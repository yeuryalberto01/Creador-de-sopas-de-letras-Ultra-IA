import { AISettings } from '../types';

export interface DecorateArgs {
    puzzleImageBase64: string;
    maskImageBase64: string;
    positivePrompt: string;
    negativePrompt: string;
    cfgScale?: number;
    steps?: number;
    aiSettings: AISettings;
}

export async function decoratePuzzleWithNanobanana(
    args: DecorateArgs
): Promise<{ imageBase64: string }> {
    const { puzzleImageBase64, maskImageBase64, positivePrompt, negativePrompt, aiSettings } = args;

    // Use the backend proxy endpoint
    const url = `${aiSettings.baseUrl || 'http://localhost:8000'}/api/ai/generate-smart-design`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': aiSettings.apiKey || ''
            },
            body: JSON.stringify({
                prompt: positivePrompt, // We pass the full constructed prompt here
                mask_image: maskImageBase64,
                style: 'color', // Default to color for now
                // We might need to extend the backend endpoint to accept negative prompt and image input if it doesn't already
                // For now, we are mapping to the existing smart design endpoint structure
                // Ideally, we should update the backend to handle image-to-image inpainting specifically
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Error en Nanobanana API");
        }

        const data = await response.json();
        return { imageBase64: data.image };

    } catch (error: any) {
        console.error("Nanobanana Client Error:", error);
        throw new Error(error.message || "Error de conexión con el servicio de diseño");
    }
}
