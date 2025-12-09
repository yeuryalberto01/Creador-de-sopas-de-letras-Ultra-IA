
import { ArtOptions, PuzzleInfo } from './types';

export const buildImagePrompt = (puzzle: PuzzleInfo, options: ArtOptions): string => {
  
  // INSTRUCCIONES DE ZONA SEGURA (MANDATO)
  const SAFE_ZONE_INSTRUCTIONS = `
    CRITICAL LAYOUT RULES (NON-NEGOTIABLE):
    1. CENTER AREA (The Puzzle Grid): MUST BE CLEAN. Use a very soft texture, plain paper, or solid light color. NO complex illustrations in the center.
    2. MARGINS: Place all heavy decorations (characters, trees, frames) in the OUTER MARGINS (Top, Bottom, Left, Right).
    3. CONTRAST: The background for the text area must ensure black text is 100% readable.
    4. NO TEXT: Do not generate any text, letters, or numbers.
  `;

  // MODO REPARACIÓN (CRISIS)
  if (options.feedback && options.feedback.length > 2) {
      return `
      🚨 CORRECTION MODE - PRIORITY OVERRIDE
      
      PREVIOUS ERROR: User rejected the image because: "${options.feedback}".
      
      CORRECTIVE TASK:
      - Create a new 8.5x11 page design.
      - SPECIFICALLY FIX: ${options.feedback}.
      - Keep the style: ${options.visualStyle}.
      
      ${SAFE_ZONE_INSTRUCTIONS}
      `.trim();
  }

  // MODO STANDARD (Generación basada en Mandato)
  return `
    ROLE: Professional Layout Artist for Puzzle Books.
    TASK: Design a background for a Word Search Puzzle Page.
    FORMAT: Vertical US Letter (8.5 x 11 inches).
    
    THEME/STYLE: ${options.visualStyle.replace('_', ' ').toUpperCase()} style.
    CONTEXT: Title is "${puzzle.title}".
    
    ${SAFE_ZONE_INSTRUCTIONS}
    
    VISUAL DESCRIPTION:
    - Create a coherent atmosphere fitting the title.
    - If 'Editorial': Clean, minimalist, high-end textbook style.
    - If 'Nature': Organic borders, vines/leaves on edges, parchment texture in center.
    - If 'Tech': Digital borders, HUD elements on edges, dark clean center.
    
    OUTPUT: High Resolution, Print-Ready Image.
  `.trim();
};
