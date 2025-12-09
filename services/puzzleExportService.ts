
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Tipos para exportación
export interface ExportOptions {
    format: 'png' | 'jpeg' | 'pdf';
    quality: number;
    scale: number;
    fileName?: string;
    includeMetadata?: boolean;
}

/**
 * Genera una máscara inteligente basada en la estructura del puzzle
 * Útil para inpainting o para proteger áreas de texto
 */
export const generateSmartMask = async (elementId: string): Promise<string | null> => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    try {
        // Renderizar solo la estructura en alto contraste (blanco y negro)
        const canvas = await html2canvas(element, {
            backgroundColor: '#000000', // Fondo negro
            scale: 1,
            logging: false,
            onclone: (clonedDoc) => {
                const el = clonedDoc.getElementById(elementId);
                if (el) {
                    el.style.color = '#ffffff'; // Texto blanco
                    // Forzar estilos para máscara
                    const grid = el.querySelector('.puzzle-grid');
                    if (grid) (grid as HTMLElement).style.background = 'transparent';
                }
            }
        });
        return canvas.toDataURL('image/png');
    } catch (e) {
        console.error("Error generating smart mask:", e);
        return null;
    }
};

/**
 * Exporta el puzzle como imagen o PDF de alta calidad
 */
export const exportPuzzleImage = async (
    elementId: string,
    options: ExportOptions = { format: 'png', quality: 1, scale: 2 }
): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const canvas = await html2canvas(element, {
            scale: options.scale,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null, // Transparente si es posible
            logging: false
        });

        const fileName = options.fileName || `puzzle-export-${Date.now()}`;

        if (options.format === 'pdf') {
            const imgData = canvas.toDataURL('image/jpeg', options.quality);
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'l' : 'p',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
            pdf.save(`${fileName}.pdf`);
        } else {
            const link = document.createElement('a');
            link.download = `${fileName}.${options.format}`;
            link.href = canvas.toDataURL(`image/${options.format}`, options.quality);
            link.click();
        }

    } catch (err) {
        console.error("Export failed:", err);
        throw err; // Re-lanzar para manejar en UI
    }
};
