import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ===== UTILIDADES DE DETECCIÓN =====

/**
 * Detecta automáticamente el proveedor basándose en el formato de la API key
 * @param apiKey - La API key a analizar
 * @returns El proveedor detectado
 */
function detectProvider(apiKey) {
    if (!apiKey) return 'unknown';

    // Gemini: AIzaSy...
    if (apiKey.startsWith('AIzaSy')) return 'gemini';

    // Groq: gsk_...
    if (apiKey.startsWith('gsk_')) return 'groq';

    // OpenAI (nuevo formato proyecto): sk-proj-...
    if (apiKey.startsWith('sk-proj-')) return 'openai';

    // OpenAI (formato antiguo) o DeepSeek: sk-...
    // DeepSeek también usa sk-, así que necesitamos más lógica
    if (apiKey.startsWith('sk-')) {
        // Si es muy largo (>100 chars) probablemente sea DeepSeek
        if (apiKey.length > 100) return 'deepseek';
        // Por defecto, asumimos OpenAI para sk- cortos
        return 'openai';
    }

    return 'unknown';
}

/**
 * Obtiene la configuración del proveedor (base URL, etc.)
 */
function getProviderConfig(provider) {
    const configs = {
        gemini: {
            name: 'Google Gemini',
            baseUrl: null, // Usa SDK con cliente especial
            defaultModel: 'gemini-2.5-flash'
        },
        groq: {
            name: 'Groq',
            baseUrl: 'https://api.groq.com/openai/v1',
            defaultModel: 'llama-3.3-70b-versatile'
        },
        deepseek: {
            name: 'DeepSeek',
            baseUrl: 'https://api.deepseek.com',
            defaultModel: 'deepseek-chat'
        },
        openai: {
            name: 'OpenAI',
            baseUrl: 'https://api.openai.com/v1',
            defaultModel: 'gpt-4o-mini'
        }
    };

    return configs[provider] || configs.openai;
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint para detectar proveedor de una API key
app.post('/api/detect-provider', (req, res) => {
    try {
        const { apiKey } = req.body;
        const provider = detectProvider(apiKey);
        const config = getProviderConfig(provider);

        res.json({
            provider,
            config,
            isValid: provider !== 'unknown'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para Gemini API
app.post('/api/gemini', async (req, res) => {
    try {
        const { model, prompt, schema } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: 'GEMINI_API_KEY no configurada en .env.local',
                help: 'Agrega tu API key de Gemini (comienza con AIzaSy...) en el archivo .env.local'
            });
        }

        // Importar dinámicamente el SDK de Gemini
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        const config = {
            temperature: 0.7,
            ...(schema && {
                responseMimeType: "application/json",
                responseSchema: schema
            })
        };

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: prompt,
            config
        });

        res.json({ text: response.text || "{}" });
    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({
            error: error.message,
            provider: 'gemini'
        });
    }
});

// Endpoint UNIFICADO para APIs compatibles con OpenAI (DeepSeek, Groq, OpenAI)
app.post('/api/openai-compatible', async (req, res) => {
    try {
        const { provider, model, messages, baseUrl: customBaseUrl, apiKey: providedApiKey } = req.body;

        // Obtener configuración del proveedor
        const providerConfig = getProviderConfig(provider);

        // Seleccionar API key: Prioridad a la enviada desde frontend, luego .env
        let apiKey = providedApiKey;

        if (!apiKey) {
            switch (provider) {
                case 'deepseek':
                    apiKey = process.env.DEEPSEEK_API_KEY;
                    break;
                case 'groq':
                    apiKey = process.env.GROQ_API_KEY;
                    break;
                case 'openai':
                    apiKey = process.env.OPENAI_API_KEY;
                    break;
            }
        }

        if (!apiKey) {
            return res.status(500).json({
                error: `API Key no encontrada para ${providerConfig.name}`,
                help: `Puedes configurarla en .env.local o enviarla desde la interfaz.`,
                provider
            });
        }

        const baseUrl = customBaseUrl || providerConfig.baseUrl;
        const url = `${baseUrl}/chat/completions`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || providerConfig.defaultModel,
                messages,
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Error ${provider}:`, errorText);
            throw new Error(`API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('OpenAI-Compatible API Error:', error);
        res.status(500).json({
            error: error.message,
            provider: req.body.provider
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Backend API Proxy corriendo en http://localhost:${PORT}`);
    console.log(`${'='.repeat(60)}\n`);
    console.log(`📡 Endpoints disponibles:`);
    console.log(`   GET  /health - Health check`);
    console.log(`   POST /api/detect-provider - Detectar proveedor de API key`);
    console.log(`   POST /api/gemini - Google Gemini`);
    console.log(`   POST /api/openai-compatible - DeepSeek, Groq, OpenAI\n`);

    console.log(`🔑 API Keys configuradas:`);
    console.log(`   Gemini:    ${process.env.GEMINI_API_KEY ? '✅ Configurada' : '❌ No configurada'}`);
    console.log(`   DeepSeek:  ${process.env.DEEPSEEK_API_KEY ? '✅ Configurada' : '⚠️  Opcional'}`);
    console.log(`   Groq:      ${process.env.GROQ_API_KEY ? '✅ Configurada' : '⚠️  Opcional'}`);
    console.log(`   OpenAI:    ${process.env.OPENAI_API_KEY ? '✅ Configurada' : '⚠️  Opcional'}`);
    console.log(`\n${'='.repeat(60)}\n`);
});
