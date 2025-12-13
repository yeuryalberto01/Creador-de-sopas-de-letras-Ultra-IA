
import { PuzzleConfig } from '../../types';

export type EditorElementId = 'title' | 'grid' | 'wordList' | 'headerLeft' | 'headerRight' | 'pageNumber' | 'footerEditorial' | 'footerVolume' | 'footerQR' | (string & {});

export interface EditorState {
    selectedElement: EditorElementId | null;
    isDragging: boolean;
}

export interface ElementStyle {
    x: number;
    y: number;
    width?: number;
    height?: number;
    fontSize?: number;
    color?: string;
    fontFamily?: string;
}

// Extension to PuzzleConfig to support custom positioning
export interface EnhancedPuzzleConfig extends PuzzleConfig {
    layout?: Record<EditorElementId, ElementStyle>;
}
