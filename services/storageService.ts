
import { SavedPuzzleRecord, AppSettings, GeneratedPuzzle, PuzzleConfig, ArtTemplate, BookStack } from "../types";

const STORAGE_KEY_DB = "sopa_creator_db";
const STORAGE_KEY_STACKS = "sopa_creator_stacks";
const STORAGE_KEY_SETTINGS = "sopa_creator_settings";
const STORAGE_KEY_ART = "sopa_creator_art_library";

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

// --- Puzzle Database Management (Single Puzzles) ---

export const savePuzzleToLibrary = (name: string, config: PuzzleConfig, puzzleData: GeneratedPuzzle): SavedPuzzleRecord => {
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
    return newRecord;
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

// --- Book Stacks Management ---

export const getBookStacks = (): BookStack[] => {
    const saved = localStorage.getItem(STORAGE_KEY_STACKS);
    return saved ? JSON.parse(saved) : [];
};

export const createBookStack = (name: string, targetCount: number): BookStack => {
    const stacks = getBookStacks();
    const newStack: BookStack = {
        id: crypto.randomUUID(),
        name,
        targetCount,
        createdAt: Date.now(),
        puzzles: []
    };
    stacks.unshift(newStack);
    localStorage.setItem(STORAGE_KEY_STACKS, JSON.stringify(stacks));
    return newStack;
};

export const addPuzzleToStack = (stackId: string, puzzleRecord: SavedPuzzleRecord) => {
    const stacks = getBookStacks();
    const stackIndex = stacks.findIndex(s => s.id === stackId);
    if (stackIndex !== -1) {
        // Automatically assign page number based on position
        const pageNum = stacks[stackIndex].puzzles.length + 1;
        const recordWithPage = {
            ...puzzleRecord,
            config: {
                ...puzzleRecord.config,
                pageNumber: pageNum.toString()
            }
        };
        
        stacks[stackIndex].puzzles.push(recordWithPage);
        localStorage.setItem(STORAGE_KEY_STACKS, JSON.stringify(stacks));
    }
};

export const deleteBookStack = (id: string) => {
    const stacks = getBookStacks();
    const filtered = stacks.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY_STACKS, JSON.stringify(filtered));
};

export const removePuzzleFromStack = (stackId: string, puzzleId: string) => {
    const stacks = getBookStacks();
    const stackIndex = stacks.findIndex(s => s.id === stackId);
    if (stackIndex !== -1) {
        stacks[stackIndex].puzzles = stacks[stackIndex].puzzles.filter(p => p.id !== puzzleId);
        localStorage.setItem(STORAGE_KEY_STACKS, JSON.stringify(stacks));
    }
};

// --- Art Template Management ---

export const saveArtTemplate = (template: ArtTemplate) => {
    const library = getArtLibrary();
    library.unshift(template);
    localStorage.setItem(STORAGE_KEY_ART, JSON.stringify(library));
};

export const getArtLibrary = (): ArtTemplate[] => {
    const saved = localStorage.getItem(STORAGE_KEY_ART);
    return saved ? JSON.parse(saved) : [];
};

export const deleteArtTemplate = (id: string) => {
    const library = getArtLibrary();
    const filtered = library.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY_ART, JSON.stringify(filtered));
};
