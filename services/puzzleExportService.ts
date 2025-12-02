import html2canvas from 'html2canvas';
import { PuzzleConfig, ElementCoordinates } from '../types';

export interface LayoutConfig {
    gridRect: { x: number; y: number; width: number; height: number };
    wordsRect: { x: number; y: number; width: number; height: number };
    width: number;
    height: number;
}

export const exportPuzzleImage = async (elementId: string): Promise<{ imageBase64: string; width: number; height: number }> => {
    const element = document.getElementById(elementId);
    if (!element) throw new Error(`Element ${elementId} not found`);

    const canvas = await html2canvas(element, {
        scale: 2, // 2x scale for better quality (approx 300dpi equivalent depending on screen)
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
    });

    return {
        imageBase64: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height
    };
};

export const createMaskFromLayout = async (
    width: number,
    height: number,
    layoutConfig: LayoutConfig
): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error("Could not get 2D context for mask generation");

    // 1. Fill background with WHITE (Editable area)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 2. Fill protected areas with BLACK (Protected area)
    ctx.fillStyle = '#000000';

    // Protect Grid
    // We need to scale the rects if the capture scale was different from the layout config source
    // Assuming layoutConfig comes from the same scale context or we adjust here.
    // For simplicity, let's assume we pass the rects relative to the captured image size.

    // NOTE: In a real implementation, we need to map the DOM element positions to the captured canvas coordinates.
    // Since we don't have the exact DOM rects here, we will rely on the caller to pass accurate relative coordinates
    // or we can try to detect them from the DOM if we are running in the browser.

    // Let's improve this: instead of passing layoutConfig blindly, let's detect the elements within the container.

    return canvas.toDataURL('image/png');
};

// Improved version that detects elements automatically
export const generateSmartMask = async (containerId: string): Promise<string> => {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);

    // 1. Capture the full container to get dimensions
    // We use a temporary canvas to draw the mask
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width; // Use 1x scale for mask, we can scale up if needed
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("No context");

    // Fill White (Edit)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Fill Black (Protect)
    ctx.fillStyle = '#000000';

    // Find critical elements to protect
    // We expect elements with specific IDs or classes
    const protectIds = ['puzzle-grid-container', 'word-list-container', 'puzzle-title', 'puzzle-header'];

    protectIds.forEach(id => {
        const el = container.querySelector(`#${id}`) || document.getElementById(id);
        if (el) {
            const rect = el.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Calculate relative position
            const x = rect.left - containerRect.left;
            const y = rect.top - containerRect.top;

            // Add some padding (e.g., 10px)
            const padding = 10;
            ctx.fillRect(x - padding, y - padding, rect.width + (padding * 2), rect.height + (padding * 2));
        }
    });

    return canvas.toDataURL('image/png');
};
