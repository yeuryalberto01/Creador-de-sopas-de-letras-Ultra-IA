
export interface ElementMetrics {
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    width: number; // Percentage 0-100
    height: number; // Percentage 0-100
    name: string;
}

export interface PuzzleStructure {
    grid: ElementMetrics | null;
    title: ElementMetrics | null;
    wordList: ElementMetrics | null;
    footer: ElementMetrics | null; // Added
    page: { width: number, height: number };
}

export const measurePuzzleElements = (): PuzzleStructure => {
    // We assume the main puzzle container has proper IDs or classes
    // In App.tsx or PuzzleSheet.tsx, we need to ensure these IDs exist:
    // - puzzle-page-container (The root sheet - ID remains)
    // - puzzle-grid-container (data-measure-id)
    // - puzzle-title (data-measure-id)
    // - puzzle-wordlist (data-measure-id)
    // - puzzle-footer (data-measure-id)

    const page = document.getElementById('puzzle-page-container');
    const grid = document.querySelector('[data-measure-id="puzzle-grid-container"]') as HTMLElement;
    const title = document.querySelector('[data-measure-id="puzzle-title"]') as HTMLElement;
    const wordList = document.querySelector('[data-measure-id="puzzle-wordlist"]') as HTMLElement;
    const footer = document.querySelector('[data-measure-id="puzzle-footer"]') as HTMLElement;

    if (!page) {
        console.warn("SpatialUtils: Puzzle page container not found!");
        return { grid: null, title: null, wordList: null, footer: null, page: { width: 0, height: 0 } };
    }

    const pageRect = page.getBoundingClientRect();

    const getMetrics = (el: HTMLElement | null, name: string): ElementMetrics | null => {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
            x: ((rect.left - pageRect.left) / pageRect.width) * 100,
            y: ((rect.top - pageRect.top) / pageRect.height) * 100,
            width: (rect.width / pageRect.width) * 100,
            height: (rect.height / pageRect.height) * 100,
            name
        };
    };

    return {
        page: { width: pageRect.width, height: pageRect.height },
        grid: getMetrics(grid, 'GRID'),
        title: getMetrics(title, 'TITLE'),
        wordList: getMetrics(wordList, 'WORD_LIST'),
        footer: getMetrics(footer, 'FOOTER')
    };
};

export const formatMetricsForPrompt = (structure: PuzzleStructure): string => {
    if (!structure.grid) return "LAYOUT UNKNOWN; Assume Standard Layout.";

    let report = "CRITICAL SPATIAL LAYOUT (DO NOT PAINT OVER THESE AREAS):\n";

    const fmt = (m: ElementMetrics | null) => {
        if (!m) return "";
        return `- ${m.name}: Occupies X:${Math.round(m.x)}% to ${Math.round(m.x + m.width)}% | Y:${Math.round(m.y)}% to ${Math.round(m.y + m.height)}%`;
    };

    report += fmt(structure.grid) + "\n";
    report += fmt(structure.title) + "\n";
    report += fmt(structure.wordList) + "\n";
    report += fmt(structure.footer) + "\n"; // Added Footer

    report += "INSTRUCTION: Leave these specific rectangular areas clean or with high contrast background.";
    return report;
};
