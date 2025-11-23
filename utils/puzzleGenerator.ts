import { Difficulty, GridCell, PlacedWord, GeneratedPuzzle, PuzzleTheme } from '../types';

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
  E: [1, 0],
  S: [0, 1],
  SE: [1, 1],
  NE: [1, -1],
  W: [-1, 0],
  N: [0, -1],
  NW: [-1, -1],
  SW: [-1, 1]
};

const getAllowedDirections = (difficulty: Difficulty) => {
  switch (difficulty) {
    case Difficulty.EASY:
      return [DIRECTIONS.E, DIRECTIONS.S];
    case Difficulty.MEDIUM:
      return [DIRECTIONS.E, DIRECTIONS.S, DIRECTIONS.SE, DIRECTIONS.NE];
    case Difficulty.HARD:
      return Object.values(DIRECTIONS);
    default:
      return [DIRECTIONS.E, DIRECTIONS.S];
  }
};

const LETTERS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";

/**
 * Calculates a "Smart" grid size based on the words provided.
 * It ensures the longest word fits and maintains a good density ratio.
 */
export const calculateSmartGridSize = (words: string[], difficulty: Difficulty): number => {
  if (words.length === 0) return 15;

  // 1. Find the longest word length
  const longestWord = Math.max(...words.map(w => w.length));

  // 2. Calculate total characters
  const totalChars = words.reduce((sum, w) => sum + w.length, 0);

  // 3. Determine density factor based on difficulty
  // Easy needs more space (lower density), Hard can be tighter.
  // We invert logic here: Large grid = low density.
  // Target Area = TotalChars * Multiplier.
  let areaMultiplier = 3.0; // Default (Medium)
  if (difficulty === Difficulty.EASY) areaMultiplier = 4.0; // Lots of empty space
  if (difficulty === Difficulty.HARD) areaMultiplier = 2.0; // Tighter

  const minArea = totalChars * areaMultiplier;
  const minDimensionByArea = Math.ceil(Math.sqrt(minArea));

  // 4. The absolute minimum is the longest word + padding
  const padding = 2; 
  const minDimensionByLength = longestWord + (difficulty === Difficulty.EASY ? 0 : padding);

  // 5. Pick the larger of the two constraints, but clamp reasonably
  let idealSize = Math.max(minDimensionByLength, minDimensionByArea);
  
  // 6. Hard constraints (Min 10, Max 25 usually)
  idealSize = Math.max(10, Math.min(idealSize, 25));

  return idealSize;
};

/**
 * Generates a color theme based on a string (e.g., the Topic).
 * This ensures "Nature" gives greens, "Fire" gives reds, consistently.
 */
export const generateThemeFromTopic = (topic: string): PuzzleTheme => {
    // If no topic, return a standard blue
    if (!topic) {
        return {
            primaryColor: '#4f46e5', // Indigo 600
            secondaryColor: '#e0e7ff', // Indigo 100
            textColor: '#000000',
            backgroundColor: '#ffffff'
        };
    }

    // Hash the topic to get a Hue (0-360)
    let hash = 0;
    for (let i = 0; i < topic.length; i++) {
        hash = topic.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);

    // Create HSL strings
    const primary = `hsl(${hue}, 70%, 40%)`;   // Darker, saturated
    const secondary = `hsl(${hue}, 70%, 95%)`; // Very light background tint
    
    return {
        primaryColor: primary,
        secondaryColor: secondary,
        textColor: '#0f172a', // Slate 900
        backgroundColor: '#ffffff'
    };
};

export const generatePuzzle = (
  size: number,
  words: string[],
  difficulty: Difficulty,
  seedInput?: string
): GeneratedPuzzle => {
  
  const seed = seedInput || Math.random().toString(36).substring(2, 8).toUpperCase();
  const rng = new SeededRNG(seed);

  let grid: GridCell[][] = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => ({
      letter: '',
      isWord: false,
      x,
      y
    }))
  );

  const placedWords: PlacedWord[] = [];
  const unplacedWords: string[] = [];
  const directions = getAllowedDirections(difficulty);
  const sortedWords = [...words].sort((a, b) => b.length - a.length || a.localeCompare(b));

  for (const word of sortedWords) {
    let placed = false;
    let attempts = 0;
    const maxAttempts = 150; // Increased attempts slightly

    while (!placed && attempts < maxAttempts) {
      attempts++;
      const dir = directions[rng.nextInfo(directions.length)];
      const startX = rng.nextInfo(size);
      const startY = rng.nextInfo(size);

      const endX = startX + dir[0] * (word.length - 1);
      const endY = startY + dir[1] * (word.length - 1);

      if (endX < 0 || endX >= size || endY < 0 || endY >= size) continue;

      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const x = startX + dir[0] * i;
        const y = startY + dir[1] * i;
        const cell = grid[y][x];
        if (cell.letter !== '' && cell.letter !== word[i]) {
          fits = false;
          break;
        }
      }

      if (fits) {
        const id = `word-${placedWords.length}`;
        for (let i = 0; i < word.length; i++) {
          const x = startX + dir[0] * i;
          const y = startY + dir[1] * i;
          grid[y][x] = {
            ...grid[y][x],
            letter: word[i],
            isWord: true,
            wordId: id
          };
        }
        placedWords.push({ id, word, startX, startY, endX, endY });
        placed = true;
      }
    }

    if (!placed) {
      unplacedWords.push(word);
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x].letter === '') {
        grid[y][x].letter = LETTERS[rng.nextInfo(LETTERS.length)];
      }
    }
  }

  return { grid, placedWords, unplacedWords, seed, timestamp: Date.now() };
};