import { GeneratedPuzzle, PuzzleConfig } from '../../types';

export interface PuzzleTemplateProps {
    puzzle: GeneratedPuzzle;
    config: PuzzleConfig;
    // Helper to get font family based on config
    fontFamily: string;
}

export interface PuzzleTemplateMeta {
    id: string;
    name: string;
    description: string;
    thumbnail?: string; // Optional path to thumbnail
    isPremium?: boolean;
}
