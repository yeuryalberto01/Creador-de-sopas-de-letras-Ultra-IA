import { getLogs, ArtStudioLogEntry } from './artStudioFeedback';
import { STYLE_PROFILES } from '../constants/styleProfiles';
import { StyleProfile } from '../types';

export interface StylePerformance {
    styleId: string;
    totalGenerations: number;
    likes: number;
    dislikes: number;
    likeRate: number;
    commonIssues: { reason: string; count: number }[];
}

export interface StyleImprovement {
    styleId: string;
    currentBasePrompt: string;
    currentNegativePrompt: string;
    suggestedBasePrompt: string;
    suggestedNegativePrompt: string;
    reasoning: string;
}

export const analyzeStylePerformance = (styleId: string): StylePerformance => {
    const logs = getLogs();
    const styleLogs = logs.filter(log => log.styleProfileId === styleId);

    const totalGenerations = styleLogs.length;
    const likes = styleLogs.filter(log => log.rating === 1).length;
    const dislikes = styleLogs.filter(log => log.rating === -1).length;
    const likeRate = totalGenerations > 0 ? likes / totalGenerations : 0;

    // Count feedback categories
    const issueMap: Record<string, number> = {};
    styleLogs.forEach(log => {
        if (log.rating === -1 && log.feedbackCategory) {
            issueMap[log.feedbackCategory] = (issueMap[log.feedbackCategory] || 0) + 1;
        }
    });

    const commonIssues = Object.entries(issueMap)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
        styleId,
        totalGenerations,
        likes,
        dislikes,
        likeRate,
        commonIssues
    };
};

export const generateStyleImprovements = async (
    styleId: string,
    performance: StylePerformance,
    aiSettings: { apiKey: string; baseUrl?: string }
): Promise<StyleImprovement> => {
    const profile = STYLE_PROFILES.find(p => p.id === styleId);
    if (!profile) throw new Error(`Style profile not found: ${styleId}`);

    const issuesSummary = performance.commonIssues
        .map(issue => `- ${issue.reason}: ${issue.count} veces`)
        .join('\n');

    const prompt = `
Eres un experto en prompts de IA generativa (Imagen 3, Stable Diffusion).

**Tarea**: Mejorar un perfil de estilo para un generador de sopas de letras basándote en feedback del usuario.

**Perfil Actual:**
- ID: ${styleId}
- Base Prompt: ${profile.basePrompt}
- Negative Prompt: ${profile.negativePrompt}

**Estadísticas de Rendimiento:**
- Total de generaciones: ${performance.totalGenerations}
- Me gusta: ${performance.likes}
- No me gusta: ${performance.dislikes}
- Tasa de éxito: ${(performance.likeRate * 100).toFixed(1)}%

**Problemas Más Comunes (según usuarios):**
${issuesSummary || 'Ninguno reportado aún.'}

**Instrucciones:**
1. Si la tasa de éxito es > 80%, sugiere mejoras menores.
2. Si la tasa es < 50%, sugiere cambios significativos.
3. Para cada problema común, añade restricciones específicas al Negative Prompt.
4. Mantén el espíritu original del estilo.
5. Recuerda que SIEMPRE debe haber un centro vacío para la sopa de letras.

**Formato de Respuesta (JSON):**
\`\`\`json
{
  "suggestedBasePrompt": "...",
  "suggestedNegativePrompt": "...",
  "reasoning": "Explica brevemente qué cambios hiciste y por qué."
}
\`\`\`
`;

    try {
        const response = await fetch(`${aiSettings.baseUrl || 'http://localhost:8000'}/api/ai/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': aiSettings.apiKey
            },
            body: JSON.stringify({
                provider: 'gemini',
                model: 'gemini-2.0-flash',
                prompt: prompt,
                json_mode: false,
                schema_type: {
                    type: 'object',
                    properties: {
                        suggestedBasePrompt: { type: 'string' },
                        suggestedNegativePrompt: { type: 'string' },
                        reasoning: { type: 'string' }
                    },
                    required: ['suggestedBasePrompt', 'suggestedNegativePrompt', 'reasoning']
                }
            })
        });

        if (!response.ok) throw new Error('Failed to call Gemini API');

        const data = await response.json();
        const result = JSON.parse(data.text);

        return {
            styleId,
            currentBasePrompt: profile.basePrompt,
            currentNegativePrompt: profile.negativePrompt,
            suggestedBasePrompt: result.suggestedBasePrompt,
            suggestedNegativePrompt: result.suggestedNegativePrompt,
            reasoning: result.reasoning
        };
    } catch (error: any) {
        throw new Error(`Error generando mejoras: ${error.message}`);
    }
};

export const optimizeAllStyles = async (
    aiSettings: { apiKey: string; baseUrl?: string }
): Promise<StyleImprovement[]> => {
    const improvements: StyleImprovement[] = [];

    for (const profile of STYLE_PROFILES) {
        const performance = analyzeStylePerformance(profile.id);

        // Only optimize if we have enough data
        if (performance.totalGenerations >= 3) {
            try {
                const improvement = await generateStyleImprovements(profile.id, performance, aiSettings);
                improvements.push(improvement);
            } catch (error) {
                console.error(`Error optimizando ${profile.id}:`, error);
            }
        }
    }

    return improvements;
};
