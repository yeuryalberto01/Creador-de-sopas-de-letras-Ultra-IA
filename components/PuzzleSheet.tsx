import React from 'react';
import { GeneratedPuzzle, PuzzleConfig, FontType } from '../types';
import { ClassicTemplate } from './templates/ClassicTemplate';
import { TechTemplate } from './templates/TechTemplate';
import { ThematicTemplate } from './templates/ThematicTemplate';

interface PuzzleSheetProps {
    puzzle: GeneratedPuzzle | null;
    config: PuzzleConfig;
    isEditMode?: boolean;
    selectedElement?: string | null;
    onSelectElement?: (id: any) => void;
    isPrintPreview?: boolean;
    onDrag?: (id: string, x: number, y: number) => void;
    onDoubleClick?: (id: string) => void;
    isLoading?: boolean;
    error?: string | null;
}

const getFontFamily = (fontType: FontType) => {
    switch (fontType) {
        case 'MODERN': return 'Roboto Mono, monospace';
        case 'FUN': return '"Architects Daughter", cursive';
        case 'SCHOOL': return 'sans-serif';
        case 'CLASSIC':
        default: return '"Courier Prime", monospace';
    }
};

const PuzzleSheet: React.FC<PuzzleSheetProps> = ({ puzzle, config, isEditMode, selectedElement, onSelectElement, isPrintPreview, onDrag, onDoubleClick, isLoading, error }) => {
    if (isLoading) {
        return (
            <div className="w-[8.5in] h-[11in] bg-white flex items-center justify-center flex-col text-gray-400 animate-pulse transition-all duration-500">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                <p className="font-mono text-sm">Generando Sopa de Letras...</p>
            </div>
        );
    }

    if (!puzzle || !puzzle.grid) {
        return (
            <div className="w-[8.5in] h-[11in] bg-white flex items-center justify-center flex-col text-slate-400 p-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                {error ? (
                    <>
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Ups, algo salió mal</h3>
                        <p className="mb-6 text-slate-500 max-w-xs mx-auto">{error}</p>
                        <div className="text-xs text-red-400 bg-red-50 px-4 py-2 rounded-lg font-mono">
                            Verifica conexión con Backend (Puerto 8000)
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <span className="text-4xl">✨</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Lienzo Listo</h3>
                        <p className="mb-6 text-slate-500 max-w-sm mx-auto">
                            Configura el tema a la izquierda y tu sopa de letras aparecerá aquí mágicamente.
                        </p>
                    </>
                )}
            </div>
        );
    }

    const fontFamily = getFontFamily(config.fontType);

    // Template Selector Logic
    if (config.templateId === 'tech') {
        return <TechTemplate
            puzzle={puzzle}
            config={config}
            fontFamily={fontFamily}
            isEditMode={isEditMode}
            selectedElement={selectedElement}
            onSelectElement={onSelectElement}
            isPrintPreview={isPrintPreview}
            onDrag={onDrag}
            onDoubleClick={onDoubleClick}
        />;
    }

    if (config.templateId === 'thematic') {
        return <ThematicTemplate
            puzzle={puzzle}
            config={config}
            fontFamily={fontFamily}
            isEditMode={isEditMode}
            selectedElement={selectedElement}
            onSelectElement={onSelectElement}
            isPrintPreview={isPrintPreview}
            onDrag={onDrag}
            onDoubleClick={onDoubleClick}
        />;
    }

    // Default to Classic for everything else
    return <ClassicTemplate
        puzzle={puzzle}
        config={config}
        fontFamily={fontFamily}
        isEditMode={isEditMode}
        selectedElement={selectedElement}
        onSelectElement={onSelectElement}
        isPrintPreview={isPrintPreview}
        onDrag={onDrag}
        onDoubleClick={onDoubleClick}
    />;
};

export default React.memo(PuzzleSheet);