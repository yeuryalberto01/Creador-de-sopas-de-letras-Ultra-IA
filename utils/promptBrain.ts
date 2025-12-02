import { STYLE_PROFILES } from '../constants/styleProfiles';
import { StyleProfile, MLUserProfile } from '../types';

export function chooseProfile(userPrompt: string, explicitStyleId?: string): StyleProfile {
    // 1. If explicit ID provided, try to find it
    if (explicitStyleId) {
        const profile = STYLE_PROFILES.find(p => p.id === explicitStyleId);
        if (profile) return profile;
    }

    // 2. Fallback: Keyword matching
    const lowerPrompt = userPrompt.toLowerCase();
    let bestMatch: StyleProfile | null = null;
    let maxMatches = 0;

    for (const profile of STYLE_PROFILES) {
        let matches = 0;
        for (const tag of profile.etiquetas) {
            if (lowerPrompt.includes(tag.toLowerCase())) {
                matches++;
            }
        }
        if (matches > maxMatches) {
            maxMatches = matches;
            bestMatch = profile;
        }
    }

    // 3. Default fallback (first profile or a generic one)
    return bestMatch || STYLE_PROFILES[0];
}

function getAdaptiveConstraints(profile: MLUserProfile | null): string {
    if (!profile || !profile.feedbackHistory) return "";

    const constraints: string[] = [];
    const recentDislikes = profile.feedbackHistory
        .filter(f => f.rating === -1)
        .slice(0, 10); // Look at last 10 dislikes

    // Map reasons to negative prompts
    const reasonMap: Record<string, string> = {
        'Texto ilegible / deformado': 'distorted text, messy fonts, unreadable letters, floating alphabet',
        'Colores extraños': 'clashing colors, weird color palette, neon overload, mud colors',
        'Estilo incorrecto': 'wrong style, unexpected art style, inconsistent design',
        'Composición desordenada': 'cluttered, messy composition, chaotic elements, overlapping objects'
    };

    const addedConstraints = new Set<string>();

    for (const feedback of recentDislikes) {
        if (feedback.reason && reasonMap[feedback.reason]) {
            const constraint = reasonMap[feedback.reason];
            if (!addedConstraints.has(constraint)) {
                constraints.push(constraint);
                addedConstraints.add(constraint);
            }
        }
    }

    return constraints.join(", ");
}

function getAdaptiveBoosters(profile: MLUserProfile | null): string {
    if (!profile) return "";

    // Find top liked style
    const topStyle = profile.stylePreferences.liked.sort((a, b) => b.count - a.count)[0];
    if (topStyle && topStyle.count > 2) {
        return `(Style influenced by user preference: ${topStyle.style})`;
    }
    return "";
}

export function buildImagePrompts(userPrompt: string, explicitStyleId?: string, mlProfile: MLUserProfile | null = null) {
    const profile = chooseProfile(userPrompt, explicitStyleId);

    const systemGuard = `
    Recibes una imagen de una sopa de letras YA TERMINADA.
    Solo debes decorar el fondo y los bordes.
    No debes modificar las letras ni la estructura del puzzle.
  `;

    const adaptiveBoosters = getAdaptiveBoosters(mlProfile);
    const adaptiveConstraints = getAdaptiveConstraints(mlProfile);

    const positive = `
    ${systemGuard}
    ${profile.basePrompt}
    ${adaptiveBoosters}
    Detalles adicionales pedidos por el usuario: ${userPrompt}.
    Paleta de color recomendada: ${profile.colorHints ?? ""}.
  `;

    const negative = `
    ${profile.negativePrompt}
    ${adaptiveConstraints}
    no cambiar el tamaño de la cuadrícula,
    no desenfocar el texto, no hacer que el texto sea difícil de leer
  `;

    return { positive, negative, profileId: profile.id };
}
