
# 🏗️ Arquitectura del Proyecto: SopaCreator AI

Este documento sirve como la **Fuente de la Verdad** para cualquier Inteligencia Artificial o desarrollador que trabaje en este proyecto. Describe la estructura, la lógica de negocio, los flujos de datos y las restricciones críticas para evitar romper la funcionalidad existente.

---

## 1. 🎯 Objetivo del Proyecto
Una aplicación web profesional (React + TypeScript) para generar, personalizar, imprimir y exportar Sopa de Letras (Word Search Puzzles). 
**Prioridad Máxima:** La calidad de la exportación a PDF/Impresión (formato Letter 8.5x11 estricto) y la integración robusta con APIs de IA (Gemini, DeepSeek, Grok).

---

## 2. 📂 Estructura de Archivos y Responsabilidades

### Núcleo (Core)
- **`index.html`**: 
  - **CRÍTICO:** Contiene la librería `html2pdf.bundle.min.js` (CDN) y los estilos CSS `@media print`.
  - **Regla:** No eliminar los estilos de `@page` ni el script de `html2pdf`.
- **`App.tsx`**: 
  - **Función:** Es el "Cerebro" (Controller). Maneja todo el estado global, modales y orquesta la comunicación entre servicios.
  - **UI:** Contiene la Sidebar (controles), el Main (previsualización) y los Modales.
  - **Art Studio:** Ahora incluye un modal completo para generar, gestionar y aplicar imágenes de fondo generadas por IA.
  - **Estado de Grilla:** Maneja independientemente `gridSize` (Ancho/Columnas) y `gridRows` (Alto/Filas).
- **`types.ts`**: 
  - **Función:** Define los contratos de datos (`GeneratedPuzzle`, `PuzzleConfig`, `AISettings`, `ArtTemplate`).
  - **Regla:** Si cambias una interfaz aquí, debes actualizar `puzzleGenerator.ts` y `storageService.ts`.

### Lógica (Utils & Services)
- **`utils/puzzleGenerator.ts`**: 
  - **Función:** Algoritmo matemático puro.
  - **Componentes:** RNG (Generador de números aleatorios con semilla), lógica de colocación de palabras, detección de colisiones y máscaras de formas (`ShapeType`).
  - **Soporte Rectangular:** El generador ahora soporta ancho y alto independientes. Las formas (Círculos, Corazones) se escalan al cuadro delimitador (bounding box) de la grilla rectangular.
- **`services/aiService.ts`**: 
  - **Función:** Capa de comunicación con LLMs.
  - **Soporte:** Google Gemini (SDK nativo) y OpenAI Compatible (DeepSeek, Grok, Local) via REST.
  - **Generación de Imágenes:** Utiliza `gemini-2.5-flash-image` para crear bordes en blanco y negro o fondos artísticos.
  - **Regla:** Siempre limpia y valida el JSON devuelto por la IA.
- **`services/storageService.ts`**: 
  - **Función:** Persistencia en `localStorage` (Configuración, Biblioteca de Puzzles, y Biblioteca de Arte).

### Visualización (Components)
- **`components/PuzzleSheet.tsx`**: 
  - **Función:** El componente visual que se renderiza en pantalla Y se imprime.
  - **CRÍTICO:** Utiliza medidas en pulgadas (`in`) y `aspect-ratio` para garantizar la fidelidad al imprimir.
  - **Capas:** 
    1. Fondo (Imagen IA Generada)
    2. Decoración CSS (Si es modo color y sin imagen)
    3. Grilla y Textos
  - **Escalado:** Implementa lógica para reducir el tamaño de celda si la grilla excede 7.2" de ancho o 9.0" de alto, asegurando que siempre quepa en la hoja carta.

---

## 3. ⚙️ Flujos Críticos (Cómo funciona todo)

