import { GoogleGenAI, Type } from "@google/genai";
import { AISettings, PuzzleTheme } from "../types";

// --- Generic Helpers ---

const cleanJson = (text: string) => {
  // Remove markdown code blocks if present
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  return JSON.parse(clean);
};

// --- API Client Implementations ---

// 1. Google Gemini Client
const callGemini = async (settings: AISettings, prompt: string, schemaType?: any): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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
    const baseUrl = settings.baseUrl || "https://api.openai.com/v1";
    
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

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error: ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
};

// --- Main Service Functions ---

const routeRequest = async (settings: AISettings, prompt: string, schema?: any): Promise<any> => {
    // Note: For Gemini we use process.env.API_KEY, but for OpenAI compatible we might need the one from settings.
    if (settings.provider !== 'gemini' && !settings.apiKey) throw new Error("API Key faltante en configuración");
    
    let textResponse = "";
    if (settings.provider === 'gemini') {
        textResponse = await callGemini(settings, prompt, schema);
    } else {
        // DeepSeek/Groq usually implies JSON mode if we ask for it
        textResponse = await callOpenAICompatible(settings, prompt, true);
    }
    
    try {
        return typeof textResponse === 'string' ? cleanJson(textResponse) : textResponse;
    } catch (e) {
        console.error("Failed to parse JSON", textResponse);
        return {};
    }
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
        
        Schema esperado: { "words": ["PALABRA1", "PALABRA2"] }
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
        // Double clean
        words = words.map((w: string) => 
            w.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-ZÑ]/g, "")
        ).filter((w: string) => w.length >= 3);
        
        return words;
    } catch (error) {
        console.error("Word Generation Error:", error);
        return [];
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