import { useState, useEffect } from 'react';

interface GridDimensions {
    width: number;
    height: number;
}

/**
 * Custom hook to calculate the optimal grid size to fit within a container.
 * 
 * @param wrapperRef - Reference to the container element
 * @param gridCols - Number of columns in the grid
 * @param gridRows - Number of rows in the grid
 * @param maxCellSize - Maximum allowed size for a single cell in pixels (default: 48)
 * @returns Object containing gridDimensions and calculated cellSize
 */
export const useGridAutoSize = (
    wrapperRef: React.RefObject<HTMLElement>,
    gridCols: number,
    gridRows: number,
    maxCellSize: number = 48
) => {
    const [gridDimensions, setGridDimensions] = useState<GridDimensions>({ width: 0, height: 0 });

    useEffect(() => {
        if (!wrapperRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;

                // 1. Calculate the maximum possible cell size that fits in the container
                // Guard against 0 cols/rows to avoid Infinity
                const safeCols = gridCols > 0 ? gridCols : 10;
                const safeRows = gridRows > 0 ? gridRows : 10;

                const maxPossibleCellWidth = width / safeCols;
                const maxPossibleCellHeight = height / safeRows;
                const maxFitCellSize = Math.min(maxPossibleCellWidth, maxPossibleCellHeight);

                // 2. Determine actual cell size constrained by maxCellSize
                const actualCellSize = Math.min(maxFitCellSize, maxCellSize);

                // 3. Calculate final grid dimensions
                const finalWidth = actualCellSize * safeCols;
                const finalHeight = actualCellSize * safeRows;

                // Safety check to avoid 0/NaN or negative values
                if (finalWidth > 0 && finalHeight > 0) {
                    setGridDimensions(prev => {
                        // OPTIMIZATION: Avoid re-rendering if dimensions are practically identical (sub-pixel shifts)
                        if (Math.abs(prev.width - finalWidth) < 1 && Math.abs(prev.height - finalHeight) < 1) {
                            return prev;
                        }
                        return { width: finalWidth, height: finalHeight };
                    });
                }
            }
        });

        observer.observe(wrapperRef.current);
        return () => observer.disconnect();
    }, [gridCols, gridRows, maxCellSize]);

    // Calculate cell size derived from dimensions for convenience
    // Fallback to 0 if dimensions are 0
    const cellSize = gridCols > 0 ? gridDimensions.width / gridCols : 0;

    return { gridDimensions, cellSize };
};
