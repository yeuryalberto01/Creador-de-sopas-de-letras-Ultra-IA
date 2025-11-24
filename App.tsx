

import React, { useState, useEffect, useCallback } from 'react';
import { generateWordListAI, generateThemeAI, generatePuzzleBackground, PROVIDER_PRESETS, testApiConnection } from './services/aiService';
import { generatePuzzle, calculateSmartGridSize, generateThemeFromTopic } from './utils/puzzleGenerator';
import { loadSettings, saveSettings, savePuzzleToLibrary, getLibrary, deletePuzzleFromLibrary, saveArtTemplate, getArtLibrary, deleteArtTemplate, getBookStacks, createBookStack, addPuzzleToStack, deleteBookStack, removePuzzleFromStack } from './services/storageService';
import PuzzleSheet from './components/PuzzleSheet';
import { Difficulty, GeneratedPuzzle, PuzzleTheme, AppSettings, SavedPuzzleRecord, PuzzleConfig, AIProvider, ShapeType, FontType, AISettings, ArtTemplate, PuzzleMargins, BookStack } from './types';
import { Printer, RefreshCw, Wand2, Settings2, Grid3X3, Type, CheckCircle2, Hash, Dices, Palette, Sparkles, Save, FolderOpen, Trash2, X, BrainCircuit, Paintbrush, Heart, Circle, Square, MessageSquare, Gem, Star, Layout, List, MousePointerClick, ChevronRight, MonitorPlay, AlertTriangle, Check, Loader2, Network, FileDown, Activity, ShieldCheck, AlertCircle, Clock, Fingerprint, Gauge, Image, Eraser, ToggleLeft, ToggleRight, Download, HelpCircle, Move, ScanLine, RotateCcw, Book, Plus, FileJson, Library, ChevronDown, ChevronUp } from 'lucide-react';

// --- CONSTANTES DE DIFICULTAD ---
const DIFFICULTY_PRESETS = {
    [Difficulty.EASY]: {
        label: "Niños / Fácil",
        defaultSize: 10,
        recommendedWords: "8 - 12",
        description: "Sin diagonales, sin invertidas. Grilla pequeña.",
        color: "bg-emerald-500",
        gridRange: [10, 14]
    },
    [Difficulty.MEDIUM]: {
        label: "Estándar / Medio",
        defaultSize: 15,
        recommendedWords: "15 - 20",
        description: "Con diagonales. Sin invertidas. Grilla mediana.",
        color: "bg-blue-500",
        gridRange: [14, 18]
    },
    [Difficulty.HARD]: {
        label: "Experto / Difícil",
        defaultSize: 20,
        recommendedWords: "25 - 40",
        description: "¡Caos total! 8 direcciones. Alta densidad.",
        color: "bg-purple-600",
        gridRange: [18, 30]
    }
};

const INITIAL_WORDS = ['REACT', 'TYPESCRIPT', 'TAILWIND', 'GEMINI', 'DEEPSEEK', 'GROQ', 'API', 'DATABASE'];

// --- Componente Tooltip Reutilizable ---
interface TooltipProps {
    text: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'right' | 'left';
    className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ 
    text, 
    children, 
    position = 'top', 
    className = "" 
}) => {
  return (
    <div className={`group relative flex items-center ${className}`}>
      {children}
      <div className={`
        pointer-events-none absolute z-[70] hidden group-hover:block 
        w-max max-w-[200px] bg-slate-900 text-white text-[10px] font-medium p-2 rounded-md shadow-xl border border-slate-700
        text-center leading-tight whitespace-normal
        ${position === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : ''}
        ${position === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' : ''}
        ${position === 'right' ? 'left-full ml-2 top-1/2 -translate-y-1/2' : ''}
        ${position === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' : ''}
      `}>
        {text}
        <div className={`
            absolute border-4 border-transparent 
            ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-900' : ''}
            ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900' : ''}
            ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 border-r-slate-900' : ''}
            ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2 border-l-slate-900' : ''}
        `}></div>
      </div>
    </div>
  );
};

// --- Componente MarginControl ---
const MarginControl = ({ 
    label, 
    value, 
    max, 
    onChange 
}: { 
    label: string; 
    value: number; 
    max: number; 
    onChange: (val: number) => void; 
}) => {
    const [localText, setLocalText] = useState(value.toString());

    useEffect(() => {
        const parsedLocal = parseFloat(localText);
        if (Math.abs(parsedLocal - value) > 0.001 || isNaN(parsedLocal)) {
             setLocalText(value.toString());
        }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const txt = e.target.value;
        setLocalText(txt); 
        
        const val = parseFloat(txt);
        if (!isNaN(val)) {
            let effective = val;
            if (effective > max) effective = max;
            if (effective < 0) effective = 0;
            onChange(effective);
        } else {
            if (txt === '') onChange(0);
        }
    };
    
    const handleBlur = () => {
        let val = parseFloat(localText);
        if (isNaN(val)) val = 0;
        if (val > max) val = max;
        if (val < 0) val = 0;
        const finalStr = val.toString();
        setLocalText(finalStr);
        onChange(val);
    };

    return (
        <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50 hover:border-indigo-500/30 transition-colors">
            <div className="flex justify-between items-center mb-1.5 gap-2">
                <span className="text-[10px] text-slate-400 font-medium">{label}</span>
                <div className="relative flex items-center">
                    <input
                        type="text"
                        inputMode="decimal"
                        value={localText}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className="w-12 text-right bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[10px] font-mono text-indigo-300 focus:border-indigo-500 outline-none"
                    />
                    <span className="text-[9px] text-slate-500 ml-1">"</span>
                </div>
            </div>
            <Tooltip text={`Ajustar margen ${label.toLowerCase()}`} position="top">
                <input 
                    type="range" 
                    min="0" 
                    max={max} 
                    step="0.1" 
                    value={value} 
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onChange(val);
                        setLocalText(val.toString());
                    }}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 block"
                />
            </Tooltip>
        </div>
    );
};

