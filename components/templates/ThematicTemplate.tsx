import React, { useEffect, useRef, useState } from 'react';
import { PuzzleTemplateProps } from './types';
import { DraggableElement } from '../editor/DraggableElement';

export const ThematicTemplate: React.FC<PuzzleTemplateProps> = ({
    puzzle, config, fontFamily,
    isEditMode = false, selectedElement = null, onSelectElement = () => { },
    isPrintPreview = false,
    onDrag
}) => {
    const { grid } = puzzle;
    const placedWords = puzzle.placedWords || puzzle.words || [];

    const {
        title, headerLeft, headerRight, footerText,
        words, showSolution, themeData,
        backgroundImage, margins,
        overlayOpacity, textOverlayOpacity
    } = config;

    // Thematic Defaults
    // We want high contrast text by default if no theme is set, but usually this template implies a background.
    const primaryColor = isPrintPreview ? '#000000' : (themeData?.primaryColor || '#ffffff');
    const textColor = isPrintPreview ? '#000000' : (themeData?.textColor || '#ffffff');
    const accentColor = isPrintPreview ? '#666666' : (themeData?.secondaryColor || '#fbbf24'); // Amber for gold/highlight

    // Margins - For Thematic, we might want 0 margins for the background, but content needs padding.
    // We'll apply margins to the content container, not the page itself for the background.
    const marginTop = margins?.top ?? 0.5;
    const marginBottom = margins?.bottom ?? 0.5;
    const marginLeft = margins?.left ?? 0.5;
    const marginRight = margins?.right ?? 0.5;

    // Grid Dimensions
    const gridRows = grid.length;
    const gridCols = grid[0]?.length || 10;

    // --- AUTO-ADJUST LOGIC (ResizeObserver) ---
    const gridWrapperRef = useRef<HTMLDivElement>(null);
    const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!gridWrapperRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                const maxPossibleCellWidth = width / gridCols;
                const maxPossibleCellHeight = height / gridRows;
                const maxFitCellSize = Math.min(maxPossibleCellWidth, maxPossibleCellHeight);
                const MAX_ALLOWED_CELL_SIZE = 55; // Slightly larger for thematic
                const actualCellSize = Math.min(maxFitCellSize, MAX_ALLOWED_CELL_SIZE);
                const finalWidth = actualCellSize * gridCols;
                const finalHeight = actualCellSize * gridRows;

                if (finalWidth > 0 && finalHeight > 0) {
                    setGridDimensions({ width: finalWidth, height: finalHeight });
                }
            }
        });

        observer.observe(gridWrapperRef.current);
        return () => observer.disconnect();
    }, [gridCols, gridRows]);

    const baseFontSizePx = Math.min(gridDimensions.width / gridCols, gridDimensions.height / gridRows) * 0.65;
    const fontSizePx = baseFontSizePx * (config.gridFontSizeScale || 1.0);

    const getLayoutStyle = (id: string): React.CSSProperties => {
        if (config.isFreeLayout && config.layout?.[id]) {
            return {
                position: 'absolute',
                left: `${config.layout[id].x}px`,
                top: `${config.layout[id].y}px`,
                zIndex: 20,
                width: 'auto',
                maxWidth: '100%'
            };
        }
        return {};
    };

    // Helper for text shadows to ensure readability on busy backgrounds
    const textShadow = isPrintPreview ? 'none' : '0px 2px 4px rgba(0,0,0,0.8)';

    return (
        <div
            style={{
                width: '8.5in',
                height: '11in',
                position: 'relative',
                backgroundColor: 'white',
                overflow: 'hidden', // Clip background
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Full Bleed Background */}
            {backgroundImage && !isPrintPreview && (
                <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                    <img
                        src={backgroundImage}
                        alt="Background"
                        className="w-full h-full object-cover"
                        style={{
                            filter: config.backgroundFilters
                                ? `brightness(${config.backgroundFilters.brightness}%) contrast(${config.backgroundFilters.contrast}%) grayscale(${config.backgroundFilters.grayscale}%) blur(${config.backgroundFilters.blur}px) sepia(${config.backgroundFilters.sepia}%)`
                                : 'none'
                        }}
                    />
                </div>
            )}

            {/* Content Container with Margins */}
            <div
                className="relative z-10 flex flex-col w-full h-full"
                style={{
                    paddingTop: `${marginTop}in`,
                    paddingBottom: `${marginBottom}in`,
                    paddingLeft: `${marginLeft}in`,
                    paddingRight: `${marginRight}in`,
                }}
            >
                {/* Header */}
                <div className="w-full flex-shrink-0 mb-4">
                    <DraggableElement
                        id="title"
                        isEditMode={isEditMode}
                        isSelected={selectedElement === 'title'}
                        onSelect={onSelectElement}
                        onDrag={onDrag}
                        style={getLayoutStyle('title')}
                    >
                        <h1
                            className="text-5xl font-black text-center uppercase tracking-widest drop-shadow-lg"
                            style={{
                                fontFamily: config.fontType === 'FUN' ? fontFamily : "'Cinzel', serif", // Default to a "Thematic" font
                                color: primaryColor,
                                textShadow: textShadow,
                                WebkitTextStroke: isPrintPreview ? '0px' : '1px rgba(0,0,0,0.3)'
                            }}
                        >
                            {title || "SOPA DE LETRAS"}
                        </h1>
                        <div className="flex justify-between mt-2 px-4 font-bold text-lg" style={{ color: textColor, textShadow }}>
                            <span>{headerLeft}</span>
                            <span>{headerRight}</span>
                        </div>
                    </DraggableElement>
                </div>

                {/* Grid */}
                <div
                    ref={gridWrapperRef}
                    className="flex-grow flex items-center justify-center relative min-h-0"
                >
                    <DraggableElement
                        id="grid"
                        isEditMode={isEditMode}
                        isSelected={selectedElement === 'grid'}
                        onSelect={onSelectElement}
                        onDrag={onDrag}
                        className="transition-all duration-300"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                            width: `${gridDimensions.width}px`,
                            height: `${gridDimensions.height}px`,
                            backgroundColor: isPrintPreview ? 'transparent' : `rgba(255, 255, 255, ${overlayOpacity ?? 0.85})`,
                            borderRadius: '16px',
                            padding: '16px',
                            boxShadow: isPrintPreview ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                            border: isPrintPreview ? '2px solid black' : '1px solid rgba(255,255,255,0.5)',
                            backdropFilter: isPrintPreview ? 'none' : 'blur(8px)',
                            ...getLayoutStyle('grid')
                        }}
                    >
                        {grid.map((row, y) => (
                            row.map((cell, x) => {
                                const isSolutionCell = showSolution && cell.isWord;
                                return (
                                    <div
                                        key={`${x}-${y}`}
                                        className="flex items-center justify-center font-bold"
                                        style={{
                                            fontSize: `${fontSizePx}px`,
                                            color: isPrintPreview ? 'black' : (isSolutionCell ? 'white' : '#1f2937'), // Dark text for readability on white plate
                                            backgroundColor: isSolutionCell ? accentColor : 'transparent',
                                            borderRadius: isSolutionCell ? '50%' : '0',
                                            textShadow: 'none'
                                        }}
                                    >
                                        {cell.isValid ? cell.letter : ''}
                                    </div>
                                );
                            })
                        ))}
                    </DraggableElement>
                </div>

                {/* Word List */}
                <div className="w-full flex-shrink-0 mt-4">
                    <DraggableElement
                        id="wordList"
                        isEditMode={isEditMode}
                        isSelected={selectedElement === 'wordList'}
                        onSelect={onSelectElement}
                        onDrag={onDrag}
                        style={getLayoutStyle('wordList')}
                    >
                        <div
                            className="rounded-xl p-4"
                            style={{
                                backgroundColor: isPrintPreview ? 'transparent' : `rgba(255, 255, 255, ${textOverlayOpacity ?? 0.9})`,
                                backdropFilter: isPrintPreview ? 'none' : 'blur(4px)',
                                boxShadow: isPrintPreview ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                border: isPrintPreview ? 'none' : '1px solid rgba(255,255,255,0.5)'
                            }}
                        >
                            <h3
                                className="text-xl font-bold mb-3 text-center uppercase tracking-wider"
                                style={{
                                    fontFamily: config.fontType === 'FUN' ? fontFamily : "'Cinzel', serif",
                                    color: isPrintPreview ? 'black' : '#1f2937'
                                }}
                            >
                                Palabras a encontrar
                            </h3>
                            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                                {words.map((word, idx) => {
                                    const isFound = placedWords.some(pw => pw.word === word);
                                    return (
                                        <div
                                            key={idx}
                                            className={`text-sm font-semibold ${!isFound ? 'line-through opacity-50' : ''}`}
                                            style={{ color: isPrintPreview ? 'black' : '#374151' }}
                                        >
                                            {word}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </DraggableElement>
                </div>

                {/* Footer */}
                <div className="w-full text-center mt-2">
                    <span
                        className="text-[10px] font-medium uppercase tracking-widest opacity-80"
                        style={{ color: textColor, textShadow }}
                    >
                        {footerText || "Generado con IA"}
                    </span>
                </div>
            </div>
        </div>
    );
};
