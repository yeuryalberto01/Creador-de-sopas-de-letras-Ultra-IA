import { SavedPuzzleRecord, AppSettings, GeneratedPuzzle, PuzzleConfig } from "../types";

const STORAGE_KEY_DB = "sopa_creator_db";
const STORAGE_KEY_SETTINGS = "sopa_creator_settings";

// --- Settings Management ---
const DEFAULT_SETTINGS: AppSettings = {
    logicAI: {
        provider: 'gemini',
        apiKey: process.env.API_KEY || '', // Fallback for demo, though env usually not avail in browser built
        modelName: 'gemini-2.5-flash'
    },
    designAI: {
        provider: 'gemini',
        apiKey: process.env.API_KEY || '',
        modelName: 'gemini-2.5-flash'
    }
};

export const loadSettings = (): AppSettings => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
    return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings) => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
};

// --- Puzzle Database Management ---

export const savePuzzleToLibrary = (name: string, config: PuzzleConfig, puzzleData: GeneratedPuzzle) => {
    const records = getLibrary();
    const newRecord: SavedPuzzleRecord = {
        id: crypto.randomUUID(),
        name: name || "Sin título",
        createdAt: Date.now(),
        config,
        puzzleData
    };
    records.unshift(newRecord); // Add to top
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(records));
};

export const getLibrary = (): SavedPuzzleRecord[] => {
    const saved = localStorage.getItem(STORAGE_KEY_DB);
    return saved ? JSON.parse(saved) : [];
};

export const deletePuzzleFromLibrary = (id: string) => {
    const records = getLibrary();
    const filtered = records.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(filtered));
};
