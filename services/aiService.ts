import { GoogleGenAI, Type } from "@google/genai";
import { AISettings, PuzzleTheme, UserPreference, ThematicTemplate, MLUserProfile } from "../types";
import { ArtisticStyle } from "../constants/artisticStyles";
import { enhancePromptWithProfile } from "./mlService";

// --- Configuration ---
const USE_BACKEND = true;
const BACKEND_URL = "http://localhost:8000/api/ai/generate";

// --- Provider Presets ---
export const PROVIDER_PRESETS = {
    gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        providerType: 'gemini',
        baseUrl: '', // Not used for SDK
        defaultModel: 'gemini-2.0-flash',
        requiresBaseUrl: false
    },
    deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        providerType: 'openai_compatible',
        baseUrl: 'https://api.deepseek.com',
        defaultModel: 'deepseek-chat',
        requiresBaseUrl: false
    },
    grok: {
        id: 'grok',
        name: 'xAI (Grok)',
        providerType: 'openai_compatible',
        baseUrl: 'https://api.x.ai/v1',
        defaultModel: 'grok-2-latest',
        requiresBaseUrl: false
    },
    custom: {
        id: 'custom',
        name: 'Custom / Local (LM Studio/Ollama)',
        providerType: 'openai_compatible',
        baseUrl: 'http://localhost:1234/v1',
        defaultModel: 'model-identifier',
        requiresBaseUrl: true
    }
};

export const GEMINI_MODELS = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Verified Access)' },
    { id: 'imagen-3.0-generate-001', name: 'Imagen 3.0 (Verified)' },
    { id: 'veo-2.0-generate-001', name: 'Veo 2.0 Video Gen (Bonus)' }
];

export const DEEPSEEK_MODELS = [
    { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)' },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoner)' }
];

export const GROK_MODELS = [
    { id: 'grok-2-latest', name: 'Grok 2 (Latest)' },
    { id: 'grok-2-vision-latest', name: 'Grok 2 Vision' },
    { id: 'grok-beta', name: 'Grok Beta' }
];




// --- Generic Helpers ---

const cleanJson = (text: string) => {
    try {
        // Remove markdown code blocks if present
        let clean = text.replace(/```json/g, '').replace(/```/g, '');
        // Find the first { and last }
        const firstBrace = clean.indexOf('{');
        const lastBrace = clean.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            clean = clean.substring(firstBrace, lastBrace + 1);
        }
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Error on text:", text);
        throw new Error("La IA no devolvió un JSON válido.");
    }
};

// --- API Client Implementations ---

