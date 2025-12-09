import { TemplateLayout } from './types';

export const SOPA_BASE_AZUL_V1: TemplateLayout = {
    id: 'sopa-base-azul-v1',
    pageWidth: 2480,
    pageHeight: 3508, // 8.5x11 a ~300dpi
    zones: [
        // --- ZONAS LOCKED (NO DECORAR) ---
        {
            id: 'header-zone',
            type: 'locked',
            role: 'header',
            bbox: { x: 0.08, y: 0.04, width: 0.84, height: 0.12 }
        },
        {
            id: 'grid-zone',
            type: 'locked',
            role: 'grid',
            bbox: { x: 0.20, y: 0.20, width: 0.60, height: 0.35 }
        },
        {
            id: 'wordbox-zone',
            type: 'locked',
            role: 'wordBox',
            bbox: { x: 0.10, y: 0.58, width: 0.80, height: 0.20 }
        },
        {
            id: 'footer-zone',
            type: 'locked',
            role: 'footer',
            bbox: { x: 0.08, y: 0.83, width: 0.84, height: 0.08 }
        },

        // --- ZONAS EDITABLE (DECORAR) ---
        {
            id: 'page-bg',
            type: 'editable',
            role: 'pageBackground',
            bbox: { x: 0, y: 0, width: 1, height: 1 }
        },
        {
            id: 'side-decor-left',
            type: 'editable',
            role: 'sideDecor',
            bbox: { x: 0.02, y: 0.20, width: 0.14, height: 0.35 } // Aprox al lado de la grilla
        },
        {
            id: 'side-decor-right',
            type: 'editable',
            role: 'sideDecor',
            bbox: { x: 0.84, y: 0.20, width: 0.14, height: 0.35 } // Aprox al lado derecho
        }
    ]
};
