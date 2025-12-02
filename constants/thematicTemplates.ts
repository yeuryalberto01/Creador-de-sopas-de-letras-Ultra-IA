import { ThematicTemplate, ColorPalette } from '../types';

const PALETTES: Record<string, ColorPalette> = {
    OCEAN: { id: 'ocean', name: 'Ocean Depths', colors: ['#001f3f', '#0074D9', '#7FDBFF', '#39CCCC'], temperature: 'cool' },
    TROPICAL: { id: 'tropical', name: 'Tropical Sunset', colors: ['#FF4136', '#FF851B', '#FFDC00', '#2ECC40'], temperature: 'warm' },
    VINTAGE: { id: 'vintage', name: 'Old Paper', colors: ['#F5DEB3', '#D2B48C', '#8B4513', '#A0522D'], temperature: 'warm' },
    CHRISTMAS: { id: 'christmas', name: 'Festive', colors: ['#FF4136', '#2ECC40', '#FFFFFF', '#FFD700'], temperature: 'warm' },
    SPACE: { id: 'space', name: 'Galaxy', colors: ['#111111', '#B10DC9', '#0074D9', '#FFFFFF'], temperature: 'cool' },
    DOMINICAN: { id: 'dominican', name: 'Dominican Flag', colors: ['#CE1126', '#002D62', '#FFFFFF'], temperature: 'neutral' },
    NATURE: { id: 'nature', name: 'Forest', colors: ['#2ECC40', '#01FF70', '#3D9970', '#8B4513'], temperature: 'neutral' },
};

export const THEMATIC_TEMPLATES: ThematicTemplate[] = [
    {
        id: 'aquatic',
        name: 'Mundo Acuático',
        category: 'Naturaleza',
        description: 'Escena submarina con peces, corales y vida marina.',
        basePrompt: 'Underwater scene, coral reef, tropical fish, sea turtles, bubbles, light rays filtering through water',
        elements: ['Tropical Fish', 'Coral Reef', 'Seaweed', 'Bubbles', 'Sea Shells', 'Starfish'],
        suggestedStyles: ['engraving', 'watercolor', 'digital_art'],
        colorPalettes: [PALETTES.OCEAN, PALETTES.TROPICAL]
    },
    {
        id: 'dominican',
        name: 'República Dominicana',
        category: 'Cultura',
        description: 'Elementos culturales dominicanos: playa, música, instrumentos, bandera.',
        basePrompt: 'Dominican Republic culture, caribbean beach, palm trees, tambora drum, guira, accordion, hibiscus flowers, tropical fruits',
        elements: ['Palm Trees', 'Tambora', 'Guira', 'Hibiscus', 'Plátanos', 'Coconuts', 'Carnival Masks'],
        suggestedStyles: ['illustration', 'poster_art', 'vibrant_color'],
        colorPalettes: [PALETTES.DOMINICAN, PALETTES.TROPICAL]
    },
    {
        id: 'christmas',
        name: 'Navidad Mágica',
        category: 'Festividades',
        description: 'Decoración navideña clásica con nieve, regalos y luces.',
        basePrompt: 'Christmas decoration, pine branches, holly berries, snow, christmas lights, ornaments, cozy winter atmosphere',
        elements: ['Snowflakes', 'Pine Cones', 'Holly', 'Gift Boxes', 'Christmas Lights', 'Reindeer'],
        suggestedStyles: ['classic_card', '3d_render', 'watercolor'],
        colorPalettes: [PALETTES.CHRISTMAS, PALETTES.VINTAGE]
    },
    {
        id: 'space',
        name: 'Exploración Espacial',
        category: 'Ciencia Ficción',
        description: 'Galaxias, planetas, astronautas y naves espaciales.',
        basePrompt: 'Deep space, nebula, distant planets, stars, astronaut, rocket ship, futuristic technology',
        elements: ['Planets', 'Stars', 'Rocket', 'Astronaut', 'Comets', 'Alien Plants'],
        suggestedStyles: ['digital_art', 'neon_cyberpunk', 'realistic'],
        colorPalettes: [PALETTES.SPACE]
    },
    {
        id: 'safari',
        name: 'Safari Africano',
        category: 'Naturaleza',
        description: 'Animales de la sabana, acacias y atardeceres.',
        basePrompt: 'African savanna, acacia trees, sunset, lions, elephants, giraffes, tribal patterns',
        elements: ['Lion', 'Elephant', 'Giraffe', 'Acacia Tree', 'Tribal Mask', 'Sunset'],
        suggestedStyles: ['watercolor', 'engraving', 'oil_painting'],
        colorPalettes: [PALETTES.TROPICAL, PALETTES.VINTAGE]
    },
    {
        id: 'botanical',
        name: 'Jardín Botánico',
        category: 'Naturaleza',
        description: 'Flores detalladas, hojas y mariposas estilo vintage.',
        basePrompt: 'Botanical garden, vintage floral illustration, detailed leaves, butterflies, bees, blooming flowers',
        elements: ['Roses', 'Ferns', 'Butterflies', 'Bees', 'Vines', 'Orchids'],
        suggestedStyles: ['vintage_illustration', 'watercolor', 'line_art'],
        colorPalettes: [PALETTES.NATURE, PALETTES.VINTAGE]
    },
    {
        id: 'sports',
        name: 'Deportes Dinámicos',
        category: 'Actividades',
        description: 'Elementos deportivos, balones, trofeos y acción.',
        basePrompt: 'Sports theme, dynamic action, soccer ball, basketball, trophy, medals, stadium lights',
        elements: ['Soccer Ball', 'Basketball', 'Trophy', 'Medal', 'Sneakers', 'Whistle'],
        suggestedStyles: ['vector_art', 'comic_book', '3d_render'],
        colorPalettes: [PALETTES.OCEAN, PALETTES.DOMINICAN] // Using strong colors
    },
    {
        id: 'vintage_library',
        name: 'Biblioteca Antigua',
        category: 'Vintage',
        description: 'Libros antiguos, plumas, mapas y curiosidades.',
        basePrompt: 'Old library, stacks of vintage books, quill pen, ink pot, antique map, magnifying glass, dust motes',
        elements: ['Old Books', 'Quill', 'Scroll', 'Glasses', 'Candle', 'Globe'],
        suggestedStyles: ['engraving', 'sepia_photo', 'oil_painting'],
        colorPalettes: [PALETTES.VINTAGE]
    }
];
