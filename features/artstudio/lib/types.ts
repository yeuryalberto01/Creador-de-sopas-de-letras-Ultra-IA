

export interface PuzzleInfo {
  title: string;
  headerLeft?: string;
  headerRight?: string;
  levelText: string;
  words: string[];
  grid: string[][];
}

export interface TemplateZone {
  id: string;
  type: 'locked' | 'editable';
  role?: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TemplateLayout {
  id?: string;
  pageWidth: number;
  pageHeight: number;
  zones: TemplateZone[];
}

export type VisualStyle =
  | 'editorial_pro'
  | 'nature_illustration'
  | 'cultural_vibrant'
  | 'tech_modern';

export type StyleIntensity = 'minimal' | 'medium' | 'full';
export type ImageQuality = 'draft_fast' | 'print_300dpi';

export interface LayoutConfig {
  // META-CONTROL
  lockedSections?: string[]; // ['header', 'grid', 'box', 'footer', 'global']

  // GLOBAL
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken';
  textColor: string;

  // CONTROL DE CONTRASTE Y TIPOGRAFÍA
  textShadow?: string;
  textStrokeWidth?: string;
  textStrokeColor?: string;
  fontWeight?: string;

  // HEADER / TÍTULO 
  headerStyle: 'standard' | 'minimal' | 'hidden';
  headerBackdrop?: 'none' | 'glass' | 'solid' | 'banner' | 'clean_gradient' | 'brush_stroke' | 'floating_card';
  headerTextColor?: string;
  fontFamilyHeader: string;
  headerOffsetY?: number;
  headerScale?: number;
  customTitleText?: string; // Nuevo: Override de texto

  // GRILLA
  fontFamilyGrid: string;
  gridTextColor?: string;
  gridBorderColor: string;
  gridBackground: string;
  gridBorderWidth?: string;
  gridRadius?: string;
  gridShadow?: string;
  gridBlur?: string;
  gridOffsetY?: number;
  paddingTop: string;

  // CAJA DE PALABRAS 
  wordListStyle: 'classic' | 'chips' | 'code';
  wordBoxVariant?: 'none' | 'border' | 'solid' | 'parchment' | 'tech' | 'glass_dark' | 'glass_light' | 'brush' | 'notebook';
  wordBoxTextColor?: string;
  wordBoxBackground?: string;
  wordBoxBorderColor?: string;
  wordBoxShadow?: string;
  fontScale?: number;
  wordBoxOffsetY?: number;

  // PIE DE PÁGINA (SMART FOOTER)
  footerStyle?: 'simple' | 'tech' | 'barcode' | 'elegant';
  footerOffsetY?: number;
  footerTextColor?: string;
  customFooterText?: string;
}

export interface DesignPlan {
  recommendedStyle: VisualStyle;
  concept: string;
  background: string;
  characters: string;
  gridTreatment: string;
  wordListTreatment: string;
  palette: string;
  decorations: string;
  artStyle: string;
  suggestedPrompt: string;
  layoutConfig: LayoutConfig;
}

export interface ArtOptions {
  visualStyle: VisualStyle;
  styleIntensity: StyleIntensity;
  quality: ImageQuality;
  userPrompt?: string;
  feedback?: string;
}

// --- ESTRUCTURAS DE ENTRENAMIENTO (DATASET & LOGS) ---

// Reporte que genera la IA al VER la imagen
export interface VisionAnalysis {
  contrastScore: number; // 0-100
  gridObstruction: boolean;
  textLegibility: 'high' | 'medium' | 'low';
  detectedElements: string[];
  critique: string;
}

// Una fila de entrenamiento compacta (JSONL friendly)
export interface TrainingLogEntry {
  id: string;
  timestamp: string;
  user_intent: string;
  ai_prompt: string;
  ai_vision_analysis: VisionAnalysis | null;
  human_rating: 1 | 0; // 1 = Like, 0 = Dislike
  human_critique: string;
  tags: string[];
  style_used: string;
}

export interface KnowledgeBase {
  positiveSamples: string[]; // Solo IDs para referencia
  negativeSamples: string[];
  styleWeights: Record<string, number>; // "Tech": 0.8 (Si baja de 0.5 deja de sugerirlo)
  logs: TrainingLogEntry[]; // El Dataset real
}

export interface GenerationVersion {
  id: string;
  timestamp: number;
  promptUsed: string;
  imageUrl: string;
  optionsSnapshot: ArtOptions;

  designPlan?: DesignPlan;
  visionAnalysis?: VisionAnalysis; // Lo que la IA "vió"

  rating?: 'like' | 'dislike';
  critiqueTags?: string[];
  critiqueText?: string;
}

export interface GenerateDesignParams {
  prompt: string;
  imageSize?: ImageQuality;
}

export interface ArtStudioState {
  isGenerating: boolean;
  isPlanning: boolean;
  isAnalyzingVision: boolean; // Nuevo estado para visión
  currentVersion: GenerationVersion | null;
  history: GenerationVersion[];
  error: string | null;
  knowledgeBase: KnowledgeBase;
}