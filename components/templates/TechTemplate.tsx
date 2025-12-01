import React, { useEffect, useRef, useState } from 'react';
import { PuzzleTemplateProps } from './types';
import { Laptop, Lightbulb, CheckSquare, Star, QrCode, Code2, Database, Cpu, Wifi } from 'lucide-react';

import { DraggableElement } from '../editor/DraggableElement';

export const TechTemplate: React.FC<PuzzleTemplateProps> = ({
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

    // Tech Theme Colors (Default if no themeData)
    const primaryColor = isPrintPreview ? '#000000' : (themeData?.primaryColor || '#1e3a8a');
    const secondaryColor = isPrintPreview ? '#000000' : (themeData?.secondaryColor || '#1e293b');
    const accentColor = isPrintPreview ? '#999999' : '#3b82f6';
    const textColor = isPrintPreview ? '#000000' : (themeData?.textColor || '#0f172a');

    // Margins
    const marginTop = margins?.top ?? 0.5;
    const marginBottom = margins?.bottom ?? 0.5;
    const marginLeft = margins?.left ?? 0.5;
    const marginRight = margins?.right ?? 0.5;

    // Dimensions
    const PAGE_WIDTH = 8.5;
    const PAGE_HEIGHT = 11.0;
    const availableWidth = PAGE_WIDTH - marginLeft - marginRight;
    const availableHeight = PAGE_HEIGHT - marginTop - marginBottom;

    // Grid Calculation
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

                // 1. Calculate the maximum possible cell size that fits in the container
                const maxPossibleCellWidth = width / gridCols;
                const maxPossibleCellHeight = height / gridRows;
                const maxFitCellSize = Math.min(maxPossibleCellWidth, maxPossibleCellHeight);

                // 2. Define a Maximum Allowed Cell Size (e.g., ~45px or 0.45 inches)
                const MAX_ALLOWED_CELL_SIZE = 48;

                // 3. Determine actual cell size
                const actualCellSize = Math.min(maxFitCellSize, MAX_ALLOWED_CELL_SIZE);

                // 4. Calculate final grid dimensions
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

    const cellSize = gridDimensions.width / gridCols; // Approximate for display
    const baseFontSizePx = Math.min(gridDimensions.width / gridCols, gridDimensions.height / gridRows) * 0.6;
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
                fontFamily: "'Inter', sans-serif",
                color: textColor,
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Background Image */}
            {backgroundImage && !isPrintPreview && (
                <div className="absolute inset-0 w-full h-full z-0 pointer-events-none opacity-20">
                    <img src={backgroundImage} className="w-full h-full object-cover" alt="bg" />
                </div>
            )}

            <div className="relative z-10 h-full flex flex-col w-full">

                {/* --- HEADER (Natural Height) --- */}
                <div className="w-full flex-shrink-0">
                    <DraggableElement
                        id="title"
                        isEditMode={isEditMode}
                        isSelected={selectedElement === 'title'}
                        onSelect={onSelectElement}
                        onDrag={onDrag}
                        className="flex flex-col mb-2 border-b-4"
                        style={{ borderColor: primaryColor, paddingBottom: '0.5rem', ...getLayoutStyle('title') }}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                                EDICIÓN PROGRAMADORES • NIVEL FÁCIL
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">v1.0.4</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-xl text-white" style={{ backgroundColor: secondaryColor }}>
                                <Laptop size={32} strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-4xl font-black tracking-tight leading-none" style={{ color: secondaryColor }}>
                                    {title || "SOPAS DE LETRAS"}
                                </h1>
                            </div>
                            <div className="text-slate-400">
                                <Lightbulb size={40} strokeWidth={1.5} />
                            </div>
                        </div>

                        <div className="flex gap-8 mt-4 text-sm font-bold text-slate-600">
                            <div className="flex-1 flex items-end gap-2">
                                <span>Nombre</span>
                                <div className="flex-1 border-b-2 border-slate-200 h-4"></div>
                            </div>
                            <div className="w-48 flex items-end gap-2">
                                <span>Fecha</span>
                                <div className="flex-1 border-b-2 border-slate-200 h-4"></div>
                            </div>
                        </div>
                    </DraggableElement>
                </div>

                {/* --- GRID WRAPPER (Fills remaining space) --- */}
                <div
                    ref={gridWrapperRef}
                    className="flex-1 flex items-center justify-center relative min-h-0 overflow-hidden my-2"
                >
                    {/* Decorative Tech Elements */}
                    <div className="absolute -left-4 top-10 text-slate-200"><Code2 size={24} /></div>
                    <div className="absolute -right-4 bottom-20 text-slate-200"><Database size={24} /></div>

                    <DraggableElement
                        id="grid"
                        isEditMode={isEditMode}
                        isSelected={selectedElement === 'grid'}
                        onSelect={onSelectElement}
                        onDrag={onDrag}
                        className="rounded-3xl p-4 shadow-inner backdrop-blur-sm transition-colors"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                            gap: '1px',
                            backgroundColor: isPrintPreview ? 'white' : `rgba(241, 245, 249, ${overlayOpacity ?? 0.9})`,
                            width: `${gridDimensions.width}px`,
                            height: `${gridDimensions.height}px`,
                            ...getLayoutStyle('grid')
                        }}
                    >
                        {grid.map((row, y) => (
                            row.map((cell, x) => {
                                const isSolutionCell = showSolution && cell.isWord;
                                return (
                                    <div
                                        key={`${x}-${y}`}
                                        className="flex items-center justify-center font-bold text-slate-700"
                                        style={{
                                            fontSize: `${fontSizePx}px`,
                                            color: isSolutionCell ? 'white' : undefined,
                                            backgroundColor: isSolutionCell ? accentColor : 'transparent',
                                            borderRadius: isSolutionCell ? '4px' : '0'
                                        }}
                                    >
                                        {cell.isValid ? cell.letter : ''}
                                    </div>
                                );
                            })
                        ))}
                    </DraggableElement>
                </div>

                {/* --- FOOTER / WORD LIST (Natural Height) --- */}
                <div className="w-full flex-shrink-0">
                    <div className="flex gap-6">
                        <DraggableElement
                            id="wordList"
                            isEditMode={isEditMode}
                            isSelected={selectedElement === 'wordList'}
                            onSelect={onSelectElement}
                            onDrag={onDrag}
                            className="flex-1 border-2 rounded-2xl p-4 relative backdrop-blur-sm transition-colors"
                            style={{
                                borderColor: secondaryColor,
                                backgroundColor: `rgba(255, 255, 255, ${textOverlayOpacity ?? 0.8})`,
                                ...getLayoutStyle('wordList')
                            }}
                        >
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: secondaryColor }}>
                                Palabras a encontrar
                            </h3>

                            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                {words.map((word, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                        <div className="w-4 h-4 border-2 rounded flex items-center justify-center" style={{ borderColor: secondaryColor }}></div>
                                        <span>{word}</span>
                                    </div>
                                ))}
                            </div>
                        </DraggableElement>

                        <div className="w-40 flex flex-col items-center justify-between py-2">
                            <div className="flex gap-1 text-slate-300">
                                <Star size={20} fill="currentColor" />
                                <Star size={20} fill="currentColor" />
                                <Star size={20} fill="currentColor" />
                                <Star size={20} fill="currentColor" />
                                <Star size={20} />
                            </div>
                            <div className="bg-slate-100 p-2 rounded-lg">
                                <QrCode size={80} className="text-slate-800" />
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-600 leading-tight">
                                    Entrena tu mente,<br />aprende tecnología
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Branding */}
                    <div className="text-center text-[10px] text-slate-400 mt-2 font-mono">
                        Puzzle creado por PUZZLEBRAND • www.tuweb.com
                    </div>
                </div>

            </div>
        </div>
    );
};
