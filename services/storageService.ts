import { SavedPuzzleRecord, AppSettings, GeneratedPuzzle, PuzzleConfig, ArtTemplate, BookStack } from "../types";
import { db, migrateFromLocalStorage } from "../db";

// Initialize DB and migration
migrateFromLocalStorage();

export const DEFAULT_SETTINGS: AppSettings = {
    logicAI: {
        provider: 'gemini',
        apiKey: import.meta.env.VITE_API_KEY || process.env.API_KEY || '',
        modelName: 'gemini-2.5-flash',
        baseUrl: 'http://localhost:8000'
    },
    designAI: {
        provider: 'gemini',
        apiKey: import.meta.env.VITE_API_KEY || process.env.API_KEY || '',
        modelName: 'gemini-2.5-flash',
        baseUrl: 'http://localhost:8000'
    }
};

// --- Settings Management ---

export const loadSettings = async (): Promise<AppSettings> => {
    try {
        const saved = await db.settings.get('global_settings');
        if (saved) {
            // Deep merge to ensure new defaults (like baseUrl) are applied to existing saved settings
            return {
                ...DEFAULT_SETTINGS,
                ...saved,
                logicAI: { ...DEFAULT_SETTINGS.logicAI, ...(saved.logicAI || {}) },
                designAI: { ...DEFAULT_SETTINGS.designAI, ...(saved.designAI || {}) }
            };
        }
        return DEFAULT_SETTINGS;
    } catch (e) {
        console.error("Failed to load settings", e);
        return DEFAULT_SETTINGS;
    }
};

export const saveSettings = async (settings: AppSettings) => {
    try {
        await db.settings.put({ ...settings, id: 'global_settings' });
    } catch (e) {
        console.error("Failed to save settings", e);
    }
};

// --- Puzzle Database Management (Single Puzzles) ---

export const savePuzzleToLibrary = async (name: string, config: PuzzleConfig, puzzleData: GeneratedPuzzle): Promise<SavedPuzzleRecord> => {
    const newRecord: SavedPuzzleRecord = {
        id: crypto.randomUUID(),
        name: name || "Sin título",
        createdAt: Date.now(),
        config,
        puzzleData
    };
    await db.puzzles.add(newRecord);
    return newRecord;
};

export const deletePuzzleFromLibrary = async (id: string) => {
    await db.puzzles.delete(id);
};

export const getLibrary = async (): Promise<SavedPuzzleRecord[]> => {
    return await db.puzzles.orderBy('createdAt').reverse().toArray();
};

// --- NEW: Reset Function ---
export const resetLibrary = async () => {
    await db.puzzles.clear();
    await db.stacks.clear();
    // Optional: clear art? await db.art.clear();
};

// --- Book Stacks Management ---

export const createBookStack = async (name: string, targetCount: number): Promise<BookStack> => {
    const newStack: BookStack = {
        id: crypto.randomUUID(),
        name,
        targetCount,
        createdAt: Date.now(),
        puzzles: []
    };
    await db.stacks.add(newStack);
    return newStack;
};

export const addPuzzleToStack = async (stackId: string, puzzleRecord: SavedPuzzleRecord) => {
    const stack = await db.stacks.get(stackId);
    if (stack) {
        const pageNum = stack.puzzles.length + 1;
        const recordWithPage = {
            ...puzzleRecord,
            id: crypto.randomUUID(),
            config: {
                ...puzzleRecord.config,
                pageNumber: pageNum.toString()
            }
        };
        stack.puzzles.push(recordWithPage);
        await db.stacks.put(stack);
    }
};

export const deleteBookStack = async (id: string) => {
    await db.stacks.delete(id);
};

export const getBookStacks = async (): Promise<BookStack[]> => {
    return await db.stacks.orderBy('name').toArray();
};

export const removePuzzleFromStack = async (stackId: string, puzzleId: string) => {
    const stack = await db.stacks.get(stackId);
    if (stack) {
        stack.puzzles = stack.puzzles.filter(p => p.id !== puzzleId);
        await db.stacks.put(stack);
    }
};

// --- Art Template Management ---

export const saveArtTemplate = async (template: ArtTemplate) => {
    await db.art.add(template);
};

export const deleteArtTemplate = async (id: string) => {
    await db.art.delete(id);
};

export const getArtLibrary = async (): Promise<ArtTemplate[]> => {
    return await db.art.toArray();
};

// --- Custom Style Templates Management ---

import { CustomTemplate } from '../types';

export const saveCustomTemplate = async (template: CustomTemplate): Promise<CustomTemplate> => {
    await db.customTemplates.put(template);
    return template;
};

export const getCustomTemplates = async (): Promise<CustomTemplate[]> => {
    return await db.customTemplates.orderBy('createdAt').reverse().toArray();
};

export const deleteCustomTemplate = async (id: string) => {
    await db.customTemplates.delete(id);
};

export const updateCustomTemplate = async (id: string, updates: Partial<CustomTemplate>) => {
    await db.customTemplates.update(id, updates);
};


// --- User Preferences (Feedback Loop) ---

export const saveUserPreference = async (type: 'like' | 'dislike', prompt: string, styleDesc?: string, artTemplateId?: string) => {
    await db.preferences.add({
        id: crypto.randomUUID(),
        type,
        prompt,
        styleDesc,
        artTemplateId,
        timestamp: Date.now()
    });
};

export const getUserPreferences = async () => {
    return await db.preferences.toArray();
};

export const exportLearningData = async (): Promise<string> => {
    const preferences = await db.preferences.toArray();
    const settings = await loadSettings();
    const tasteProfile = settings.tasteProfile || "No profile generated yet.";

    const exportData = {
        version: 1,
        timestamp: Date.now(),
        tasteProfile,
        preferences
    };

    return JSON.stringify(exportData, null, 2);
};

export const saveTasteProfile = async (profile: string) => {
    const settings = await loadSettings();
    settings.tasteProfile = profile;
    await saveSettings(settings);
};

export const getTasteProfile = async (): Promise<string | undefined> => {
    const settings = await loadSettings();
    return settings.tasteProfile;
};

// --- ML Profile Storage ---

import { MLUserProfile } from '../types';

const createInitialUserProfile = (): MLUserProfile => ({
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

export const saveMLProfile = async (profile: MLUserProfile) => {
    // @ts-ignore
    await db.settings.put({ ...profile, id: 'ml_user_profile' });
};

export const getMLProfile = async (): Promise<MLUserProfile> => {
    try {
        const profile = await db.settings.get('ml_user_profile');
        return profile ? (profile as unknown as MLUserProfile) : createInitialUserProfile();
    } catch (e) {
        console.error("Error loading ML profile", e);
        return createInitialUserProfile();
    }
};
