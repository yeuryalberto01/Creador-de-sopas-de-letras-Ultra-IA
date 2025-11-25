import { GoogleGenAI, Type } from "@google/genai";
import { AISettings, PuzzleTheme } from "../types";

// --- Provider Presets ---

export const PROVIDER_PRESETS = {
    gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        providerType: 'gemini',
        baseUrl: '', // Not used for SDK
        defaultModel: 'gemini-2.5-flash',
        requiresBaseUrl: false
    },
    deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        providerType: 'openai_compatible',
        baseUrl: 'https://api.deepseek.com',
        defaultModel: 'deepseek-chat',
        requiresBaseUrl: false // We pre-fill it, but user can edit if they want
    },
    grok: {
        id: 'grok',
        name: 'xAI (Grok)',
        providerType: 'openai_compatible',
        baseUrl: 'https://api.x.ai/v1',
        defaultModel: 'grok-beta',
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
    // If user provided a key in settings, use it. Otherwise fallback to env (only works if env is injected)
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
        model: settings.modelName || 'gemini-2.5-flash',
        contents: prompt,
        config: config
    });

    return response.text || "{}";
};

// 2. OpenAI Compatible Client (DeepSeek, Groq, Local)
const callOpenAICompatible = async (settings: AISettings, prompt: string, jsonMode: boolean): Promise<string> => {
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
        Genera un objeto JSON con una lista de palabras para una sopa de letras.
        Tema: "${topic}".
        Dificultad: ${difficulty}.
        Cantidad: ${count} palabras.
        
        Reglas:
        1. SOLO palabras individuales (sin frases).
        2. En ESPAÑOL.
        3. Normalizadas: Mayúsculas, sin tildes, solo letras A-Z y Ñ.
        4. Longitud mínima: 3 letras.
        5. Devuelve SOLO el JSON.
        
        Ejemplo de formato: { "words": ["PALABRA1", "PALABRA2"] }
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
        Actúa como un diseñador gráfico experto. Genera una paleta de colores CSS para una hoja de sopa de letras basada en el tema: "${topic}".
        
        Devuelve un JSON con:
        - primaryColor: Color principal fuerte (bordes, títulos).
        - secondaryColor: Color de fondo muy suave para la grilla (debe ser legible con texto negro).
        - textColor: Color del texto (generalmente oscuro, casi negro o azul oscuro).
        - backgroundColor: Color de fondo de la página (generalmente blanco o un tinte muy sutil).
        
        IMPORTANTE: Devuelve SOLO el JSON.

        Ejemplo de salida:
        {
            "primaryColor": "#b91c1c",
            "secondaryColor": "#fef2f2",
            "textColor": "#1a0f0f",
            "backgroundColor": "#ffffff"
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

/**
 * Generates a background image using Gemini 2.5 Flash Image.
 * Supports Black & White (Line Art) or Color (Vector Frame).
 */
export const generatePuzzleBackground = async (settings: AISettings, prompt: string, style: 'bw' | 'color'): Promise<string> => {
    // Requires a Google API Key, can't use generic OpenAI endpoints easily for image gen with this specific setup
    const apiKey = settings.apiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("Se requiere API Key de Google para generar imágenes.");

    const ai = new GoogleGenAI({ apiKey });
    
    // Construct Prompt based on Style - Optimized for Text Overlay with strong Negative Space focus
    let finalPrompt = "";
    
    if (style === 'bw') {
        finalPrompt = `
            Design a professional coloring book style PAGE BORDER / FRAME about: ${prompt}.
            
            CRITICAL LAYOUT RULES:
            1. The art must be ONLY around the edges (top, bottom, sides) acting as a frame.
            2. The CENTER (80% of the page area) must be COMPLETELY EMPTY WHITE SPACE.
            3. Do not place any objects, lines, or textures in the center. It must be blank for text.
            
            Style Rules:
            1. Black and white vector line art ONLY.
            2. Crisp lines, high contrast.
            3. No grayscale shading, no gradients.
            4. Intricate details on edges only.
            5. Aspect Ratio: Vertical Portrait (3:4).
        `;
    } else {
        // Updated to be structural like BW but in color (Vector/Illustration style)
        finalPrompt = `
            Design a professional decorative VECTOR FRAME / BORDER about: ${prompt}.
            
            CRITICAL LAYOUT RULES:
            1. The illustration must be restricted to the edges to form a frame.
            2. The CENTER must be pure EMPTY WHITE SPACE (Negative Space).
            3. This is for a document background, so the middle must be clean.
            
            Style Rules:
            1. Style: Clean Flat Vector Art / Sticker Art / Clip Art.
            2. Use flat, vibrant colors.
            3. White background.
            4. DO NOT use watercolor, complex paintings, or photographic styles that fill the page.
            5. Aspect Ratio: Vertical Portrait (3:4).
        `;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Fast, efficient model
            contents: {
                parts: [
                    { text: finalPrompt }
                ]
            },
            config: {
                imageConfig: {
                    aspectRatio: "3:4", // Matches Letter/A4 roughly
                }
            }
        });

        // Extract Image
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No se generó ninguna imagen.");

    } catch (error) {
        console.error("Image Gen Error:", error);
        throw error;
    }
};