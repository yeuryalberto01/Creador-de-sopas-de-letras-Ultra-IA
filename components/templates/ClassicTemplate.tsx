import React, { useEffect, useRef, useState } from 'react';
import { PuzzleTemplateProps } from './types';
import { DraggableElement } from '../editor/DraggableElement';

export const ClassicTemplate: React.FC<PuzzleTemplateProps> = ({
    puzzle, config, fontFamily,
    isEditMode = false, selectedElement = null, onSelectElement = () => { },
    isPrintPreview = false,
    onDrag
}) => {
    const { grid } = puzzle;
    const placedWords = puzzle.placedWords || puzzle.words || [];

    const {
        title, headerLeft, headerRight, footerText, pageNumber,
        words, showSolution, styleMode, themeData,
        backgroundImage, backgroundStyle,
        margins, overlayOpacity, textOverlayOpacity,
        designTheme, showBorders = true
    } = config;

    // Defaults if margins not provided
    const marginTop = margins?.top ?? 0.5;
    const marginBottom = margins?.bottom ?? 0.5;
    const marginLeft = margins?.left ?? 0.5;
    const marginRight = margins?.right ?? 0.5;

    // Opacity Defaults
    const finalGridOpacity = overlayOpacity !== undefined ? overlayOpacity : 0.85;
    const finalTextOpacity = textOverlayOpacity !== undefined ? textOverlayOpacity : 0.95;

    // Grid Dimensions
    const gridRows = grid.length;
    const gridCols = grid[0]?.length || 10;

    const isColor = styleMode === 'color' && themeData;

    // --- THEME LOGIC ---
    const getThemeStyles = () => {
        if (designTheme === 'classic') {
            return {
                pageStyle: {},
                contentStyle: { border: showBorders ? '3px double black' : 'none', padding: '0' }, // Padding handled by flex gap
                headerTitle: { fontFamily: '"Times New Roman", serif', textTransform: 'uppercase' as const, letterSpacing: '0.2em', borderBottom: showBorders ? '1px solid black' : 'none', paddingBottom: '0.2rem' },
                gridBorder: { border: showBorders ? '2px solid black' : 'none', borderRadius: 0 },
                wordListTitle: { fontFamily: '"Times New Roman", serif', fontStyle: 'italic', borderBottom: 'none' }
            };
        }
        if (designTheme === 'kids') {
            if (isColor) {
                return {
                    pageStyle: { backgroundColor: undefined },
                    contentStyle: { border: showBorders ? '6px solid #FFB347' : 'none', borderRadius: '20px', padding: '0.25in' },
                    headerTitle: { fontFamily: '"Comic Sans MS", cursive', color: '#FF4500', textShadow: '2px 2px 0px #FFD700', letterSpacing: '0.05em' },
                    gridBorder: { border: showBorders ? '4px dashed #77DD77' : 'none', borderRadius: '15px', backgroundColor: 'rgba(255,255,255,0.8)' },
                    wordListTitle: { fontFamily: '"Comic Sans MS", cursive', backgroundColor: '#FF6961', color: 'white', borderRadius: '10px', padding: '0.2rem 0.8rem' }
                };
            } else {
                return {
                    pageStyle: {},
                    contentStyle: { border: showBorders ? '6px solid black' : 'none', borderRadius: '20px', padding: '0.25in' },
                    headerTitle: { fontFamily: '"Comic Sans MS", cursive', color: 'black', letterSpacing: '0.05em' },
                    gridBorder: { border: showBorders ? '4px dashed black' : 'none', borderRadius: '15px' },
                    wordListTitle: { fontFamily: '"Comic Sans MS", cursive', border: '2px solid black', borderRadius: '10px', padding: '0.2rem 0.8rem' }
                };
            }
        }
        if (designTheme === 'modern') {
            return {
                pageStyle: {},
                contentStyle: {
                    border: showBorders ? (isColor ? '2px solid #6366f1' : '2px solid black') : 'none',
                    borderRadius: '16px',
                    padding: '0.5in'
                },
                headerTitle: { fontFamily: 'Inter, sans-serif', fontWeight: '800', letterSpacing: '-0.02em' },
                gridBorder: { border: showBorders ? '1px solid rgba(0,0,0,0.1)' : 'none', borderRadius: '8px' },
                wordListTitle: { fontFamily: 'Inter, sans-serif', fontWeight: '600' }
            };
        }
        if (designTheme === 'minimal') {
            return {
                pageStyle: {},
                contentStyle: {
                    border: showBorders ? '1px solid #94a3b8' : 'none',
                    padding: '0.5in'
                },
                headerTitle: { fontFamily: 'Inter, sans-serif', fontWeight: '300', letterSpacing: '0.1em' },
                gridBorder: { border: 'none' },
                wordListTitle: { fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', fontSize: '0.8em', letterSpacing: '0.1em' }
            };
        }
        return {
            pageStyle: {},
            contentStyle: { border: showBorders ? '1px solid black' : 'none', padding: '0.5in' },
            headerTitle: {},
            gridBorder: {},
            wordListTitle: {}
        };
    };

    const themeStyles = getThemeStyles();

    const pageBackgroundStyle = isPrintPreview
        ? { backgroundColor: 'white' }
        : (isColor
            ? { backgroundColor: themeData.backgroundColor }
            : { backgroundColor: backgroundImage ? 'transparent' : (themeStyles.pageStyle.backgroundColor || 'white') });

    const headerTextColor = isPrintPreview ? 'black' : (isColor ? themeData.primaryColor : 'black');

    // --- AUTO-ADJUST LOGIC (ResizeObserver) ---
    const gridWrapperRef = useRef<HTMLDivElement>(null);
    const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!gridWrapperRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;

                // 1. Calculate the maximum possible cell size that fits in the container
                const maxPossibleCellWidth = width / gridCols;
                const maxPossibleCellHeight = height / gridRows;
                const maxFitCellSize = Math.min(maxPossibleCellWidth, maxPossibleCellHeight);

                // 2. Define a Maximum Allowed Cell Size (e.g., ~45px or 0.45 inches)
                // This prevents 10x10 grids from having huge letters.
                // 1 inch = 96px. 0.5 inch = 48px.
                const MAX_ALLOWED_CELL_SIZE = 48;

                // 3. Determine actual cell size
                const actualCellSize = Math.min(maxFitCellSize, MAX_ALLOWED_CELL_SIZE);

                // 4. Calculate final grid dimensions
                const finalWidth = actualCellSize * gridCols;
                const finalHeight = actualCellSize * gridRows;

                // Safety check to avoid 0/NaN
                if (finalWidth > 0 && finalHeight > 0) {
                    setGridDimensions({ width: finalWidth, height: finalHeight });
                }
            }
        });

        observer.observe(gridWrapperRef.current);
        return () => observer.disconnect();
    }, [gridCols, gridRows]);

    // Font Size Calculation based on measured dimensions
    // Convert pixels to inches approximation for consistency if needed, but here we work in pixels for display
    // 1 inch = 96px usually in browser
    const baseFontSizePx = Math.min(gridDimensions.width / gridCols, gridDimensions.height / gridRows) * 0.6;
    const fontSizePx = baseFontSizePx * (config.gridFontSizeScale || 1.0);

    const getGridBackgroundColor = () => {
        if (isPrintPreview) return 'transparent';
        if (!isColor) return 'transparent';
        if (backgroundImage) return `rgba(255, 255, 255, ${0.85 * finalGridOpacity})`;
        return 'transparent';
    };

    const gridContainerStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridTemplateRows: `repeat(${gridRows}, 1fr)`,
        width: `${gridDimensions.width}px`,
        height: `${gridDimensions.height}px`,
        margin: '0 auto', // Center in wrapper
        backgroundColor: getGridBackgroundColor(),
        borderColor: isPrintPreview ? 'black' : (isColor ? themeData.primaryColor : 'black'),
        backdropFilter: backgroundImage && finalGridOpacity > 0.05 && finalGridOpacity < 0.95 ? 'blur(2px)' : 'none',
        borderRadius: config.maskShape === 'CIRCLE' ? '50%' : (config.maskShape === 'SQUARE' ? '4px' : '0'),
        boxShadow: backgroundImage && config.maskShape === 'SQUARE' && finalGridOpacity > 0.4 ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
        ...themeStyles.gridBorder,
        ...(config.maskShape === 'CIRCLE' ? { borderRadius: '50%' } : {})
    };

    const cellStyle = (isWord: boolean, isValid: boolean): React.CSSProperties => ({
        color: isPrintPreview ? 'black' : (isColor ? themeData.textColor : 'black'),
        backgroundColor: showSolution && isWord
            ? (isColor ? themeData.primaryColor : '#d1d5db')
            : 'transparent',
        fontWeight: '900',
        textShadow: backgroundImage ? '0px 0px 3px rgba(255, 255, 255, 0.9), 0px 0px 1px white' : 'none',
        zIndex: 1,
        fontSize: `${fontSizePx}px`,
        lineHeight: 1 // Tight line height
    });

    const getTextCardStyle = (addMarginBottom: boolean = true): React.CSSProperties => {
        if (isPrintPreview) return { backgroundColor: 'transparent', border: 'none', boxShadow: 'none', marginBottom: addMarginBottom ? '0.5rem' : '0' };
        if (!hasBackground && designTheme !== 'modern') return { marginBottom: addMarginBottom ? '0.5rem' : '0' };
        if (hasBackground) return { backgroundColor: 'transparent', border: 'none', boxShadow: 'none', marginBottom: addMarginBottom ? '0.5rem' : '0', padding: '0.5rem' };
        return {
            backgroundColor: `rgba(255, 255, 255, ${Math.max(finalTextOpacity, 0.92)})`,
            backdropFilter: 'blur(8px)',
            borderRadius: '0.75rem',
            padding: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            marginBottom: addMarginBottom ? '1rem' : '0'
        };
    };

    const hasBackground = !!backgroundImage;

    return (
        <div
            style={{
                width: '8.5in',
                height: '11in',
                paddingTop: `${marginTop}in`,
                paddingBottom: `${marginBottom}in`,
                paddingLeft: `${marginLeft}in`,
                paddingRight: `${marginRight}in`,
                backgroundColor: 'white',
                ...pageBackgroundStyle,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Background Layer */}
            {backgroundImage && !isPrintPreview && (
                <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                    <img
                        src={backgroundImage}
                        alt="Puzzle Background"
                        className="w-full h-full object-cover"
                        style={{
                            filter: config.backgroundFilters
                                ? `brightness(${config.backgroundFilters.brightness}%) contrast(${config.backgroundFilters.contrast}%) grayscale(${config.backgroundFilters.grayscale}%) blur(${config.backgroundFilters.blur}px) sepia(${config.backgroundFilters.sepia}%)`
                                : (backgroundStyle === 'bw' ? 'grayscale(100%) contrast(125%)' : 'none')
                        }}
                    />
                </div>
            )}

            {isColor && !backgroundImage && (
                <div className="absolute top-0 left-0 w-full h-4 opacity-50 z-0" style={{ backgroundColor: themeData.primaryColor }} />
            )}

            {/* Main Content Container - Flexbox */}
            <div
                className="relative z-10 w-full h-full flex flex-col"
                style={{ ...themeStyles.contentStyle }}
            >
                {/* Header (Natural Height) */}
                <div className="w-full flex-shrink-0" style={getTextCardStyle(true)}>
                    <div className={`w-full ${!hasBackground && designTheme !== 'classic' ? 'border-b-2 pb-2' : ''}`} style={{ borderColor: headerTextColor, color: headerTextColor }}>
                        <DraggableElement id="title" isEditMode={isEditMode} isSelected={selectedElement === 'title'} onSelect={onSelectElement} onDrag={onDrag}>
                            <h1 className="text-4xl font-bold text-center uppercase tracking-wider mb-1" style={{ fontFamily: config.fontType === 'FUN' ? fontFamily : 'Inter', ...themeStyles.headerTitle }}>
                                {title || "Sopa de Letras"}
                            </h1>
                        </DraggableElement>
                        <div className="flex justify-between mt-1 text-sm font-mono-puzzle w-full px-2" style={{ color: isColor ? themeData.textColor : 'black' }}>
                            <DraggableElement id="headerLeft" isEditMode={isEditMode} isSelected={selectedElement === 'headerLeft'} onSelect={onSelectElement} onDrag={onDrag}>
                                <span className="min-w-[100px]">{headerLeft}</span>
                            </DraggableElement>
                            <DraggableElement id="headerRight" isEditMode={isEditMode} isSelected={selectedElement === 'headerRight'} onSelect={onSelectElement} onDrag={onDrag}>
                                <span className="min-w-[100px] text-right">{headerRight}</span>
                            </DraggableElement>
                        </div>
                    </div>
                </div>

                {/* Grid Wrapper (Fills remaining space) */}
                <div
                    ref={gridWrapperRef}
                    className="flex-grow flex items-center justify-center w-full relative min-h-0 overflow-hidden my-2"
                >
                    {/* The Grid itself */}
                    <DraggableElement
                        id="grid"
                        isEditMode={isEditMode}
                        isSelected={selectedElement === 'grid'}
                        onSelect={onSelectElement}
                        onDrag={onDrag}
                        className={`transition-all duration-300 ${showBorders && config.maskShape === 'SQUARE' && designTheme !== 'classic' ? 'border-2' : ''}`}
                        style={gridContainerStyle}
                    >
                        {grid.map((row, y) => (
                            row.map((cell, x) => {
                                const isSolutionCell = showSolution && cell.isWord;
                                return (
                                    <div
                                        key={`${x}-${y}`}
                                        className={`flex items-center justify-center font-bold ${showSolution && !cell.isWord ? 'opacity-30' : ''}`}
                                        style={cellStyle(isSolutionCell, cell.isValid)}
                                    >
                                        {cell.isValid ? cell.letter : ''}
                                    </div>
                                );
                            })
                        ))}
                    </DraggableElement>
                </div>

                {/* Word List (Natural Height) */}
                <div className="w-full flex-shrink-0" style={getTextCardStyle(true)}>
                    <DraggableElement id="wordList" isEditMode={isEditMode} isSelected={selectedElement === 'wordList'} onSelect={onSelectElement} onDrag={onDrag}>
                        <h3 className="text-lg font-bold mb-1 inline-block px-2 py-0.5 rounded-t-md border-b" style={{ color: isColor ? 'white' : 'black', backgroundColor: isColor ? themeData.primaryColor : 'transparent', borderColor: 'black', fontFamily: config.fontType === 'FUN' ? fontFamily : 'inherit', ...themeStyles.wordListTitle }}>
                            Palabras a encontrar:
                        </h3>
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs sm:text-sm font-medium w-full px-2" style={{ color: isColor ? themeData.textColor : 'black', fontFamily: config.fontType === 'FUN' ? fontFamily : 'inherit' }}>
                            {words.sort().map((word, idx) => {
                                const isFound = placedWords.some(pw => pw.word === word);
                                return (
                                    <div key={idx} className={`flex items-center ${!isFound ? 'text-red-600 font-bold decoration-4 decoration-red-600' : ''}`} style={!isFound ? { textDecoration: 'line-through', textDecorationThickness: '2px' } : {}}>
                                        <span className="w-2 h-2 border mr-1 inline-block shadow-sm flex-shrink-0" style={{ borderColor: isColor ? themeData.primaryColor : 'black', backgroundColor: isColor ? 'white' : 'transparent', boxShadow: isColor ? 'none' : '1px 1px 0 0 rgba(0,0,0,1)' }}></span>
                                        <span className="truncate">{word}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </DraggableElement>
                </div>

                {/* Footer (Natural Height) */}
                <div className="w-full flex-shrink-0" style={getTextCardStyle(false)}>
                    <div className={`w-full flex justify-between items-end text-gray-500 ${!hasBackground ? 'border-t pt-1' : ''} relative`}>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-medium uppercase tracking-wide">{footerText !== undefined ? footerText : "Generado con SopaCreator AI"}</span>
                            <span className="font-mono text-[8px] opacity-60">ID: {puzzle.seed}</span>
                        </div>
                        {pageNumber && <div className="text-lg font-bold font-mono text-black absolute right-0 bottom-1">{pageNumber}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};
