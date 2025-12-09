
export interface ContrastReport {
  isHeaderDark: boolean;
  isGridDark: boolean;
  averageLuminance: number; // 0 (Negro) a 255 (Blanco)
}

// Calcula la luminancia (brillo percibido)
const getLuminance = (r: number, g: number, b: number) => {
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

export const analyzeImageContrast = (base64Image: string): Promise<ContrastReport> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Image;
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      // Optimización: Usar un canvas pequeño para el análisis estadístico
      // No necesitamos leer 4 millones de pixeles para saber si es oscuro.
      // 100x129 pixeles es suficiente representación.
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); // Flag de optimización para lectura
      if (!ctx) {
        resolve({ isHeaderDark: false, isGridDark: false, averageLuminance: 255 });
        return;
      }

      const SAMPLE_W = 100;
      const SAMPLE_H = 129;
      canvas.width = SAMPLE_W; 
      canvas.height = SAMPLE_H;
      ctx.drawImage(img, 0, 0, SAMPLE_W, SAMPLE_H);

      // ZONAS DE ANÁLISIS (Coordenadas relativas al layout 8.5x11)
      // Header: Top 15%
      // Grid: Center Box (20% al 70% vertical)
      
      const headerData = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H * 0.15).data;
      const gridData = ctx.getImageData(SAMPLE_W * 0.1, SAMPLE_H * 0.25, SAMPLE_W * 0.8, SAMPLE_H * 0.45).data;

      const calculateAverageLuma = (data: Uint8ClampedArray) => {
        let totalLuma = 0;
        let count = 0;
        // Stride de 4 (RGBA) * 4 (saltar pixeles) = 16. Leemos 1 de cada 4 pixeles del sample.
        // Esto es extremadamente rápido.
        for (let i = 0; i < data.length; i += 16) { 
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          totalLuma += getLuminance(r, g, b);
          count++;
        }
        return count > 0 ? totalLuma / count : 128;
      };

      const headerLuma = calculateAverageLuma(headerData);
      const gridLuma = calculateAverageLuma(gridData);
      
      // Umbral conservador: < 100 se considera fondo oscuro
      const THRESHOLD = 100;

      console.log(`👁️ [CENE-EYE OPTIMIZED] Luma Header: ${headerLuma.toFixed(0)}, Luma Grid: ${gridLuma.toFixed(0)}`);

      resolve({
        isHeaderDark: headerLuma < THRESHOLD,
        isGridDark: gridLuma < THRESHOLD,
        averageLuminance: (headerLuma + gridLuma) / 2
      });
    };

    img.onerror = () => {
      // Fallback silencioso
      resolve({ isHeaderDark: false, isGridDark: false, averageLuminance: 255 });
    };
  });
};
