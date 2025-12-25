
import { Difficulty, PuzzleTheme } from '../types';

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

export const measurePuzzleElements = () => {
  const root = document.getElementById('puzzle-sheet');
  if (!root) return null;

  const getRect = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return {
      x: elRect.left - rootRect.left,
      y: elRect.top - rootRect.top,
      width: elRect.width,
      height: elRect.height
    };
  };

  return {
    grid: getRect('puzzle-grid'),
    title: getRect('puzzle-title'),
    wordList: getRect('puzzle-wordlist')
  };
};
