export enum Difficulty {
  EASY = 'Fácil',
  MEDIUM = 'Intermedio',
  HARD = 'Difícil'
}

export type ShapeType = 'SQUARE' | 'CIRCLE' | 'HEART' | 'DIAMOND' | 'STAR';
export type FontType = 'CLASSIC' | 'MODERN' | 'FUN' | 'SCHOOL';
export type FooterStyle = 'SIMPLE' | 'COMMERCIAL' | 'MODERN' | 'MINIMAL_QR' | 'TECH' | 'BARCODE' | 'ELEGANT';

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

// Custom Template for saving style configurations
export interface CustomTemplate {
  id: string;
  name: string;
  createdAt: number;

  // Style Configuration
  designTheme: 'minimal' | 'classic' | 'kids' | 'modern';
  showBorders: boolean;
  themeData: PuzzleTheme;

  // Layout Configuration
  margins: PuzzleMargins;
  fontType: FontType;

  // Optional preview thumbnail (base64)
  thumbnail?: string;
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

  // Header & Footer Metadata
  editorial?: string;
  volume?: string;
  footerStyle?: FooterStyle;
  showQrCode?: boolean;

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

  // Art Studio / Detailed Style Overrides - Independent Typography per Element
  fontFamilyHeader?: FontType;   // Typography for header/title
  fontFamilyGrid?: FontType;     // Typography for grid letters
  fontFamilyWordList?: FontType; // Typography for word list
  // Bold toggles per element
  boldHeader?: boolean;
  boldGrid?: boolean;
  boldWordList?: boolean;
  headerStyle?: string;
  wordListStyle?: string;
  gridBorderColor?: string;
  gridBackground?: string;
  gridBorderWidth?: string;
  gridRadius?: string;
  textShadow?: string;
  wordBoxVariant?: string;
  headerBackdrop?: string;
  textStrokeWidth?: string;
  blendMode?: string;
  marketingText?: string;
  designAssets?: DesignAssetInstance[];
}

export interface DesignAssetInstance {
  id: string;
  assetId: string;
  x: number;
  y: number;
  width: string;
  height: string;
  rotation?: number;
  svgContent?: string;
  isAdaptable?: boolean;
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
  tasteProfile?: string; // Consolidated user preferences (AI generated)

  // Smart Persistence
  footerPreferences?: {
    editorial?: string;
    footerStyle?: FooterStyle;
  };
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

export interface UserPreference {
  id: string;
  type: 'like' | 'dislike';
  prompt: string;
  styleDesc?: string;
  artTemplateId?: string; // Link to specific gallery item
  timestamp: number;
}

// --- Art Studio 2.0 Types ---

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  temperature: 'warm' | 'cool' | 'neutral';
}

export interface ThematicTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrompt: string;
  elements: string[];
  suggestedStyles: string[];
  colorPalettes: ColorPalette[];
  previewImage?: string; // URL or base64
}

export interface VisualFeatures {
  dominantColors: string[];
  colorTemperature: 'warm' | 'cool' | 'neutral';
  styleType: string;
  composition: 'symmetric' | 'organic' | 'geometric';
  complexity: 'minimal' | 'balanced' | 'detailed';
  theme: string;
}

export interface MLUserProfile {
  id: string;
  createdAt: number;
  updatedAt: number;

  // Learned Preferences
  preferredThemes: { theme: string; score: number }[];
  avoidedThemes: { theme: string; score: number }[];

  colorPreferences: {
    liked: { color: string; count: number }[];
    disliked: { color: string; count: number }[];
    preferredTemperature: 'warm' | 'cool' | 'neutral' | null;
  };

  stylePreferences: {
    liked: { style: string; count: number }[];
    disliked: { style: string; count: number }[];
  };

  compositionPreferences: {
    preferred: 'symmetric' | 'organic' | 'geometric' | null;
    complexityLevel: 'minimal' | 'balanced' | 'detailed' | null;
  };

  // Stats
  totalFeedback: number;
  likeRate: number;
  topThemes: string[];
  feedbackHistory?: {
    timestamp: number;
    prompt: string;
    styleId: string;
    rating: 1 | -1;
    reason?: string;
    details?: string;
  }[];
}

export type AgeGroup = "kids" | "teens" | "adults";

export interface StyleProfile {
  id: string;
  etiquetas: string[];         // palabras clave para mapear prompts pobres
  ageGroup: AgeGroup;
  basePrompt: string;          // prompt profesional base
  negativePrompt: string;      // restricciones
  colorHints?: string;         // pistas de paleta de color
}

export type PuzzleLayout = "classic" | "kids-compact" | "magazine";

export interface PuzzleSkin {
  id: string;
  name: string;
  layout: PuzzleLayout;
  styleProfileId: string;      // referencia a un StyleProfile
  description: string;
  previewEmoji?: string;       // opcional para UI
}