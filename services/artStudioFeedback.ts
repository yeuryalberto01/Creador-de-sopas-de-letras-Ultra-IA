export interface ArtStudioLogEntry {
    id: string;
    timestamp: number;
    userPrompt: string;
    styleProfileId: string;
    positivePrompt: string;
    negativePrompt: string;
    cfgScale?: number;
    steps?: number;
    rating?: 1 | -1;   // 1 = like, -1 = dislike
    feedbackCategory?: string;
    feedbackText?: string;
}

const STORAGE_KEY = 'art_studio_logs';

export const logGeneration = (entry: Omit<ArtStudioLogEntry, 'id' | 'timestamp'>): void => {
    const logs = getLogs();
    const newEntry: ArtStudioLogEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Date.now()
    };
    logs.unshift(newEntry);
    // Keep only last 50 logs
    if (logs.length > 50) logs.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
};

export const updateRating = (id: string, rating: 1 | -1, category?: string, text?: string): void => {
    const logs = getLogs();
    const index = logs.findIndex(l => l.id === id);
    if (index !== -1) {
        logs[index].rating = rating;
        if (category) logs[index].feedbackCategory = category;
        if (text) logs[index].feedbackText = text;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    }
};

export const getLogs = (): ArtStudioLogEntry[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Error parsing logs", e);
        return [];
    }
};
