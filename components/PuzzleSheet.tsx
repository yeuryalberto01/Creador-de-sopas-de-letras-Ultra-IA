
import React from 'react';
import { GeneratedPuzzle, PuzzleConfig, FontType } from '../types';

interface PuzzleSheetProps {
  puzzle: GeneratedPuzzle | null;
  config: PuzzleConfig;
}

const getFontFamily = (fontType: FontType, isColor: boolean) => {
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
    words, showSolution, styleMode, themeData,
    fontType, backgroundImage, backgroundStyle 
  } = config;

  // Derive Dimensions
  const gridRows = grid.length;
  const gridCols = grid[0]?.length || 10;

  // Define styles based on mode
  const isColor = styleMode === 'color' && themeData;
  const fontFamily = getFontFamily(fontType, !!isColor);
  
  // FIX: If background image exists, container background must be transparent
  // otherwise the white background covers the image due to stacking context.
  const containerStyle = isColor 
    ? { backgroundColor: themeData.backgroundColor } 
    : { backgroundColor: backgroundImage ? 'transparent' : 'white' };
  
  const headerStyle = isColor ? { 
    color: themeData.primaryColor,
    borderBottomColor: themeData.primaryColor 
  } : { 
    color: 'black',
    borderBottomColor: 'black' 
  };

  // --- LOGICA DE ESCALADO PROPORCIONAL ---
  const MAX_WIDTH_INCH = 7.2; 
  const MAX_HEIGHT_INCH = 9.0; 
  const BASE_CELL_SIZE_INCH = 0.48; 

  let cellSize = BASE_CELL_SIZE_INCH;
  
  if (gridCols * cellSize > MAX_WIDTH_INCH) {
      cellSize = MAX_WIDTH_INCH / gridCols;
  }

  if (gridRows * cellSize > MAX_HEIGHT_INCH) {
      cellSize = MAX_HEIGHT_INCH / gridRows;
  }

  const calculatedWidth = gridCols * cellSize;
  const calculatedHeight = gridRows * cellSize;
  const fontSizeInch = cellSize * 0.62;

  // Background logic for the Grid Container specifically (The box behind letters)
  const getGridBackgroundColor = () => {
      if (config.maskShape !== 'SQUARE') return 'transparent';
      
      if (isColor) return themeData.secondaryColor;
      
      // If we have an image, we need a semi-transparent white box so letters are readable
      if (backgroundImage) return 'rgba(255,255,255,0.85)';
      
      return 'white';
  };

  const gridContainerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
    gridTemplateRows: `repeat(${gridRows}, 1fr)`,
    width: `${calculatedWidth}in`, 
    height: `${calculatedHeight}in`, 
    margin: '0 auto', 
    backgroundColor: getGridBackgroundColor(),
    borderColor: isColor ? themeData.primaryColor : 'black',
    backdropFilter: backgroundImage ? 'blur(2px)' : 'none',
    borderRadius: config.maskShape === 'SQUARE' ? '4px' : '0',
    // Add shadow if floating over image
    boxShadow: backgroundImage && config.maskShape === 'SQUARE' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
  };

  const cellStyle = (isWord: boolean, isValid: boolean): React.CSSProperties => ({
    color: isColor ? themeData.textColor : 'black',
    backgroundColor: showSolution && isWord 
        ? (isColor ? themeData.primaryColor : '#d1d5db') 
        : (isValid && config.maskShape === 'SQUARE' 
            ? 'transparent' 
            : (isValid && isColor ? themeData.secondaryColor : (isValid ? (backgroundImage ? 'rgba(255,255,255,0.6)' : 'white') : 'transparent'))),
    ...(showSolution && isWord && isColor ? { color: 'white' } : {}),
    fontFamily: fontFamily,
    opacity: isValid ? 1 : 0, 
    borderRadius: config.maskShape !== 'SQUARE' ? '20%' : '0'
  });

  return (
    <div 
      id="puzzle-sheet"
      className="mx-auto relative flex flex-col items-center p-12 box-border transition-colors duration-300 shadow-sm print:shadow-none print:m-0 print:border-none print:w-[8.5in] print:h-[11in] overflow-hidden"
      style={{ 
        width: '8.5in', 
        height: '11in',
        ...containerStyle
      }}
    >
      {/* --- ART GENERATION LAYER --- */}
      {/* FIX: Removed -z-10 and used standard absolute. Content below uses relative z-10 to sit on top. */}
      {backgroundImage && (
          <div className="absolute inset-0 w-full h-full">
            <img 
                src={backgroundImage} 
                alt="Puzzle Background" 
                className="w-full h-full object-cover"
                style={{
                    opacity: backgroundStyle === 'bw' ? 1.0 : 0.5,
                    filter: backgroundStyle === 'bw' ? 'grayscale(100%) contrast(125%)' : 'none'
                }}
            />
            {/* White overlay for standard paper feel if needed, but keeping it raw for art */}
          </div>
      )}

      {/* Decorative Background Element for Color Mode (Only if no image) */}
      {isColor && !backgroundImage && (
          <div 
            className="absolute top-0 left-0 w-full h-4 opacity-50 z-0" 
            style={{ backgroundColor: themeData.primaryColor }}
          />
      )}

      {/* WRAPPER FOR CONTENT TO ENSURE IT SITS ON TOP OF IMAGE */}
      <div className="relative z-10 w-full h-full flex flex-col">
        
        {/* Header */}
        <div className={`w-full border-b-2 mb-6 pb-2 ${backgroundImage ? 'bg-white/90 p-4 rounded-lg shadow-sm' : ''}`} style={headerStyle}>
            <h1 className="text-4xl font-bold text-center uppercase tracking-wider mb-4" style={{ fontFamily: fontType === 'FUN' ? fontFamily : 'Inter' }}>
                {title || "Sopa de Letras"}
            </h1>
            <div className="flex justify-between mt-2 text-sm font-mono-puzzle w-full px-2" style={{ color: isColor ? themeData.textColor : 'black' }}>
            <span className="min-w-[150px]">{headerLeft}</span>
            <span className="min-w-[150px] text-right">{headerRight}</span>
            </div>
        </div>

        {/* Grid Container */}
        <div className="flex-grow flex items-center justify-center w-full mb-6 relative">
            <div 
            className={`transition-all duration-300 ${config.maskShape === 'SQUARE' ? 'border-2' : ''}`}
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
                        fontSize: `${fontSizeInch}in`,
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
        <div className={`w-full mt-auto mb-4 px-4 ${backgroundImage ? 'bg-white/90 p-4 rounded-lg shadow-sm' : ''}`}>
            <h3 
                className="text-xl font-bold mb-3 border-b inline-block px-2 py-1 rounded-t-md" 
                style={{ 
                    color: isColor ? 'white' : 'black',
                    backgroundColor: isColor ? themeData.primaryColor : 'transparent',
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
                color: isColor ? themeData.textColor : 'black',
                fontFamily: fontType === 'FUN' ? fontFamily : 'inherit'
            }}
            >
                {words.sort().map((word, idx) => {
                    const isFound = placedWords.some(pw => pw.word === word);
                    return (
                        <div key={idx} className={`flex items-center ${!isFound ? 'line-through text-red-500' : ''}`}>
                            <span 
                                className="w-3 h-3 border mr-2 inline-block shadow-sm flex-shrink-0"
                                style={{
                                    borderColor: isColor ? themeData.primaryColor : 'black',
                                    backgroundColor: isColor ? 'white' : 'transparent',
                                    boxShadow: isColor ? 'none' : '1px 1px 0 0 rgba(0,0,0,1)'
                                }}
                            ></span>
                            <span className="truncate">{word}</span>
                        </div>
                    );
                })}
            </div>
        </div>
        
        {/* Footer */}
        <div className={`w-full flex justify-between items-end text-gray-500 mt-2 border-t pt-2 pb-1 relative ${backgroundImage ? 'bg-white/90 px-2 rounded-sm' : ''}`}>
            <div className="flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-wide">
                    {footerText !== undefined ? footerText : "Generado con SopaCreator AI"}
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
    </div>
  );
};

export default PuzzleSheet;
