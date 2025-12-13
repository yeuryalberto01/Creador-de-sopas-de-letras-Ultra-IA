import { DesignAsset } from './types';

export const INITIAL_ASSETS: DesignAsset[] = [
    // --- CORNERS ---
    {
        id: 'corner-floral-1',
        name: 'Esquina Floral Simple',
        type: 'corner',
        category: 'Floral',
        isAdaptable: true,
        defaultWidth: '100px',
        defaultHeight: '100px',
        svgContent: `
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 10 H40 M10 10 V40" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
                <path d="M15 15 L35 35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="10" cy="10" r="4" fill="currentColor"/>
                <path d="M45 10 Q30 10 25 25 Q10 30 10 45" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/>
            </svg>
        `
    },
    {
        id: 'corner-tech-1',
        name: 'Esquina Tech',
        type: 'corner',
        category: 'Tech',
        isAdaptable: true,
        defaultWidth: '120px',
        defaultHeight: '120px',
        svgContent: `
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 2 H50 L60 12" stroke="currentColor" stroke-width="2"/>
                <path d="M2 2 V50 L12 60" stroke="currentColor" stroke-width="2"/>
                <rect x="5" y="5" width="10" height="10" fill="currentColor" opacity="0.5"/>
                <path d="M20 20 L40 20 L20 40 Z" fill="currentColor" opacity="0.2"/>
            </svg>
        `
    },

    // --- TEXT BOXES ---
    {
        id: 'textbox-vintage-1',
        name: 'Caja Vintage',
        type: 'textbox',
        category: 'Vintage',
        isAdaptable: true,
        defaultWidth: '300px',
        defaultHeight: 'auto',
        svgContent: `
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="296" height="96" rx="10" stroke="currentColor" stroke-width="2"/>
                <rect x="6" y="6" width="288" height="88" rx="6" stroke="currentColor" stroke-width="1" stroke-dasharray="4 2"/>
            </svg>
        `
    },

    // --- DIVIDERS ---
    {
        id: 'divider-star-1',
        name: 'Divisor Estrellas',
        type: 'divider',
        category: 'Funny',
        isAdaptable: true,
        defaultWidth: '100%',
        defaultHeight: '20px',
        svgContent: `
            <svg viewBox="0 0 200 20" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="0" y1="10" x2="200" y2="10" stroke="currentColor" stroke-width="1" opacity="0.5"/>
                <polygon points="100,2 103,8 109,8 104,12 106,18 100,14 94,18 96,12 91,8 97,8" fill="currentColor"/>
            </svg>
        `
    }
];

export const ASSET_CATEGORIES: string[] = ['Todos', 'Floral', 'Tech', 'Vintage', 'Funny'];