// --- Componente de Diagnóstico del Sistema ---
const SystemDiagnostics = ({ settings, onClose }: { settings: AppSettings, onClose: () => void }) => {
    // ... (SystemDiagnostics code remains same, omitted for brevity but assumed present)
    const [results, setResults] = useState<any[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [overallStatus, setOverallStatus] = useState<'pending' | 'success' | 'warning' | 'error'>('pending');

    const runTests = async () => {
        setIsRunning(true);
        setResults([]);
        setOverallStatus('pending');

        const newResults = [];
        let hasError = false;

        const hasPdfLib = (window as any).html2pdf !== undefined;
        newResults.push({
            name: "Librería de Exportación PDF (html2pdf)",
            status: hasPdfLib ? 'success' : 'error',
            message: hasPdfLib ? "Cargada y lista para renderizar." : "No se encontró la librería. Recarga la página."
        });
        if (!hasPdfLib) hasError = true;

        try {
            localStorage.setItem('test_diagnostic', 'ok');
            localStorage.removeItem('test_diagnostic');
            newResults.push({
                name: "Almacenamiento Local (Biblioteca)",
                status: 'success',
                message: "Permisos de escritura correctos."
            });
        } catch (e) {
            newResults.push({
                name: "Almacenamiento Local",
                status: 'error',
                message: "No se puede guardar en este navegador."
            });
            hasError = true;
        }

        const logicStart = performance.now();
        const logicTest = await testApiConnection(settings.logicAI);
        const logicTime = Math.round(performance.now() - logicStart);
        newResults.push({
            name: `API Lógica (${settings.logicAI.provider})`,
            status: logicTest.success ? 'success' : 'error',
            message: logicTest.message + (logicTest.success ? ` (${logicTime}ms)` : "")
        });
        if (!logicTest.success) hasError = true;

        setResults(newResults);
        setIsRunning(false);
        setOverallStatus(hasError ? 'warning' : 'success');
    };

    useEffect(() => {
        runTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-slate-900 text-white w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-400"/> Diagnóstico del Sistema
                    </h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white"/></button>
                </div>
                
                <div className="p-6 space-y-4">
                     <div className="space-y-2">
                        {results.map((res, idx) => (
                            <div key={idx} className="bg-slate-800 p-3 rounded-lg flex items-center justify-between border border-slate-700">
                                <div className="flex items-center gap-3">
                                    {res.status === 'success' ? (
                                        <div className="bg-green-500/20 p-1.5 rounded-full text-green-400">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    ) : (
                                        <div className="bg-red-500/20 p-1.5 rounded-full text-red-400">
                                            <X className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-200">{res.name}</span>
                                        <span className={`text-[10px] ${res.status === 'success' ? 'text-slate-400' : 'text-red-300'}`}>
                                            {res.message}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-950 flex justify-end gap-2">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm shadow-lg transition-all"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Componente de Configuración de Proveedor ---
const ProviderSettingsForm = ({ 
    title, 
    icon: Icon, 
    settings, 
    onUpdate 
}: { 
    title: string; 
    icon: any; 
    settings: AISettings; 
    onUpdate: (s: AISettings) => void; 
}) => {
    // ... (ProviderSettingsForm code remains same, omitted for brevity but assumed present)
    const [selectedPreset, setSelectedPreset] = useState<string>('gemini');
    const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    useEffect(() => {
        if (settings.provider === 'gemini') {
            setSelectedPreset('gemini');
        } else if (settings.baseUrl?.includes('deepseek')) {
            setSelectedPreset('deepseek');
        } else if (settings.baseUrl?.includes('x.ai')) {
            setSelectedPreset('grok');
        } else if (settings.baseUrl?.includes('openai.com')) {
            setSelectedPreset('openai');
        } else if (settings.provider === 'openai_compatible') {
            setSelectedPreset('custom');
        }
    }, [settings.provider, settings.baseUrl]);

    const handlePresetChange = (presetKey: string) => {
        setSelectedPreset(presetKey);
        const preset = PROVIDER_PRESETS[presetKey as keyof typeof PROVIDER_PRESETS];
        
        onUpdate({
            ...settings,
            provider: preset.providerType as AIProvider,
            baseUrl: preset.baseUrl,
            modelName: preset.defaultModel
        });
        setTestStatus('idle');
    };

    const runTest = async () => {
        setTestStatus('loading');
        setTestMessage('');
        const result = await testApiConnection(settings);
        setTestStatus(result.success ? 'success' : 'error');
        setTestMessage(result.message);
    };

    return (
         <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700 space-y-4">
            <div className="flex items-center gap-2 text-indigo-300 border-b border-white/5 pb-2">
                <Icon className="w-5 h-5" />
                <h3 className="font-semibold text-sm">{title}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                     <label className="block text-xs text-slate-400 mb-1 font-bold">Proveedor de IA</label>
                     <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {Object.values(PROVIDER_PRESETS).map((preset) => (
                            <Tooltip key={preset.id} text={`Usar configuración predefinida para ${preset.name}`} position="top">
                                <button
                                    onClick={() => handlePresetChange(preset.id)}
                                    className={`w-full text-xs p-2 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 text-center h-16 ${
                                        selectedPreset === preset.id 
                                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]' 
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                                >
                                    <Network className={`w-4 h-4 ${selectedPreset === preset.id ? 'text-indigo-400' : 'opacity-50'}`} />
                                    <span className="line-clamp-1 scale-90">{preset.name}</span>
                                </button>
                            </Tooltip>
                        ))}
                     </div>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1 font-bold">API Key <span className="text-red-400">*</span></label>
                    <div className="flex gap-2">
                        <input 
                            type="password" 
                            value={settings.apiKey}
                            onChange={(e) => onUpdate({...settings, apiKey: e.target.value})}
                            placeholder={selectedPreset === 'gemini' ? "Usando variable de entorno (opcional sobreescribir)" : "sk-..."}
                            className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm font-mono text-indigo-300 focus:border-indigo-500 outline-none"
                        />
                        <button 
                            onClick={runTest}
                            disabled={testStatus === 'loading'}
                            className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 ${
                                testStatus === 'success' ? 'bg-green-500/20 border-green-500 text-green-400' :
                                testStatus === 'error' ? 'bg-red-500/20 border-red-500 text-red-400' :
                                'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                             {testStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Network className="w-4 h-4"/>}
                        </button>
                    </div>
                </div>
                 <div>
                    <label className="block text-xs text-slate-400 mb-1 font-bold">Modelo</label>
                    <input 
                        type="text" 
                        value={settings.modelName}
                        onChange={(e) => onUpdate({...settings, modelName: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm font-mono text-slate-300 focus:border-indigo-500 outline-none"
                    />
                </div>
                <div className={selectedPreset === 'gemini' ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="block text-xs text-slate-400 mb-1 font-bold">Base URL</label>
                    <input 
                        type="text" 
                        value={settings.baseUrl || ''}
                        onChange={(e) => onUpdate({...settings, baseUrl: e.target.value})}
                        disabled={selectedPreset === 'gemini'}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm font-mono text-slate-400 focus:border-indigo-500 outline-none"
                    />
                </div>
            </div>
        </div>
    );
};

export default function App() {
  // --- Global Settings & Modals ---
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false); // New Save Modal
  const [showArtStudio, setShowArtStudio] = useState(false);
  
  const [libraryPuzzles, setLibraryPuzzles] = useState<SavedPuzzleRecord[]>([]);
  const [bookStacks, setBookStacks] = useState<BookStack[]>([]); // New Book Stacks
  const [artLibrary, setArtLibrary] = useState<ArtTemplate[]>([]);

  // --- Puzzle Config State ---
  const [title, setTitle] = useState('Sopa de Letras');
  const [headerLeft, setHeaderLeft] = useState('Nombre: _________________');
  const [headerRight, setHeaderRight] = useState('Fecha: _________________');
  const [footerText, setFooterText] = useState('Generado con SopaCreator AI');
  const [pageNumber, setPageNumber] = useState('');
  
  const [topic, setTopic] = useState('');
  const [manualWord, setManualWord] = useState('');
  const [wordList, setWordList] = useState<string[]>(INITIAL_WORDS);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  
  // --- Smart Features ---
  const [gridSize, setGridSize] = useState<number>(15);
  const [gridRows, setGridRows] = useState<number>(15);
  const [isSmartGrid, setIsSmartGrid] = useState(true); 
  const [styleMode, setStyleMode] = useState<'bw' | 'color'>('bw');
  const [themeData, setThemeData] = useState<PuzzleTheme | undefined>(undefined);
  
  // --- New Expert Features ---
  const [maskShape, setMaskShape] = useState<ShapeType>('SQUARE');
  const [fontType, setFontType] = useState<FontType>('CLASSIC');
  const [hiddenMessage, setHiddenMessage] = useState('');
  const [margins, setMargins] = useState<PuzzleMargins>({ top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 });

  // --- Art Features ---
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
  const [backgroundStyle, setBackgroundStyle] = useState<'bw' | 'color'>('bw');
  const [isArtActive, setIsArtActive] = useState(false);
  const [artPrompt, setArtPrompt] = useState('');
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);

  const [showSolution, setShowSolution] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // --- Seed & Generation ---
  const [seedInput, setSeedInput] = useState('');
  const [currentSeed, setCurrentSeed] = useState('');
  const [generatedPuzzle, setGeneratedPuzzle] = useState<GeneratedPuzzle | null>(null);

  // --- Save Logic State ---
  const [saveOption, setSaveOption] = useState<'single' | 'existing_book' | 'new_book'>('single');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [newBookName, setNewBookName] = useState('');
  const [newBookTarget, setNewBookTarget] = useState(40);
  const [activeLibraryTab, setActiveLibraryTab] = useState<'puzzles' | 'books'>('puzzles');

  // --- Logic ---

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
      setDifficulty(newDifficulty);
      if (isSmartGrid) {
          const preset = DIFFICULTY_PRESETS[newDifficulty];
          setGridSize(preset.defaultSize);
          setGridRows(preset.defaultSize); 
      }
  };

  const handleGeneratePuzzle = useCallback((forceSeed?: string, forceWords?: string[], forceTheme?: PuzzleTheme) => {
    const seedToUse = forceSeed || (seedInput.trim() !== '' ? seedInput : undefined);
    const wordsToUse = forceWords || wordList;
    
    let widthToUse = gridSize;
    let heightToUse = gridRows;

    if (isSmartGrid) {
        const calculated = calculateSmartGridSize(wordsToUse, difficulty);
        const presetSize = DIFFICULTY_PRESETS[difficulty].defaultSize;
        let shapeMultiplier = maskShape === 'SQUARE' ? 1.0 : 1.3;
        let sizeToUse = Math.max(presetSize, Math.ceil(calculated * shapeMultiplier));
        const [min, max] = DIFFICULTY_PRESETS[difficulty].gridRange;
        sizeToUse = Math.max(min, Math.min(sizeToUse, max));
        widthToUse = sizeToUse;
        heightToUse = sizeToUse;
        setGridSize(widthToUse);
        setGridRows(heightToUse);
    }

    if (forceTheme) {
        setThemeData(forceTheme);
    } else if (styleMode === 'color' && !themeData) {
        const themeSource = topic || seedToUse || 'default';
        setThemeData(generateThemeFromTopic(themeSource));
    }

    const puzzle = generatePuzzle(widthToUse, heightToUse, wordsToUse, difficulty, seedToUse, maskShape, hiddenMessage);
    setGeneratedPuzzle(puzzle);
    setCurrentSeed(puzzle.seed);
    
  }, [gridSize, gridRows, wordList, difficulty, seedInput, isSmartGrid, styleMode, topic, themeData, maskShape, hiddenMessage]);

  useEffect(() => {
    handleGeneratePuzzle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleAiGenerate = async () => {
    if (!topic) return;
    setIsGeneratingAI(true);
    try {
        const range = DIFFICULTY_PRESETS[difficulty].recommendedWords.split('-').map(Number);
        const count = Math.ceil((range[0] + range[1]) / 2); 
        const newWords = await generateWordListAI(settings.logicAI, topic, count, difficulty);
        
        let newTheme: PuzzleTheme | null = null;
        if (styleMode === 'color') {
             newTheme = await generateThemeAI(settings.designAI, topic);
             if (!newTheme) newTheme = generateThemeFromTopic(topic);
        }

        if (newWords.length > 0) {
            setWordList(newWords);
            setSeedInput(''); 
            if (newTheme) setThemeData(newTheme);
            setTimeout(() => {
                handleGeneratePuzzle(undefined, newWords, newTheme || undefined);
            }, 50);
        }
    } catch (error: any) {
        alert("Error generando con AI: " + error.message);
    } finally {
        setIsGeneratingAI(false);
    }
  };

  const handleGenerateArt = async () => {
    if (!artPrompt) return;
    setIsGeneratingArt(true);
    try {
        const bgBase64 = await generatePuzzleBackground(settings.designAI, artPrompt, backgroundStyle);
        setBackgroundImage(bgBase64);
        setIsArtActive(true);
        const newTemplate: ArtTemplate = {
            id: crypto.randomUUID(),
            name: artPrompt.slice(0, 20),
            prompt: artPrompt,
            imageBase64: bgBase64,
            style: backgroundStyle,
            createdAt: Date.now()
        };
        saveArtTemplate(newTemplate);
        setArtLibrary(getArtLibrary());
    } catch (e: any) {
        alert("Error generando arte: " + e.message);
    } finally {
        setIsGeneratingArt(false);
    }
  };

  const executeSave = () => {
      if (!generatedPuzzle) return;

      const config: PuzzleConfig = {
          title, headerLeft, headerRight, footerText, pageNumber,
          difficulty, gridSize, gridHeight: gridRows, words: wordList,
          showSolution, styleMode, themeData, maskShape, hiddenMessage,
          fontType, margins, 
          backgroundImage, backgroundStyle
      };

      if (saveOption === 'single') {
          savePuzzleToLibrary(title, config, generatedPuzzle);
      } else if (saveOption === 'existing_book' && selectedBookId) {
          const record = {
              id: crypto.randomUUID(),
              name: title,
              createdAt: Date.now(),
              config,
              puzzleData: generatedPuzzle
          };
          addPuzzleToStack(selectedBookId, record);
      } else if (saveOption === 'new_book' && newBookName) {
          const stack = createBookStack(newBookName, newBookTarget);
          const record = {
            id: crypto.randomUUID(),
            name: title,
            createdAt: Date.now(),
            config,
            puzzleData: generatedPuzzle
          };
          addPuzzleToStack(stack.id, record);
      }
      
      setLibraryPuzzles(getLibrary());
      setBookStacks(getBookStacks());
      setShowSaveModal(false);
      alert("¡Guardado exitosamente!");
  };

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    setTimeout(() => {
        const element = document.getElementById('puzzle-sheet');
        if (!element) return;
        
        const opt = {
            margin: 0,
            filename: `SopaLetras_${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        
        (window as any).html2pdf().set(opt).from(element).save().then(() => {
            setIsExportingPDF(false);
        });
    }, 500);
  };

  const handleExportBookJson = (stack: BookStack) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stack, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${stack.name.replace(/\s+/g, '_')}_API_DATA.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  useEffect(() => {
    setLibraryPuzzles(getLibrary());
    setBookStacks(getBookStacks());
    setArtLibrary(getArtLibrary());
  }, [showLibraryModal, showSaveModal, showArtStudio]);

  return (
    <div className="flex h-screen w-full bg-[#1e1e2e] text-slate-300 font-sans overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-[380px] h-full flex flex-col border-r border-slate-700/50 bg-[#181825] shadow-2xl relative z-20">
        
        {/* Header Logo */}
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between bg-[#11111b]">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
                <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="font-bold text-lg text-white leading-tight tracking-tight">SopaCreator AI</h1>
                <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase">Pro Edition v4.5</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Tooltip text="Diagnóstico del Sistema" position="bottom">
                <button onClick={() => setShowDiagnostics(true)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-emerald-400">
                    <Activity className="w-4 h-4"/>
                </button>
            </Tooltip>
            <Tooltip text="Configuración Global API" position="bottom">
                <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
                    <Settings2 className="w-5 h-5" />
                </button>
            </Tooltip>
          </div>
        </div>

        {/* Scrollable Controls */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="p-5 space-y-6">

                {/* Sección 1: Generación AI */}
                <section className="space-y-3 bg-[#1e1e2e] p-4 rounded-xl border border-slate-700/50 shadow-sm relative group">
                    <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-100 transition-opacity">
                        <Sparkles className="w-12 h-12 text-indigo-500" />
                    </div>
                    <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Wand2 className="w-4 h-4" /> Generador Inteligente
                    </h2>
                    
                    <div className="space-y-2 relative z-10">
                        <label className="text-xs font-medium text-slate-400">Tema o Tópico</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="Ej: Dinosaurios, Espacio..." 
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none text-white placeholder-slate-600"
                                onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                            />
                            <button 
                                onClick={handleAiGenerate}
                                disabled={isGeneratingAI || !topic}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center w-10"
                            >
                                {isGeneratingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Sección 2: Configuración Básica */}
                <section className="space-y-4">
                     <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-1">
                        <Layout className="w-3 h-3" /> Estructura
                    </h2>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Dificultad</label>
                            <select 
                                value={difficulty}
                                onChange={(e) => handleDifficultyChange(e.target.value as Difficulty)}
                                className="w-full bg-slate-800 border-none rounded-lg px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-slate-700 transition-colors"
                            >
                                {Object.values(Difficulty).map(d => (
                                    <option key={d} value={d}>{DIFFICULTY_PRESETS[d].label}</option>
                                ))}
                            </select>
                        </div>
                         <div>
                             <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Forma Máscara</label>
                             <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
                                {(['SQUARE', 'CIRCLE', 'HEART', 'STAR'] as ShapeType[]).map(shape => (
                                    <button
                                        key={shape}
                                        onClick={() => setMaskShape(shape)}
                                        className={`flex-1 p-1 rounded flex items-center justify-center transition-all ${maskShape === shape ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                        title={shape}
                                    >
                                        {shape === 'SQUARE' && <Square className="w-3 h-3" />}
                                        {shape === 'CIRCLE' && <Circle className="w-3 h-3" />}
                                        {shape === 'HEART' && <Heart className="w-3 h-3" />}
                                        {shape === 'STAR' && <Star className="w-3 h-3" />}
                                    </button>
                                ))}
                             </div>
                         </div>
                    </div>

                    <div className="space-y-2">
                         <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Dimensiones Grilla</label>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500">Auto-ajuste</span>
                                <button 
                                    onClick={() => setIsSmartGrid(!isSmartGrid)}
                                    className={`w-8 h-4 rounded-full transition-colors relative ${isSmartGrid ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isSmartGrid ? 'left-4.5 translate-x-1' : 'left-0.5'}`} />
                                </button>
                            </div>
                         </div>
                         
                         <div className={`grid grid-cols-2 gap-3 transition-opacity ${isSmartGrid ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                             <div>
                                 <label className="text-[9px] text-slate-500 block mb-1">Columnas (Ancho)</label>
                                 <input 
                                    type="number" 
                                    min="5" max="30"
                                    value={gridSize}
                                    onChange={(e) => {
                                        setGridSize(parseInt(e.target.value));
                                        if (maskShape !== 'SQUARE') setGridRows(parseInt(e.target.value)); // Keep square aspect for shapes
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-center"
                                 />
                             </div>
                             <div>
                                 <label className="text-[9px] text-slate-500 block mb-1">Filas (Alto)</label>
                                 <input 
                                    type="number" 
                                    min="5" max="30"
                                    value={gridRows}
                                    onChange={(e) => setGridRows(parseInt(e.target.value))}
                                    disabled={maskShape !== 'SQUARE'}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-center disabled:opacity-50"
                                 />
                             </div>
                         </div>
                    </div>
                </section>

                {/* Sección 3: Palabras */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-1">
                        <List className="w-3 h-3" /> Vocabulario <span className="text-[10px] normal-case opacity-50 ml-auto">{wordList.length} palabras</span>
                    </h2>
                    
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={manualWord}
                            onChange={(e) => setManualWord(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && manualWord.trim()) {
                                    setWordList(prev => [...prev, manualWord.trim().replace(/[^A-ZÑ]/g, '')]);
                                    setManualWord('');
                                }
                            }}
                            placeholder="Añadir palabra..." 
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-l-lg px-3 py-2 text-xs focus:border-indigo-500 outline-none text-white font-mono"
                        />
                         <button 
                            onClick={() => {
                                if (manualWord.trim()) {
                                    setWordList(prev => [...prev, manualWord.trim().replace(/[^A-ZÑ]/g, '')]);
                                    setManualWord('');
                                }
                            }}
                            className="bg-slate-700 hover:bg-slate-600 px-3 rounded-r-lg text-white"
                        >
                            <Plus className="w-4 h-4"/>
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto content-start bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                        {wordList.map((w, i) => (
                            <span key={i} className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1 group">
                                {w}
                                <button 
                                    onClick={() => setWordList(prev => prev.filter((_, idx) => idx !== i))}
                                    className="hover:text-red-400"
                                >
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </span>
                        ))}
                        {wordList.length === 0 && <span className="text-[10px] text-slate-600 italic w-full text-center py-2">Lista vacía. Añade palabras o usa la IA.</span>}
                    </div>
                    
                    <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded text-[10px] text-amber-200/80 flex gap-2 items-start">
                         <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                         <div className="w-full">
                            <label className="block font-bold mb-1">Mensaje Oculto (Opcional)</label>
                            <input 
                                type="text"
                                value={hiddenMessage}
                                onChange={(e) => setHiddenMessage(e.target.value)}
                                placeholder="Se revela con las letras sobrantes..."
                                className="w-full bg-transparent border-b border-amber-500/30 outline-none text-amber-100 placeholder-amber-500/40"
                            />
                         </div>
                    </div>
                </section>

                {/* Sección 4: Estilo y Arte */}
                 <section className="space-y-4">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-1">
                        <Palette className="w-3 h-3" /> Diseño & Arte
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <button 
                            onClick={() => { setStyleMode('bw'); setBackgroundImage(undefined); }}
                            className={`p-2 rounded border flex flex-col items-center gap-1 ${styleMode === 'bw' && !backgroundImage ? 'bg-slate-700 border-white text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                        >
                            <div className="w-4 h-4 bg-white border border-black rounded-sm"></div>
                            B/N Clásico
                        </button>
                        <button 
                            onClick={() => { setStyleMode('color'); setBackgroundImage(undefined); }}
                            className={`p-2 rounded border flex flex-col items-center gap-1 ${styleMode === 'color' && !backgroundImage ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                        >
                            <div className="w-4 h-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-sm"></div>
                            Color Digital
                        </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/50">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Art Studio (IA)</label>
                             <button onClick={() => setShowArtStudio(true)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                <FolderOpen className="w-3 h-3" /> Galería
                             </button>
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={artPrompt}
                                onChange={(e) => setArtPrompt(e.target.value)}
                                placeholder="Describe el fondo (ej: Espacio, Selva)..."
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-l-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerateArt()}
                            />
                             <div className="flex flex-col border-y border-r border-slate-700 bg-slate-800 px-1 justify-center">
                                <button onClick={() => setBackgroundStyle('bw')} className={`text-[8px] ${backgroundStyle === 'bw' ? 'text-white font-bold' : 'text-slate-500'}`}>B/N</button>
                                <button onClick={() => setBackgroundStyle('color')} className={`text-[8px] ${backgroundStyle === 'color' ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>COL</button>
                             </div>
                             <button 
                                onClick={handleGenerateArt}
                                disabled={isGeneratingArt || !artPrompt}
                                className="bg-pink-600 hover:bg-pink-500 px-3 rounded-r-lg text-white disabled:opacity-50"
                             >
                                {isGeneratingArt ? <Loader2 className="w-4 h-4 animate-spin"/> : <Image className="w-4 h-4"/>}
                             </button>
                        </div>
                        {backgroundImage && (
                             <div className="relative group w-full h-16 bg-slate-900 rounded-lg overflow-hidden border border-slate-600">
                                <img src={backgroundImage} className="w-full h-full object-cover opacity-70" alt="bg" />
                                <button 
                                    onClick={() => setBackgroundImage(undefined)}
                                    className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all font-xs font-bold uppercase tracking-wider"
                                >
                                    <Eraser className="w-4 h-4 mr-1" /> Quitar Fondo
                                </button>
                             </div>
                        )}
                    </div>

                    <div className="space-y-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase">Tipografía</label>
                         <div className="grid grid-cols-4 gap-1">
                            {(['CLASSIC', 'MODERN', 'FUN', 'SCHOOL'] as FontType[]).map(ft => (
                                <button 
                                    key={ft} 
                                    onClick={() => setFontType(ft)}
                                    className={`text-[9px] py-1 rounded border ${fontType === ft ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                >
                                    {ft === 'CLASSIC' ? 'Mono' : ft === 'MODERN' ? 'Sans' : ft === 'FUN' ? 'Fun' : 'Sch'}
                                </button>
                            ))}
                         </div>
                    </div>
                 </section>
                 
                 {/* Sección 5: Textos */}
                 <section className="space-y-2">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-1">
                        <Type className="w-3 h-3" /> Metadatos
                    </h2>
                     <div className="grid grid-cols-1 gap-2">
                        <input value={title} onChange={e => setTitle(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Título Principal" />
                        <div className="grid grid-cols-2 gap-2">
                            <input value={headerLeft} onChange={e => setHeaderLeft(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Subtítulo Izq" />
                            <input value={headerRight} onChange={e => setHeaderRight(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Subtítulo Der" />
                        </div>
                         <div className="grid grid-cols-3 gap-2">
                            <input value={footerText} onChange={e => setFooterText(e.target.value)} className="col-span-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Pie de página" />
                            <input value={pageNumber} onChange={e => setPageNumber(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-center" placeholder="# Pág" />
                        </div>
                     </div>
                 </section>

                 {/* Sección 6: Márgenes */}
                 <section className="space-y-2">
                     <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-1">
                        <Move className="w-3 h-3" /> Márgenes (Pulgadas)
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <MarginControl 
                            label="Superior" 
                            value={margins.top} 
                            max={3.0} 
                            onChange={(val) => setMargins({...margins, top: val})} 
                        />
                        <MarginControl 
                            label="Inferior" 
                            value={margins.bottom} 
                            max={3.0} 
                            onChange={(val) => setMargins({...margins, bottom: val})} 
                        />
                        <MarginControl 
                            label="Izquierdo" 
                            value={margins.left} 
                            max={3.0} 
                            onChange={(val) => setMargins({...margins, left: val})} 
                        />
                        <MarginControl 
                            label="Derecho" 
                            value={margins.right} 
                            max={3.0} 
                            onChange={(val) => setMargins({...margins, right: val})} 
                        />
                    </div>
                 </section>

            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#11111b] border-t border-slate-700/50 flex flex-col gap-2 shadow-lg z-20">
             <button 
                onClick={() => handleGeneratePuzzle()}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-lg shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
                <RefreshCw className="w-5 h-5" /> Regenerar Sopa
            </button>
            <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => setShowLibraryModal(true)} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center gap-2 text-xs font-medium border border-slate-700 transition-colors">
                    <FolderOpen className="w-4 h-4" /> Biblioteca
                 </button>
                 <button onClick={() => setShowSaveModal(true)} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center gap-2 text-xs font-medium border border-slate-700 transition-colors">
                    <Save className="w-4 h-4" /> Guardar
                 </button>
            </div>
        </div>
      </aside>

      {/* --- MAIN PREVIEW AREA --- */}
      <main className="flex-1 h-full bg-[#181825] relative flex flex-col overflow-hidden">
         {/* Background Noise Layer */}
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>
         
         {/* Top Toolbar - Floating Fixed */}
         <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full border border-slate-600 flex items-center gap-2 shadow-xl z-40 pointer-events-auto transition-transform hover:scale-105">
            <Tooltip text="Mostrar/Ocultar Solución" position="bottom">
                <button 
                    onClick={() => setShowSolution(!showSolution)}
                    className={`p-2 rounded-full transition-all ${showSolution ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                >
                    <CheckCircle2 className="w-5 h-5" />
                </button>
            </Tooltip>
            <div className="w-px h-6 bg-slate-600 mx-1"></div>
            <Tooltip text="Exportar a PDF" position="bottom">
                <button 
                    onClick={handleExportPDF}
                    disabled={isExportingPDF}
                    className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                >
                    {isExportingPDF ? <Loader2 className="w-5 h-5 animate-spin"/> : <Printer className="w-5 h-5" />}
                </button>
            </Tooltip>
         </div>

         {/* Scrollable Canvas Area */}
         <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar w-full flex flex-col items-center pt-24 pb-20 px-8 relative z-10">
             {/* Paper Container */}
             <div className="relative scale-[0.85] xl:scale-100 transition-transform duration-500 shadow-2xl origin-top">
                 <PuzzleSheet 
                    puzzle={generatedPuzzle} 
                    config={{
                        title, headerLeft, headerRight, footerText, pageNumber,
                        difficulty, gridSize, gridHeight: gridRows, words: wordList,
                        showSolution, styleMode, themeData, maskShape, hiddenMessage,
                        fontType, margins,
                        backgroundImage, backgroundStyle
                    }} 
                />
             </div>
         </div>
      </main>

      {/* --- MODALS --- */}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 text-white w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Settings2 className="w-6 h-6 text-indigo-500"/> Configuración de IA
                    </h2>
                    <button onClick={() => setShowSettingsModal(false)}><X className="w-6 h-6 text-slate-400 hover:text-white"/></button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                    <ProviderSettingsForm 
                        title="Inteligencia Lógica (Generación de Palabras)"
                        icon={BrainCircuit}
                        settings={settings.logicAI}
                        onUpdate={(s) => setSettings({...settings, logicAI: s})}
                    />
                    <div className="w-full h-px bg-slate-800"></div>
                    <ProviderSettingsForm 
                        title="Inteligencia Visual (Colores y Estilos)"
                        icon={Palette}
                        settings={settings.designAI}
                        onUpdate={(s) => setSettings({...settings, designAI: s})}
                    />
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-950 flex justify-end gap-2">
                    <button 
                        onClick={() => { saveSettings(settings); setShowSettingsModal(false); }}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg transition-all"
                    >
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Save Options Modal (New) */}
      {showSaveModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-slate-900 text-white w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950">
                      <h2 className="text-lg font-bold flex items-center gap-2">
                          <Save className="w-5 h-5 text-indigo-400"/> Guardar Proyecto
                      </h2>
                      <button onClick={() => setShowSaveModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white"/></button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      
                      {/* Option 1: Single */}
                      <div 
                        onClick={() => setSaveOption('single')}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${saveOption === 'single' ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                      >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${saveOption === 'single' ? 'border-indigo-400 bg-indigo-400' : 'border-slate-500'}`}>
                              {saveOption === 'single' && <Check className="w-3 h-3 text-slate-900" />}
                          </div>
                          <div>
                              <div className="font-bold text-sm">Puzzle Individual</div>
                              <div className="text-[10px] text-slate-400">Guardar como hoja suelta en la biblioteca.</div>
                          </div>
                      </div>

                      {/* Option 2: Add to Book */}
                      <div 
                        onClick={() => setSaveOption('existing_book')}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-2 ${saveOption === 'existing_book' ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                      >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${saveOption === 'existing_book' ? 'border-indigo-400 bg-indigo-400' : 'border-slate-500'}`}>
                                {saveOption === 'existing_book' && <Check className="w-3 h-3 text-slate-900" />}
                            </div>
                            <div>
                                <div className="font-bold text-sm">Añadir a Libro Existente</div>
                                <div className="text-[10px] text-slate-400">Agregar como página siguiente en una colección.</div>
                            </div>
                          </div>
                          
                          {saveOption === 'existing_book' && (
                              <div className="ml-7 mt-1">
                                  {bookStacks.length > 0 ? (
                                      <select 
                                        value={selectedBookId}
                                        onChange={(e) => setSelectedBookId(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-600 rounded p-2 text-xs text-white outline-none"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                          <option value="">Selecciona un libro...</option>
                                          {bookStacks.map(b => (
                                              <option key={b.id} value={b.id}>{b.name} ({b.puzzles.length}/{b.targetCount} págs)</option>
                                          ))}
                                      </select>
                                  ) : (
                                      <div className="text-xs text-amber-400 italic">No tienes libros creados aún.</div>
                                  )}
                              </div>
                          )}
                      </div>

                      {/* Option 3: New Book */}
                      <div 
                        onClick={() => setSaveOption('new_book')}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-2 ${saveOption === 'new_book' ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                      >
                           <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${saveOption === 'new_book' ? 'border-indigo-400 bg-indigo-400' : 'border-slate-500'}`}>
                                    {saveOption === 'new_book' && <Check className="w-3 h-3 text-slate-900" />}
                                </div>
                                <div>
                                    <div className="font-bold text-sm">Crear Nuevo Libro</div>
                                    <div className="text-[10px] text-slate-400">Iniciar una nueva colección con este puzzle.</div>
                                </div>
                           </div>

                           {saveOption === 'new_book' && (
                               <div className="ml-7 mt-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                                   <input 
                                        type="text" 
                                        placeholder="Nombre del Libro (ej: Animales Vol 1)"
                                        value={newBookName}
                                        onChange={(e) => setNewBookName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-600 rounded p-2 text-xs outline-none"
                                   />
                                   <div className="flex items-center gap-2">
                                       <span className="text-xs text-slate-400">Meta de páginas:</span>
                                       <input 
                                            type="number" 
                                            value={newBookTarget}
                                            onChange={(e) => setNewBookTarget(parseInt(e.target.value))}
                                            className="w-20 bg-slate-950 border border-slate-600 rounded p-1 text-xs outline-none"
                                       />
                                   </div>
                               </div>
                           )}
                      </div>

                  </div>
                  
                  <div className="p-4 border-t border-slate-700 bg-slate-950 flex justify-end gap-2">
                      <button 
                          onClick={executeSave}
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm shadow-lg transition-all"
                      >
                          Confirmar y Guardar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Library Modal (Updated) */}
      {showLibraryModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 text-white w-full max-w-4xl h-[85vh] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Library className="w-6 h-6 text-indigo-400"/> Biblioteca
                        </h2>
                        <div className="flex bg-slate-800 rounded-lg p-1">
                            <button 
                                onClick={() => setActiveLibraryTab('puzzles')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeLibraryTab === 'puzzles' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                Puzzles Sueltos
                            </button>
                            <button 
                                onClick={() => setActiveLibraryTab('books')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeLibraryTab === 'books' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                Mis Libros
                            </button>
                        </div>
                    </div>
                    <button onClick={() => setShowLibraryModal(false)}><X className="w-6 h-6 text-slate-400 hover:text-white"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#11111b]">
                    
                    {/* TAB: PUZZLES */}
                    {activeLibraryTab === 'puzzles' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {libraryPuzzles.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center h-64 text-slate-500">
                                    <FolderOpen className="w-12 h-12 mb-2 opacity-50"/>
                                    <p>No tienes puzzles guardados aún.</p>
                                </div>
                            ) : (
                                libraryPuzzles.map(puzzle => (
                                    <div key={puzzle.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-indigo-500 transition-all group relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-white truncate max-w-[180px]">{puzzle.name}</h3>
                                                <span className="text-[10px] text-slate-400 block">{new Date(puzzle.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${DIFFICULTY_PRESETS[puzzle.config.difficulty].color} text-white font-bold`}>
                                                {puzzle.config.difficulty}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-400 mb-4 flex gap-2">
                                            <span className="bg-slate-900 px-2 py-1 rounded">{puzzle.config.words.length} Palabras</span>
                                            <span className="bg-slate-900 px-2 py-1 rounded">{puzzle.config.gridSize}x{puzzle.config.gridHeight || puzzle.config.gridSize}</span>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <button 
                                                onClick={() => {
                                                    setGeneratedPuzzle(puzzle.puzzleData);
                                                    setWordList(puzzle.config.words);
                                                    setTitle(puzzle.config.title);
                                                    setGridSize(puzzle.config.gridSize);
                                                    setDifficulty(puzzle.config.difficulty);
                                                    setThemeData(puzzle.config.themeData);
                                                    setStyleMode(puzzle.config.styleMode);
                                                    setMaskShape(puzzle.config.maskShape);
                                                    setHiddenMessage(puzzle.config.hiddenMessage || '');
                                                    setMargins(puzzle.config.margins || { top:0.5, bottom:0.5, left:0.5, right:0.5 });
                                                    setBackgroundImage(puzzle.config.backgroundImage);
                                                    setShowLibraryModal(false);
                                                }}
                                                className="flex-1 bg-indigo-600/20 hover:bg-indigo-600 hover:text-white text-indigo-300 py-2 rounded text-xs font-bold transition-colors"
                                            >
                                                Cargar
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    deletePuzzleFromLibrary(puzzle.id);
                                                    setLibraryPuzzles(getLibrary());
                                                }}
                                                className="p-2 bg-slate-700 hover:bg-red-900/50 hover:text-red-400 text-slate-400 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* TAB: BOOKS */}
                    {activeLibraryTab === 'books' && (
                        <div className="space-y-4">
                            {bookStacks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                    <Book className="w-12 h-12 mb-2 opacity-50"/>
                                    <p>No tienes libros creados.</p>
                                    <button onClick={() => {setShowLibraryModal(false); setShowSaveModal(true); setSaveOption('new_book');}} className="mt-4 text-indigo-400 hover:underline text-sm">
                                        Crear mi primer libro al guardar
                                    </button>
                                </div>
                            ) : (
                                bookStacks.map(stack => (
                                    <div key={stack.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                        <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-amber-600/20 p-2 rounded-lg text-amber-500">
                                                    <Book className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white text-lg">{stack.name}</h3>
                                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                                        <span>Creado: {new Date(stack.createdAt).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span>Meta: {stack.targetCount} páginas</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                 <Tooltip text="Descargar API JSON (Data)" position="bottom">
                                                    <button 
                                                        onClick={() => handleExportBookJson(stack)}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-emerald-900/30 text-emerald-400 border border-slate-700 hover:border-emerald-500 rounded-lg text-xs font-mono transition-all"
                                                    >
                                                        <FileJson className="w-4 h-4"/> API EXPORT
                                                    </button>
                                                 </Tooltip>
                                                 <button 
                                                    onClick={() => {
                                                        if(confirm('¿Borrar libro completo?')) {
                                                            deleteBookStack(stack.id);
                                                            setBookStacks(getBookStacks());
                                                        }
                                                    }}
                                                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                                 >
                                                     <Trash2 className="w-4 h-4"/>
                                                 </button>
                                            </div>
                                        </div>
                                        
                                        {/* Progress Bar */}
                                        <div className="px-4 pt-4">
                                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                                                <span>Progreso</span>
                                                <span>{stack.puzzles.length} / {stack.targetCount}</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-indigo-500 transition-all duration-500"
                                                    style={{ width: `${Math.min(100, (stack.puzzles.length / stack.targetCount) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Preview List (Collapsible-ish) */}
                                        <div className="p-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                {stack.puzzles.map((p, idx) => (
                                                    <div key={p.id} className="bg-slate-900/50 p-2 rounded border border-slate-700/50 flex items-center justify-between group">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <span className="text-xs font-mono font-bold text-slate-500 w-5 flex-shrink-0">#{idx + 1}</span>
                                                            <span className="text-xs text-slate-300 truncate">{p.name}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                if(confirm('¿Quitar del libro?')) {
                                                                    removePuzzleFromStack(stack.id, p.id);
                                                                    setBookStacks(getBookStacks());
                                                                }
                                                            }}
                                                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-3 h-3"/>
                                                        </button>
                                                    </div>
                                                ))}
                                                {stack.puzzles.length === 0 && (
                                                    <div className="col-span-full text-center text-xs text-slate-600 py-2">Libro vacío</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
      )}

      {/* Art Studio Modal */}
      {showArtStudio && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-slate-900 text-white w-full max-w-4xl h-[80vh] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Image className="w-6 h-6 text-pink-500"/> Art Studio Gallery
                    </h2>
                    <button onClick={() => setShowArtStudio(false)}><X className="w-6 h-6 text-slate-400 hover:text-white"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-[#11111b] custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {artLibrary.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-slate-500">
                                <Palette className="w-12 h-12 mx-auto mb-2 opacity-50"/>
                                <p>No hay arte generado. Usa el panel izquierdo para crear fondos.</p>
                            </div>
                        ) : (
                            artLibrary.map(art => (
                                <div key={art.id} className="relative group rounded-lg overflow-hidden border border-slate-700 aspect-[3/4]">
                                    <img src={art.imageBase64} className="w-full h-full object-cover" alt={art.name} />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                        <p className="text-xs font-bold text-white line-clamp-2 mb-2">{art.prompt}</p>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    setBackgroundImage(art.imageBase64);
                                                    setBackgroundStyle(art.style);
                                                    setShowArtStudio(false);
                                                }}
                                                className="flex-1 bg-indigo-600 text-white text-[10px] py-1.5 rounded font-bold hover:bg-indigo-500"
                                            >
                                                USAR
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    deleteArtTemplate(art.id);
                                                    setArtLibrary(getArtLibrary());
                                                }}
                                                className="bg-red-900/50 text-red-200 text-[10px] py-1.5 px-2 rounded hover:bg-red-600"
                                            >
                                                <Trash2 className="w-3 h-3"/>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="absolute top-2 right-2">
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${art.style === 'bw' ? 'bg-black text-white border-white' : 'bg-white text-indigo-600 border-indigo-600'}`}>
                                            {art.style === 'bw' ? 'B/N' : 'COL'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
             </div>
          </div>
      )}

       {/* Diagnostics Overlay */}
       {showDiagnostics && (
           <SystemDiagnostics settings={settings} onClose={() => setShowDiagnostics(false)} />
       )}

    </div>
  );
}