
export enum Difficulty {
  EASY = 'Fácil',
  MEDIUM = 'Intermedio',
  HARD = 'Difícil'
}

export type ShapeType = 'SQUARE' | 'CIRCLE' | 'HEART' | 'DIAMOND' | 'STAR';
export type FontType = 'CLASSIC' | 'MODERN' | 'FUN' | 'SCHOOL';

export interface GridCell {
  letter: string;
  isWord: boolean; // True if this cell is part of a placed word
  wordId?: string; // ID of the word this cell belongs to (for solution highlighting)
  isValid: boolean; // True if inside the shape mask
  x: number;
  y: number;
}

export interface PlacedWord {
  id: string;
  word: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface PuzzleTheme {
  primaryColor: string; // Hex code for headers/borders
  secondaryColor: string; // Lighter shade for backgrounds
  textColor: string;
  backgroundColor: string; // Page background
}

export interface ArtTemplate {
  id: string;
  name: string;
  prompt: string;
  imageBase64: string;
  style: string;
  createdAt: number;
}

export interface PuzzleMargins {
  top: number;    // Inches
  bottom: number; // Inches
  left: number;   // Inches
  right: number;  // Inches
}

export interface ImageFilters {
  brightness: number; // 0-200, default 100
  contrast: number;   // 0-200, default 100
  grayscale: number;  // 0-100, default 0
  blur: number;       // 0-20px, default 0
  sepia: number;      // 0-100, default 0
}

export interface ElementCoordinates {
  x: number;
  y: number;
}

export interface PuzzleConfig {
  title: string;
  headerLeft: string;
  headerRight: string;
  footerText?: string;
  pageNumber?: string;
  difficulty: Difficulty;
  gridSize: number; // Represents WIDTH (Columns)
  gridHeight?: number; // Represents HEIGHT (Rows). Optional for backward compat.
  words: string[];
  showSolution: boolean;
  seed?: string;
  styleMode: 'bw' | 'color';
  themeData?: PuzzleTheme;
  hiddenMessage?: string;

  // Appearance
  designTheme?: 'minimal' | 'classic' | 'kids' | 'modern';
  showBorders?: boolean;
  margins?: PuzzleMargins;
  fontType?: FontType;
  maskShape?: ShapeType;
  gridFontSizeScale?: number;

  // Background & Art
  backgroundImage?: string;
  backgroundStyle?: 'bw' | 'color';
  backgroundFilters?: ImageFilters;
  overlayOpacity?: number;
  textOverlayOpacity?: number;
  templateId?: string;

  // Smart Layout / Free Canvas
  isFreeLayout?: boolean;
  layout?: {
    [key: string]: ElementCoordinates; // Key is element ID (title, grid, wordList, etc.)
  };
}

export type AIProvider = 'gemini' | 'deepseek' | 'grok' | 'openai' | 'openai_compatible';

export interface GeneratedPuzzle {
  grid: GridCell[][];
  placedWords: PlacedWord[]; // Renamed from 'words' to match generator
  words?: PlacedWord[]; // Backward compatibility for old saves
  unplacedWords?: string[];
  theme: PuzzleTheme;
  seed: string;
  timestamp?: number;
}

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string; // For DeepSeek/Groq/LocalLLM
  modelName: string;
}

export interface AppSettings {
  id?: string;
  logicAI: AISettings; // Who generates the words?
  designAI: AISettings; // Who generates the colors/theme?
}

export interface SavedPuzzleRecord {
  id: string;
  name: string;
  createdAt: number;
  config: PuzzleConfig;
  puzzleData: GeneratedPuzzle;
}

// --- Book / Collection Logic ---
export interface BookStack {
  id: string;
  name: string;
  targetCount: number; // Target number of pages (e.g. 40)
  createdAt: number;
  puzzles: SavedPuzzleRecord[];
}