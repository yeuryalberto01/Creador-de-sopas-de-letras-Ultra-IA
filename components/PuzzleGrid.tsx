
import React, { useState } from 'react';
import { PuzzleInfo, LayoutConfig } from '../features/artstudio/lib/types';
import { Zap, Leaf, Bookmark, Code, Feather, Paintbrush, Notebook, Lock, Unlock, Edit3, Fingerprint, Copyright } from 'lucide-react';

interface PuzzleGridProps {
    puzzle: PuzzleInfo;
    layoutConfig: LayoutConfig;
    className?: string;
    transparent?: boolean;
    onSectionSelect?: (section: 'header' | 'grid' | 'box' | 'footer') => void;
    onToggleLock?: (section: string) => void;
    activeSection?: string;
    metadata?: {
        seed: string;
        version: string;
        pageNumber: number;
    };
}

// COMPONENTE DE CAPA INTERACTIVA (DETECCIÓN)
const InteractiveLayer: React.FC<{
    sectionId: string;
    isActive: boolean;
    isLocked: boolean;
    onSelect?: () => void;
    onToggleLock?: () => void;
    children: React.ReactNode;
    className?: string;
}> = ({ sectionId, isActive, isLocked, onSelect, onToggleLock, children, className = "" }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Si no hay handlers, renderizar normal (modo exportación o solo lectura)
    if (!onSelect) return <div className={className}>{children}</div>;

    return (
        <div
            className={`relative group/layer transition-all duration-200 ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
            {/* Outline de Detección */}
            <div className={`absolute -inset-2 rounded-xl border-2 pointer-events-none transition-opacity duration-200 z-50
                ${isActive ? 'border-indigo-500 opacity-100' : isHovered ? 'border-indigo-400/50 opacity-100' : 'border-transparent opacity-0'}
            `}></div>

            {/* Etiqueta Flotante (Solo en Hover o Activo) */}
            <div className={`absolute -top-5 left-0 flex items-center gap-1 z-50 transition-opacity duration-200 
                 ${isActive || isHovered ? 'opacity-100' : 'opacity-0'}
            `}>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-t-md text-white flex items-center gap-2
                    ${isActive ? 'bg-indigo-600' : 'bg-slate-700/80 backdrop-blur'}
                `}>
                    {sectionId}
                    {isLocked && <Lock className="w-2.5 h-2.5" />}
                </span>
            </div>

            {/* Botones de Acción (Solo Hover o Activo) */}
            {(isActive || isHovered) && (
                <div className="absolute -top-5 right-0 flex gap-1 z-50">
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleLock?.(); }}
                        className={`p-1 rounded-full hover:scale-110 transition-transform ${isLocked ? 'bg-amber-500 text-white shadow-lg' : 'bg-white/20 text-white/60 hover:bg-white/40'}`}
                        title={isLocked ? "Desbloquear sección (Permitir cambios IA)" : "Bloquear sección (Mantener fijo)"}
                    >
                        {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>
                    <button
                        className="p-1 rounded-full bg-indigo-500 text-white shadow-lg hover:scale-110 transition-transform"
                        title="Editar propiedades"
                    >
                        <Edit3 className="w-3 h-3" />
                    </button>
                </div>
            )}

            {children}
        </div>
    );
};

