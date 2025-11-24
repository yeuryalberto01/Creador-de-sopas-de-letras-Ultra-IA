import React from 'react';
import { GeneratedPuzzle, PuzzleConfig, FontType } from '../types';

interface PuzzleSheetProps {
  puzzle: GeneratedPuzzle | null;
  config: PuzzleConfig;
}

const getFontFamily = (fontType: FontType) => {
    switch (fontType) {
        case 'MODERN': return 'Roboto Mono, monospace'; // Or Inter/San-serif
        case 'FUN': return '"Architects Daughter", cursive';
        case 'SCHOOL': return 'sans-serif'; // Simple, clean
        case 'CLASSIC': 
        default: return '"Courier Prime", monospace';
    }
};

const PuzzleSheet: React.FC<PuzzleSheetProps> = ({ puzzle, config }) => {
  if (!puzzle) {
    return (
        <div className="w-[8.5in] h-[11in] bg-white flex items-center justify-center flex-col text-gray-400 animate-pulse">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p className="font-mono text-sm">Generando Sopa de Letras...</p>
        </div>
    );
  }

  const { grid, placedWords } = puzzle;
  const { 
    title, headerLeft, headerRight, footerText, pageNumber,
    gridSize, words, showSolution, styleMode, themeData,
    fontType 
  } = config;

  // Define styles based on mode
  const isColor = styleMode === 'color' && !!themeData;
  const theme = themeData ?? {
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    textColor: '#000000',
    backgroundColor: '#ffffff'
  };
  const fontFamily = getFontFamily(fontType);
  
  const containerStyle = isColor ? { backgroundColor: theme.backgroundColor } : { backgroundColor: 'white' };
  
  const headerStyle = isColor ? { 
    color: theme.primaryColor,
    borderBottomColor: theme.primaryColor 
  } : { 
    color: 'black',
    borderBottomColor: 'black' 
  };

  const gridContainerStyle = {
    gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
    width: '100%',
    maxWidth: '6.5in',
    aspectRatio: '1/1',
    // We remove background here if using a shape mask to allow transparency between cells
    // But usually a contiguous background looks better. 
    // If shape is not square, we might want transparent container background.
    backgroundColor: config.maskShape === 'SQUARE' 
        ? (isColor ? theme.secondaryColor : 'white') 
        : 'transparent',
    borderColor: isColor ? theme.primaryColor : 'black',
  };

  const cellStyle = (isWord: boolean, isValid: boolean) => ({
    color: isColor ? theme.textColor : 'black',
    // In solution mode, highlight found words
    backgroundColor: showSolution && isWord 
        ? (isColor ? theme.primaryColor : '#d1d5db') 
        : (isValid && config.maskShape === 'SQUARE' ? 'transparent' : (isValid && isColor ? theme.secondaryColor : (isValid ? 'white' : 'transparent'))),
    // In solution mode, ensure text is readable against dark highlight
    ...(showSolution && isWord && isColor ? { color: 'white' } : {}),
    fontFamily: fontFamily,
    opacity: isValid ? 1 : 0, // Hide invalid cells
    borderRadius: config.maskShape !== 'SQUARE' ? '4px' : '0' // Rounded cells for shapes looks nicer
  });

  return (
    <div 
      id="puzzle-sheet"
      className="mx-auto relative flex flex-col items-center p-12 box-border transition-colors duration-300"
      style={{ 
        width: '8.5in', 
        height: '11in',
        ...containerStyle
      }}
    >
      {/* Decorative Background Element for Color Mode */}
      {isColor && (
          <div 
            className="absolute top-0 left-0 w-full h-4 opacity-50" 
            style={{ backgroundColor: theme.primaryColor }}
          />
      )}

      {/* Header */}
      <div className="w-full border-b-2 mb-6 pb-2" style={headerStyle}>
        <h1 className="text-4xl font-bold text-center uppercase tracking-wider mb-4" style={{ fontFamily: fontType === 'FUN' ? fontFamily : 'Inter' }}>
            {title || "Sopa de Letras"}
        </h1>
        <div className="flex justify-between mt-2 text-sm font-mono-puzzle w-full px-2" style={{ color: isColor ? theme.textColor : 'black' }}>
          <span className="min-w-[150px]">{headerLeft}</span>
          <span className="min-w-[150px] text-right">{headerRight}</span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-grow flex items-center justify-center w-full mb-6 relative">
        <div 
          className={`grid gap-0 transition-colors duration-300 ${config.maskShape === 'SQUARE' ? 'border-2 rounded-sm' : ''}`}
          style={gridContainerStyle}
        >
          {grid.map((row, y) => (
            row.map((cell, x) => {
              const isSolutionCell = showSolution && cell.isWord;
              
              return (
                <div 
                  key={`${x}-${y}`}
                  className={`
                    flex items-center justify-center 
                    font-bold
                    ${showSolution && !cell.isWord ? 'opacity-30' : ''}
                  `}
                  style={{
                      fontSize: gridSize > 18 ? '0.8rem' : gridSize > 14 ? '1rem' : '1.25rem',
                      lineHeight: 1,
                      ...cellStyle(isSolutionCell, cell.isValid)
                  }}
                >
                  {cell.isValid ? cell.letter : ''}
                </div>
              );
            })
          ))}
        </div>
      </div>

      {/* Word List */}
      <div className="w-full mt-auto mb-4 px-4">
        <h3 
            className="text-xl font-bold mb-3 border-b inline-block px-2 py-1 rounded-t-md" 
            style={{ 
                color: isColor ? 'white' : 'black',
                backgroundColor: isColor ? theme.primaryColor : 'transparent',
                borderColor: 'black',
                fontFamily: fontType === 'FUN' ? fontFamily : 'inherit'
            }}
        >
            Palabras a encontrar:
        </h3>
        <div 
          className="grid gap-x-4 gap-y-2 text-sm font-medium w-full"
          style={{
            gridTemplateColumns: `repeat(${words.length > 20 ? 4 : 3}, 1fr)`,
            color: isColor ? theme.textColor : 'black',
            fontFamily: fontType === 'FUN' ? fontFamily : 'inherit'
          }}
        >
            {words.sort().map((word, idx) => {
                const isFound = placedWords.some(pw => pw.word === word);
                return (
                    <div key={idx} className={`flex items-center ${!isFound ? 'line-through text-red-500' : ''}`}>
                        <span 
                            className="w-3 h-3 border mr-2 inline-block shadow-sm"
                            style={{
                                borderColor: isColor ? theme.primaryColor : 'black',
                                backgroundColor: isColor ? 'white' : 'transparent',
                                boxShadow: isColor ? 'none' : '1px 1px 0 0 rgba(0,0,0,1)'
                            }}
                        ></span>
                        {word}
                    </div>
                );
            })}
        </div>
        {!placedWords.length && <p className="text-red-500 text-xs mt-2">Error: No se pudieron colocar palabras. Intenta con menos palabras o una cuadrícula más grande.</p>}
      </div>
      
      {/* Footer */}
      <div className="w-full flex justify-between items-end text-gray-500 mt-2 border-t pt-2 pb-1 relative">
        <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wide">
                {footerText !== undefined ? footerText : "Generado con AI SopaCreator"}
            </span>
            <span className="font-mono text-[9px] opacity-60">ID: {puzzle.seed}</span>
        </div>
        
        {pageNumber && (
            <div className="text-xl font-bold font-mono text-black absolute right-0 bottom-1">
                {pageNumber}
            </div>
        )}
      </div>
    </div>
  );
};

export default PuzzleSheet;
