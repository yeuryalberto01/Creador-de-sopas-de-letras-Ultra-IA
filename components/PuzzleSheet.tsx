import React from 'react';
import { GeneratedPuzzle, PuzzleConfig, FontType } from '../types';
import { ClassicTemplate } from './templates/ClassicTemplate';
import { TechTemplate } from './templates/TechTemplate';

interface PuzzleSheetProps {
    puzzle: GeneratedPuzzle | null;
    config: PuzzleConfig;
    isEditMode?: boolean;
    selectedElement?: string | null;
    onSelectElement?: (id: any) => void;
    isPrintPreview?: boolean;
    onDrag?: (id: string, x: number, y: number) => void;
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

const PuzzleSheet: React.FC<PuzzleSheetProps> = ({ puzzle, config, isEditMode, selectedElement, onSelectElement, isPrintPreview, onDrag }) => {
    if (!puzzle || !puzzle.grid) {
        return (
            <div className="w-[8.5in] h-[11in] bg-white flex items-center justify-center flex-col text-gray-400 animate-pulse">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                <p className="font-mono text-sm">Generando Sopa de Letras...</p>
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
    />;
};

export default PuzzleSheet;