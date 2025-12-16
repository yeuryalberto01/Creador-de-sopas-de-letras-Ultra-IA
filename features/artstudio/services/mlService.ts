import { VisualFeatures, MLUserProfile } from '../../../types';

// RAG Types
export interface TrainingExample {
    prompt: string;
    image_path: string; // Base64 when sending, or file path when retrieving
    style: string;
    rating: number; // 1 or -1
    timestamp: number;
    meta?: any;
}

export interface RetrievalRequest {
    prompt: string;
    limit?: number;
    min_rating?: number;
}

// Configuration
const API_URL = "http://localhost:8000/api/ml";

/**
 * Saves a generated image as a training example to the external drive.
 */
export const saveTrainingExample = async (
    prompt: string,
    image: string,
    style: string,
    rating: 'like' | 'dislike',
    meta: any = {}
): Promise<boolean> => {
    try {
        const payload: TrainingExample = {
            prompt,
            image_path: image,
            style,
            rating: rating === 'like' ? 1 : -1,
            timestamp: Date.now(),
            meta
        };

        const response = await fetch(`${API_URL}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("Failed to save training data:", await response.text());
            return false;
        }
        return true;
    } catch (e) {
        console.error("Error saving training example:", e);
        return false;
    }
};

/**
 * Retrieves similar successful examples from the external drive.
 */
export const findSimilarExamples = async (prompt: string): Promise<TrainingExample[]> => {
    try {
        const response = await fetch(`${API_URL}/retrieve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, limit: 3, min_rating: 1 })
        });

        if (!response.ok) return [];

        return await response.json();
    } catch (e) {
        console.warn("Could not retrieve similar examples:", e);
        return [];
    }
};

/**
 * Sets the external drive path config.
 */
export const setTrainingPath = async (path: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ training_path: path })
        });
        return response.ok;
    } catch (e) {
        return false;
    }
};


// --- Legacy functions (kept for compatibility during migration) ---
export const analyzeImageFeatures = async (prompt: string, styleId: string, templateId?: string): Promise<VisualFeatures> => {
    return {
        dominantColors: ['#ffffff'],
        colorTemperature: 'neutral',
        styleType: styleId,
        composition: 'organic',
        complexity: 'balanced',
        theme: 'General'
    };
};

export const updateUserProfile = async (currentProfile: MLUserProfile, features: VisualFeatures, feedback: 'like' | 'dislike', details?: any) => {
    // This function can be deprecated or updated to also call saveTrainingExample
    // For now we just return the profile as is to avoid breaking code
    // In a real refactor, we would call saveTrainingExample here.
    if (details) {
        await saveTrainingExample(details.prompt, details.image || "", features.styleType || "unknown", feedback, details);
    }
    return currentProfile;
};
