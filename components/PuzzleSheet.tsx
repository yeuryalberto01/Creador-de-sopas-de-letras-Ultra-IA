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
  if (!puzzle || !puzzle.grid) {
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
    fontType, backgroundImage, backgroundStyle,
    margins, overlayOpacity, textOverlayOpacity
  } = config;

  // Defaults if margins not provided (0.5 inch default)
  const marginTop = margins?.top ?? 0.5;
  const marginBottom = margins?.bottom ?? 0.5;
  const marginLeft = margins?.left ?? 0.5;
  const marginRight = margins?.right ?? 0.5;
  
  // Opacity Defaults
  const finalGridOpacity = overlayOpacity !== undefined ? overlayOpacity : 0.85;
  const finalTextOpacity = textOverlayOpacity !== undefined ? textOverlayOpacity : 0.9;

  // Derive Dimensions
  const gridRows = grid.length;
  const gridCols = grid[0]?.length || 10;

  // Define styles based on mode
  const isColor = styleMode === 'color' && themeData;
  const fontFamily = getFontFamily(fontType, !!isColor);
  
  // Container background: Transparent if image exists so we can see it
  const containerStyle = isColor 
    ? { backgroundColor: themeData.backgroundColor } 
    : { backgroundColor: backgroundImage ? 'transparent' : 'white' };
  
  const headerTextColor = isColor ? themeData.primaryColor : 'black';

  // --- LOGICA DE ESCALADO PROPORCIONAL CON MÁRGENES ---
  // Page size: 8.5 x 11 inches
  const PAGE_WIDTH = 8.5;
  const PAGE_HEIGHT = 11.0;
  
  // Calculate available space for content
  const availableWidth = PAGE_WIDTH - marginLeft - marginRight;
  const availableHeight = PAGE_HEIGHT - marginTop - marginBottom;

  // Reserve space for Header and Footer roughly (in inches)
  const estimatedHeaderHeight = 1.0;
  const estimatedFooterHeight = 2.0 + (words.length > 20 ? 0.5 : 0); 
  
  const maxGridWidth = availableWidth;
  const maxGridHeight = Math.max(2.0, availableHeight - estimatedHeaderHeight - estimatedFooterHeight);

  const BASE_CELL_SIZE_INCH = 0.48; 

  let cellSize = BASE_CELL_SIZE_INCH;
  
  // Shrink cell size if grid exceeds available width
  if (gridCols * cellSize > maxGridWidth) {
      cellSize = maxGridWidth / gridCols;
  }

  // Shrink cell size if grid exceeds available height
  if (gridRows * cellSize > maxGridHeight) {
      cellSize = maxGridHeight / gridRows;
  }

  const calculatedWidth = gridCols * cellSize;
  const calculatedHeight = gridRows * cellSize;
  const fontSizeInch = cellSize * 0.62;

  // Background logic for the Grid Container (The box behind letters)
  const getGridBackgroundColor = () => {
      if (config.maskShape !== 'SQUARE') return 'transparent';
      
      if (isColor) return themeData.secondaryColor;
      
      // Dynamic overlay opacity for image backgrounds
      if (backgroundImage) {
          return `rgba(255,255,255,${finalGridOpacity})`;
      }
      
      return 'white';
  };

  // --- HELPER: Glassmorphism / Card Style for Text Areas ---
  const hasBackground = !!backgroundImage;
  
  const getTextCardStyle = (addMarginBottom: boolean = true): React.CSSProperties => {
      if (!hasBackground) {
          // Standard Clean Style without background image
          return {
              marginBottom: addMarginBottom ? '1rem' : '0'
          };
      }

      // "Glass" Style when background image is present
      return {
          backgroundColor: `rgba(255, 255, 255, ${finalTextOpacity})`,
          backdropFilter: finalTextOpacity < 0.95 ? 'blur(4px)' : 'none',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          marginBottom: addMarginBottom ? '1rem' : '0'
      };
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
    // Apply blur for glassmorphism effect if semi-transparent
    backdropFilter: backgroundImage && finalGridOpacity > 0.05 && finalGridOpacity < 0.95 ? 'blur(2px)' : 'none',
    borderRadius: config.maskShape === 'SQUARE' ? '4px' : '0',
    // Shadow only if opacity is high enough to look like a card
    boxShadow: backgroundImage && config.maskShape === 'SQUARE' && finalGridOpacity > 0.4 ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
  };

  const cellStyle = (isWord: boolean, isValid: boolean): React.CSSProperties => ({
    color: isColor ? themeData.textColor : 'black',
    backgroundColor: showSolution && isWord 
        ? (isColor ? themeData.primaryColor : '#d1d5db') 
        : (isValid && config.maskShape === 'SQUARE' 
            ? 'transparent' 
            : (isValid && isColor ? themeData.secondaryColor : (isValid ? (backgroundImage ? `rgba(255,255,255,${finalGridOpacity * 0.7})` : 'white') : 'transparent'))),
    ...(showSolution && isWord && isColor ? { color: 'white' } : {}),
    fontFamily: fontFamily,
    opacity: isValid ? 1 : 0, 
    borderRadius: config.maskShape !== 'SQUARE' ? '20%' : '0'
  });

  return (
    <div 
      id="puzzle-sheet"
      className="mx-auto relative flex flex-col items-center box-border transition-all duration-300 shadow-sm print:shadow-none print:m-0 print:border-none print:w-[8.5in] print:h-[11in] overflow-hidden"
      style={{ 
        width: '8.5in', 
        height: '11in',
        paddingTop: `${marginTop}in`,
        paddingBottom: `${marginBottom}in`,
        paddingLeft: `${marginLeft}in`,
        paddingRight: `${marginRight}in`,
        ...containerStyle
      }}
    >
      {/* --- ART GENERATION LAYER --- */}
      {backgroundImage && (
          <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
            <img 
                src={backgroundImage} 
                alt="Puzzle Background" 
                className="w-full h-full object-cover"
                style={{
                    opacity: backgroundStyle === 'bw' ? 1.0 : 0.95, // Keep mostly opaque to see the vector art
                    filter: backgroundStyle === 'bw' ? 'grayscale(100%) contrast(125%)' : 'none'
                }}
            />
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
        
        {/* Header - Now using Dynamic Card Style */}
        <div 
            className="w-full flex-shrink-0 transition-all" 
            style={getTextCardStyle(true)}
        >
             <div 
                className={`w-full ${!hasBackground ? 'border-b-2 pb-2' : ''}`}
                style={{ borderColor: headerTextColor, color: headerTextColor }}
             >
                <h1 className="text-4xl font-bold text-center uppercase tracking-wider mb-2" style={{ fontFamily: fontType === 'FUN' ? fontFamily : 'Inter' }}>
                    {title || "Sopa de Letras"}
                </h1>
                <div className="flex justify-between mt-1 text-sm font-mono-puzzle w-full px-2" style={{ color: isColor ? themeData.textColor : 'black' }}>
                    <span className="min-w-[150px]">{headerLeft}</span>
                    <span className="min-w-[150px] text-right">{headerRight}</span>
                </div>
            </div>
        </div>

        {/* Grid Container */}
        <div className="flex-grow flex items-center justify-center w-full mb-4 relative min-h-0">
            <div 
            className={`transition-all duration-300 ${config.maskShape === 'SQUARE' && !backgroundImage ? 'border-2' : ''}`}
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

        {/* Word List - Now using Dynamic Card Style */}
        <div 
            className="w-full mt-auto flex-shrink-0 transition-all"
            style={getTextCardStyle(true)}
        >
            <h3 
                className="text-lg font-bold mb-2 inline-block px-2 py-0.5 rounded-t-md border-b" 
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
            className="grid gap-x-4 gap-y-1 text-xs sm:text-sm font-medium w-full"
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
                                className="w-2.5 h-2.5 border mr-1.5 inline-block shadow-sm flex-shrink-0"
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
        
        {/* Footer - Now using Dynamic Card Style */}
        <div 
            className="w-full flex-shrink-0 transition-all"
            style={getTextCardStyle(false)}
        >
             <div className={`w-full flex justify-between items-end text-gray-500 ${!hasBackground ? 'border-t pt-1' : ''} relative`}>
                <div className="flex flex-col">
                    <span className="text-[9px] font-medium uppercase tracking-wide">
                        {footerText !== undefined ? footerText : "Generado con SopaCreator AI"}
                    </span>
                    <span className="font-mono text-[8px] opacity-60">ID: {puzzle.seed}</span>
                </div>
                
                {pageNumber && (
                    <div className="text-lg font-bold font-mono text-black absolute right-0 bottom-1">
                        {pageNumber}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default PuzzleSheet;