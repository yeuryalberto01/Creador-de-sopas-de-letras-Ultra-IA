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
  color?: string; // For solution highlighting
}

export interface PuzzleTheme {
  primaryColor: string; // Hex code for headers/borders
  secondaryColor: string; // Lighter shade for backgrounds
  textColor: string;
  backgroundColor: string; // Page background
}

export interface PuzzleConfig {
  title: string;
  headerLeft: string;
  headerRight: string;
  footerText?: string;
  pageNumber?: string;
  difficulty: Difficulty;
  gridSize: number;
  words: string[];
  showSolution: boolean;
  seed?: string; 
  styleMode: 'bw' | 'color'; 
  themeData?: PuzzleTheme;
  // New Features
  maskShape: ShapeType;
  hiddenMessage?: string;
  fontType: FontType;
}

export interface GeneratedPuzzle {
  grid: GridCell[][];
  placedWords: PlacedWord[];
  unplacedWords: string[];
  seed: string;
  timestamp: number; // Created date
}

// --- New Types for AI & Storage ---

export type AIProvider = 'gemini' | 'openai_compatible'; // DeepSeek, Groq, etc use OpenAI format

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string; // For DeepSeek/Groq/LocalLLM
  modelName: string;
}

export interface AppSettings {
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