// 1. Google Gemini Client
const callGemini = async (settings: AISettings, prompt: string, schemaType?: any, imageBase64?: string): Promise<string> => {
    if (USE_BACKEND) {
        try {
            const body: any = {
                provider: 'gemini',
                model: settings.modelName,
                prompt: prompt,
                schema_type: schemaType
            };

            if (imageBase64) {
                body.image = imageBase64; // Send image to backend if present
            }

            const response = await fetch(BACKEND_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": settings.apiKey || ""
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Backend Error (${response.status}): ${errText}`);
            }

            const data = await response.json();
            return data.text || "{}";
        } catch (e: any) {
            console.error("Backend Call Failed:", e);
            throw e;
        }
    }

    // Fallback to Client-Side (Legacy)
    const apiKey = settings.apiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("Falta la API Key de Google Gemini");

    const ai = new GoogleGenAI({ apiKey });

    const config: any = {
        temperature: 0.7,
    };

    if (schemaType) {
        config.responseMimeType = "application/json";
        config.responseSchema = schemaType;
    }

    let contents: any[] = [prompt];
    if (imageBase64) {
        // Extract MIME type and data dynamically
        let mimeType = "image/png"; // Default to png if not found
        let base64Data = imageBase64;

        if (imageBase64.includes(';base64,')) {
            const parts = imageBase64.split(';base64,');
            mimeType = parts[0].replace('data:', '');
            base64Data = parts[1];
        }

        contents = [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: prompt }
        ];
    }

    const response = await ai.models.generateContent({
        model: settings.modelName || 'gemini-2.0-flash',
        contents: contents,
        config: config
    });

    return response.text || "{}";
};

// ... (callOpenAICompatible remains unchanged) ...

export const analyzeImageStyle = async (settings: AISettings, imageBase64: string): Promise<string> => {
    const prompt = `
        Analyze this image and describe its artistic style in a way that can be used as a prompt for an image generator.
        Focus on:
        1. Lighting (e.g., cinematic, soft, hard, volumetric)
        2. Color Palette (e.g., pastel, neon, monochrome, vibrant)
        3. Texture/Medium (e.g., oil painting, vector art, 3D render, pencil sketch)
        4. Composition/Mood (e.g., minimalist, chaotic, serene, epic)
        
        Return a concise, comma-separated paragraph describing these elements. 
        Start with "Art Style: ".
    `;

    try {
        let response = "";
        if (settings.provider === 'gemini') {
            response = await callGemini(settings, prompt, undefined, imageBase64);
        } else {
            // For now, only Gemini supports vision in this setup easily
            // You could extend callOpenAICompatible if using GPT-4o
            if (settings.modelName.includes('gpt-4o') || settings.modelName.includes('claude')) {
                // Placeholder for OpenAI Vision support if needed later
                throw new Error("Vision only supported on Gemini for now.");
            }
            throw new Error("Provider does not support vision analysis.");
        }
        return response.trim();
    } catch (error) {
        console.error("Style Analysis Error:", error);
        throw error;
    }
};

// 2. OpenAI Compatible Client (DeepSeek, Groq, Local)
const callOpenAICompatible = async (settings: AISettings, prompt: string, jsonMode: boolean): Promise<string> => {
    if (USE_BACKEND && !settings.baseUrl.includes('localhost')) {
        try {
            const response = await fetch(BACKEND_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": settings.apiKey || ""
                },
                body: JSON.stringify({
                    provider: settings.provider, // deepseek, grok, openai
                    model: settings.modelName,
                    prompt: prompt,
                    json_mode: jsonMode
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Backend Error (${response.status}): ${errText}`);
            }

            const data = await response.json();
            return data.text || "{}";
        } catch (e: any) {
            console.error("Backend Call Failed:", e);
            throw e;
        }
    }

    // Client-Side Direct Call
    if (!settings.apiKey && !settings.baseUrl.includes('localhost')) {
        throw new Error("Falta la API Key");
    }

    const baseUrl = settings.baseUrl || "https://api.openai.com/v1";
    // Remove trailing slash if present to avoid //chat/completions
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");

    const body: any = {
        model: settings.modelName,
        messages: [
            { role: "system", content: "You are a helpful assistant that outputs JSON." },
            { role: "user", content: prompt }
        ],
        temperature: 0.7
    };

    if (jsonMode) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "{}";
};

// --- Main Service Functions ---

export const testApiConnection = async (settings: AISettings): Promise<{ success: boolean; message: string }> => {
    try {
        const prompt = "Reply with exactly this JSON: {\"status\": \"ok\"}";

        let response = "";
        if (settings.provider === 'gemini') {
            response = await callGemini(settings, prompt);
        } else {
            response = await callOpenAICompatible(settings, prompt, true);
        }

        // Try to parse to ensure it's valid
        const json = cleanJson(response);
        if (json && json.status === 'ok') {
            return { success: true, message: "Conectado" };
        } else if (json) {
            return { success: true, message: "Conectado (Resp. Inesperada)" };
        } else {
            return { success: false, message: "Respuesta inválida" };
        }
    } catch (error: any) {
        return { success: false, message: error.message || "Error desconocido" };
    }
};

const routeRequest = async (settings: AISettings, prompt: string, schema?: any): Promise<any> => {
    let textResponse = "";

    if (settings.provider === 'gemini') {
        textResponse = await callGemini(settings, prompt, schema);
    } else {
        // For OpenAI compatible, we force JSON mode instructions in prompt if supported, 
        // but here we just pass the flag.
        textResponse = await callOpenAICompatible(settings, prompt, true);
    }

    return cleanJson(textResponse);
};

