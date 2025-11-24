import { AISettings, PuzzleTheme } from "../types";

const BACKEND_URL = 'http://localhost:3001';

// --- Generic Helpers ---

const cleanJson = (text: string) => {
    // Remove markdown code blocks if present
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(clean);
};

// --- API Client Implementations ---

// 1. Google Gemini Client (via backend)
const callGemini = async (settings: AISettings, prompt: string, schemaType?: any): Promise<string> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/gemini`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: settings.modelName || 'gemini-2.5-flash',
                prompt,
                schema: schemaType
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error en Gemini API');
        }

        const data = await response.json();
        return data.text || "{}";
    } catch (error) {
        console.error('Gemini Backend Error:', error);
        throw error;
    }
};

// 2. OpenAI Compatible Client (DeepSeek, Groq, Local) via backend
const callOpenAICompatible = async (settings: AISettings, prompt: string, jsonMode: boolean): Promise<string> => {
    try {
        // Determinar el proveedor
        let provider = 'openai';

        // Si el proveedor es explícito, usarlo
        if (['deepseek', 'groq', 'openai'].includes(settings.provider)) {
            provider = settings.provider;
        }
        // Lógica legacy para detección automática si es 'openai_compatible'
        else {
            if (settings.baseUrl?.includes('deepseek')) provider = 'deepseek';
            else if (settings.baseUrl?.includes('groq')) provider = 'groq';
            else if (settings.modelName?.includes('deepseek')) provider = 'deepseek';
            else if (settings.modelName?.includes('groq')) provider = 'groq';
        }

        const response = await fetch(`${BACKEND_URL}/api/openai-compatible`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider,
                model: settings.modelName,
                baseUrl: settings.baseUrl,
                apiKey: settings.apiKey, // Enviar key si existe (override)
                messages: [
                    { role: "system", content: "You are a helpful assistant that outputs JSON." },
                    { role: "user", content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error en API');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI-Compatible Backend Error:', error);
        throw error;
    }
};

// --- Main Service Functions ---

const routeRequest = async (settings: AISettings, prompt: string, schema?: any): Promise<any> => {
    let textResponse = "";
    if (settings.provider === 'gemini') {
        textResponse = await callGemini(settings, prompt, schema);
    } else {
        // Maneja openai_compatible, deepseek, groq, openai
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
        type: 'OBJECT',
        properties: {
            words: { type: 'ARRAY', items: { type: 'STRING' } }
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
        type: 'OBJECT',
        properties: {
            primaryColor: { type: 'STRING' },
            secondaryColor: { type: 'STRING' },
            textColor: { type: 'STRING' },
            backgroundColor: { type: 'STRING' }
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