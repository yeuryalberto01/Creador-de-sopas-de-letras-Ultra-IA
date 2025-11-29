/**
 * Generates a high-contrast Black & White mask of the current puzzle.
 * Black = Content (Forbidden Zone)
 * White = Empty (Safe Zone for Art)
 */
export const generateLayoutMask = async (elementId: string = 'puzzle-sheet'): Promise<string | null> => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id '${elementId}' not found.`);
        return null;
    }

    try {
        // 1. Clone the element to manipulate styles without affecting the UI
        const clone = element.cloneNode(true) as HTMLElement;

        // Position off-screen but visible to html2canvas
        clone.style.position = 'absolute';
        clone.style.top = '-9999px';
        clone.style.left = '-9999px';
        clone.style.width = '8.5in'; // Enforce print size
        clone.style.height = '11in';
        clone.style.zIndex = '-1';

        // 2. Apply High-Contrast Styles (The "Masking" Logic)
        // Everything that is content should be BLACK. Background WHITE.

        // Force background white
        clone.style.backgroundColor = '#ffffff';
        clone.style.backgroundImage = 'none';

        // Helper to force black color on elements
        const makeBlack = (el: HTMLElement) => {
            el.style.color = '#000000';
            el.style.borderColor = '#000000';
            el.style.backgroundColor = 'transparent'; // Text backgrounds transparent
            el.style.textShadow = 'none';
            el.style.boxShadow = 'none';
            el.style.opacity = '1';
            el.style.filter = 'none';
        };

        // Traverse and style
        const allElements = clone.querySelectorAll('*');
        allElements.forEach((el) => {
            if (el instanceof HTMLElement) {
                makeBlack(el);

                // Remove any existing background images on children
                if (el.style.backgroundImage) el.style.backgroundImage = 'none';

                // Ensure borders are visible
                const style = window.getComputedStyle(el);
                if (style.borderWidth !== '0px') {
                    el.style.borderColor = '#000000';
                }
            }
        });

        document.body.appendChild(clone);

        // 3. Capture with html2canvas (from global window)
        // @ts-ignore
        if (!window.html2canvas) {
            console.error("html2canvas not loaded");
            document.body.removeChild(clone);
            return null;
        }

        // @ts-ignore
        const canvas = await window.html2canvas(clone, {
            scale: 1, // Low res is fine for a mask, speed is better
            logging: false,
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        // 4. Cleanup
        document.body.removeChild(clone);

        // 5. Return Base64
        return canvas.toDataURL('image/jpeg', 0.5); // Low quality JPEG is fine for mask

    } catch (error) {
        console.error("Error generating layout mask:", error);
        return null;
    }
};
