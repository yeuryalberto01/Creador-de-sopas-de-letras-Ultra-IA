import { AISettings, MLUserProfile, VisualFeatures, ThematicTemplate } from '../types';
import { THEMATIC_TEMPLATES } from '../constants/thematicTemplates';
import { ARTISTIC_STYLES } from '../constants/artisticStyles';
import { getUserPreferences, saveTasteProfile } from './storageService';

// --- Mock AI Analysis (Replace with real AI call if needed, but heuristic is faster for now) ---

export const analyzeImageFeatures = async (prompt: string, styleId: string, templateId?: string): Promise<VisualFeatures> => {
    // In a real scenario, we would send the image to a vision model.
    // For now, we infer features from the prompt and metadata to save tokens/latency.

    const style = ARTISTIC_STYLES.find(s => s.id === styleId);
    const template = THEMATIC_TEMPLATES.find(t => t.id === templateId);

    // Infer temperature
    let temperature: 'warm' | 'cool' | 'neutral' = 'neutral';
    if (styleId === 'watercolor' || styleId === 'poster_art') temperature = 'warm';
    if (styleId === 'digital_art' || styleId === 'space') temperature = 'cool';
    if (template?.colorPalettes[0]) temperature = template.colorPalettes[0].temperature;

    // Infer complexity
    let complexity: 'minimal' | 'balanced' | 'detailed' = 'balanced';
    if (styleId === 'engraving' || styleId === 'realistic') complexity = 'detailed';
    if (styleId === 'illustration' || styleId === 'poster_art') complexity = 'minimal';

    return {
        dominantColors: template?.colorPalettes[0]?.colors || ['#ffffff'],
        colorTemperature: temperature,
        styleType: styleId,
        composition: template ? 'organic' : 'symmetric',
        complexity: complexity,
        theme: template?.category || 'General'
    };
};

// --- Profile Management ---

export const getInitialUserProfile = (): MLUserProfile => ({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    preferredThemes: [],
    avoidedThemes: [],
    colorPreferences: { liked: [], disliked: [], preferredTemperature: null },
    stylePreferences: { liked: [], disliked: [] },
    compositionPreferences: { preferred: null, complexityLevel: null },
    totalFeedback: 0,
    likeRate: 0,
    topThemes: []
});

export const updateUserProfile = async (
    currentProfile: MLUserProfile,
    features: VisualFeatures,
    feedback: 'like' | 'dislike'
): Promise<MLUserProfile> => {
    const newProfile = { ...currentProfile, updatedAt: Date.now() };
    const weight = feedback === 'like' ? 1 : -1;

    // 1. Update Themes
    const themeIndex = newProfile.preferredThemes.findIndex(t => t.theme === features.theme);
    if (themeIndex >= 0) {
        newProfile.preferredThemes[themeIndex].score += weight;
    } else if (feedback === 'like') {
        newProfile.preferredThemes.push({ theme: features.theme, score: 1 });
    }

    // Sort themes
    newProfile.preferredThemes.sort((a, b) => b.score - a.score);
    newProfile.topThemes = newProfile.preferredThemes.slice(0, 3).map(t => t.theme);

    // 2. Update Styles
    const styleList = feedback === 'like' ? newProfile.stylePreferences.liked : newProfile.stylePreferences.disliked;
    const styleEntry = styleList.find(s => s.style === features.styleType);
    if (styleEntry) {
        styleEntry.count++;
    } else {
        styleList.push({ style: features.styleType, count: 1 });
    }

    // 3. Stats
    newProfile.totalFeedback++;
    // Recalculate like rate (simplified)
    const totalLikes = newProfile.stylePreferences.liked.reduce((acc, curr) => acc + curr.count, 0);
    newProfile.likeRate = totalLikes / newProfile.totalFeedback;

    return newProfile;
};

// --- Recommendations & Prediction ---

export const getRecommendations = (profile: MLUserProfile): ThematicTemplate[] => {
    if (profile.topThemes.length === 0) return THEMATIC_TEMPLATES.slice(0, 3); // Default

    // Filter templates matching top themes
    const recommended = THEMATIC_TEMPLATES.filter(t =>
        profile.topThemes.includes(t.category) ||
        profile.preferredThemes.some(pt => pt.theme === t.category && pt.score > 0)
    );

    return recommended.length > 0 ? recommended : THEMATIC_TEMPLATES.slice(0, 3);
};

export const predictSatisfaction = (profile: MLUserProfile, templateId: string, styleId: string): number => {
    if (profile.totalFeedback < 5) return 0; // Not enough data

    let score = 50; // Base score

    // Check Theme
    const template = THEMATIC_TEMPLATES.find(t => t.id === templateId);
    if (template) {
        const themePref = profile.preferredThemes.find(t => t.theme === template.category);
        if (themePref) score += themePref.score * 5;
    }

    // Check Style
    const likedStyle = profile.stylePreferences.liked.find(s => s.style === styleId);
    if (likedStyle) score += likedStyle.count * 5;

    const dislikedStyle = profile.stylePreferences.disliked.find(s => s.style === styleId);
    if (dislikedStyle) score -= dislikedStyle.count * 10; // Dislikes weigh more

    return Math.min(Math.max(score, 0), 100);
};

export const enhancePromptWithProfile = (basePrompt: string, profile: MLUserProfile): string => {
    let enhancements = "";

    // Add preferred complexity
    // if (profile.compositionPreferences.complexityLevel === 'detailed') {
    //     enhancements += ", highly detailed, intricate patterns";
    // } else if (profile.compositionPreferences.complexityLevel === 'minimal') {
    //     enhancements += ", clean, simple, minimalist";
    // }

    // Add preferred styles if not present
    const topStyle = profile.stylePreferences.liked.sort((a, b) => b.count - a.count)[0];
    if (topStyle && !basePrompt.includes(topStyle.style)) {
        // We could subtly influence the style, but maybe better to respect user choice
        // enhancements += `, influenced by ${topStyle.style}`; 
    }

    return `${basePrompt} ${enhancements}`.trim();
};