### A. Generación del Puzzle
1. Usuario cambia configuración en Sidebar (`App.tsx`).
2. Se llama a `handleGeneratePuzzle()`.
3. `calculateSmartGridSize` decide el tamaño óptimo (para modo Auto).
4. `generatePuzzle` (en utils) crea la matriz bidimensional (`GridCell[][]`) usando filas y columnas específicas.
5. El estado `generatedPuzzle` se actualiza.
6. `<PuzzleSheet />` recibe los nuevos datos y se re-renderiza.

### B. Sistema de Exportación (PDF e Impresión) - ¡ZONA FRÁGIL!
Este es el punto más delicado de la app.
- **ID Objetivo:** `#puzzle-sheet` en `PuzzleSheet.tsx`.
- **Impresión Nativa:** Se basa en `index.html` -> `@media print`. Las clases de Tailwind `print:hidden` en `App.tsx` ocultan la UI (sidebar, botones).
- **PDF (html2pdf):**
  - Usa `html2canvas` con `scale: 3` para alta resolución.
  - Ignora los estilos de impresión del navegador y toma una "foto" del elemento DOM.
  - **Regla:** El contenedor padre en `App.tsx` tiene transformaciones CSS (`scale-[0.65]`) para que quepa en pantalla. Al imprimir/exportar, estas transformaciones se anulan (`print:scale-100`, `print:transform-none`) para que salga a tamaño real.

### C. Integración IA & Arte
1. **Palabras:** `App.tsx` -> `aiService.generateWordListAI`. Retorna JSON.
2. **Arte:** `Art Studio Modal` -> `aiService.generatePuzzleBackground`.
   - Prompt Engineering específico para B/N (Line Art) vs Color (Watermark).
   - Retorna Base64 de la imagen generada.
   - Se guarda en `localStorage` como `ArtTemplate`.

---

## 4. 🎮 Guía de UI (Botones y Controles)

### Sidebar (Panel Izquierdo)
1. **Contenido:** Input para Tema (IA) y lista de palabras manual.
2. **Grilla:** Switch Auto/Manual. Sliders para **Columnas** y **Filas** independientes.
3. **Diseño y Arte:** 
   - Botón "Arte y Decoración" (Abre Modal).
   - Selector de Formas (Cuadrado, Corazón, etc.).
   - Fuentes y Modo Color.
4. **Textos:** Títulos y campos de metadatos.
5. **Footer Actions:** Botones grandes de Generar, Guardar, PDF e Imprimir.

### Modal Art Studio
- **Izquierda:** Prompt de entrada, Selector de Estilo (B/N vs Color), Botón Generar.
- **Derecha:** Galería de plantillas guardadas con vista previa y botones Aplicar/Borrar.

### Modales
- **Configuración (Engranaje):** Gestiona API Keys y realiza el "Diagnóstico del Sistema".
- **Biblioteca (Carpeta):** Carga/Borra puzzles de `localStorage`.
- **Diagnóstico (Pulso):** Ejecuta pruebas unitarias en vivo sobre las librerías y APIs.

---

## 5. 🚫 Reglas de Oro para la IA (DO NOT BREAK)

1. **NO ELIMINAR** las clases `print:hidden`, `print:block`, `print:w-full`, etc. Son vitales para que la hoja salga limpia en papel.
2. **NO MODIFICAR** el tamaño fijo de `8.5in` x `11in` en `PuzzleSheet.tsx`.
3. **MANTENER** el `<script>` de `html2pdf` en `index.html`. No intentar importarlo via NPM (causa problemas de compatibilidad con React 18/19 en algunos entornos de compilación rápida).
4. **INTEGRIDAD DE DATOS:** Al modificar `generatePuzzle`, asegurar que siempre devuelva un objeto compatible con la interfaz `GeneratedPuzzle`.
5. **MANEJO DE ERRORES:** Siempre envolver las llamadas a APIs de IA en `try/catch` y notificar al usuario en la UI, no solo en consola.

---

*Este archivo debe ser consultado antes de realizar cambios estructurales o de refactorización.*
