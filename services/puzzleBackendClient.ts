
import { Difficulty, GeneratedPuzzle, PuzzleTheme, GridCell, PlacedWord } from '../types';
import { generateThemeFromTopic } from '../utils/puzzleGenerator';

const API_BASE_URL = 'http://localhost:8000'; // Default, can be env var

export interface BackendGridResponse {
    grid: GridCell[][];
    placedWords: PlacedWord[];
    unplacedWords: string[];
    seed: string;
    timestamp: number;
    width: number;
    height: number;
}

export const createPuzzleRemote = async (
    words: string[],
    width: number,
    height: number,
    difficulty: Difficulty,
    seed?: string,
    hiddenMessage?: string
): Promise<GeneratedPuzzle> => {

    try {
        const response = await fetch(`${API_BASE_URL}/api/puzzle/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                words,
                width,
                height,
                difficulty: difficulty === Difficulty.EASY ? 'EASY' : difficulty === Difficulty.HARD ? 'HARD' : 'MEDIUM',
                seed,
                hidden_message: hiddenMessage
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Backend Error: ${response.status} - ${errText}`);
        }

        const data: BackendGridResponse = await response.json();

        // Map Backend response to Frontend GeneratedPuzzle interface
        // Note: Backend doesn't generate theme (pure logic), so we generate it here or use default
        // We can infer theme from input or just use default.
        const theme: PuzzleTheme = generateThemeFromTopic('');

        return {
            grid: data.grid,
            placedWords: data.placedWords,
            unplacedWords: data.unplacedWords,
            seed: data.seed,
            timestamp: data.timestamp,
            theme: theme,
            // Helper for legacy support if needed
            words: data.placedWords
        };
    } catch (error) {
        console.error("❌ Failed to create puzzle via Backend:", error);
        throw error;
    }
};

// --- Collections API ---

export interface Collection {
    id: string;
    title: string;
    description?: string;
    cover_color?: string;
    created_at?: string;
    updated_at?: string;
    item_count?: number;
}

export interface CollectionItem {
    id: string;
    collection_id: string;
    puzzle_data: GeneratedPuzzle;
    order_index: number;
    created_at: string;
}

export const getCollections = async (): Promise<Collection[]> => {
    const res = await fetch(`${API_BASE_URL}/api/collections/`);
    if (!res.ok) throw new Error('Failed to fetch collections');
    return await res.json();
};

export const createCollection = async (title: string, description?: string, cover_color: string = '#6366f1'): Promise<Collection> => {
    const res = await fetch(`${API_BASE_URL}/api/collections/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, cover_color })
    });
    if (!res.ok) throw new Error('Failed to create collection');
    return await res.json();
};

export const deleteCollection = async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/collections/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete collection');
};

export const getCollectionItems = async (collectionId: string): Promise<CollectionItem[]> => {
    const res = await fetch(`${API_BASE_URL}/api/collections/${collectionId}/items`);
    if (!res.ok) throw new Error('Failed to fetch items');
    return await res.json();
};

export const addPuzzleToCollection = async (collectionId: string, puzzle: GeneratedPuzzle): Promise<CollectionItem> => {
    const res = await fetch(`${API_BASE_URL}/api/collections/${collectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzle_data: puzzle })
    });
    if (!res.ok) throw new Error('Failed to add puzzle to collection');
    return await res.json();
};