export const PuzzleGrid: React.FC<PuzzleGridProps> = ({
    puzzle,
    layoutConfig,
    className = "",
    transparent = false,
    onSectionSelect,
    onToggleLock,
    activeSection,
    metadata = { seed: 'UNKNOWN', version: 'v1.0', pageNumber: 1 }
}) => {

    // OPTIMIZACIÓN GPU: Forzar composición en tarjeta gráfica
    const gpuAcceleratedStyle: React.CSSProperties = {
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        willChange: 'transform, opacity'
    };

    const pageStyle: React.CSSProperties = {
        width: '816px',
        height: '1056px',
        minWidth: '816px',
        minHeight: '1056px',
        ...gpuAcceleratedStyle
    };

    const containerStyle = transparent
        ? `bg-transparent ${className}`
        : `bg-white ${className}`;

    const getFontStyle = (fontName: string) => {
        if (['mono', 'serif', 'sans'].includes(fontName)) return {};
        return { fontFamily: fontName };
    };

    const getFontClass = (fontName: string, defaultClass: string) => {
        if (fontName === 'mono') return 'font-mono';
        if (fontName === 'serif') return 'font-serif';
        if (fontName === 'sans') return 'font-sans';
        if (fontName === 'display') return 'font-display';
        return '';
    };

    const headerFontClass = getFontClass(layoutConfig.fontFamilyHeader, 'font-display');
    const gridFontClass = getFontClass(layoutConfig.fontFamilyGrid, 'font-sans');
    const headerFontStyle = getFontStyle(layoutConfig.fontFamilyHeader);
    const gridFontStyle = getFontStyle(layoutConfig.fontFamilyGrid);

    const getTextStyle = (colorOverride?: string) => ({
        color: colorOverride || layoutConfig.textColor,
        mixBlendMode: layoutConfig.blendMode || 'normal' as any,
        fontWeight: layoutConfig.fontWeight || '700',
        textShadow: layoutConfig.textShadow === 'glow'
            ? `0 0 10px ${colorOverride || layoutConfig.textColor}, 0 0 20px ${colorOverride || layoutConfig.textColor}`
            : layoutConfig.textShadow === 'strong'
                ? '2px 2px 0px rgba(0,0,0,0.5)'
                : 'none',
        WebkitTextStroke: layoutConfig.textStrokeWidth
            ? `${layoutConfig.textStrokeWidth} ${layoutConfig.textStrokeColor || '#ffffff'}`
            : '0px',
    });

    // TÍTULO DE LA PÁGINA (CABECERA)
    const renderHeader = () => {
        const scale = layoutConfig.headerScale || 1;
        const transform = `translateY(${layoutConfig.headerOffsetY || 0}px)`;
        const displayTitle = layoutConfig.customTitleText || puzzle.title;

        let backdropClasses = "relative z-20 transition-transform duration-200 px-8 py-4 rounded-xl";
        let backdropStyle: React.CSSProperties = { ...gpuAcceleratedStyle };
        let localTextColor = layoutConfig.headerTextColor || layoutConfig.textColor;

        switch (layoutConfig.headerBackdrop) {
            case 'glass':
                backdropClasses += " bg-white/20 backdrop-blur-md shadow-sm border border-white/20";
                break;
            case 'solid':
                backdropClasses += " bg-white/95 shadow-md border-2 border-slate-900";
                break;
            case 'clean_gradient':
                backdropClasses += " bg-gradient-to-b from-white/90 to-transparent";
                break;
            case 'banner':
                backdropClasses += " bg-slate-900 shadow-xl border-y-4 border-amber-500";
                localTextColor = '#FFFFFF';
                break;
            case 'brush_stroke':
                backdropStyle = {
                    ...backdropStyle,
                    background: `linear-gradient(to right, transparent 0%, ${layoutConfig.textColor === '#ffffff' ? '#000000' : '#ffffff'} 15%, ${layoutConfig.textColor === '#ffffff' ? '#000000' : '#ffffff'} 85%, transparent 100%)`,
                    opacity: 0.9,
                    transform: `rotate(-1deg) ${transform}`
                };
                localTextColor = layoutConfig.textColor === '#ffffff' ? '#ffffff' : '#000000';
                backdropClasses += " shadow-sm";
                break;
            case 'floating_card':
                backdropClasses += " bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-slate-200 rotate-1";
                localTextColor = '#000000';
                break;
            default:
                backdropClasses += "";
        }

        const headerTextStyle = getTextStyle(localTextColor);

        if (layoutConfig.headerBackdrop === 'brush_stroke') {
            headerTextStyle.mixBlendMode = 'normal';
        }

        const content = () => {
            if (layoutConfig.headerStyle === 'minimal') {
                return (
                    <div className={`flex flex-col w-full mb-6 ${backdropClasses}`} style={{ ...headerTextStyle, transform, ...backdropStyle }}>
                        <div className="flex justify-between items-center border-b pb-2 mb-2 opacity-90" style={{ borderColor: localTextColor }}>
                            <span className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-1"><Zap className="w-3 h-3" /> {puzzle.headerLeft}</span>
                            <span className="text-[10px] font-mono uppercase tracking-widest">{puzzle.headerRight}</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <h1 className={`${headerFontClass} text-[2.8rem] leading-none uppercase tracking-tighter`} style={{ ...headerFontStyle, fontSize: `${2.8 * scale}rem` }}>{displayTitle}</h1>
                        </div>
                    </div>
                );
            }

            if (layoutConfig.fontFamilyHeader.includes('Serif') || layoutConfig.fontFamilyHeader === 'Cinzel') {
                return (
                    <div className={`flex flex-col w-full items-center text-center mb-8 ${backdropClasses}`} style={{ ...headerTextStyle, transform, ...backdropStyle }}>
                        <div className="flex w-full justify-between text-[9px] font-bold tracking-[0.2em] uppercase mb-2 opacity-80">
                            <span className="flex items-center gap-1"><Leaf className="w-3 h-3" /> {puzzle.headerLeft}</span>
                            <span>{puzzle.headerRight}</span>
                        </div>
                        <h1 className={`${headerFontClass} text-[3.8rem] leading-[0.9] uppercase tracking-tight drop-shadow-sm`} style={{ ...headerFontStyle, fontSize: `${3.8 * scale}rem` }}>{displayTitle}</h1>
                        <div className="flex items-center gap-2 mt-2 opacity-80">
                            <div className={`h-px w-12 bg-current opacity-50`}></div>
                            <span className="text-[10px] italic tracking-wider" style={headerFontStyle}>{puzzle.levelText}</span>
                            <div className={`h-px w-12 bg-current opacity-50`}></div>
                        </div>
                    </div>
                );
            }

            return (
                <div className={`flex flex-col w-full items-center text-center mb-6 ${backdropClasses}`} style={{ ...headerTextStyle, transform, ...backdropStyle }}>
                    <div className="w-full flex justify-between border-b-4 border-current pb-1 mb-2">
                        <span className="text-[12px] font-black uppercase tracking-wider">{puzzle.headerLeft}</span>
                        <span className="text-[12px] font-black uppercase tracking-wider">{puzzle.headerRight}</span>
                    </div>
                    <h1 className={`${headerFontClass} text-[3.5rem] leading-none font-black uppercase tracking-tighter`} style={{ ...headerFontStyle, fontSize: `${3.5 * scale}rem` }}>{displayTitle}</h1>
                </div>
            );
        };

        return (
            <InteractiveLayer
                sectionId="TÍTULO"
                isActive={activeSection === 'header'}
                isLocked={layoutConfig.lockedSections?.includes('header') || false}
                onSelect={() => onSectionSelect?.('header')}
                onToggleLock={() => onToggleLock?.('header')}
            >
                {content()}
            </InteractiveLayer>
        );
    };

    // CAJA DE PALABRAS
    const renderWordBox = () => {
        let bg = layoutConfig.wordBoxBackground || 'transparent';
        let borderCol = layoutConfig.wordBoxBorderColor || layoutConfig.gridBorderColor;
        let shadow = layoutConfig.wordBoxShadow || 'none';
        let borderWidth = '0px';
        let containerClasses = "w-full relative p-6 rounded-xl mt-6 transition-all duration-300";
        let boxTextColor = layoutConfig.wordBoxTextColor || layoutConfig.textColor;

        switch (layoutConfig.wordBoxVariant) {
            case 'parchment':
                bg = '#f5e6c8e6';
                borderCol = '#8a7e5f';
                borderWidth = '1px';
                shadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 0 40px rgba(168, 150, 100, 0.3)';
                containerClasses += " border-double";
                boxTextColor = '#4a4036';
                break;
            case 'tech':
                bg = 'rgba(10, 15, 30, 0.95)';
                borderCol = '#0ea5e9';
                borderWidth = '1px';
                shadow = '0 0 20px rgba(14, 165, 233, 0.3), inset 0 0 10px rgba(14, 165, 233, 0.1)';
                containerClasses += " rounded-none clip-path-polygon";
                boxTextColor = '#38bdf8';
                break;
            case 'solid':
                bg = '#ffffff';
                borderCol = '#000000';
                borderWidth = '3px';
                shadow = '6px 6px 0px rgba(0,0,0,1)';
                boxTextColor = '#000000';
                break;
            case 'glass_dark':
                bg = 'rgba(20, 20, 20, 0.75)';
                borderCol = 'rgba(255,255,255,0.15)';
                borderWidth = '1px';
                containerClasses += " backdrop-blur-xl shadow-2xl";
                boxTextColor = '#FFFFFF';
                break;
            case 'glass_light':
                bg = 'rgba(255, 255, 255, 0.6)';
                borderCol = 'rgba(255,255,255,0.8)';
                borderWidth = '1px';
                containerClasses += " backdrop-blur-xl shadow-lg border-2";
                boxTextColor = '#1a1a1a';
                break;
            case 'brush':
                bg = 'rgba(255,255,255,0.95)';
                containerClasses += " shadow-lg skew-y-1 transform scale-[1.02]";
                borderCol = 'transparent';
                shadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2)';
                break;
            case 'notebook':
                bg = '#fefce8';
                containerClasses += " shadow-md border-l-4 border-red-400 rotate-[-1deg]";
                borderCol = '#cbd5e1';
                borderWidth = '0px';
                boxTextColor = '#334155';
                break;
            case 'border':
                bg = 'rgba(255,255,255,0.9)';
                borderCol = boxTextColor;
                borderWidth = '2px';
                containerClasses += " border-dashed backdrop-blur-sm";
                break;
            default:
                bg = 'transparent';
                break;
        }

        const boxStyle: React.CSSProperties = {
            backgroundColor: bg,
            borderColor: borderCol,
            boxShadow: shadow,
            borderWidth: borderWidth,
            transform: `translateY(${layoutConfig.wordBoxOffsetY || 0}px)`,
            ...gpuAcceleratedStyle
        };

        const wordStyle = getTextStyle(boxTextColor);

        return (
            <InteractiveLayer
                sectionId="CAJA PALABRAS"
                isActive={activeSection === 'box'}
                isLocked={layoutConfig.lockedSections?.includes('box') || false}
                onSelect={() => onSectionSelect?.('box')}
                onToggleLock={() => onToggleLock?.('box')}
            >
                <div className={containerClasses} style={boxStyle}>
                    {layoutConfig.wordBoxVariant === 'tech' && (
                        <>
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-current"></div>
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-current"></div>
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current"></div>
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-current"></div>
                        </>
                    )}

                    <div className="w-full relative" style={getFontStyle(layoutConfig.wordListStyle === 'code' ? 'Share Tech Mono' : layoutConfig.fontFamilyGrid)}>
                        <div className="mb-4 text-center flex items-center justify-center gap-2 opacity-90" style={{ color: boxTextColor }}>
                            {layoutConfig.wordBoxVariant === 'parchment' && <Feather className="w-4 h-4" />}
                            {layoutConfig.wordBoxVariant === 'brush' && <Paintbrush className="w-4 h-4" />}
                            {layoutConfig.wordBoxVariant === 'notebook' && <Notebook className="w-4 h-4" />}
                            {layoutConfig.wordListStyle === 'classic' && <div className={`h-px w-12 bg-current opacity-50`}></div>}
                            <span className="text-[11px] font-black uppercase tracking-[0.3em]">
                                {layoutConfig.wordListStyle === 'code' ? '// SYSTEM_WORDS' : 'PALABRAS A ENCONTRAR'}
                            </span>
                            {layoutConfig.wordListStyle === 'classic' && <div className={`h-px w-12 bg-current opacity-50`}></div>}
                            {layoutConfig.wordBoxVariant === 'tech' && <Code className="w-4 h-4" />}
                        </div>

                        <div className="grid grid-cols-5 gap-y-3 gap-x-2 w-full">
                            {puzzle.words.map((word) => (
                                <div key={word} className="flex items-center justify-center group">
                                    {layoutConfig.wordListStyle === 'chips' && (
                                        <div className="px-3 py-1 border rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/60 backdrop-blur-sm shadow-sm" style={{ borderColor: borderCol, color: boxTextColor }}>{word}</div>
                                    )}
                                    {layoutConfig.wordListStyle === 'code' && (
                                        <div className="text-[10px] font-bold text-left w-full flex gap-1 opacity-90 font-mono" style={{ color: boxTextColor }}><span className="opacity-50 text-[10px]">{`>`}</span> {word}</div>
                                    )}
                                    {layoutConfig.wordListStyle === 'classic' && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 border border-current rotate-45" style={{ borderColor: boxTextColor, backgroundColor: boxTextColor }}></div>
                                            <span className={`text-[11px] font-bold tracking-tight uppercase ${gridFontClass}`} style={{ ...gridFontStyle, ...wordStyle }}>{word}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </InteractiveLayer>
        );
    }

    // PIE DE PÁGINA INTELIGENTE (SMART FOOTER)
    const renderFooter = () => {
        const textColor = layoutConfig.footerTextColor || layoutConfig.textColor;
        const transform = `translateY(${layoutConfig.footerOffsetY || 0}px)`;
        const footerText = layoutConfig.customFooterText || "IMPRENTAS CENECOMPUC";

        let containerClass = "w-full flex justify-between items-end mt-4 pt-4 border-t border-current opacity-80 text-[10px]";

        if (layoutConfig.footerStyle === 'BARCODE') {
            containerClass = "w-full flex justify-between items-center mt-6 p-3 bg-white/90 backdrop-blur border border-black rounded-md text-black";
        } else if (layoutConfig.footerStyle === 'TECH') {
            containerClass = "w-full flex justify-between items-center mt-6 p-2 bg-black/80 backdrop-blur text-cyan-400 font-mono border-t border-cyan-500";
        }

        return (
            <InteractiveLayer
                sectionId="FOOTER"
                isActive={activeSection === 'footer'}
                isLocked={layoutConfig.lockedSections?.includes('footer') || false}
                onSelect={() => onSectionSelect?.('footer')}
                onToggleLock={() => onToggleLock?.('footer')}
                className={`w-full relative z-30 transition-transform duration-200`}
            >
                <div className={containerClass} style={{ transform, color: layoutConfig.footerStyle ? undefined : textColor, borderColor: layoutConfig.footerStyle ? undefined : textColor }}>
                    <div className="flex flex-col gap-1">
                        <span className="font-black uppercase tracking-widest flex items-center gap-1">
                            <Copyright className="w-3 h-3" /> {footerText}
                        </span>
                        <span className="text-[8px] opacity-60 uppercase tracking-wide">Colección Matatiempo Vol. 1</span>
                    </div>

                    <div className="flex flex-col items-end gap-0.5 text-[9px] font-mono opacity-70">
                        <span className="flex items-center gap-1"><Fingerprint className="w-3 h-3" /> SEED: {metadata.seed.substring(0, 8)}</span>
                        <span>VER: {metadata.version} • PAG: {metadata.pageNumber < 10 ? `0${metadata.pageNumber}` : metadata.pageNumber}</span>
                    </div>
                </div>
            </InteractiveLayer>
        );
    };

    const gridLetterStyle = getTextStyle(layoutConfig.gridTextColor || layoutConfig.textColor);

    return (
        <div style={pageStyle} className={`relative flex flex-col shrink-0 ${containerStyle} overflow-hidden select-none box-border transition-all duration-300`}>
            <div
                className="flex flex-col h-full w-full px-[48px] pb-[48px] justify-between z-10 relative transition-all duration-300"
                style={{ paddingTop: layoutConfig.paddingTop }}
            >
                {layoutConfig.headerStyle !== 'hidden' && (
                    <header className="shrink-0 relative z-20">
                        {renderHeader()}
                    </header>
                )}

                <main className="flex-1 min-h-0 flex flex-col items-center justify-start w-full relative z-10 transition-transform duration-200" style={{ transform: `translateY(${layoutConfig.gridOffsetY || 0}px)` }}>
                    <InteractiveLayer
                        sectionId="GRILLA"
                        isActive={activeSection === 'grid'}
                        isLocked={layoutConfig.lockedSections?.includes('grid') || false}
                        onSelect={() => onSectionSelect?.('grid')}
                        onToggleLock={() => onToggleLock?.('grid')}
                        className="w-full flex justify-center"
                    >
                        <div
                            className="grid gap-0 w-full max-w-[95%] aspect-square relative overflow-hidden transition-all duration-300"
                            style={{
                                gridTemplateColumns: `repeat(${puzzle.grid[0].length}, minmax(0, 1fr))`,
                                gridTemplateRows: `repeat(${puzzle.grid.length}, minmax(0, 1fr))`,
                                backgroundColor: layoutConfig.gridBackground,
                                borderColor: layoutConfig.gridBorderColor,
                                borderWidth: layoutConfig.gridBorderWidth || '3px',
                                borderRadius: layoutConfig.gridRadius,
                                boxShadow: transparent ? 'none' : layoutConfig.gridShadow,
                                backdropFilter: layoutConfig.gridBlur,
                                ...gpuAcceleratedStyle
                            }}
                        >
                            {puzzle.grid.map((row, rIdx) => (
                                <React.Fragment key={rIdx}>
                                    {row.map((letter, cIdx) => (
                                        <div
                                            key={`${rIdx}-${cIdx}`}
                                            className={`flex items-center justify-center select-none capitalize ${gridFontClass} relative`}
                                            style={{
                                                ...gridFontStyle,
                                                ...gridLetterStyle,
                                                opacity: letter.trim() === '' ? 0 : 1,
                                                pointerEvents: letter.trim() === '' ? 'none' : 'auto'
                                            }}
                                        >
                                            <span
                                                className="absolute inset-0 flex items-center justify-center leading-none"
                                                style={{
                                                    fontSize: layoutConfig.fontScale ? `${1.8 * layoutConfig.fontScale}rem` : '1.8rem',
                                                    // Tweaks for visual centering depending on font
                                                    transform: layoutConfig.fontFamilyGrid === 'MODERN' ? 'translateY(1px)' : 'none'
                                                }}
                                            >
                                                {letter}
                                            </span>
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </InteractiveLayer>
                </main>

                <footer className="shrink-0 flex flex-col gap-2 pt-2 relative z-20">
                    {renderWordBox()}
                    {renderFooter()}
                </footer>
            </div>
        </div>
    );
};
