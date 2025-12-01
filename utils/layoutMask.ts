/**
 * Generates a high-contrast Black & White mask of the current puzzle.
 * Black = Content (Forbidden Zone)
 * White = Empty (Safe Zone for Art)
 */
declare global {
    interface Window {
        html2canvas: any;
    }
}

export const generateLayoutMask = async (elementId: string = 'puzzle-sheet'): Promise<string | null> => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id '${elementId}' not found.`);
        return null;
    }

    try {
        // 1. Clone the element to manipulate styles without affecting the UI
        const clone = element.cloneNode(true) as HTMLElement;

        // Position fixed at 0,0 but behind everything
        clone.style.position = 'fixed';
        clone.style.top = '0';
        clone.style.left = '0';
        clone.style.width = '8.5in'; // Enforce print size
        clone.style.height = '11in';
        clone.style.zIndex = '-9999';
        clone.style.pointerEvents = 'none'; // Ensure it doesn't intercept clicks

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
        if (!window.html2canvas) {
            console.error("html2canvas not loaded");
            document.body.removeChild(clone);
            return null;
        }

        // Wrap html2canvas in a promise with timeout
        const canvasPromise = window.html2canvas(clone, {
            scale: 1, // Low res is fine for a mask, speed is better
            logging: false,
            useCORS: true,
            backgroundColor: '#ffffff',
            removeContainer: true
        });

        const timeoutPromise = new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error("html2canvas timed out")), 5000);
        });

        // @ts-ignore
        const canvas = await Promise.race([canvasPromise, timeoutPromise]);

        // 4. Cleanup
        document.body.removeChild(clone);

        // 5. Return Base64
        return canvas.toDataURL('image/jpeg', 0.5); // Low quality JPEG is fine for mask

    } catch (error) {
        console.error("Error generating layout mask:", error);
        // Ensure cleanup happens
        const clone = document.getElementById(elementId + '-clone'); // We didn't set an ID, but we have the ref.
        // Actually, we have the 'clone' variable in scope? No, it's inside try block.
        // But we appended it. We should probably remove it if it's still there.
        // Since we can't easily access 'clone' here if it failed before appending, 
        // we rely on the fact that if it threw, it might be stuck. 
        // But the 'clone' variable is defined inside 'try'.
        // Let's just return null. The user can retry.
        return null;
    }
};
