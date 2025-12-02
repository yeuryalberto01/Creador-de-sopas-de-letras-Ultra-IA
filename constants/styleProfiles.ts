import { StyleProfile } from '../types';

export const STYLE_PROFILES: StyleProfile[] = [
    {
        id: 'rd-cultural',
        etiquetas: ['rd', 'dominicana', 'republica dominicana', 'patria', 'bandera', 'caribe', 'playa', 'cultura'],
        ageGroup: 'adults',
        basePrompt: 'A professional, vibrant illustration of Dominican Republic culture. Elements include palm trees, the Dominican flag colors (red, white, blue), tropical fruits, and carnival masks. The style is festive and colorful, suitable for a cultural event poster.',
        negativePrompt: 'text, letters, words, distorted grid, blurry, low quality, dark, gloomy',
        colorHints: 'Red, White, Blue, Tropical Green, Bright Yellow'
    },
    {
        id: 'superheroes-comic',
        etiquetas: ['comic', 'heroes', 'superheroe', 'accion', 'batalla', 'ciudad', 'explosion'],
        ageGroup: 'kids',
        basePrompt: 'A dynamic comic book style frame. Features a futuristic city skyline, action lines, "POW" and "ZAP" style decorative elements (without text), and bright primary colors. The style mimics classic superhero comics with bold outlines and halftone patterns.',
        negativePrompt: 'text inside grid, letters, words, realistic photos, dark, scary, gore',
        colorHints: 'Cyan, Magenta, Yellow, Black, Red, Blue'
    },
    {
        id: 'space-kids',
        etiquetas: ['espacio', 'universo', 'estrellas', 'planetas', 'astronauta', 'cohete', 'alien'],
        ageGroup: 'kids',
        basePrompt: 'A cute, cartoon-style space theme. Includes smiling planets, rocket ships, stars, and friendly aliens. The background is a deep blue with twinkling stars, but kept light enough to be cheerful. Vector art style, flat design.',
        negativePrompt: 'text, letters, words, scary aliens, realistic photos, complex details',
        colorHints: 'Deep Blue, Purple, Bright Yellow, White, Neon Green'
    },
    {
        id: 'nature-floral',
        etiquetas: ['naturaleza', 'flores', 'jardin', 'primavera', 'bosque', 'hojas'],
        ageGroup: 'adults',
        basePrompt: 'A elegant floral border design. Features watercolor-style flowers, vines, and leaves intertwining around the frame. Soft pastel colors and a calming, organic feel. Suitable for a relaxation puzzle.',
        negativePrompt: 'text, letters, words, sharp edges, neon colors, industrial elements',
        colorHints: 'Pastel Pink, Sage Green, Lavender, Soft Yellow'
    },
    {
        id: 'underwater-adventure',
        etiquetas: ['mar', 'oceano', 'peces', 'submarino', 'agua', 'playa'],
        ageGroup: 'kids',
        basePrompt: 'An underwater ocean scene. Features colorful coral reefs, cute fish, bubbles, and a submarine. The water is a bright turquoise. Cartoon style, engaging for children.',
        negativePrompt: 'text, letters, words, scary sharks, dark abyss, realistic photos',
        colorHints: 'Turquoise, Coral Orange, Yellow, Seaweed Green'
    },
    {
        id: 'underwater-fishing',
        etiquetas: ['pesca', 'fishing', 'peces', 'rio', 'lago', 'naturaleza', 'trucha', 'bajo', 'agua'],
        ageGroup: 'adults',
        basePrompt: 'A high-quality illustration of an underwater river scene. The central area is framed by a rustic border made of twisted driftwood and smooth river stones. Surrounding the frame are realistic freshwater fish like trout and bass swimming among aquatic plants and rocks. The background shows the blue water with sunlight filtering down from the surface. At the bottom, a parchment scroll texture for the word list area. The style is semi-realistic, vibrant, and detailed, suitable for a nature-themed puzzle.',
        negativePrompt: 'cartoon, low quality, blurry, distorted fish, text on background, watermark',
        colorHints: 'Teal, Blue, Brown, Green, Silver'
    }
];
