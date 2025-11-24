
# 🏗️ Arquitectura del Proyecto: SopaCreator AI (v4.5 - Art Studio Edition)

Este documento es la **Fuente de la Verdad** técnica del proyecto. Describe la estructura, lógica de negocio, flujos de datos y restricciones críticas. Úsalo para analizar impactos antes de realizar cambios en el código.

---

## 1. 🎯 Visión y Stack Tecnológico
**Objetivo:** Aplicación web profesional para generar, personalizar, imprimir y exportar Sopa de Letras con capacidades de diseño artístico generativo.
**Prioridad:** Calidad de impresión (Letter 8.5x11), UX fluida y robustez en la integración de IA.

**Tecnologías:**
*   **Frontend:** React 19 + TypeScript + Vite (implícito).
*   **Estilos:** Tailwind CSS (con clases personalizadas `print:`).
*   **IA:** Google GenAI SDK (Gemini 2.5) + REST (OpenAI Compatible).
*   **Exportación:** `html2pdf.js` (vía CDN).
*   **Persistencia:** `localStorage` (Browser Native).

---

## 2. 📂 Estructura de Archivos y Responsabilidades

### A. Núcleo (Core)
- **`index.html`**:
  - **Función:** Punto de entrada. Carga librerías críticas (`html2pdf`, Tailwind CDN) y define estilos base `@media print`.
  - **Restricción:** No eliminar el script de `html2pdf` ni los estilos de `@page`.
- **`App.tsx` (Controller)**:
  - **Responsabilidad:** Orquestador principal. Maneja el estado global (`config`, `puzzleData`), controla la UI (Sidebar, Main, Modales) e integra los servicios.
  - **Nuevas Funciones:** 
    - Control de **Grilla Rectangular** (GridSize vs GridRows).
    - Gestión del **Art Studio** (Prompts, Generación, Galería).
    - Sistema de Diagnóstico de APIs.
- **`types.ts` (Contracts)**:
  - **Responsabilidad:** Define las estructuras de datos inmutables.
  - **Modelos Clave:** `PuzzleConfig` (incluye ahora `backgroundId`, `backgroundImage`), `ArtTemplate`, `GeneratedPuzzle`.

### B. Lógica y Algoritmos (Utils)
- **`utils/puzzleGenerator.ts`**:
  - **Responsabilidad:** Motor matemático.
  - **Lógica Rectangular:** Acepta `width` y `height` independientes. Si `height` es `undefined`, asume cuadrado (`width`).
  - **Máscaras de Forma:** Las funciones `isInsideShape` normalizan las coordenadas (0 a 1) para aplicar formas (Corazón, Estrella) sin importar si la grilla es cuadrada o rectangular.
  - **Algoritmo:** Backtracking aleatorio con semilla (Seeded RNG) para reproducibilidad garantizada.

### C. Servicios (Services)
- **`services/aiService.ts`**:
  - **Responsabilidad:** Gateway para LLMs y Modelos de Imagen.
  - **Texto:** Genera palabras y temas (JSON) usando Gemini Flash o OpenAI.
  - **Imágenes (Art Studio):** Usa `gemini-2.5-flash-image`.
    - *Estrategia:* Prompt Engineering específico para "Coloring Book" (B/N) o "Watermark" (Color) para evitar conflictos visuales con el texto.
- **`services/storageService.ts`**:
  - **Responsabilidad:** Capa de persistencia local.
  - **Keys:** 
    - `sopa_creator_db` (Puzzles guardados).
    - `sopa_creator_settings` (API Keys).
    - `sopa_creator_art_library` (Plantillas de arte).

### D. Visualización (Components)
- **`components/PuzzleSheet.tsx`**:
  - **Responsabilidad:** Lienzo de renderizado final (WYSIWYG para impresión).
  - **Estrategia de Capas (Layering Strategy) - CRÍTICO:**
    1.  **Capa 0 (Fondo):** Imagen generada por IA. `absolute inset-0 z-0`. Opacidad variable según estilo.
    2.  **Capa 1 (Contenedor):** `relative z-10`. Contiene todo el texto y la grilla.
    3.  **Capa Grilla:** Si hay imagen de fondo, la grilla tiene un fondo semitransparente (`rgba(255,255,255,0.85)`) para garantizar legibilidad de letras.
  - **Escalado Inteligente:** Calcula el tamaño de celda en pulgadas (`in`) basándose en el ancho (7.2") Y alto (9.0") máximos disponibles.

