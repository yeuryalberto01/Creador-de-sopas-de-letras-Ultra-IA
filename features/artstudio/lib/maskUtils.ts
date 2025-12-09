import { TemplateLayout } from './types';

export function createMaskFromTemplate(template: TemplateLayout): string {
    const canvas = document.createElement('canvas');
    canvas.width = template.pageWidth;
    canvas.height = template.pageHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('No se pudo obtener el contexto 2D del canvas para la máscara.');
    }

    // 1. Pintar TODO de BLANCO (lo que es blanco será reemplazado/pintado por la IA)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Pintar zonas LOCKED de NEGRO (lo que es negro se protege/mantiene del original)
    ctx.fillStyle = '#000000';

    template.zones.forEach(zone => {
        if (zone.type === 'locked') {
            const x = zone.bbox.x * canvas.width;
            const y = zone.bbox.y * canvas.height;
            const width = zone.bbox.width * canvas.width;
            const height = zone.bbox.height * canvas.height;

            ctx.fillRect(x, y, width, height);
        }
    });

    return canvas.toDataURL('image/png');
}