export const generateWordListAI = async (settings: AISettings, topic: string, count: number, difficulty: string): Promise<string[]> => {
    const prompt = `
        Act as an Expert Puzzle Creator. Generate a word list for a Word Search Puzzle in SPANISH about "${topic}".
        Target Audience Difficulty: ${difficulty.toUpperCase()}.

        STRICT RULES:
        1. **Format**: JSON ONLY. { "words": ["WORD1", "WORD2"] }
        2. **Content**: 
           - Quantity: Exactly ${count} words.
           - Language: Spanish.
           - Text Normalization: UPPERCASE only, NO ACCENTS (Á->A).
           - **CRITICAL**: SINGLE WORDS ONLY! No compound words, no phrases, no underscores.
           - Examples of GOOD words: CASA, PERRO, ARBOL, CIELO, MESA
           - Examples of BAD words: CASA_GRANDE, PERRO_NEGRO, DARK_MATTER (NEVER USE THESE!)
        3. **Difficulty Logic**:
           - EASY: Short, common words (3-6 letters). Example: SOL, LUNA, GATO
           - MEDIUM: Standard vocabulary (5-8 letters). Example: CIELO, ARBOL, MESA
           - HARD: Longer words but still SINGLE words (7-12 letters). Example: UNIVERSO, COMPUTADORA, MEDICINA
        
        Output JSON ONLY with simple, single Spanish words.
    `;

    // Gemini Schema definition
    const geminiSchema = {
        type: Type.OBJECT,
        properties: {
            words: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    };

    try {
        const data = await routeRequest(settings, prompt, geminiSchema);

        let words = data.words || [];
        if (!Array.isArray(words)) return [];

        // Double clean
        words = words.map((w: string) =>
            w.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-ZÑ]/g, "")
        ).filter((w: string) => w.length >= 3);

        return words;
    } catch (error) {
        console.error("Word Generation Error:", error);
        throw error;
    }
};

export const generateThemeAI = async (settings: AISettings, topic: string): Promise<PuzzleTheme | null> => {
    const prompt = `
        Act as a an Expert UI/UX Designer for Educational Printables (Word Search Puzzles).
        Create a Logical and Structured Color Theme for the topic: "${topic}".

        Design Rules (Strict):
        1. **Readability is King**: The 'backgroundColor' MUST be very light (white, faint cream, soft pastel) to ensure printed text is legible.
        2. **High Contrast**: The 'textColor' MUST be very dark (black, deep charcoal, dark navy) to stand out against the background.
        3. **Thematic Harmony**: 
           - 'primaryColor': The main brand color (headers, bold borders). Should match the "${topic}" vibe (e.g. Red for Christmas, Orange for Halloween).
           - 'secondaryColor': A complementary accent (grid lines, subheaders). 
        
        Reasoning Steps (Internal):
        - Analyze the emotion of "${topic}".
        - Select a palette that fits the emotion but respects the Contrast Rules.
        
        Output Format: JSON ONLY.
        { 
            "primaryColor": "#HEX", 
            "secondaryColor": "#HEX", 
            "textColor": "#HEX", 
            "backgroundColor": "#HEX" 
        }
    `;

    const geminiSchema = {
        type: Type.OBJECT,
        properties: {
            primaryColor: { type: Type.STRING },
            secondaryColor: { type: Type.STRING },
            textColor: { type: Type.STRING },
            backgroundColor: { type: Type.STRING }
        }
    };

    try {
        const data = await routeRequest(settings, prompt, geminiSchema);
        if (data.primaryColor) {
            return data as PuzzleTheme;
        }
        return null;
    } catch (error) {
        console.error("Theme Generation Error:", error);
        return null;
    }
};

