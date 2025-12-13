import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import pako from 'pako';
import { PuzzleTemplateProps } from './types';
import { useGridAutoSize } from '../../hooks/useGridAutoSize';
import { DraggableElement } from '../editor/DraggableElement';
import { RenderedAsset } from '../../features/design_library/components/RenderedAsset';

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
            default: return 'Montserrat, "Inter", sans-serif';
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

    const getThemeStyles = () => {
        const baseContentStyle = {
            padding: '2rem',
            transition: 'all 0.3s ease'
        };

        if (designTheme === 'modern') {
            return {
                containerClass: '',
                titleStyle: { fontFamily: headerFont, fontWeight: headerWeight, textTransform: 'uppercase' as const, letterSpacing: '-0.02em', fontSize: '3rem' },
                metaBarStyle: { fontFamily: headerFont, fontWeight: headerWeight === '700' ? '500' : '400', textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontSize: '0.75rem', color: '#64748b' },
                gridStyle: { borderRadius: '12px', fontFamily: gridFont, fontWeight: gridWeight },
                wordListStyle: { fontFamily: wordListFont, fontWeight: wordListWeight }
            };
        }

        // DEFAULT: EDITORIAL (The Standard)
        return {
            containerClass: '',
            contentStyle: { // Restored for compatibility
                padding: '2rem',
                height: '100%',
                display: 'flex',
                flexDirection: 'column' as const
            },
            titleStyle: { fontFamily: headerFont, fontWeight: headerWeight, fontSize: '3.5rem', lineHeight: '1', color: '#1e293b' },
            metaBarStyle: { fontFamily: headerFont, fontWeight: headerWeight === '700' ? '500' : '400', fontStyle: 'italic', fontSize: '0.9rem', color: '#475569', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '0.5rem 0', margin: '0.5rem 0 1.5rem 0' },
            gridStyle: { borderRadius: '2px', fontFamily: gridFont, fontWeight: gridWeight }, // Sharp corners for print
            wordListStyle: { fontFamily: wordListFont, fontWeight: wordListWeight }
        };
    };

    const themeStyles = getThemeStyles();

    // SAFETY CHECK: Ensure contentStyle exists for the spread below
    const activeContentStyle = 'contentStyle' in themeStyles ? themeStyles.contentStyle : {};


    // --- GRID CALCULATION ---
    const gridWrapperRef = useRef<HTMLDivElement>(null);
    const { gridDimensions } = useGridAutoSize(
        gridWrapperRef,
        gridCols,
        gridRows,
        54 // Increased MAX cell size for better visibility
    );

    // Font Size Logic
    const baseFontSizePx = Math.min(gridDimensions.width / gridCols, gridDimensions.height / gridRows) * 0.65; // Slightly larger text
    const fontSizePx = baseFontSizePx * (config.gridFontSizeScale || 1.0);


    // --- RENDER HELPERS ---

    // Word List: Switch to Columns instead of Pills
    const renderWordList = () => {
        // Use columns for professional look
        // Math Check: 3 cols typically fits 15-20 words in ~2 inches of height.
        return (
            <div className="w-full grid grid-cols-3 gap-x-4 gap-y-2 mt-4" style={{ fontFamily: themeStyles.wordListStyle.fontFamily, fontWeight: wordListWeight }}>
                {words.sort().map((word, idx) => {
                    return (
                        <div key={idx} className="flex items-center space-x-2">
                            {/* Checkbox Circle - Empty for player use */}
                            <div
                                className="w-4 h-4 rounded-full border border-gray-400 flex-shrink-0 flex items-center justify-center bg-transparent"
                            >
                            </div>
                            {/* Word Text - Clear and legible */}
                            <span
                                className="text-sm tracking-wide text-gray-800"
                                style={{
                                    fontFamily: themeStyles.wordListStyle.fontFamily,
                                    fontWeight: wordListWeight,
                                    fontSize: '0.9rem'
                                }}
                            >
                                {word}
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
            {/* Added pb-8 to ensure visual gap between bottom of list and footer margin */}
            <div
                className="relative z-10 w-full h-full flex flex-col justify-start pb-8"
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
                    className="mb-6"
                >
                    <div
                        className={`w-full flex-shrink-0 text-center px-4 py-2 hover:bg-blue-50/10 transition-colors rounded-lg`}
                        style={getSelectionStyle('header')}
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
                    className="flex-grow flex items-center justify-center w-full relative min-h-0 my-2"
                    ref={gridWrapperRef}
                >
                    <DraggableElement
                        id="grid"
                        isEditMode={isEditMode}
                        isSelected={selectedElement === 'grid'}
                        onSelect={onSelectElement}
                        onDrag={onDrag}
                        onDoubleClick={() => onDoubleClick?.('grid')}
                        className="relative"
                    >
                        {/* Grid Container */}
                        <div
                            className="grid transition-all duration-300 relative group"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                                gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                                width: `${gridDimensions.width}px`,
                                height: `${gridDimensions.height}px`,
                                backgroundColor: isPrintPreview ? 'transparent' : (backgroundImage ? `rgba(255,255,255,${overlayOpacity})` : 'transparent'),
                                backdropFilter: backgroundImage ? 'blur(4px)' : 'none',
                                borderRadius: '4px',
                                boxShadow: (!isPrintPreview && backgroundImage) ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none',
                                ...getSelectionStyle('grid')
                            }}
                            data-puzzle-object="grid"
                            data-measure-id="puzzle-grid-container"
                        >
                            {/* Double Border Frame for "Pro" look (Optional based on theme, hardcoded here for editorial feel) */}
                            {!isPrintPreview && showBorders && (
                                <div className="absolute -inset-3 border-4 border-slate-900/5 rounded-xl pointer-events-none" />
                            )}

                            {grid.map((row, y) => (
                                row.map((cell, x) => {
                                    const isSolutionCell = showSolution && cell.isWord;
                                    return (
                                        <div
                                            key={`${x}-${y}`}
                                            className="flex items-center justify-center select-none"
                                            style={{
                                                fontSize: `${fontSizePx}px`,
                                                fontFamily: gridFont,
                                                fontWeight: gridWeight,
                                                color: isSolutionCell ? (isColor ? themeData.primaryColor : '#0f172a') : '#334155',
                                                backgroundColor: isSolutionCell ? (isColor ? `${themeData.primaryColor}20` : '#e2e8f0') : 'transparent',
                                                borderRadius: isSolutionCell ? '4px' : '0'
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
                    className="mt-6"
                >
                    <div
                        className="w-full flex-shrink-0 px-8 py-4 bg-slate-50 border-t-2 border-slate-100"
                        style={{
                            ...getSelectionStyle('wordList')
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
