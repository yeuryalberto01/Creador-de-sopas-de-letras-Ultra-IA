import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import pako from 'pako';
import { PuzzleTemplateProps } from './types';
import { useGridAutoSize } from '../../hooks/useGridAutoSize';
import { DraggableElement } from '../editor/DraggableElement';
import { RenderedAsset } from '../../features/design_library/components/RenderedAsset';
import { effectsToStyle } from '../editor/effectsUtils';

// --- DESIGN 2.0: PROFESSIONAL EDITOR ---
// This component has been refactored to treat Header, Grid, and WordList as distinct
// "Objects" that can be interacted with (via hover detection) and styling is upgraded
// to use 'Playfair Display' and 'Lora' for a magazine/editorial look.

export const ClassicTemplate: React.FC<PuzzleTemplateProps> = ({
    puzzle, config, fontFamily,
    isEditMode = false, selectedElement = null, onSelectElement = () => { },
    isPrintPreview = false,
    onDrag,
    onDoubleClick
}) => {
    const { grid } = puzzle;
    const placedWords = puzzle.placedWords || puzzle.words || [];

    const {
        title, headerLeft, headerRight, footerText, pageNumber,
        words, showSolution, styleMode, themeData: configThemeData,
        backgroundImage, backgroundStyle,
        margins, overlayOpacity, textOverlayOpacity,
        designTheme, showBorders = true,
        designAssets = [] // Defaults to empty array
    } = config;

    // Use themeData from config, fallback to puzzle.theme for color consistency
    const themeData = configThemeData || puzzle.theme;

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

    // --- THEME UTILS ---
    const getFontFamily = (type: string | undefined): string => {
        switch (type) {
            case 'CLASSIC': return '"Courier New", Courier, monospace';
            case 'MODERN': return 'Montserrat, "Inter", sans-serif';
            case 'FUN': return '"Comic Sans MS", "Chalkboard SE", cursive';
            case 'SCHOOL': return '"Times New Roman", Times, serif';
            case 'EDITORIAL': return '"Playfair Display", serif';
            default: return type ? type : 'Montserrat, "Inter", sans-serif';
        }
    };

    // Independent typography per Smart Object
    const headerFont = getFontFamily(config.fontFamilyHeader || 'MODERN');
    const gridFont = getFontFamily(config.fontFamilyGrid || 'CLASSIC');
    const wordListFont = getFontFamily(config.fontFamilyWordList || 'MODERN');

    // Legacy fallback
    const effectiveFontFamily = getFontFamily(config.fontType || 'EDITORIAL');

    // --- OBJECT STYLES ---

    // 1. Hover Detection Helper
    const getSelectionStyle = (elementId: string): React.CSSProperties => {
        if (!isEditMode) return {};
        const isSelected = selectedElement === elementId;
        const hoverColor = isSelected ? '#3b82f6' : 'rgba(59, 130, 246, 0.4)'; // Blue 500

        // Return a transparent border that lights up on hover/select
        return isEditMode ? {
            cursor: 'pointer',
            outline: isSelected ? `2px solid ${hoverColor}` : '1px dashed transparent',
            outlineOffset: '4px',
            transition: 'outline 0.15s ease'
        } : {};
    };

    // 2. Visual Theme Map
    // Bold weights per element
    const headerWeight = config.boldHeader !== false ? '700' : '400'; // Default bold
    const gridWeight = config.boldGrid ? '700' : '400'; // Default normal
    const wordListWeight = config.boldWordList ? '700' : '400'; // Default normal

    // --- OBJECT STYLES SYSTEM (REFACTORED) ---
    // 2. Visual Theme Map - Strict Separation of Concerns

    // A. Layout & Typography (Structure)
    const getThemeLayout = () => {
        // Base structure defaults
        const base = {
            titleFont: headerFont,
            titleWeight: headerWeight,
            gridFont: gridFont,
            gridWeight: gridWeight,
            gridRadius: '2px',
            wordListFont: wordListFont,
            wordListWeight: wordListWeight,
            metaStyle: {
                fontFamily: headerFont,
                textTransform: 'none' as const,
                letterSpacing: 'normal',
                fontSize: '0.9rem',
                borderStyle: 'solid' as const,
                borderWidth: '1px 0',
            },
            gridShadow: '4px 4px 0px rgba(0,0,0,1)' // Default: Classic Retro Hard Shadow
        };

        if (designTheme === 'modern') {
            return {
                ...base,
                gridRadius: '16px', // Slightly more rounded for modern
                gridShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', // Soft Elevation
                titleStyle: {
                    textTransform: 'uppercase' as const,
                    letterSpacing: '-0.02em',
                    fontSize: '3rem'
                },
                metaStyle: {
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.1em',
                    fontSize: '0.75rem',
                    borderWidth: '0'
                }
            };
        }

        if (designTheme === 'invisible' || designTheme === 'minimal') {
            return {
                ...base,
                gridRadius: '0px',
                gridShadow: designTheme === 'minimal' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none', // Minimal has subtle shadow, Invisible has none
                titleStyle: {
                    fontFamily: headerFont || '"Playfair Display", serif',
                    fontWeight: '900',
                    fontSize: '3.0rem',
                    letterSpacing: '-0.02em',
                    marginBottom: '1rem',
                    marginTop: '1rem',
                    textAlign: 'center' as const
                },
                metaStyle: {
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: '500',
                    textTransform: 'uppercase' as const,
                    fontSize: '0.85rem',
                    letterSpacing: '0.3em',
                    borderWidth: '0',
                    textAlign: 'center' as const,
                    // Normalized spacing to match other themes and prevent jumpiness
                    marginTop: '0.5rem',
                    marginBottom: '1.5rem'
                },
                // Crucial: Invisible theme implies no grid borders structure
                gridBorderStyle: 'none'
            };
        }

        if (designTheme === 'kids') {
            return {
                ...base,
                gridRadius: '24px', // Very rounded
                gridShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)', // Soft playful
            };
        }

        // Default: Classic/Editorial
        return base;
    };

    // B. Color & Fill (Palette)
    const getThemePalette = () => {
        // 1. Force B/W if mode is 'bw'
        if (!isColor) {
            return {
                primary: '#000000',
                secondary: '#333333',
                text: '#000000',
                background: '#ffffff',
                gridBorder: '#000000',
                gridBackground: 'transparent',
                metaColor: '#475569'
            };
        }

        // 2. Color Mode: Use provided themeData or strict defaults
        const primary = themeData?.primaryColor || '#1e293b';
        const secondary = themeData?.secondaryColor || '#475569';
        const text = themeData?.textColor || '#1e293b';
        const bg = themeData?.backgroundColor || '#ffffff';

        // Theme-specific color overrides (only defaults if user hasn't customized)
        // Note: In a real "Theme" system, the theme might suggest colors, but themeData should win.
        // We assume themeData IS the winner here.

        return {
            primary,
            secondary,
            text,
            background: bg,
            gridBorder: primary, // In color mode, grid border usually matches primary
            gridBackground: config.gridBackground || '#ffffff',
            metaColor: secondary
        };
    };

    const layout = getThemeLayout();
    const palette = getThemePalette();

    // Compile Styles
    const themeStyles = {
        containerClass: '',
        contentStyle: {
            padding: '2rem',
            height: '100%',
            display: 'flex',
            flexDirection: 'column' as const,
            backgroundColor: palette.background // Apply page background
        },
        titleStyle: {
            fontFamily: layout.titleFont,
            fontWeight: layout.titleWeight,
            fontSize: (layout as any).titleStyle?.fontSize || '3.5rem',
            lineHeight: (layout as any).titleStyle?.lineHeight || '1',
            color: palette.primary, // Color derived from palette
            ...(layout as any).titleStyle // Spread other layout props
        },
        metaBarStyle: {
            fontFamily: layout.metaStyle.fontFamily,
            fontWeight: layout.titleWeight === '700' ? '500' : '400',
            fontStyle: designTheme === 'modern' ? 'normal' : 'italic',
            fontSize: layout.metaStyle.fontSize,
            color: palette.metaColor,
            borderTop: layout.metaStyle.borderWidth !== '0' ? `1px solid ${palette.secondary}40` : 'none',
            borderBottom: layout.metaStyle.borderWidth !== '0' ? `1px solid ${palette.secondary}40` : 'none',
            padding: '0.5rem 0',
            margin: '0.5rem 0 1.5rem 0',
            ...(layout as any).metaStyle
        },
        gridStyle: {
            borderRadius: layout.gridRadius,
            fontFamily: layout.gridFont,
            fontWeight: layout.gridWeight,
            borderColor: (layout as any).gridBorderStyle === 'none' ? 'transparent' : palette.gridBorder,
            backgroundColor: palette.gridBackground,
            boxShadow: (layout as any).gridShadow
        },
        wordListStyle: {
            fontFamily: layout.wordListFont,
            fontWeight: layout.wordListWeight,
            color: palette.text
        }
    };

    // SAFETY CHECK: Ensure contentStyle exists for the spread below
    const activeContentStyle = 'contentStyle' in themeStyles ? themeStyles.contentStyle : {};


    // --- GRID CALCULATION ---
    const gridWrapperRef = useRef<HTMLDivElement>(null);
    const { gridDimensions } = useGridAutoSize(
        gridWrapperRef,
        gridCols,
        gridRows,
        200 // UNLIMITED: Allows the grid to expand as much as the paper permits
    );

    // Font Size Logic: Maximize readability (approx 95% of cell size)
    const baseFontSizePx = Math.min(gridDimensions.width / gridCols, gridDimensions.height / gridRows) * 0.95;
    const fontSizePx = baseFontSizePx * (config.gridFontSizeScale || 1.0);


    // --- RENDER HELPERS ---

    // Word List: NEWSPAPER-STYLE MULTI-COLUMN LAYOUT
    // Uses CSS columns for organized, balanced distribution
    const renderWordList = () => {
        // Calculate optimal column count based on word count
        const wordCount = words.length;
        let columnCount = 4; // Default
        if (wordCount <= 8) columnCount = 2;
        else if (wordCount <= 15) columnCount = 3;
        else if (wordCount <= 25) columnCount = 4;
        else columnCount = 5;

        return (
            <div
                className="w-full mt-4"
                style={{
                    fontFamily: themeStyles.wordListStyle.fontFamily,
                    fontWeight: wordListWeight,
                    columnCount: columnCount,
                    columnGap: '2rem',
                    columnRule: '1px solid #e5e7eb'
                }}
            >
                {words.sort().map((word, idx) => {
                    return (
                        <div
                            key={idx}
                            className="flex items-center space-x-3 py-1.5 break-inside-avoid"
                        >
                            {/* Checkbox Circle */}
                            <div
                                className="w-4 h-4 rounded-full border-2 border-gray-400 flex-shrink-0 bg-white"
                            >
                            </div>
                            {/* Word Text */}
                            <span
                                className="text-gray-800 uppercase"
                                style={{
                                    fontFamily: themeStyles.wordListStyle.fontFamily,
                                    fontWeight: wordListWeight || '600',
                                    fontSize: '0.85rem',
                                    letterSpacing: '0.03em'
                                }}
                            >
                                {word.replace(/_/g, ' ')}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };


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
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}
            className="shadow-2xl mx-auto overflow-hidden bg-white text-slate-900 selection:bg-blue-100"
            id="puzzle-page-container"
        >
            {/* Background Image / Color Layer */}
            {backgroundImage && !isPrintPreview && (
                <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                    <img
                        src={backgroundImage}
                        alt="Background"
                        className="w-full h-full object-cover"
                        style={{
                            opacity: 1, // Controlled by filtering mostly
                            filter: backgroundStyle === 'bw' ? 'grayscale(100%) opacity(0.3)' : `opacity(${1 - (config.backgroundFilters?.contrast || 0) / 200})`
                        }}
                    />
                    <div className="absolute inset-0 bg-white" style={{ opacity: isPrintPreview ? 0 : 0.4 }} />
                </div>
            )}

            {/* Design Assets Layer */}
            {designAssets.map(asset => (
                <RenderedAsset
                    key={asset.id}
                    instance={asset}
                    isEditMode={isEditMode}
                    isSelected={selectedElement === asset.id}
                    onSelect={onSelectElement}
                    onDrag={onDrag}
                    themeData={isColor ? themeData : undefined}
                />
            ))}


            {/* --- MAIN LAYOUT (Flex Column) --- */}
            <div
                className="relative z-10 w-full h-full flex flex-col justify-between gap-6" // Added gap-6 to force distribution
                style={{ ...activeContentStyle }}
            >

                {/* 1. HEADER OBJECT */}
                <DraggableElement
                    id="header"
                    isEditMode={isEditMode}
                    isSelected={selectedElement === 'header'}
                    onSelect={onSelectElement}
                    onDrag={onDrag}
                    onDoubleClick={() => onDoubleClick?.('header')}
                    className="mb-2" // REDUCED: Give more space to the grid
                >
                    <div
                        className={`w-full flex-shrink-0 text-center px-4 py-2 hover:bg-blue-50/10 transition-colors rounded-lg`}
                        style={{
                            ...getSelectionStyle('header'),
                            ...effectsToStyle(config.headerEffects)
                        }}
                        data-puzzle-object="header"
                        data-measure-id="puzzle-title"
                    >
                        {/* Title */}
                        <h1
                            className="leading-tight mb-2 tracking-tight"
                            style={themeStyles.titleStyle}
                        >
                            {title || "SOPA DE LETRAS"}
                        </h1>

                        {/* Meta Bar */}
                        <div
                            className="flex justify-between items-center w-full max-w-2xl mx-auto"
                            style={themeStyles.metaBarStyle}
                        >
                            <span className="uppercase">{headerLeft || "Dificultad: Media"}</span>
                            {headerRight && (
                                <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mx-2"></span>
                                    <span className="uppercase">{headerRight}</span>
                                </>
                            )}
                        </div>
                    </div>
                </DraggableElement>


                {/* 2. GRID OBJECT (Flexible Height) */}
                <div
                    className="flex-grow flex items-center justify-center w-full relative min-h-0 py-2" // Added py-2 for visual breathing room
                    ref={gridWrapperRef}
                >
                    <DraggableElement
                        id="grid"
                        isEditMode={isEditMode}
                        isSelected={selectedElement === 'grid'}
                        onSelect={onSelectElement}
                        onDrag={onDrag}
                        onDoubleClick={() => onDoubleClick?.('grid')}
                        className="relative max-w-full max-h-full" // Ensure it doesn't overflow parent
                    >
                        {/* Grid Container - PROFESSIONAL VECTOR STYLE ENFORCED */}
                        <div
                            className="grid transition-all duration-300 relative group overflow-hidden" // Added overflow-hidden
                            style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, // Force strict width distribution
                                gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,    // Force strict height distribution
                                width: `${gridDimensions.width}px`,
                                height: `${gridDimensions.height}px`,
                                // Force Solid White Background for Legibility
                                backgroundColor: themeStyles.gridStyle.backgroundColor, // Use Palette
                                // Sharp Black Borders (Vector Look) - REDUCED WEIGHT
                                borderWidth: showBorders ? (config.gridBorderWidth || '2px') : '0px', // Respect showBorders
                                borderColor: themeStyles.gridStyle.borderColor, // Use Palette
                                borderStyle: 'solid',
                                borderRadius: themeStyles.gridStyle.borderRadius, // Use Layout
                                // Dynamic Shadow based on Theme
                                boxShadow: config.gridShadow || themeStyles.gridStyle.boxShadow,
                                ...getSelectionStyle('grid'),
                                ...effectsToStyle(config.gridEffects)
                            }}
                            data-puzzle-object="grid"
                            data-measure-id="puzzle-grid-container"
                        >
                            {grid.map((row, y) => (
                                row.map((cell, x) => {
                                    const isSolutionCell = showSolution && cell.isWord;

                                    // Professional Typography
                                    const finalColor = showSolution
                                        ? (isSolutionCell ? '#ffffff' : '#000000')
                                        : '#000000'; // Pure Black

                                    const finalBg = showSolution && isSolutionCell
                                        ? (isColor ? (themeData?.primaryColor || '#000000') : '#000000')
                                        : 'transparent';

                                    const finalWeight = showSolution && isSolutionCell ? '700' : '400'; // Lighter weight (was 500)

                                    return (
                                        <div
                                            key={`${x}-${y}`}
                                            className="flex items-center justify-center select-none overflow-hidden antialiased" // Added antialiased
                                            style={{
                                                fontSize: `${fontSizePx * 0.85}px`, // Reduced scale (0.95 -> 0.85)
                                                lineHeight: '1', // Ensure line height matches font size to prevent expansion
                                                fontFamily: '"Inter", "Arial", sans-serif', // Enforce generic readable font
                                                fontWeight: finalWeight,
                                                color: finalColor,
                                                backgroundColor: finalBg,
                                                borderRadius: isSolutionCell ? '0px' : '0', // Square highlight
                                            }}
                                        >
                                            {cell.isValid ? cell.letter : ''}
                                        </div>
                                    );
                                })
                            ))}
                        </div>
                    </DraggableElement>
                </div>


                {/* 3. WORD LIST OBJECT */}
                <DraggableElement
                    id="wordList"
                    isEditMode={isEditMode}
                    isSelected={selectedElement === 'wordList'}
                    onSelect={onSelectElement}
                    onDrag={onDrag}
                    onDoubleClick={() => onDoubleClick?.('wordList')}
                    className="mt-2" // REDUCED: More vertical space for the grid
                >
                    <div
                        className="w-full flex-shrink-0 px-8 py-2 bg-slate-50 border-t border-slate-100" // More compact padding
                        style={{
                            ...getSelectionStyle('wordList'),
                            ...effectsToStyle(config.wordListEffects),
                            transform: config.wordBoxScale ? `scale(${config.wordBoxScale})` : undefined,
                            transformOrigin: 'top center'
                        }}
                        data-puzzle-object="wordList"
                        data-measure-id="puzzle-wordlist"
                    >
                        <h3
                            className="text-center text-sm uppercase tracking-widest text-slate-500 mb-4"
                            style={{ fontFamily: themeStyles.wordListStyle.fontFamily, fontWeight: wordListWeight }}
                        >
                            — Palabras a Encontrar ({words.length}) —
                        </h3>
                        {renderWordList()}
                    </div>
                </DraggableElement>

                {/* 4. FOOTER (Bottom Absolute) */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: `${marginLeft}in`,
                        right: `${marginRight}in`,
                        height: `${marginBottom}in`,
                        paddingTop: '0.5rem',
                        display: 'flex',
                        justifyContent: 'center'
                    }}
                    data-puzzle-object="footer"
                    data-measure-id="puzzle-footer"
                >
                    <div className="w-full border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-mono pt-2">
                        <span>{config.editorial || "EDITORIAL PROPIA"}</span>
                        <span>VOL. {config.volume || "1"}</span>
                        <span>PAG. {pageNumber || "1"}</span>
                    </div>
                </div>

            </div>
        </div>
    );
};
