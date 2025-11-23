import React, { useState, useEffect, useCallback } from 'react';
import { generateWordListAI, generateThemeAI } from './services/aiService';
import { generatePuzzle, calculateSmartGridSize, generateThemeFromTopic } from './utils/puzzleGenerator';
import { loadSettings, saveSettings, savePuzzleToLibrary, getLibrary, deletePuzzleFromLibrary } from './services/storageService';
import PuzzleSheet from './components/PuzzleSheet';
import { Difficulty, GeneratedPuzzle, PuzzleTheme, AppSettings, SavedPuzzleRecord, PuzzleConfig, AIProvider } from './types';
import { Printer, RefreshCw, Wand2, Settings2, Grid3X3, Type, CheckCircle2, Hash, Dices, Palette, Sparkles, Save, FolderOpen, Trash2, X, BrainCircuit, Paintbrush } from 'lucide-react';

const INITIAL_WORDS = ['REACT', 'TYPESCRIPT', 'TAILWIND', 'GEMINI', 'DEEPSEEK', 'GROQ', 'API', 'DATABASE'];

export default function App() {
  // --- Global Settings & Modals ---
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryPuzzles, setLibraryPuzzles] = useState<SavedPuzzleRecord[]>([]);

  // --- Puzzle Config State ---
  const [title, setTitle] = useState('Mi Sopa de Letras');
  const [headerLeft, setHeaderLeft] = useState('Nombre: _________________');
  const [headerRight, setHeaderRight] = useState('Fecha: _________________');
  const [footerText, setFooterText] = useState('Generado con AI SopaCreator');
  const [pageNumber, setPageNumber] = useState('');
  
  const [topic, setTopic] = useState('');
  const [manualWord, setManualWord] = useState('');
  const [wordList, setWordList] = useState<string[]>(INITIAL_WORDS);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  
  // --- Smart Features ---
  const [gridSize, setGridSize] = useState<number>(15);
  const [isSmartGrid, setIsSmartGrid] = useState(true); 
  const [styleMode, setStyleMode] = useState<'bw' | 'color'>('bw');
  const [themeData, setThemeData] = useState<PuzzleTheme | undefined>(undefined);
  
  const [showSolution, setShowSolution] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // --- Seed & Generation ---
  const [seedInput, setSeedInput] = useState('');
  const [currentSeed, setCurrentSeed] = useState('');
  const [generatedPuzzle, setGeneratedPuzzle] = useState<GeneratedPuzzle | null>(null);

  // --- Logic ---

  const handleGeneratePuzzle = useCallback((forceSeed?: string, forceWords?: string[], forceTheme?: PuzzleTheme) => {
    const seedToUse = forceSeed || (seedInput.trim() !== '' ? seedInput : undefined);
    const wordsToUse = forceWords || wordList;
    
    // 1. Calculate Size
    let sizeToUse = gridSize;
    if (isSmartGrid) {
        sizeToUse = calculateSmartGridSize(wordsToUse, difficulty);
        setGridSize(sizeToUse);
    }

    // 2. Theme Logic
    // If a theme is forced (loaded from DB), use it.
    // Else if color mode is on, generate one if we don't have one or if topic changed
    if (forceTheme) {
        setThemeData(forceTheme);
    } else if (styleMode === 'color' && !themeData) {
        // Fallback sync theme if AI didn't run
        const themeSource = topic || seedToUse || 'default';
        setThemeData(generateThemeFromTopic(themeSource));
    }

    // 3. Generate
    const puzzle = generatePuzzle(sizeToUse, wordsToUse, difficulty, seedToUse);
    setGeneratedPuzzle(puzzle);
    setCurrentSeed(puzzle.seed);
    
  }, [gridSize, wordList, difficulty, seedInput, isSmartGrid, styleMode, topic, themeData]);

  // Initial Load
  useEffect(() => {
    handleGeneratePuzzle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // --- AI Operations ---

  const handleAiGenerate = async () => {
    if (!topic) return;
    setIsGeneratingAI(true);

    try {
        // 1. Generate Words
        const newWords = await generateWordListAI(settings.logicAI, topic, 15, difficulty);
        
        // 2. Generate Theme (if color mode)
        let newTheme: PuzzleTheme | null = null;
        if (styleMode === 'color') {
             // We try AI generation for theme first
             newTheme = await generateThemeAI(settings.designAI, topic);
             // Fallback to algorithmic if AI fails or returns null
             if (!newTheme) newTheme = generateThemeFromTopic(topic);
        }

        if (newWords.length > 0) {
            setWordList(newWords);
            setSeedInput(''); 
            if (newTheme) setThemeData(newTheme);

            // Wait for state to settle then generate
            setTimeout(() => {
                handleGeneratePuzzle(undefined, newWords, newTheme || undefined);
            }, 50);
        }
    } catch (error) {
        alert("Error generando con AI. Revisa tu configuración y API Keys.");
        console.error(error);
    } finally {
        setIsGeneratingAI(false);
    }
  };

  // --- Library Operations ---

  const handleSaveToLibrary = () => {
    if (!generatedPuzzle) return;
    
    const config: PuzzleConfig = {
        title, headerLeft, headerRight, footerText, pageNumber, 
        difficulty, gridSize, words: wordList, 
        showSolution, seed: currentSeed, styleMode, themeData
    };
    
    savePuzzleToLibrary(title, config, generatedPuzzle);
    alert("¡Puzzle guardado en la biblioteca local!");
  };

  const handleLoadFromLibrary = (record: SavedPuzzleRecord) => {
      setTitle(record.config.title);
      setHeaderLeft(record.config.headerLeft);
      setHeaderRight(record.config.headerRight);
      setFooterText(record.config.footerText || "Generado con AI SopaCreator");
      setPageNumber(record.config.pageNumber || "");
      setDifficulty(record.config.difficulty);
      setGridSize(record.config.gridSize);
      setIsSmartGrid(false); // Fixed size from save
      setWordList(record.config.words);
      setSeedInput(record.config.seed || '');
      setStyleMode(record.config.styleMode);
      setThemeData(record.config.themeData);
      
      setGeneratedPuzzle(record.puzzleData);
      setCurrentSeed(record.puzzleData.seed);
      setShowLibraryModal(false);
  };

  const handleRemoveWord = (wordToRemove: string) => {
    setWordList(wordList.filter(w => w !== wordToRemove));
  };
  
  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualWord.trim()) {
      const cleanWord = manualWord.toUpperCase().replace(/[^A-ZÑ]/g, '');
      if (cleanWord && !wordList.includes(cleanWord)) {
        setWordList([...wordList, cleanWord]);
        setManualWord('');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-900 bg-gray-200">
      
      {/* --- Sidebar Controls --- */}
      <aside className="w-full md:w-96 bg-slate-900 text-white p-6 overflow-y-auto no-print shadow-2xl z-10 custom-scrollbar h-screen sticky top-0 border-r border-slate-700">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-indigo-400">
                <Grid3X3 className="w-7 h-7" />
                SopaCreator
            </h1>
            <p className="text-slate-500 text-xs mt-1">Multi-API Suite v3.1</p>
          </div>
          <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <Settings2 className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          
          {/* AI Generator Panel */}
          <div className="bg-gradient-to-br from-indigo-900/50 to-slate-800 p-4 rounded-xl border border-indigo-500/30">
            <h2 className="text-xs uppercase tracking-widest font-bold text-indigo-300 flex items-center gap-2 mb-3">
              <BrainCircuit className="w-4 h-4" /> Generador AI
            </h2>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Tema (ej. Dinosaurios)..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                onClick={handleAiGenerate}
                disabled={isGeneratingAI || !topic}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg shadow-lg shadow-indigo-900/50 transition-all active:scale-95"
              >
                {isGeneratingAI ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Word Manager */}
            <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50">
                <form onSubmit={handleAddWord} className="flex gap-2 mb-2">
                    <input
                        type="text"
                        value={manualWord}
                        onChange={(e) => setManualWord(e.target.value)}
                        placeholder="Agregar palabra..."
                        className="flex-1 bg-transparent border-b border-slate-700 px-2 py-1 text-xs outline-none focus:border-indigo-400"
                    />
                    <button type="submit" className="text-indigo-400 hover:text-white text-xs font-bold px-2">+</button>
                </form>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                {wordList.map((word) => (
                    <span key={word} className="bg-slate-800 text-[10px] px-2 py-1 rounded-full flex items-center gap-1 border border-slate-700 group">
                    {word}
                    <button onClick={() => handleRemoveWord(word)} className="text-slate-500 group-hover:text-red-400 ml-1">&times;</button>
                    </span>
                ))}
                </div>
            </div>
          </div>
            
          {/* Config Panels */}
          <div className="space-y-4">
              
              {/* Appearance */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Apariencia</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => { setStyleMode('bw'); }}
                        className={`py-2 text-xs font-medium rounded-lg border transition-all ${styleMode === 'bw' ? 'bg-white text-slate-900 border-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                    >
                        Clásico B/N
                    </button>
                    <button
                        onClick={() => { setStyleMode('color'); }}
                        className={`py-2 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1 ${styleMode === 'color' ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white border-transparent' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                    >
                        <Paintbrush className="w-3 h-3" /> Color AI
                    </button>
                </div>
              </div>

              {/* Difficulty & Grid */}
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400">Dificultad</span>
                    <div className="flex bg-slate-900 rounded p-0.5">
                        {Object.values(Difficulty).map((d) => (
                        <button
                            key={d}
                            onClick={() => { setDifficulty(d); setIsSmartGrid(true); }}
                            className={`px-2 py-1 text-[10px] rounded transition-colors ${
                            difficulty === d ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'
                            }`}
                        >
                            {d}
                        </button>
                        ))}
                    </div>
                 </div>
                 
                 <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2">
                         <span className="text-xs font-semibold text-slate-400">Grilla</span>
                         <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" checked={isSmartGrid} onChange={(e) => setIsSmartGrid(e.target.checked)} className="accent-indigo-500 rounded sm"/>
                            <span className="text-[10px] text-indigo-300">Auto-Size</span>
                         </label>
                     </div>
                     <input 
                        type="number" 
                        value={gridSize}
                        disabled={isSmartGrid}
                        onChange={(e) => { setGridSize(Number(e.target.value)); setIsSmartGrid(false); }}
                        className={`w-12 bg-slate-900 border border-slate-600 rounded text-center text-xs py-1 ${isSmartGrid ? 'opacity-50' : ''}`}
                     />
                 </div>
              </div>

              {/* Headers & Footer */}
              <div className="space-y-2">
                 <label className="text-xs font-semibold text-slate-500 uppercase">Encabezados y Pie</label>
                 <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:border-indigo-500 outline-none placeholder-slate-500" placeholder="Título Principal" />
                 <div className="flex gap-2">
                    <input type="text" value={headerLeft} onChange={(e) => setHeaderLeft(e.target.value)} className="w-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs outline-none placeholder-slate-500" placeholder="Izq..." />
                    <input type="text" value={headerRight} onChange={(e) => setHeaderRight(e.target.value)} className="w-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs outline-none placeholder-slate-500" placeholder="Der..." />
                 </div>
                 <div className="flex gap-2 pt-1">
                    <input type="text" value={footerText} onChange={(e) => setFooterText(e.target.value)} className="w-2/3 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs outline-none placeholder-slate-500" placeholder="Texto Pie de Página" />
                    <input type="text" value={pageNumber} onChange={(e) => setPageNumber(e.target.value)} className="w-1/3 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs outline-none placeholder-slate-500 text-center" placeholder="# Pag" />
                 </div>
              </div>

              {/* Seed */}
              <div className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700">
                  <Hash className="w-4 h-4 text-purple-400" />
                  <input 
                    type="text" 
                    value={seedInput} 
                    onChange={(e) => setSeedInput(e.target.value.toUpperCase())} 
                    placeholder={currentSeed || "SEED"} 
                    className="flex-1 bg-transparent text-xs font-mono tracking-wider outline-none text-white uppercase placeholder-slate-600"
                  />
                  <button onClick={() => { setSeedInput(''); handleGeneratePuzzle(); }} className="hover:bg-slate-700 p-1 rounded"><Dices className="w-4 h-4 text-slate-400"/></button>
              </div>

          </div>

          {/* Action Buttons */}
          <div className="pt-4 grid grid-cols-2 gap-3">
             <button
              onClick={() => handleGeneratePuzzle()}
              className="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RefreshCw className="w-5 h-5" /> Regenerar
            </button>
            
            <button
              onClick={handleSaveToLibrary}
              className="bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg border border-slate-600 flex items-center justify-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" /> Guardar
            </button>
            <button
              onClick={() => {
                  setLibraryPuzzles(getLibrary());
                  setShowLibraryModal(true);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg border border-slate-600 flex items-center justify-center gap-2 text-sm"
            >
              <FolderOpen className="w-4 h-4" /> Librería
            </button>

             <button
              onClick={() => window.print()}
              className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 mt-2"
            >
              <Printer className="w-5 h-5" /> Imprimir / PDF
            </button>
          </div>

        </div>
      </aside>

      {/* --- Main Preview --- */}
      <main className="flex-1 overflow-auto p-4 md:p-8 flex items-start justify-center print-area bg-gray-200">
        <div className="shadow-2xl print:shadow-none transition-all duration-300 origin-top scale-[0.85] md:scale-90 xl:scale-100">
           
           <div className="no-print mb-4 flex justify-between items-center">
              <div className="text-gray-500 text-xs flex items-center gap-1 font-medium bg-white px-3 py-1 rounded-full shadow-sm">
                 <CheckCircle2 className="w-3 h-3 text-green-500"/> A4 / Letter Ready
              </div>
              <button onClick={() => setShowSolution(!showSolution)} className={`text-xs px-3 py-1 rounded-full border transition-all ${showSolution ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-500 border-gray-200'}`}>
                {showSolution ? 'Solución Visible' : 'Mostrar Solución'}
              </button>
           </div>
           
           <PuzzleSheet 
             puzzle={generatedPuzzle}
             config={{
               title, headerLeft, headerRight, footerText, pageNumber, 
               difficulty, gridSize, words: wordList, showSolution, 
               styleMode, themeData, seed: currentSeed
             }}
           />
        </div>
      </main>

      {/* --- MODAL: Settings --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 text-white w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Settings2 className="w-5 h-5 text-indigo-400"/> Configuración de APIs</h2>
                    <button onClick={() => setShowSettingsModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white"/></button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-8">
                    {/* Logic AI Config */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-300 border-b border-indigo-900/50 pb-2">
                            <BrainCircuit className="w-5 h-5" />
                            <h3 className="font-semibold">Inteligencia Lógica (Palabras)</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Proveedor</label>
                                <select 
                                    value={settings.logicAI.provider}
                                    onChange={(e) => setSettings({...settings, logicAI: {...settings.logicAI, provider: e.target.value as AIProvider}})}
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm"
                                >
                                    <option value="gemini">Google Gemini</option>
                                    <option value="openai_compatible">OpenAI Compatible (DeepSeek/Groq)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Nombre del Modelo</label>
                                <input 
                                    type="text" 
                                    value={settings.logicAI.modelName}
                                    onChange={(e) => setSettings({...settings, logicAI: {...settings.logicAI, modelName: e.target.value}})}
                                    placeholder="ej. gemini-2.5-flash o deepseek-chat"
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs text-slate-400 mb-1">API Key</label>
                                <input 
                                    type="password" 
                                    value={settings.logicAI.apiKey}
                                    onChange={(e) => setSettings({...settings, logicAI: {...settings.logicAI, apiKey: e.target.value}})}
                                    placeholder="Pegar API Key aquí..."
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm font-mono text-indigo-300"
                                />
                            </div>
                            {settings.logicAI.provider === 'openai_compatible' && (
                                <div className="md:col-span-2">
                                    <label className="block text-xs text-slate-400 mb-1">Base URL (Opcional)</label>
                                    <input 
                                        type="text" 
                                        value={settings.logicAI.baseUrl || ''}
                                        onChange={(e) => setSettings({...settings, logicAI: {...settings.logicAI, baseUrl: e.target.value}})}
                                        placeholder="ej. https://api.deepseek.com/v1"
                                        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm font-mono"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Design AI Config */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-pink-300 border-b border-pink-900/50 pb-2">
                            <Palette className="w-5 h-5" />
                            <h3 className="font-semibold">Inteligencia Visual (Diseño y Color)</h3>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Proveedor</label>
                                <select 
                                    value={settings.designAI.provider}
                                    onChange={(e) => setSettings({...settings, designAI: {...settings.designAI, provider: e.target.value as AIProvider}})}
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm"
                                >
                                    <option value="gemini">Google Gemini</option>
                                    <option value="openai_compatible">OpenAI Compatible (DeepSeek/Groq)</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-xs text-slate-400 mb-1">Nombre del Modelo</label>
                                <input 
                                    type="text" 
                                    value={settings.designAI.modelName}
                                    onChange={(e) => setSettings({...settings, designAI: {...settings.designAI, modelName: e.target.value}})}
                                    placeholder="ej. gemini-2.5-flash"
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs text-slate-400 mb-1">API Key</label>
                                <input 
                                    type="password" 
                                    value={settings.designAI.apiKey}
                                    onChange={(e) => setSettings({...settings, designAI: {...settings.designAI, apiKey: e.target.value}})}
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm font-mono text-pink-300"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-end gap-2">
                    <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white">Cancelar</button>
                    <button 
                        onClick={() => {
                            saveSettings(settings);
                            setShowSettingsModal(false);
                        }}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm shadow-lg"
                    >
                        Guardar Configuración
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL: Library --- */}
      {showLibraryModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold flex items-center gap-2"><FolderOpen className="w-6 h-6 text-indigo-600"/> Librería de Puzzles</h2>
                    <button onClick={() => setShowLibraryModal(false)}><X className="w-6 h-6 text-gray-500 hover:text-black"/></button>
                </div>
                <div className="p-6 overflow-y-auto bg-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {libraryPuzzles.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500">
                            <Save className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                            <p>No tienes puzzles guardados aún.</p>
                        </div>
                    )}
                    {libraryPuzzles.map((record) => (
                        <div key={record.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow group relative">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-indigo-900 truncate pr-6">{record.name}</h3>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); deletePuzzleFromLibrary(record.id); setLibraryPuzzles(getLibrary()); }}
                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-xs text-gray-500 mb-3 space-y-1">
                                <p>Creado: {new Date(record.createdAt).toLocaleDateString()}</p>
                                <p>Tema: {record.config.words.length} palabras • {record.config.difficulty}</p>
                                <p className="font-mono text-[10px] bg-gray-100 inline-block px-1 rounded">ID: {record.puzzleData.seed}</p>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button 
                                    onClick={() => handleLoadFromLibrary(record)}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-bold"
                                >
                                    Cargar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
              </div>
          </div>
      )}

    </div>
  );
}