
import { Difficulty, GridCell, PlacedWord, GeneratedPuzzle, PuzzleTheme, ShapeType } from '../types';

// Simple Pseudo-Random Number Generator (Mulberry32)
class SeededRNG {
  private seed: number;

  constructor(seedStr: string) {
    let h = 0xdeadbeef;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
    }
    this.seed = (h ^ h >>> 16) >>> 0;
  }

  next(): number {
    this.seed += 0x6D2B79F5;
    let t = this.seed;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  nextInfo(max: number): number {
    return Math.floor(this.next() * max);
  }
}

// Directions map
const DIRECTIONS = {
  E: [1, 0],   // Right
  S: [0, 1],   // Down
  SE: [1, 1],  // Diagonal Down-Right
  NE: [1, -1], // Diagonal Up-Right
  W: [-1, 0],  // Left (Reverse)
  N: [0, -1],  // Up (Reverse)
  NW: [-1, -1],// Diagonal Up-Left (Reverse)
  SW: [-1, 1]  // Diagonal Down-Left (Reverse)
};

const getAllowedDirections = (difficulty: Difficulty) => {
  switch (difficulty) {
    case Difficulty.EASY:
      // STANDARD: Kids/Beginner. only Left-to-Right and Top-to-Bottom.
      // No diagonals, no backwards.
      return [DIRECTIONS.E, DIRECTIONS.S];

    case Difficulty.MEDIUM:
      // STANDARD: Standard puzzles. Forward reading directions + Diagonals.
      // Usually no backwards text to keep it flowy but challenging.
      return [DIRECTIONS.E, DIRECTIONS.S, DIRECTIONS.SE, DIRECTIONS.NE];

    case Difficulty.HARD:
      // STANDARD: Expert. Chaos mode. All 8 directions allowed.
      return Object.values(DIRECTIONS);

    default:
      return [DIRECTIONS.E, DIRECTIONS.S];
  }
};

const LETTERS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";

/**
 * Checks if a coordinate is inside the requested shape mask.
 * Coordinates are normalized -1 to 1 for calculation.
 * Now handles Rectangular bounding boxes.
 */
const isInsideShape = (x: number, y: number, w: number, h: number, shape: ShapeType): boolean => {
  if (shape === 'SQUARE') return true;

  // Normalize to -1 to 1 range based on dimensions
  const nx = (x / (w - 1)) * 2 - 1;
  const ny = (y / (h - 1)) * 2 - 1;

  if (shape === 'CIRCLE') {
    // In a rectangle, this creates an ellipse which is desirable behavior
    return (nx * nx + ny * ny) <= 1.0;
  }

  if (shape === 'DIAMOND') {
    return (Math.abs(nx) + Math.abs(ny)) <= 1.0;
  }

  if (shape === 'HEART') {
    // Heart formula approximation
    // (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
    // We flip Y because grid 0 is top
    const fy = -ny * 1.2 + 0.3; // Adjust for grid aspect
    const fx = nx * 1.2;
    const a = fx * fx + fy * fy - 1;
    return (a * a * a - fx * fx * fy * fy * fy) <= 0;
  }

  if (shape === 'STAR') {
    // Simple 5-point star check using distance logic
    const r = Math.sqrt(nx * nx + ny * ny);
    const theta = Math.atan2(ny, nx);
    return r < (0.4 + 0.3 * Math.cos(5 * theta + Math.PI / 2)); // rotated
  }

  return true;
};

/**
 * Calculates a "Smart" grid size based on the words provided.
 * It ensures the longest word fits and maintains a good density ratio.
 */
export const calculateSmartGridSize = (words: string[], difficulty: Difficulty): number => {
  if (words.length === 0) return 15;

  const longestWord = Math.max(...words.map(w => w.length));
  const totalChars = words.reduce((sum, w) => sum + w.length, 0);

  // Density Multiplier: Higher number = More empty space (Easier)
  // Lower number = Tighter packing (Harder)
  let areaMultiplier = 3.0;

  if (difficulty === Difficulty.EASY) areaMultiplier = 3.5; // Loose, easy to spot
  if (difficulty === Difficulty.MEDIUM) areaMultiplier = 2.8; // Standard
  if (difficulty === Difficulty.HARD) areaMultiplier = 1.8; // Tight, chaotic

  const minArea = totalChars * areaMultiplier;
  const minDimensionByArea = Math.ceil(Math.sqrt(minArea));

  // Padding ensures word doesn't touch both edges often in Easy mode
  const padding = difficulty === Difficulty.EASY ? 2 : 0;
  const minDimensionByLength = longestWord + padding;

  let idealSize = Math.max(minDimensionByLength, minDimensionByArea);

  // Hard constraints based on standards
  if (difficulty === Difficulty.EASY) idealSize = Math.max(10, Math.min(idealSize, 14));
  if (difficulty === Difficulty.MEDIUM) idealSize = Math.max(14, Math.min(idealSize, 18));
  if (difficulty === Difficulty.HARD) idealSize = Math.max(18, Math.min(idealSize, 26));

  return idealSize;
};

