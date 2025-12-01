import { GoogleGenAI, Type } from "@google/genai";
import { AISettings, PuzzleTheme } from "../types";

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
    openai: {
        id: 'openai',
        name: 'OpenAI',
        providerType: 'openai_compatible',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o',
        requiresBaseUrl: false
    },
    openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        providerType: 'openai_compatible',
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultModel: 'google/gemini-2.0-flash-001',
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
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (New)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Best Reasoning)' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast)' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B' }
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

export const OPENAI_MODELS = [
    { id: 'gpt-4o', name: 'GPT-4o (Omni)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'o1-preview', name: 'o1 Preview' },
    { id: 'o1-mini', name: 'o1 Mini' }
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
const callGemini = async (settings: AISettings, prompt: string, schemaType?: any): Promise<string> => {
    if (USE_BACKEND) {
        try {
            const response = await fetch(BACKEND_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": settings.apiKey || "" // Optional: Send key if user provided one overrides backend env
                },
                body: JSON.stringify({
                    provider: 'gemini',
                    model: settings.modelName,
                    prompt: prompt,
                    schema_type: schemaType
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

    const response = await ai.models.generateContent({
        model: settings.modelName || 'gemini-2.0-flash',
        contents: prompt,
        config: config
    });

    return response.text || "{}";
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
        Genera JSON con ${count} palabras en ESPAÑOL sobre "${topic}".
        Reglas: Sin tildes, mayúsculas, sin frases.
        Formato: { "words": ["PALABRA1", "PALABRA2"] }
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
        Generate JSON color palette for topic "${topic}".
        Keys: primaryColor (strong), secondaryColor (pale), textColor (dark), backgroundColor (white/subtle).
        Format: { "primaryColor": "#...", "secondaryColor": "#...", "textColor": "#...", "backgroundColor": "#..." }
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
        Act as a professional prompt engineer for AI Image Generators (Midjourney/DALL-E 3).
        Enhance this simple description into a detailed, vivid prompt: "${originalPrompt}".
        Focus on lighting, texture, composition, and mood.
        Keep it under 40 words. Return ONLY the English prompt text.
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
                    return data.image;
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
                throw new Error(`Backend SVG Error (${response.status}): ${errText}`);
            }

            const data = await response.json();
            console.log("SVG Success!");
            return data.image || "";

        } catch (e: any) {
            console.error("Backend SVG Call Failed:", e);
            throw new Error(`Error generando arte (Backend): ${e.message}`);
        }
    }

    // Legacy Client-Side Fallback (Should not be reached if USE_BACKEND is true and backend is up)
    throw new Error("El backend no está disponible para generar imágenes.");
};

export const createContextAwarePrompt = async (settings: AISettings, basePrompt: string, templateType: string): Promise<string> => {
    const layoutDescription = templateType === 'tech'
        ? "Layout: Header at top (20% height), Grid in center (60% height), Word list at bottom (20% height). Keep the center area relatively clean or low contrast to ensure text readability."
        : "Layout: Classic Word Search. Title at top, large grid in middle, words at bottom. Design should frame the content.";

    const systemPrompt = `
        You are an AI Art Director. Refine this image generation prompt to respect a specific layout.
        
        User Prompt: "${basePrompt}"
        Layout Constraints: ${layoutDescription}
        
        Instructions:
        1. Describe a background that fits the theme but keeps the "Safe Zones" (where text goes) legible.
        2. Suggest using a "Frame", "Border", or "Vignette" style if appropriate.
        3. Mention "low opacity" or "subtle texture" for the center area.
        4. Return ONLY the refined prompt in English.
    `;

    try {
        let response = "";
        if (settings.provider === 'gemini') {
            response = await callGemini(settings, systemPrompt);
        } else {
            response = await callOpenAICompatible(settings, systemPrompt, false);
        }
        return response.replace(/"/g, '').trim();
    } catch (error) {
        console.error("Context Aware Prompt Error:", error);
        return basePrompt + " " + layoutDescription;
    }
};