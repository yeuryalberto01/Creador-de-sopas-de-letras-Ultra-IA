import Dexie, { Table } from 'dexie';
import { SavedPuzzleRecord, BookStack, AppSettings, ArtTemplate, UserPreference } from './types';

export class SopaDatabase extends Dexie {
    puzzles!: Table<SavedPuzzleRecord, string>;
    stacks!: Table<BookStack, string>;
    settings!: Table<AppSettings, string>;
    art!: Table<ArtTemplate, string>;
    preferences!: Table<UserPreference, string>;

    constructor() {
        super('SopaCreatorDB');

        this.version(1).stores({
            puzzles: '++id, name, createdAt',
            stacks: '++id, name',
            settings: 'id', // We'll use a fixed ID 'global_settings'
            art: '++id'
        });

        // Version 2: Add preferences
        this.version(2).stores({
            preferences: '++id, type, timestamp'
        });
    }
}

export const db = new SopaDatabase();

// --- Migration Logic ---
export const migrateFromLocalStorage = async () => {
    try {
        const hasMigrated = localStorage.getItem('sopa_db_migrated');
        if (hasMigrated) return;

        console.log("Starting migration from localStorage to IndexedDB...");

        // 1. Migrate Puzzles
        const savedPuzzles = localStorage.getItem("sopa_creator_db");
        if (savedPuzzles) {
            const puzzles: SavedPuzzleRecord[] = JSON.parse(savedPuzzles);
            if (Array.isArray(puzzles) && puzzles.length > 0) {
                // Ensure IDs are strings and unique if missing
                const cleanPuzzles = puzzles.map(p => ({
                    ...p,
                    id: p.id || crypto.randomUUID()
                }));
                await db.puzzles.bulkPut(cleanPuzzles);
                console.log(`Migrated ${cleanPuzzles.length} puzzles.`);
            }
        }

        // 2. Migrate Stacks
        const savedStacks = localStorage.getItem("sopa_creator_stacks");
        if (savedStacks) {
            const stacks: BookStack[] = JSON.parse(savedStacks);
            if (Array.isArray(stacks) && stacks.length > 0) {
                const cleanStacks = stacks.map(s => ({
                    ...s,
                    id: s.id || crypto.randomUUID()
                }));
                await db.stacks.bulkPut(cleanStacks);
                console.log(`Migrated ${cleanStacks.length} stacks.`);
            }
        }

        // 3. Migrate Settings
        const savedSettings = localStorage.getItem("sopa_creator_settings");
        if (savedSettings) {
            const settings: AppSettings = JSON.parse(savedSettings);
            // Ensure we store it with a known key
            await db.settings.put({ ...settings }, 'global_settings');
            console.log("Migrated settings.");
        }

        // 4. Migrate Art
        const savedArt = localStorage.getItem("sopa_creator_art_library");
        if (savedArt) {
            const art: ArtTemplate[] = JSON.parse(savedArt);
            if (Array.isArray(art) && art.length > 0) {
                await db.art.bulkPut(art);
                console.log(`Migrated ${art.length} art templates.`);
            }
        }

        localStorage.setItem('sopa_db_migrated', 'true');
        console.log("Migration complete.");

    } catch (e) {
        console.error("Migration failed:", e);
    }
};
