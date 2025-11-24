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
 * Checks if a coordinate is inside the requested shape mask.
 * Coordinates are normalized -1 to 1 for calculation.
 */
const isInsideShape = (x: number, y: number, size: number, shape: ShapeType): boolean => {
  if (shape === 'SQUARE') return true;

  // Normalize to -1 to 1 range
  const nx = (x / (size - 1)) * 2 - 1;
  const ny = (y / (size - 1)) * 2 - 1;

  if (shape === 'CIRCLE') {
    return (nx * nx + ny * ny) <= 1.0;
  }

  if (shape === 'DIAMOND') {
    return (Math.abs(nx) + Math.abs(ny)) <= 1.0;
  }

  if (shape === 'HEART') {
    // Heart formula approximation
    const fy = -ny * 1.2 + 0.3;
    const fx = nx * 1.2;
    const a = fx * fx + fy * fy - 1;
    return (a * a * a - fx * fx * fy * fy * fy) <= 0;
  }

  if (shape === 'STAR') {
    // 5-point star using polar coordinates
    const r = Math.sqrt(nx * nx + ny * ny);
    const theta = Math.atan2(ny, nx);
    return r < (0.4 + 0.3 * Math.cos(5 * theta + Math.PI / 2));
  }

  // --- NEW SHAPES ---

  if (shape === 'HEXAGON') {
    // Regular flat-top hexagon
    const abs_nx = Math.abs(nx);
    const abs_ny = Math.abs(ny);
    return abs_ny <= 0.866 && (abs_nx + 0.866 * abs_ny) <= 0.95;
  }

  if (shape === 'TRIANGLE') {
    // Equilateral triangle pointing up
    const topEdge = ny >= -1.0;
    const leftEdge = (ny - 0.5) <= -1.732 * (nx + 0.866);
    const rightEdge = (ny - 0.5) <= 1.732 * (nx - 0.866);
    return topEdge && leftEdge && rightEdge;
  }

  if (shape === 'CROSS') {
    // Plus/Cross shape
    const thickness = 0.4;
    const horizontal = Math.abs(ny) <= thickness;
    const vertical = Math.abs(nx) <= thickness;
    return horizontal || vertical;
  }

  if (shape === 'RHOMBUS') {
    // Rhombus with different aspect ratio than diamond
    return (Math.abs(nx) + Math.abs(ny * 0.8)) <= 1.0;
  }

  if (shape === 'OVAL') {
    // Ellipse wider horizontally
    const a = 1.0;
    const b = 0.7;
    return ((nx * nx) / (a * a) + (ny * ny) / (b * b)) <= 1.0;
  }

  return true;
};

/**
 * Calculates a "Smart" grid size based on the words provided.
 */
export const calculateSmartGridSize = (words: string[], difficulty: Difficulty): number => {
  if (words.length === 0) return 15;

  const longestWord = Math.max(...words.map(w => w.length));
  const totalChars = words.reduce((sum, w) => sum + w.length, 0);

  let areaMultiplier = 3.0;
  if (difficulty === Difficulty.EASY) areaMultiplier = 4.0;
  if (difficulty === Difficulty.HARD) areaMultiplier = 2.0;

  const minArea = totalChars * areaMultiplier;
  const minDimensionByArea = Math.ceil(Math.sqrt(minArea));
  const padding = 2;
  const minDimensionByLength = longestWord + (difficulty === Difficulty.EASY ? 0 : padding);

  let idealSize = Math.max(minDimensionByLength, minDimensionByArea);

  // Hard constraints
  idealSize = Math.max(12, Math.min(idealSize, 25));

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
  size: number,
  words: string[],
  difficulty: Difficulty,
  seedInput?: string,
  shape: ShapeType = 'SQUARE',
  hiddenMessage?: string
): GeneratedPuzzle => {

  const seed = seedInput || Math.random().toString(36).substring(2, 8).toUpperCase();
  const rng = new SeededRNG(seed);

  // Initialize Grid with validity mask
  let grid: GridCell[][] = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => ({
      letter: '',
      isWord: false,
      isValid: isInsideShape(x, y, size, shape),
      x,
      y
    }))
  );

  const placedWords: PlacedWord[] = [];
  const unplacedWords: string[] = [];
  const directions = getAllowedDirections(difficulty);
  const sortedWords = [...words].sort((a, b) => b.length - a.length || a.localeCompare(b));

  // Place Words
  for (const word of sortedWords) {
    let placed = false;
    let attempts = 0;
    const maxAttempts = 200;

    while (!placed && attempts < maxAttempts) {
      attempts++;
      const dir = directions[rng.nextInfo(directions.length)];
      const startX = rng.nextInfo(size);
      const startY = rng.nextInfo(size);

      // Early check: Is start point valid?
      if (!grid[startY][startX].isValid) continue;

      const endX = startX + dir[0] * (word.length - 1);
      const endY = startY + dir[1] * (word.length - 1);

      // Boundary Check
      if (endX < 0 || endX >= size || endY < 0 || endY >= size) continue;

      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const x = startX + dir[0] * i;
        const y = startY + dir[1] * i;
        const cell = grid[y][x];

        // Mask Check
        if (!cell.isValid) {
          fits = false;
          break;
        }

        // Collision Check
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

  // Fill Empty Cells (Hidden Message Logic)
  const cleanMessage = hiddenMessage
    ? hiddenMessage.toUpperCase().replace(/[^A-ZÑ]/g, '')
    : '';

  let messageIndex = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
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

  return { grid, placedWords, unplacedWords, seed, timestamp: Date.now() };
};