export const enhancePromptAI = async (settings: AISettings, originalPrompt: string): Promise<string> => {
    const prompt = `
            Act as a professional prompt engineer for AI Image Generators(Midjourney / DALL - E 3).
        Enhance this simple description into a detailed, vivid prompt: "${originalPrompt}".
        Focus on lighting, texture, composition, and mood.
        Keep it under 40 words.Return ONLY the English prompt text.
    `;

    try {
        let response = "";
        if (settings.provider === 'gemini') {
            response = await callGemini(settings, prompt);
        } else {
            response = await callOpenAICompatible(settings, prompt, false);
        }
        return response.replace(/"/g, '').trim();
    } catch (error) {
        console.error("Prompt Enhancement Error:", error);
        return originalPrompt;
    }
};

/**
 * Generates a background image using Gemini.
 * Tries Imagen 3 first, falls back to SVG generation via Text Model if unavailable.
 */
export const generatePuzzleBackground = async (settings: AISettings, prompt: string, style: string): Promise<string> => {
    if (USE_BACKEND) {
        try {
            // 1. Try Imagen 3 (Backend)
            console.log("Attempting Image Generation with Imagen 3 (Backend)...");
            const response = await fetch("http://localhost:8000/api/ai/generate-image", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": settings.apiKey || ""
                },
                body: JSON.stringify({
                    prompt: prompt,
                    style: style,
                    model: 'imagen-3.0-generate-001'
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.image) {
                    console.log("Imagen 3 Success!");
                    let img = data.image;
                    if (!img.startsWith('data:') && !img.trim().startsWith('<svg') && !img.trim().startsWith('<?xml')) {
                        img = `data:image/png;base64,${img}`;
                    }
                    return img;
                }
            } else {
                console.warn("Backend Imagen 3 Failed:", await response.text());
            }

        } catch (e) {
            console.error("Backend Imagen 3 Error:", e);
        }

        try {
            // 2. Fallback to SVG (Backend)
            console.log("Attempting SVG Fallback (Backend)...");
            const response = await fetch("http://localhost:8000/api/ai/generate-svg", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": settings.apiKey || ""
                },
                body: JSON.stringify({
                    prompt: prompt,
                    style: style
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Backend SVG Error(${response.status}): ${errText} `);
            }

            const data = await response.json();
            console.log("SVG Success!");
            return data.image || "";

        } catch (e: any) {
            console.error("Backend SVG Call Failed:", e);
            throw new Error(`Error generando arte(Backend): ${e.message} `);
        }
    }
    // Fallback if backend not used or failed
    return "";
};

import { getUserPreferences, getTasteProfile } from "./storageService";

// --- Global Rules Integration ---
const getGlobalRules = async (): Promise<string[]> => {
    try {
        // Assume API is on same host/port logic
        const response = await fetch("http://localhost:8000/api/brain/rules");
        if (response.ok) {
            const data = await response.json();
            // Filter only active rules
            return data.rules.filter((r: any) => r.active).map((r: any) => r.content);
        }
    } catch (e) {
        console.warn("Failed to load global rules", e);
    }
    return [];
};

export const createContextAwarePrompt = async (settings: AISettings, basePrompt: string, templateType: string): Promise<string> => {
    let layoutDescription = "";

    if (templateType === 'thematic') {
        layoutDescription = `
            LAYOUT: FULL PAGE ART POSTER.
        - The center area contains a puzzle grid but it should be INTEGRATED into the art(e.g.framed by trees, inside a magical portal, on a parchment).
        - Do NOT create a plain white box.The center can have low opacity or subtle texture.
        - Use a "Frame" or "Border" composition where the subject matter is around the edges.
        `;
    } else {
        layoutDescription = `
            LAYOUT: Standard Puzzle Background.
        - Keep the center area(80 %) relatively clear or low contrast for text readability.
        - Place main artistic elements on the edges / margins.
        `;
    }

    // --- Feedback Loop Integration ---
    let preferencesContext = "";
    try {
        const prefs = await getUserPreferences();
        const likes = prefs.filter(p => p.type === 'like').slice(-5); // Last 5 likes
        const dislikes = prefs.filter(p => p.type === 'dislike').slice(-5); // Last 5 dislikes

        if (likes.length > 0) {
            preferencesContext += "\nUSER PREFERENCES (DO MORE OF THIS):\n";
            likes.forEach(p => preferencesContext += `- The user liked: "${p.prompt}"\n`);
        }

        if (dislikes.length > 0) {
            preferencesContext += "\nUSER DISLIKES (AVOID THIS):\n";
            dislikes.forEach(p => preferencesContext += `- The user disliked: "${p.prompt}"\n`);
        }
    } catch (e) {
        console.warn("Failed to load user preferences for prompt context", e);
    }

    // --- Taste Profile Integration (Long Term Memory) ---
    try {
        const profile = await getTasteProfile();
        if (profile) {
            preferencesContext += `\nUSER TASTE PROFILE (LONG TERM MEMORY - PRIORITIZE THIS):\n"${profile}"\n`;
        }
    } catch (e) {
        console.warn("Failed to load taste profile", e);
    }

    // --- Global Rules Integration (Supreme Directives) ---
    let globalRulesContext = "";
    try {
        const rules = await getGlobalRules();
        if (rules.length > 0) {
            globalRulesContext = "\nDIRECTIVAS SUPREMAS (GLOBAL RULES - HIGHEST PRIORITY):\n" + rules.map(r => `- ${r}`).join("\n") + "\n";
        }
    } catch (e) {
        console.warn("Global Rules Context Failed", e);
    }

    const systemPrompt = `
            ${globalRulesContext}
            Act as an Art Director for a high - end puzzle book.
            Refine this user prompt into a detailed image generation prompt: "${basePrompt}"

    ${layoutDescription}

    ${preferencesContext}

    CRITICAL DESIGN CONSTRAINTS(ANTI - PATTERNS TO AVOID):
            - NO "Office Document" aesthetic(plain white backgrounds with simple thin borders).
            - NO "Floating Boxes"(disconnected grid / list boxes).
    - NO generic / cheap "Tech" icons(chips, CPUs) scattered randomly.
    - NO flat, desaturated colors.Use rich, vibrant, or cinematic lighting.
    - NO "Word Art" or "Clip Art" style.
    - The design must look like a Movie Poster, Book Cover, or High - Quality Illustration.

                Instructions:
            1. Describe a background that fits the theme and layout.
    2. Suggest specific lighting and textures(e.g. "cinematic lighting", "parchment texture", "glowing nebula").
    3. Return ONLY the refined prompt in English.
    `;

    try {
        let response = "";
        if (settings.provider === 'gemini') {
            // FORCE ULTRA BRAIN (Gemini 2.5) for Logic/Reasoning
            const logicSettings = { ...settings, modelName: 'gemini-2.0-flash' };
            response = await callGemini(logicSettings, systemPrompt);
        } else {
            response = await callOpenAICompatible(settings, systemPrompt, false);
        }
        return response.replace(/"/g, '').trim();
    } catch (error) {
        console.error("Context Aware Prompt Error:", error);
        return basePrompt + " " + layoutDescription;
    }
};

export const generateTasteProfile = async (settings: AISettings, preferences: UserPreference[]): Promise<string> => {
    if (preferences.length === 0) return "No sufficient data to generate a profile.";

    const likes = preferences.filter(p => p.type === 'like').map(p => p.prompt).join("\n- ");
    const dislikes = preferences.filter(p => p.type === 'dislike').map(p => p.prompt).join("\n- ");

    const prompt = `
        Analyze the following user preferences for art generation:

        LIKED PROMPTS:
        - ${likes}

        DISLIKED PROMPTS:
        - ${dislikes}

        Create a concise "Taste Profile" (max 50 words) describing what this user prefers visually.
        Focus on style, lighting, and mood.
        Example: "User prefers dark, cinematic sci-fi themes with neon lighting. Dislikes minimalist or flat designs."
    `;

    try {
        let response = "";
        if (settings.provider === 'gemini') {
            response = await callGemini(settings, prompt);
        } else {
            response = await callOpenAICompatible(settings, prompt, false);
        }
        return response.trim();
    } catch (error) {
        console.error("Taste Profile Generation Error:", error);
        return "Error generating profile.";
    }
};

// --- Art Studio 2.0 Prompt Builder ---

// Imports moved to top of file
export const buildArtisticPrompt = (
    userPrompt: string,
    template: ThematicTemplate | null,
    style: ArtisticStyle,
    profile: MLUserProfile | null
): string => {
    let finalPrompt = "";

    // 1. Base Context (Template or User)
    if (template) {
        finalPrompt += `Subject: ${template.basePrompt}. `;
        if (userPrompt) finalPrompt += `Specific details: ${userPrompt}. `;

        // Add random elements from template for variety
        const randomElements = template.elements.sort(() => 0.5 - Math.random()).slice(0, 3).join(", ");
        finalPrompt += `Featuring: ${randomElements}. `;
    } else {
        finalPrompt += `Subject: ${userPrompt}. `;
    }

    // 2. Style Application
    finalPrompt += `\nArt Style: ${style.promptModifier}. `;

    // 3. ML Profile Enhancements
    if (profile) {
        finalPrompt = enhancePromptWithProfile(finalPrompt, profile);
    }

    // 4. Quality Boosters
    finalPrompt += "\nQuality: Masterpiece, professional, high resolution, detailed, aesthetic.";

    // 5. Negative Prompt (Implicitly handled by some APIs, but good to have in text)
    // We return just the positive prompt here, the negative one is usually sent separately or appended
    // depending on the API. For now, we append it as a "Negative:" section if the API supports it textually,
    // or just rely on the style's negative prompt being used elsewhere.
    // Let's keep it clean and just return the positive prompt for now.

    return finalPrompt;
};

export const generateDesignAsset = async (settings: AISettings, prompt: string, style: 'bw' | 'color', count: number = 1): Promise<{ assets: Array<{ image: string, raw_svg: string }> }> => {
    if (USE_BACKEND) {
        try {
            const response = await fetch(`${BACKEND_URL.replace('/generate', '')}/generate-smart-design`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": settings.apiKey || ""
                },
                body: JSON.stringify({
                    prompt: prompt,
                    style: style,
                    count: count
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Backend Error (${response.status}): ${errText}`);
            }

            const data = await response.json();
            // Handle legacy single format response if backend isn't fully ready (backward compatibility)
            if (data.image && !data.assets) {
                return { assets: [data] };
            }
            return data;
        } catch (e: any) {
            console.error("Design Generation Failed:", e);
            throw e;
        }
    }
    throw new Error("Design generation requires backend.");
};
