import { CustomTemplate, Difficulty, FontType } from '../../types';

export interface DesignPreset extends Omit<CustomTemplate, 'id' | 'createdAt' | 'name'> {
    id: string;
    label: string;
    description: string;
    previewColors: string[];
}

export const DESIGN_PRESETS: DesignPreset[] = [
    {
        id: 'preset_vintage',
        label: 'Vintage Paper',
        description: 'Estilo clásico con tonos sepia y tipografía elegante.',
        previewColors: ['#78350f', '#fef3c7', '#fcd34d'],
        designTheme: 'classic',
        showBorders: true,
        fontType: 'EDITORIAL' as FontType,
        margins: { top: 0.75, bottom: 0.75, left: 0.75, right: 0.75 },
        themeData: {
            primaryColor: '#78350f', // Amber 900
            secondaryColor: '#b45309', // Amber 700
            textColor: '#451a03',      // Amber 950
            backgroundColor: '#fffbeb' // Amber 50
        }
    },
    {
        id: 'preset_blueprint',
        label: 'Tech Blueprint',
        description: 'Estilo técnico azul, ideal para temas de ingeniería o sci-fi.',
        previewColors: ['#1e40af', '#eff6ff', '#3b82f6'],
        designTheme: 'modern',
        showBorders: true,
        fontType: 'MODERN' as FontType,
        margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
        themeData: {
            primaryColor: '#1e3a8a', // Blue 900
            secondaryColor: '#3b82f6', // Blue 500
            textColor: '#172554',      // Blue 950
            backgroundColor: '#eff6ff' // Blue 50
        }
    },
    {
        id: 'preset_nature',
        label: 'Forest Calm',
        description: 'Tonos verdes relajantes para temas de naturaleza.',
        previewColors: ['#166534', '#f0fdf4', '#4ade80'],
        designTheme: 'minimal',
        showBorders: false,
        fontType: 'CLASSIC' as FontType,
        margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
        themeData: {
            primaryColor: '#14532d', // Green 900
            secondaryColor: '#16a34a', // Green 600
            textColor: '#052e16',      // Green 950
            backgroundColor: '#f0fdf4' // Green 50
        }
    },
    {
        id: 'preset_kids',
        label: 'Candy Pop',
        description: 'Colores vibrantes y divertidos para niños.',
        previewColors: ['#db2777', '#fff1f2', '#f472b6'],
        designTheme: 'kids',
        showBorders: true,
        fontType: 'FUN' as FontType,
        margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
        themeData: {
            primaryColor: '#be185d', // Pink 700
            secondaryColor: '#f472b6', // Pink 400
            textColor: '#831843',      // Pink 900
            backgroundColor: '#fff1f2' // Pink 50
        }
    },
    {
        id: 'preset_dark',
        label: 'Midnight',
        description: 'Alto contraste en modo oscuro moderno.',
        previewColors: ['#0f172a', '#f8fafc', '#64748b'],
        designTheme: 'modern',
        showBorders: false,
        fontType: 'MODERN' as FontType,
        margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
        themeData: {
            primaryColor: '#0f172a', // Slate 900
            secondaryColor: '#334155', // Slate 700
            textColor: '#020617',      // Slate 950 (Text is usually dark on page, but for dark usage, page bg handles it)
            backgroundColor: '#ffffff' // Keep page white for print, or dark if digital only? Assuming Print usually white.
        }
    },
    {
        id: 'preset_invisible',
        label: 'Invisible Ink',
        description: 'Minimalismo extremo, sin bordes de grilla.',
        previewColors: ['#000000', '#ffffff', '#e5e5e5'],
        designTheme: 'invisible',
        showBorders: false,
        fontType: 'EDITORIAL' as FontType,
        margins: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 },
        themeData: {
            primaryColor: '#000000',
            secondaryColor: '#000000',
            textColor: '#000000',
            backgroundColor: '#ffffff'
        }
    }
];