export const generateThemeFromTopic = (topic: string): PuzzleTheme => {
  if (!topic) {
    return {
      primaryColor: '#4f46e5',
      secondaryColor: '#e0e7ff',
      textColor: '#000000',
      backgroundColor: '#ffffff'
    };
  }
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    hash = topic.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  const primary = `hsl(${hue}, 70%, 40%)`;
  const secondary = `hsl(${hue}, 70%, 95%)`;
  return {
    primaryColor: primary,
    secondaryColor: secondary,
    textColor: '#0f172a',
    backgroundColor: '#ffffff'
  };
};

export const generatePuzzle = (
  width: number,
  heightInput: number | undefined,
  words: string[],
  difficulty: Difficulty,
  seedInput?: string,
  shape: ShapeType = 'SQUARE',
  hiddenMessage?: string
): GeneratedPuzzle => {

  const height = heightInput || width; // Fallback to square if height not provided

  // 1. Seed Initialization: Ensures reproducibility
  const seed = seedInput || Math.random().toString(36).substring(2, 8).toUpperCase();

  // We will use a local RNG for the attempts. 
  // If we retry, we might want to vary the internal seed slightly or just shuffle differently.

  let bestResult: GeneratedPuzzle | null = null;
  let maxPlaced = -1;

  // ATTEMPT STRATEGY:
  // 1. Standard (Longest First) - Best for packing
  // 2. Shuffle (Random Order) - Breaks specific blockages
  // 3. Standard (Longest First) with different RNG state (if seed not forced, or just vary internal shuffle)

  const attempts = 3;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const rng = new SeededRNG(seed + (attempt > 0 ? `-${attempt}` : '')); // Vary seed slightly for retries if allowed, or just use it to shuffle differently

    // Initialize Grid
    let grid: GridCell[][] = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => ({
        letter: '',
        isWord: false,
        isValid: isInsideShape(x, y, width, height, shape),
        x,
        y
      }))
    );

    const placedWords: PlacedWord[] = [];
    const unplacedWords: string[] = [];
    const directions = getAllowedDirections(difficulty);

    // Sort words
    let sortedWords = [...words];
    if (attempt === 0) {
      // Standard: Longest first
      sortedWords.sort((a, b) => b.length - a.length || a.localeCompare(b));
    } else if (attempt === 1) {
      // Shuffle: Random order
      for (let i = sortedWords.length - 1; i > 0; i--) {
        const j = rng.nextInfo(i + 1);
        [sortedWords[i], sortedWords[j]] = [sortedWords[j], sortedWords[i]];
      }
    } else {
      // Attempt 2: Longest first again but maybe the RNG shuffle of positions will help
      sortedWords.sort((a, b) => b.length - a.length || a.localeCompare(b));
    }

    // --- BACKTRACKING SOLVER ---
    const solve = (index: number): boolean => {
      if (index >= sortedWords.length) return true; // All words placed

      const word = sortedWords[index];

      // Generate all valid positions
      const coords = [];
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
          if (grid[y][x].isValid) coords.push({ x, y });

      // Fisher-Yates shuffle for randomness using current RNG
      for (let i = coords.length - 1; i > 0; i--) {
        const j = rng.nextInfo(i + 1);
        [coords[i], coords[j]] = [coords[j], coords[i]];
      }

      // Shuffle directions
      const shuffledDirs = [...directions];
      for (let i = shuffledDirs.length - 1; i > 0; i--) {
        const j = rng.nextInfo(i + 1);
        [shuffledDirs[i], shuffledDirs[j]] = [shuffledDirs[j], shuffledDirs[i]];
      }

      for (const pos of coords) {
        for (const dir of shuffledDirs) {
          // Check if fits
          let fits = true;
          const endX = pos.x + dir[0] * (word.length - 1);
          const endY = pos.y + dir[1] * (word.length - 1);

          if (endX < 0 || endX >= width || endY < 0 || endY >= height) fits = false;
          else {
            for (let i = 0; i < word.length; i++) {
              const x = pos.x + dir[0] * i;
              const y = pos.y + dir[1] * i;
              const cell = grid[y][x];
              if (!cell.isValid || (cell.letter !== '' && cell.letter !== word[i])) {
                fits = false;
                break;
              }
            }
          }

          if (fits) {
            // Place word (Track changes for backtracking)
            const changes: { x: number, y: number, prevLetter: string, prevIsWord: boolean, prevId: string | undefined }[] = [];

            for (let i = 0; i < word.length; i++) {
              const x = pos.x + dir[0] * i;
              const y = pos.y + dir[1] * i;
              changes.push({
                x, y,
                prevLetter: grid[y][x].letter,
                prevIsWord: grid[y][x].isWord,
                prevId: grid[y][x].wordId
              });

              grid[y][x] = {
                ...grid[y][x],
                letter: word[i],
                isWord: true,
                wordId: `word-${index}` // Temp ID
              };
            }

            // Recurse
            if (solve(index + 1)) {
              placedWords.push({
                id: `word-${index}`,
                word,
                startX: pos.x,
                startY: pos.y,
                endX: pos.x + dir[0] * (word.length - 1),
                endY: pos.y + dir[1] * (word.length - 1)
              });
              return true;
            }

            // Backtrack
            for (const change of changes) {
              grid[change.y][change.x] = {
                ...grid[change.y][change.x],
                letter: change.prevLetter,
                isWord: change.prevIsWord,
                wordId: change.prevId
              };
            }
          }
        }
      }

      return false;
    };

    // Try to solve perfectly
    const success = solve(0);

    // If successful, we are done!
    if (success) {
      // Fill Empty Cells
      fillEmptyCells(grid, width, height, hiddenMessage, rng);
      return { grid, placedWords, unplacedWords: [], seed, timestamp: Date.now(), theme: generateThemeFromTopic('') };
    }

    // If failed, we check if this attempt was better than previous ones (more words placed? or just keep the partial result?)
    // The recursive solver undoes everything on failure. So `grid` is empty of the failed words.
    // To implement "Best Effort", we need a solver that doesn't undo on the *top level* failure, or tracks the max depth.
    // Since we want 100%, let's just rely on the retries.
    // If ALL retries fail, we need to return the "best partial".
    // But our `solve` function is all-or-nothing.

    // Let's do a "Greedy Fallback" for the final attempt if all strict solves fail.
    if (attempt === attempts - 1) {
      // Run a greedy placement (no backtracking) to get as many as possible
      // Reset grid
      grid = Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => ({
          letter: '',
          isWord: false,
          isValid: isInsideShape(x, y, width, height, shape),
          x,
          y
        }))
      );
      const greedyPlaced: PlacedWord[] = [];
      const greedyUnplaced: string[] = [];

      // Sort longest first for greedy
      sortedWords.sort((a, b) => b.length - a.length || a.localeCompare(b));

      for (const word of sortedWords) {
        // Try to place
        let placed = false;
        // Generate coords/dirs again
        const coords = [];
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (grid[y][x].isValid) coords.push({ x, y });
        // Shuffle
        for (let i = coords.length - 1; i > 0; i--) { const j = rng.nextInfo(i + 1);[coords[i], coords[j]] = [coords[j], coords[i]]; }

        const shuffledDirs = [...directions];
        for (let i = shuffledDirs.length - 1; i > 0; i--) { const j = rng.nextInfo(i + 1);[shuffledDirs[i], shuffledDirs[j]] = [shuffledDirs[j], shuffledDirs[i]]; }

        for (const pos of coords) {
          for (const dir of shuffledDirs) {
            // Check fit
            let fits = true;
            const endX = pos.x + dir[0] * (word.length - 1);
            const endY = pos.y + dir[1] * (word.length - 1);
            if (endX < 0 || endX >= width || endY < 0 || endY >= height) fits = false;
            else {
              for (let i = 0; i < word.length; i++) {
                const x = pos.x + dir[0] * i;
                const y = pos.y + dir[1] * i;
                const cell = grid[y][x];
                if (!cell.isValid || (cell.letter !== '' && cell.letter !== word[i])) { fits = false; break; }
              }
            }

            if (fits) {
              // Place permanently
              for (let i = 0; i < word.length; i++) {
                const x = pos.x + dir[0] * i;
                const y = pos.y + dir[1] * i;
                grid[y][x] = { ...grid[y][x], letter: word[i], isWord: true, wordId: `word-${word}` };
              }
              greedyPlaced.push({
                id: `word-${word}`, word, startX: pos.x, startY: pos.y, endX, endY
              });
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
        if (!placed) greedyUnplaced.push(word);
      }

      fillEmptyCells(grid, width, height, hiddenMessage, rng);
      return { grid, placedWords: greedyPlaced, unplacedWords: greedyUnplaced, seed, timestamp: Date.now(), theme: generateThemeFromTopic('') };
    }
  }

  // Should not reach here due to the fallback above, but TS needs return
  return { grid: [], placedWords: [], unplacedWords: words, seed, timestamp: Date.now(), theme: generateThemeFromTopic('') };
};

const fillEmptyCells = (grid: GridCell[][], width: number, height: number, hiddenMessage: string | undefined, rng: SeededRNG) => {
  const cleanMessage = hiddenMessage
    ? hiddenMessage.toUpperCase().replace(/[^A-ZÑ]/g, '')
    : '';

  let messageIndex = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].isValid && grid[y][x].letter === '') {
        if (cleanMessage && messageIndex < cleanMessage.length) {
          grid[y][x].letter = cleanMessage[messageIndex];
          messageIndex++;
        } else {
          grid[y][x].letter = LETTERS[rng.nextInfo(LETTERS.length)];
        }
      }
    }
  }
};