---

## 3. ⚙️ Flujos Críticos de Datos

### 1. Flujo de Generación de Puzzle (Rectangular)
1.  **Input:** Usuario define `Columnas` (Ancho) y `Filas` (Alto) en `App.tsx`.
2.  **Proceso:** `generatePuzzle(w, h, ...)` crea una matriz `GridCell[h][w]`.
3.  **Validación:** El generador verifica límites `x < width` y `y < height`.
4.  **Render:** `PuzzleSheet` itera sobre `grid` (filas) y `row` (columnas) para pintar.

### 2. Flujo "Art Studio" (Generación de Fondos)
1.  **Prompt:** Usuario describe escena (ej: "Bosque mágico").
2.  **API Call:** `aiService` construye un prompt técnico:
    - *B/N:* "Line art, coloring book style, empty center".
    - *Color:* "Watercolor, pastel, low contrast, watermark".
3.  **Respuesta:** Recibe Base64 de Gemini.
4.  **Almacenamiento:** Se guarda en `localStorage` como `ArtTemplate`.
5.  **Aplicación:** Se inyecta en `PuzzleConfig.backgroundImage`.
6.  **Visualización:** `PuzzleSheet` detecta la imagen y cambia el fondo del papel de `white` a `transparent` para revelar la imagen debajo.

### 3. Flujo de Exportación (PDF)
1.  **Disparador:** Botón "PDF" en Sidebar.
2.  **Librería:** `html2pdf.js`.
3.  **Configuración:**
    - `scale: 3`: Alta resolución (aprox 300 DPI).
    - `format: 'letter'`: Coincide con las dimensiones CSS de `PuzzleSheet`.
4.  **Truco:** `App.tsx` tiene `print:block`. Al exportar, se ignora el escalado CSS (`scale-X`) de la vista previa y se renderiza a tamaño real (8.5x11 in).

---

## 4. 📝 Diccionario de Datos (localStorage)

### `SavedPuzzleRecord`
```typescript
{
  id: string;          // UUID
  name: string;        // Título
  createdAt: number;   // Timestamp
  config: PuzzleConfig;// Configuración completa para recrearlo
  puzzleData: GeneratedPuzzle; // La matriz resuelta (para carga instantánea)
}
```

### `ArtTemplate`
```typescript
{
  id: string;
  name: string;        // Derivado del prompt
  prompt: string;      // Prompt original
  imageBase64: string; // Data URL completa
  style: 'bw' | 'color';
}
```

---

## 5. 🚫 Restricciones y Reglas de Seguridad ("Do Not Break")

1.  **Dimensiones de Papel:** NUNCA modificar `width: 8.5in` y `height: 11in` en `PuzzleSheet.tsx`. Romperá la impresión.
2.  **Z-Index en Fondos:** La imagen de fondo **NO** debe tener `z-index` negativo si el contenedor padre tiene fondo blanco. La estrategia actual (`div` de imagen absoluto + `div` de contenido relativo z-10) es la única que funciona consistentemente con `html2pdf`.
3.  **API Keys:** Nunca exponer las keys en el código cliente si se despliega públicamente. Usar `settings` locales o variables de entorno inyectadas.
4.  **Retro-compatibilidad:** Al cargar un puzzle viejo desde `localStorage`, `gridHeight` puede ser `undefined`. Siempre usar fallback: `height = config.gridHeight || config.gridSize`.

---

## 6. 🛠️ Guía de Mantenimiento

*   **Si los fondos no se ven:** Revisa `PuzzleSheet.tsx`. Asegúrate de que el contenedor principal tenga `backgroundColor: 'transparent'` cuando `backgroundImage` existe.
*   **Si el PDF sale cortado:** Verifica los márgenes en `generatePuzzle` (padding) o ajusta `MAX_WIDTH_INCH` en `PuzzleSheet`.
*   **Si la IA falla:** Usa el botón "Diagnóstico" en el modal de configuración para probar la conexión independientemente de la lógica del puzzle.
