export interface ArtisticStyle {
    id: string;
    label: string;
    description: string;
    promptModifier: string;
    negativePrompt: string;
    previewColor: string;
}

export const ARTISTIC_STYLES: ArtisticStyle[] = [
    {
        id: 'engraving',
        label: 'Grabado Vintage',
        description: 'Estilo clásico de libro antiguo, líneas detalladas, blanco y negro.',
        promptModifier: 'vintage engraving style, woodcut illustration, detailed linework, cross-hatching, black and white ink, antique book illustration',
        negativePrompt: 'color, 3d, photorealistic, blur, modern, digital',
        previewColor: '#e3dac9'
    },
    {
        id: 'watercolor',
        label: 'Acuarela Artística',
        description: 'Suave, colores mezclados, textura de papel.',
        promptModifier: 'watercolor painting, soft edges, paper texture, wet-on-wet technique, artistic splashes, dreamy atmosphere',
        negativePrompt: 'sharp lines, vector, plastic, 3d, harsh contrast',
        previewColor: '#ffb7b2'
    },
    {
        id: 'digital_art',
        label: 'Arte Digital Premium',
        description: 'Moderno, vibrante, alta definición, estilo concept art.',
        promptModifier: 'premium digital art, concept art style, vibrant colors, dynamic lighting, high definition, 8k, artstation trends',
        negativePrompt: 'pixelated, low quality, blurry, noise, grain',
        previewColor: '#a2d2ff'
    },
    {
        id: 'illustration',
        label: 'Ilustración de Libro',
        description: 'Estilo de cuento infantil, colores planos, líneas limpias.',
        promptModifier: 'children book illustration, clean lines, flat colors, whimsical, charming, vector style',
        negativePrompt: 'scary, dark, grunge, realistic, photographic',
        previewColor: '#ffdfba'
    },
    {
        id: 'poster_art',
        label: 'Póster Vintage',
        description: 'Estilo cartel de viaje retro, colores sólidos, tipografía.',
        promptModifier: 'vintage travel poster style, retro graphics, bold flat colors, screen print texture, mid-century modern',
        negativePrompt: '3d, realistic, photo, messy',
        previewColor: '#ff6961'
    },
    {
        id: '3d_render',
        label: 'Render 3D Cute',
        description: 'Estilo Pixar/Disney, volumétrico, iluminación suave.',
        promptModifier: '3d render, claymation style, cute, isometric, soft lighting, ambient occlusion, plastic texture, toy-like',
        negativePrompt: '2d, flat, sketch, drawing, painting',
        previewColor: '#b5ead7'
    },
    {
        id: 'pixel_art',
        label: 'Pixel Art Retro',
        description: 'Estilo videojuego clásico 8-bit o 16-bit.',
        promptModifier: 'pixel art, 16-bit, retro game sprite, dithering, limited color palette',
        negativePrompt: 'vector, smooth, hd, 3d, blur',
        previewColor: '#c7ceea'
    },
    {
        id: 'realistic',
        label: 'Fotorealista',
        description: 'Como una fotografía de alta calidad.',
        promptModifier: 'photorealistic, 8k, macro photography, depth of field, cinematic lighting, highly detailed',
        negativePrompt: 'drawing, painting, cartoon, sketch, illustration',
        previewColor: '#e2f0cb'
    }
];
