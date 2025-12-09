import html2canvas from 'html2canvas';

export async function captureElementAsPng(element: HTMLElement): Promise<string> {
    const canvas = await html2canvas(element, {
        scale: 2, // Mayor resolución para impresión
        useCORS: true,
        backgroundColor: null, // Transparente si es posible, o blanco por defecto
        ignoreElements: (element) => {
            // Ignore iframes to prevent CSP errors from extensions (like Rokt)
            if (element.tagName.toLowerCase() === 'iframe') return true;
            return false;
        }
    });
    return canvas.toDataURL('image/png');
}
