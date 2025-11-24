
# 🏗️ Arquitectura del Proyecto: SopaCreator AI (v4.6 - Layout Engine Edition)

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
    - Control de **Márgenes Dinámicos** (Top, Bottom, Left, Right).
    - Control de **Grilla Rectangular** (GridSize vs GridRows).
    - Gestión del **Art Studio** (Prompts, Generación, Galería).
    - Sistema de Diagnóstico de APIs.
    - Implementación extensiva de **Tooltips** para UX.
- **`types.ts` (Contracts)**:
  - **Responsabilidad:** Define las estructuras de datos inmutables.
  - **Modelos Clave:** `PuzzleConfig` (incluye ahora `margins: PuzzleMargins`), `GeneratedPuzzle`.

### B. Lógica y Algoritmos (Utils)
- **`utils/puzzleGenerator.ts`**:
  - **Responsabilidad:** Motor matemático.
  - **Lógica Rectangular:** Acepta `width` y `height` independientes.
  - **Algoritmo:** Backtracking aleatorio con semilla (Seeded RNG).

### C. Servicios (Services)
- **`services/aiService.ts`**:
  - **Responsabilidad:** Gateway para LLMs y Modelos de Imagen.
  - **Texto:** Genera palabras y temas (JSON).
  - **Imágenes (Art Studio):** Usa `gemini-2.5-flash-image` con prompts optimizados para no interferir con el texto.
- **`services/storageService.ts`**:
  - **Responsabilidad:** Capa de persistencia local (`localStorage`).

### D. Visualización (Components)
- **`components/PuzzleSheet.tsx`**:
  - **Responsabilidad:** Lienzo de renderizado final (WYSIWYG para impresión).
  - **Motor de Maquetación (Layout Engine) - CRÍTICO:**
    - Recibe `margins` (pulgadas) desde la config.
    - **Cálculo:** `availableWidth = 8.5 - marginLeft - marginRight`.
    - **Padding:** Aplica padding CSS directamente al contenedor raíz de la hoja.
    - **Escalado de Grilla:** Calcula el tamaño de celda (`cellSize`) dividiendo el `availableWidth` por `gridCols`. Si la grilla es muy densa y los márgenes muy grandes, las celdas se hacen pequeñas automáticamente.
  - **Estrategia de Capas:**
    1.  **Capa 0 (Fondo):** Imagen generada por IA (`absolute inset-0`).
    2.  **Capa 1 (Contenedor):** `relative z-10`. Contiene todo el texto y la grilla.

---

## 3. ⚙️ Flujos Críticos de Datos

### 1. Flujo de Layout Dinámico
1.  **Input:** Usuario mueve sliders de márgenes en `App.tsx` (0 a 3 pulgadas).
2.  **Estado:** `App.tsx` actualiza el objeto `margins` y lo pasa a `PuzzleSheet`.
3.  **Render:** 
    - `PuzzleSheet` aplica `style={{ paddingLeft: margins.left + 'in', ... }}`.
    - Recalcula `maxGridWidth` y `maxGridHeight`.
    - Ajusta `cellSize` para que la grilla *nunca* desborde el área segura (Area Pagina - Margenes).

### 2. Flujo de Generación de Puzzle (Rectangular)
1.  **Input:** Usuario define `Columnas` (Ancho) y `Filas` (Alto).
2.  **Proceso:** `generatePuzzle` crea matriz `GridCell`.
3.  **Visualización:** La grilla se renderiza dentro del área calculada en el punto 1.

### 3. Flujo "Art Studio"
1.  **Prompt:** Usuario describe escena.
2.  **API Call:** Genera imagen B/N o Color.
3.  **Visualización:** `PuzzleSheet` hace transparente el fondo del papel para revelar la imagen, pero mantiene un fondo semitransparente detrás de la grilla de letras para legibilidad.

---

## 4. 📝 Diccionario de Datos (localStorage)

### `PuzzleMargins`
```typescript
{
  top: number;    // Pulgadas (ej: 0.5)
  bottom: number;
  left: number;
  right: number;
}
```

### `SavedPuzzleRecord`
Ahora incluye `margins` dentro de `config`.

---

## 5. 🚫 Restricciones y Reglas de Seguridad

1.  **Dimensiones de Papel:** NUNCA modificar `width: 8.5in` y `height: 11in` en `PuzzleSheet.tsx` como base. Los márgenes deben aplicarse como *padding* interno, no reduciendo el tamaño del contenedor externo.
2.  **Z-Index:** La imagen de fondo va en `z-0`, el contenido en `z-10`.
3.  **Impresión:** `@media print` elimina los márgenes del navegador, por lo que los márgenes internos definidos en `PuzzleSheet` son los únicos que contarán en el papel físico.
