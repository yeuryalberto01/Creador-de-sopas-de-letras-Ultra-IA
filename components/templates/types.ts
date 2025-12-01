import { GeneratedPuzzle, PuzzleConfig } from '../../types';

export interface PuzzleTemplateProps {
    puzzle: GeneratedPuzzle;
    config: PuzzleConfig;
    // Helper to get font family based on config
    fontFamily: string;
    // Editor Props
    isEditMode?: boolean;
    selectedElement?: string | null;
    onSelectElement?: (id: string) => void;
    isPrintPreview?: boolean;
    onDrag?: (id: string, x: number, y: number) => void;
}

export interface PuzzleTemplateMeta {
    id: string;
    name: string;
    description: string;
    thumbnail?: string; // Optional path to thumbnail
    isPremium?: boolean;
}
