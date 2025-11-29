import React from 'react';
import { PuzzleTemplateProps } from './types';
import { Laptop, Lightbulb, CheckSquare, Star, QrCode, Code2, Database, Cpu, Wifi } from 'lucide-react';

export const TechTemplate: React.FC<PuzzleTemplateProps> = ({ puzzle, config, fontFamily }) => {
    const { grid, placedWords } = puzzle;
    const {
        title, headerLeft, headerRight, footerText,
        words, showSolution, themeData,
        backgroundImage, margins,
        overlayOpacity, textOverlayOpacity
    } = config;

    // Tech Theme Colors (Default if no themeData)
    const primaryColor = themeData?.primaryColor || '#1e3a8a'; // Dark Blue
    const secondaryColor = themeData?.secondaryColor || '#1e293b'; // Slate 800
    const accentColor = '#3b82f6'; // Blue 500
    const textColor = themeData?.textColor || '#0f172a'; // Slate 900

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

    // Layout constants
    const headerHeight = 1.8; // Inches
    const footerHeight = 2.5; // Inches
    const maxGridHeight = availableHeight - headerHeight - footerHeight - 0.2; // 0.2 gap

    // Cell Size Calculation
    let cellSize = 0.45; // Base size
    if (gridCols * cellSize > availableWidth) cellSize = availableWidth / gridCols;
    if (gridRows * cellSize > maxGridHeight) cellSize = maxGridHeight / gridRows;

    const fontSizeInch = cellSize * 0.6;

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
                fontFamily: "'Inter', sans-serif", // Tech font
                color: textColor
            }}
        >
            {/* Background Image (Optional) */}
            {backgroundImage && (
                <div className="absolute inset-0 w-full h-full z-0 pointer-events-none opacity-20">
                    <img src={backgroundImage} className="w-full h-full object-cover" alt="bg" />
                </div>
            )}

            <div className="relative z-10 h-full flex flex-col">

                {/* --- HEADER --- */}
                <div className="flex flex-col mb-4 border-b-4" style={{ borderColor: primaryColor, paddingBottom: '0.5rem' }}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                            EDICIÓN PROGRAMADORES • NIVEL FÁCIL
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">v1.0.4</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Icon Left */}
                        <div className="p-2 rounded-xl text-white" style={{ backgroundColor: secondaryColor }}>
                            <Laptop size={32} strokeWidth={1.5} />
                        </div>

                        {/* Title */}
                        <div className="flex-1">
                            <h1 className="text-4xl font-black tracking-tight leading-none" style={{ color: secondaryColor }}>
                                {title || "SOPAS DE LETRAS"} <span style={{ color: accentColor }}>TECH</span>
                            </h1>
                        </div>

                        {/* Icon Right */}
                        <div className="text-slate-400">
                            <Lightbulb size={40} strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* Name / Date Fields */}
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
                </div>

                {/* --- GRID --- */}
                <div className="flex-1 flex items-center justify-center relative">
                    {/* Decorative Tech Elements around Grid */}
                    <div className="absolute -left-4 top-10 text-slate-200"><Code2 size={24} /></div>
                    <div className="absolute -right-4 bottom-20 text-slate-200"><Database size={24} /></div>

                    <div
                        className="bg-slate-100 rounded-3xl p-4 shadow-inner"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                            gap: '1px',
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
                                            width: `${cellSize}in`,
                                            height: `${cellSize}in`,
                                            fontSize: `${fontSizeInch}in`,
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
                    </div>
                </div>

                {/* --- FOOTER / WORD LIST --- */}
                <div className="mt-4 flex gap-6 h-[2.5in]">
                    {/* Word List Box */}
                    <div className="flex-1 border-2 rounded-2xl p-4 relative" style={{ borderColor: secondaryColor }}>
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: secondaryColor }}>
                            Palabras a encontrar
                        </h3>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            {words.map((word, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                    <div className="w-4 h-4 border-2 rounded flex items-center justify-center" style={{ borderColor: secondaryColor }}>
                                        {/* Checkbox empty */}
                                    </div>
                                    <span>{word}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Side: Rating & QR */}
                    <div className="w-40 flex flex-col items-center justify-between py-2">
                        {/* Stars */}
                        <div className="flex gap-1 text-slate-300">
                            <Star size={20} fill="currentColor" />
                            <Star size={20} fill="currentColor" />
                            <Star size={20} fill="currentColor" />
                            <Star size={20} fill="currentColor" />
                            <Star size={20} />
                        </div>

                        {/* QR Code Placeholder */}
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
    );
};
