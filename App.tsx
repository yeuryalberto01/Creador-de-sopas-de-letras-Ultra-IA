
import React, { useState, useEffect, useCallback } from 'react';
import { generateWordListAI, generateThemeAI, generatePuzzleBackground, PROVIDER_PRESETS, testApiConnection } from './services/aiService';
import { generatePuzzle, calculateSmartGridSize, generateThemeFromTopic } from './utils/puzzleGenerator';
import { loadSettings, saveSettings, savePuzzleToLibrary, getLibrary, deletePuzzleFromLibrary, saveArtTemplate, getArtLibrary, deleteArtTemplate } from './services/storageService';
import PuzzleSheet from './components/PuzzleSheet';
import { Difficulty, GeneratedPuzzle, PuzzleTheme, AppSettings, SavedPuzzleRecord, PuzzleConfig, AIProvider, ShapeType, FontType, AISettings, ArtTemplate } from './types';
import { Printer, RefreshCw, Wand2, Settings2, Grid3X3, Type, CheckCircle2, Hash, Dices, Palette, Sparkles, Save, FolderOpen, Trash2, X, BrainCircuit, Paintbrush, Heart, Circle, Square, MessageSquare, Gem, Star, Layout, List, MousePointerClick, ChevronRight, MonitorPlay, AlertTriangle, Check, Loader2, Network, FileDown, Activity, ShieldCheck, AlertCircle, Clock, Fingerprint, Gauge, Image, Eraser, ToggleLeft, ToggleRight, Download } from 'lucide-react';

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
    position?: 'top' | 'bottom' | 'right';
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
        pointer-events-none absolute z-50 hidden group-hover:block 
        w-48 bg-slate-900 text-white text-[10px] font-medium p-2 rounded-md shadow-xl border border-slate-700
        text-center leading-tight
        ${position === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : ''}
        ${position === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' : ''}
        ${position === 'right' ? 'left-full ml-2 top-1/2 -translate-y-1/2' : ''}
      `}>
        {text}
        <div className={`
            absolute border-4 border-transparent 
            ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-900' : ''}
            ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900' : ''}
            ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 border-r-slate-900' : ''}
        `}></div>
      </div>
    </div>
  );
};

// --- Componente de Diagnóstico del Sistema ---
const SystemDiagnostics = ({ settings, onClose }: { settings: AppSettings, onClose: () => void }) => {
    const [results, setResults] = useState<any[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [overallStatus, setOverallStatus] = useState<'pending' | 'success' | 'warning' | 'error'>('pending');

    const runTests = async () => {
        setIsRunning(true);
        setResults([]);
        setOverallStatus('pending');

        const newResults = [];
        let hasError = false;

        // Test 1: Librería PDF
        const hasPdfLib = (window as any).html2pdf !== undefined;
        newResults.push({
            name: "Librería de Exportación PDF (html2pdf)",
            status: hasPdfLib ? 'success' : 'error',
            message: hasPdfLib ? "Cargada y lista para renderizar." : "No se encontró la librería. Recarga la página."
        });
        if (!hasPdfLib) hasError = true;

        // Test 2: Local Storage
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

        // Test 3: Logic API
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
                    <div className="text-center mb-4">
                        {isRunning ? (
                            <div className="flex flex-col items-center gap-2 text-indigo-400">
                                <Loader2 className="w-8 h-8 animate-spin" />
                                <span className="text-sm font-medium">Ejecutando pruebas...</span>
                            </div>
                        ) : overallStatus === 'success' ? (
                            <div className="flex flex-col items-center gap-2 text-green-400">
                                <ShieldCheck className="w-10 h-10" />
                                <span className="text-lg font-bold">¡Todo Funcionando!</span>
                                <span className="text-xs text-slate-400">Tu aplicación está lista para usarse.</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-amber-400">
                                <AlertCircle className="w-10 h-10" />
                                <span className="text-lg font-bold">Revisión Requerida</span>
                                <span className="text-xs text-slate-400">Se encontraron algunos problemas.</span>
                            </div>
                        )}
                    </div>

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
                        onClick={runTests} 
                        disabled={isRunning}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        Re-intentar
                    </button>
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
    const [selectedPreset, setSelectedPreset] = useState<string>('gemini');
    const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    // Sync local preset state with incoming settings on mount/change
    useEffect(() => {
        // Try to identify preset based on provider and url
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

    const currentPreset = PROVIDER_PRESETS[selectedPreset as keyof typeof PROVIDER_PRESETS] || PROVIDER_PRESETS.custom;

    return (
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700 space-y-4">
            <div className="flex items-center gap-2 text-indigo-300 border-b border-white/5 pb-2">
                <Icon className="w-5 h-5" />
                <h3 className="font-semibold text-sm">{title}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preset Selector */}
                <div className="md:col-span-2">
                     <label className="block text-xs text-slate-400 mb-1 font-bold">Proveedor de IA</label>
                     <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {Object.values(PROVIDER_PRESETS).map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => handlePresetChange(preset.id)}
                                className={`text-xs p-2 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 text-center h-16 ${
                                    selectedPreset === preset.id 
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]' 
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                }`}
                            >
                                <Network className={`w-4 h-4 ${selectedPreset === preset.id ? 'text-indigo-400' : 'opacity-50'}`} />
                                <span className="line-clamp-1 scale-90">{preset.name}</span>
                            </button>
                        ))}
                     </div>
                </div>

                {/* API Key */}
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
                            {testStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin"/> : 
                             testStatus === 'success' ? <Check className="w-4 h-4"/> : 
                             testStatus === 'error' ? <AlertTriangle className="w-4 h-4"/> : 
                             <Network className="w-4 h-4"/>}
                            {testStatus === 'loading' ? 'Probando...' : 'Probar'}
                        </button>
                    </div>
                    {testMessage && (
                        <p className={`text-[10px] mt-1 ${testStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {testMessage}
                        </p>
                    )}
                </div>

                {/* Model Name */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1 font-bold">Modelo</label>
                    <input 
                        type="text" 
                        value={settings.modelName}
                        onChange={(e) => onUpdate({...settings, modelName: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm font-mono text-slate-300 focus:border-indigo-500 outline-none"
                    />
                </div>

                {/* Base URL (Only if needed or custom) */}
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
  const [showArtStudio, setShowArtStudio] = useState(false);
  
  const [libraryPuzzles, setLibraryPuzzles] = useState<SavedPuzzleRecord[]>([]);
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
  const [gridSize, setGridSize] = useState<number>(15); // Represents Width/Columns
  const [gridRows, setGridRows] = useState<number>(15); // Represents Height/Rows
  const [isSmartGrid, setIsSmartGrid] = useState(true); 
  const [styleMode, setStyleMode] = useState<'bw' | 'color'>('bw');
  const [themeData, setThemeData] = useState<PuzzleTheme | undefined>(undefined);
  
  // --- New Expert Features ---
  const [maskShape, setMaskShape] = useState<ShapeType>('SQUARE');
  const [fontType, setFontType] = useState<FontType>('CLASSIC');
  const [hiddenMessage, setHiddenMessage] = useState('');

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

  // --- Logic ---

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
      setDifficulty(newDifficulty);
      if (isSmartGrid) {
          const preset = DIFFICULTY_PRESETS[newDifficulty];
          setGridSize(preset.defaultSize);
          setGridRows(preset.defaultSize); // Keep it square in auto mode
      }
  };

  const handleGeneratePuzzle = useCallback((forceSeed?: string, forceWords?: string[], forceTheme?: PuzzleTheme) => {
    const seedToUse = forceSeed || (seedInput.trim() !== '' ? seedInput : undefined);
    const wordsToUse = forceWords || wordList;
    
    // 1. Calculate Size
    let widthToUse = gridSize;
    let heightToUse = gridRows;

    if (isSmartGrid) {
        // We use the difficulty preset logic here usually, but also respect words
        // If words fit in default size, use default. If not, auto-expand.
        // We use the stricter of: calculated size OR difficulty default.
        const calculated = calculateSmartGridSize(wordsToUse, difficulty);
        const presetSize = DIFFICULTY_PRESETS[difficulty].defaultSize;
        
        // Shape multiplier
        let shapeMultiplier = maskShape === 'SQUARE' ? 1.0 : 1.3;
        
        // If word list is huge, we must expand beyond preset
        let sizeToUse = Math.max(presetSize, Math.ceil(calculated * shapeMultiplier));
        
        // Ensure we stick to reasonable limits per difficulty
        const [min, max] = DIFFICULTY_PRESETS[difficulty].gridRange;
        sizeToUse = Math.max(min, Math.min(sizeToUse, max));
        
        widthToUse = sizeToUse;
        heightToUse = sizeToUse; // Smart mode enforces Square for consistency
        
        setGridSize(widthToUse);
        setGridRows(heightToUse);
    }

    // 2. Theme Logic
    if (forceTheme) {
        setThemeData(forceTheme);
    } else if (styleMode === 'color' && !themeData) {
        const themeSource = topic || seedToUse || 'default';
        setThemeData(generateThemeFromTopic(themeSource));
    }

    // 3. Generate with Rectangular Support
    const puzzle = generatePuzzle(widthToUse, heightToUse, wordsToUse, difficulty, seedToUse, maskShape, hiddenMessage);
    setGeneratedPuzzle(puzzle);
    setCurrentSeed(puzzle.seed);
    
  }, [gridSize, gridRows, wordList, difficulty, seedInput, isSmartGrid, styleMode, topic, themeData, maskShape, hiddenMessage]);

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
        // Extract count based on difficulty recommended
        const range = DIFFICULTY_PRESETS[difficulty].recommendedWords.split('-').map(Number);
        const count = Math.ceil((range[0] + range[1]) / 2); // Average

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
        console.error(error);
    } finally {
        setIsGeneratingAI(false);
    }
  };

  // --- Art Operations ---

  const handleGenerateArt = async () => {
    if (!artPrompt) return;
    setIsGeneratingArt(true);
    try {
        const bgBase64 = await generatePuzzleBackground(settings.designAI, artPrompt, backgroundStyle);
        setBackgroundImage(bgBase64);
        setIsArtActive(true);
        
        // Save automatically to history
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

  const handleLoadArt = (template: ArtTemplate) => {
      setBackgroundImage(template.imageBase64);
      setBackgroundStyle(template.style);
      setIsArtActive(true);
  };

  const handleClearArt = () => {
      setBackgroundImage(undefined);
      setIsArtActive(false);
  };

  // --- Library Operations ---

  const handleSaveToLibrary = () => {
    if (!generatedPuzzle) return;
    
    const config: PuzzleConfig = {
        title, headerLeft, headerRight, footerText, pageNumber, 
        difficulty, gridSize, gridHeight: gridRows, // Save both dims
        words: wordList, 
        showSolution, seed: currentSeed, styleMode, themeData,
        maskShape, hiddenMessage, fontType,
        // Save Art State
        backgroundImage: isArtActive ? backgroundImage : undefined,
        backgroundStyle: isArtActive ? backgroundStyle : undefined
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
      setGridRows(record.config.gridHeight || record.config.gridSize); // Fallback to square
      setIsSmartGrid(false); 
      setWordList(record.config.words);
      setSeedInput(record.config.seed || '');
      setStyleMode(record.config.styleMode);
      setThemeData(record.config.themeData);
      
      // New Features Load
      setMaskShape(record.config.maskShape || 'SQUARE');
      setHiddenMessage(record.config.hiddenMessage || '');
      setFontType(record.config.fontType || 'CLASSIC');
      
      // Art Load
      if (record.config.backgroundImage) {
          setBackgroundImage(record.config.backgroundImage);
          setBackgroundStyle(record.config.backgroundStyle || 'bw');
          setIsArtActive(true);
      } else {
          setIsArtActive(false);
      }
      
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

  const handleDownloadPDF = async () => {
      const element = document.getElementById('puzzle-sheet');
      if (!element) return;
      
      setIsExportingPDF(true);

      const opt = {
          margin: 0,
          filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${currentSeed}.pdf`,
          image: { type: 'jpeg', quality: 1 },
          html2canvas: { 
              scale: 3, // Ultra High resolution (300dpi equivalent approx)
              useCORS: true, 
              logging: false,
              letterRendering: true,
              scrollX: 0,
              scrollY: 0
          },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      try {
          // @ts-ignore
          if (window.html2pdf) {
             // @ts-ignore
             await window.html2pdf().set(opt).from(element).save();
          } else {
              alert("Error: Librería PDF no cargada. Intenta recargar la página.");
          }
      } catch (err) {
          console.error("PDF Export failed", err);
          alert("Hubo un error al generar el PDF.");
      } finally {
          setIsExportingPDF(false);
      }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-100 font-sans text-slate-900 print:block print:h-auto print:bg-white print:overflow-visible">
      
      {/* --- SIDEBAR: Control Panel --- */}
      <aside className="w-full md:w-[400px] bg-slate-900 text-slate-200 flex flex-col h-full border-r border-slate-700 shadow-2xl z-20 print:hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <div className="bg-indigo-600 p-1.5 rounded-md">
                    <Grid3X3 className="w-5 h-5 text-white" />
                </div>
                SopaCreator
            </h1>
            <p className="text-slate-500 text-[10px] mt-1 tracking-wider uppercase font-medium ml-1">Generador Profesional v4.1</p>
          </div>
          <div className="flex gap-2">
             <Tooltip text="Biblioteca Guardada" position="bottom">
                <button onClick={() => { setLibraryPuzzles(getLibrary()); setShowLibraryModal(true); }} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                    <FolderOpen className="w-5 h-5" />
                </button>
            </Tooltip>
            <Tooltip text="Configuración API" position="bottom">
                <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white relative">
                    <Settings2 className="w-5 h-5" />
                    {(!settings.logicAI.apiKey && settings.logicAI.provider !== 'gemini') && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                </button>
            </Tooltip>
          </div>
        </div>

        {/* Scrollable Controls */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
            
            {/* SECTION 1: DIFFICULTY (The Master Control) */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2">
                    <Gauge className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">1. Nivel de Dificultad</span>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                     {Object.values(Difficulty).map((d) => {
                         const preset = DIFFICULTY_PRESETS[d];
                         const isSelected = difficulty === d;
                         return (
                            <button
                                key={d}
                                onClick={() => handleDifficultyChange(d)}
                                className={`text-left p-3 rounded-lg border transition-all relative overflow-hidden group ${
                                isSelected 
                                    ? `bg-slate-800 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]` 
                                    : 'bg-slate-800/30 border-slate-700 hover:bg-slate-800 hover:border-slate-500'
                                }`}
                            >
                                <div className={`absolute top-0 left-0 w-1 h-full ${preset.color} transition-opacity ${isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-80'}`} />
                                <div className="ml-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{preset.label}</span>
                                        {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-tight">{preset.description}</p>
                                    <div className="mt-2 flex gap-2 text-[9px] font-mono text-slate-400">
                                        <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">Grilla ~{preset.defaultSize}x{preset.defaultSize}</span>
                                        <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">Palabras: {preset.recommendedWords}</span>
                                    </div>
                                </div>
                            </button>
                         );
                     })}
                </div>
            </div>

            {/* SECTION 2: CONTENIDO */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2">
                    <List className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">2. Contenido</span>
                </div>

                {/* AI Input */}
                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 hover:border-indigo-500/30 transition-colors">
                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-2 block flex justify-between">
                        <span>Generar con IA</span>
                        <BrainCircuit className="w-3 h-3 text-indigo-400" />
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Tema (ej. Países, Espacio)..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder-slate-600"
                        />
                        <button
                            onClick={handleAiGenerate}
                            disabled={isGeneratingAI || !topic}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-3 py-2 rounded-lg transition-all active:scale-95 shadow-lg shadow-indigo-900/20"
                        >
                            {isGeneratingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Word Management */}
                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                     <div className="flex justify-between items-center mb-2">
                         <label className="text-[10px] uppercase text-slate-500 font-bold block">
                            Palabras ({wordList.length})
                        </label>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            wordList.length > parseInt(DIFFICULTY_PRESETS[difficulty].recommendedWords.split('-')[1]) 
                            ? 'bg-amber-900/50 text-amber-200' 
                            : 'bg-slate-900 text-slate-400'
                        }`}>
                            Rec: {DIFFICULTY_PRESETS[difficulty].recommendedWords}
                        </span>
                     </div>
                    <form onSubmit={handleAddWord} className="relative mb-3">
                        <input
                            type="text"
                            value={manualWord}
                            onChange={(e) => setManualWord(e.target.value)}
                            placeholder="Agregar palabra manual..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:border-indigo-500 outline-none placeholder-slate-600"
                        />
                         <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white transition-colors">
                            <span className="text-xl leading-none">+</span>
                        </button>
                    </form>
                    
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                        {wordList.map((word) => (
                            <span key={word} className="inline-flex items-center gap-1.5 bg-slate-700 text-slate-200 text-[11px] px-2.5 py-1 rounded-full border border-slate-600 group hover:border-slate-500 transition-colors">
                                {word}
                                <button onClick={() => handleRemoveWord(word)} className="text-slate-400 hover:text-red-400 rounded-full p-0.5 transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* SECTION 3: GRID CONFIG */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2">
                    <MonitorPlay className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">3. Ajustes de Grilla</span>
                </div>

                <div className="bg-slate-800 p-1 rounded-lg flex mb-4">
                    <button 
                        onClick={() => setIsSmartGrid(true)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${isSmartGrid ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Auto (Según Nivel)
                    </button>
                    <button 
                         onClick={() => setIsSmartGrid(false)}
                         className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${!isSmartGrid ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Manual
                    </button>
                </div>

                {!isSmartGrid && (
                    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-4 mt-2">
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <div className="flex justify-between items-end mb-1">
                                    <label className="text-[9px] uppercase text-slate-400 font-bold">Columnas</label>
                                    <span className="text-xs font-mono text-indigo-300 font-bold">{gridSize}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="8" 
                                    max="30" 
                                    value={gridSize} 
                                    onChange={(e) => setGridSize(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                             </div>
                             <div>
                                <div className="flex justify-between items-end mb-1">
                                    <label className="text-[9px] uppercase text-slate-400 font-bold">Filas</label>
                                    <span className="text-xs font-mono text-indigo-300 font-bold">{gridRows}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="8" 
                                    max="30" 
                                    value={gridRows} 
                                    onChange={(e) => setGridRows(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                             </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SECTION 4: DESIGN & ART */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2">
                    <Palette className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">4. Diseño y Arte</span>
                </div>
                
                {/* Art Studio Button */}
                <button
                    onClick={() => { setArtLibrary(getArtLibrary()); setShowArtStudio(true); }}
                    className="w-full bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white p-3 rounded-lg shadow-lg flex items-center justify-between group transition-all"
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-200" />
                        <span className="font-bold text-sm">Arte y Decoración</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                </button>
                
                {/* Background Toggle */}
                {backgroundImage && (
                    <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Image className="w-4 h-4 text-pink-400" />
                            <span className="text-xs text-slate-300">Fondo Activado</span>
                        </div>
                        <button 
                            onClick={() => setIsArtActive(!isArtActive)}
                            className={`relative w-9 h-5 rounded-full transition-colors ${isArtActive ? 'bg-indigo-500' : 'bg-slate-600'}`}
                        >
                             <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${isArtActive ? 'translate-x-4' : ''}`} />
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                     {/* Shape */}
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase text-slate-500 font-bold">Forma</label>
                        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                            {[
                                { id: 'SQUARE', icon: Square },
                                { id: 'CIRCLE', icon: Circle },
                                { id: 'HEART', icon: Heart },
                                { id: 'STAR', icon: Star }
                            ].map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => { setMaskShape(s.id as ShapeType); setIsSmartGrid(true); }}
                                    className={`flex-1 p-1.5 flex justify-center rounded transition-all ${maskShape === s.id ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-white'}`}
                                >
                                    <s.icon className="w-4 h-4" />
                                </button>
                            ))}
                        </div>
                     </div>

                      {/* Font */}
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase text-slate-500 font-bold">Fuente</label>
                         <select 
                            value={fontType} 
                            onChange={(e) => setFontType(e.target.value as FontType)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none"
                        >
                            <option value="CLASSIC">Clásica</option>
                            <option value="MODERN">Moderna</option>
                            <option value="FUN">Divertida</option>
                        </select>
                     </div>
                </div>

                {/* Color Toggle */}
                <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                    <span className="text-xs text-slate-300 ml-1">Modo Color (Letras)</span>
                    <button 
                        onClick={() => setStyleMode(prev => prev === 'bw' ? 'color' : 'bw')}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${styleMode === 'color' ? 'bg-gradient-to-r from-pink-500 to-indigo-500' : 'bg-slate-600'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform duration-300 ${styleMode === 'color' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>
            
             {/* SECTION 5: META DETAILS */}
            <div className="space-y-3">
                 <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2">
                    <Type className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">5. Textos</span>
                </div>
                
                <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-500 font-bold">Título Principal</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="Sopa de Letras" />
                </div>
                
                <div className="flex gap-2">
                    <div className="w-1/2 space-y-1">
                        <label className="text-[10px] uppercase text-slate-500 font-bold">Subtítulo Izq</label>
                        <input type="text" value={headerLeft} onChange={(e) => setHeaderLeft(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 outline-none" />
                    </div>
                    <div className="w-1/2 space-y-1">
                        <label className="text-[10px] uppercase text-slate-500 font-bold">Subtítulo Der</label>
                        <input type="text" value={headerRight} onChange={(e) => setHeaderRight(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 outline-none" />
                    </div>
                </div>
            </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
             <button
                onClick={() => handleGeneratePuzzle()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
                <RefreshCw className="w-5 h-5" /> Generar Puzzle
            </button>
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={handleSaveToLibrary}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-lg border border-slate-700 flex items-center justify-center gap-2 text-xs font-medium"
                >
                    <Save className="w-3.5 h-3.5" /> Guardar
                </button>
                <button
                    onClick={handleDownloadPDF}
                    disabled={isExportingPDF}
                    className="bg-sky-700 hover:bg-sky-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-medium"
                >
                    {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} 
                    PDF
                </button>
                 <button
                    onClick={() => window.print()}
                    className="col-span-2 bg-emerald-700 hover:bg-emerald-600 text-emerald-100 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-medium"
                >
                    <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
            </div>
        </div>
      </aside>

      {/* --- MAIN: Preview Area --- */}
      <main className="flex-1 bg-gray-200/50 relative overflow-auto flex flex-col items-center p-8 print:bg-white print:p-0 print:m-0 print:w-full print:h-full print:absolute print:top-0 print:left-0 print:z-50 print:overflow-visible">
        
        {/* Toolbar Floating */}
        <div className="absolute top-6 flex gap-4 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 z-10 no-print print:hidden">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 border-r pr-4">
                 <Hash className="w-3 h-3" />
                 <span className="font-mono">{currentSeed || "SEED"}</span>
            </div>
            <button 
                onClick={() => setShowSolution(!showSolution)} 
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${showSolution ? 'text-green-600' : 'text-gray-500 hover:text-gray-800'}`}
            >
                {showSolution ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                {showSolution ? 'Ocultar Solución' : 'Ver Solución'}
            </button>
        </div>

        {/* Paper Simulation */}
        <div className="relative shadow-2xl print:shadow-none transition-transform duration-300 origin-center scale-[0.65] sm:scale-[0.75] md:scale-[0.85] lg:scale-[0.9] xl:scale-100 print:scale-100 print:transform-none print:m-0 print:p-0 my-auto">
           <PuzzleSheet 
             puzzle={generatedPuzzle}
             config={{
               title, headerLeft, headerRight, footerText, pageNumber, 
               difficulty, gridSize, gridHeight: gridRows, // Pass both
               words: wordList, showSolution, 
               styleMode, themeData, seed: currentSeed,
               maskShape, hiddenMessage, fontType,
               backgroundImage: isArtActive ? backgroundImage : undefined,
               backgroundStyle: isArtActive ? backgroundStyle : undefined
             }}
           />
        </div>

      </main>

      {/* --- MODAL: Art Studio --- */}
      {showArtStudio && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md print:hidden">
              <div className="bg-slate-900 text-white w-full max-w-5xl h-[85vh] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col md:flex-row">
                  
                  {/* Left: Controls */}
                  <div className="w-full md:w-1/3 bg-slate-950 p-6 flex flex-col border-r border-slate-800">
                      <div className="mb-6">
                          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-indigo-400 flex items-center gap-2">
                              <Sparkles className="w-6 h-6 text-pink-400"/> Art Studio
                          </h2>
                          <p className="text-slate-400 text-xs mt-2">
                              Crea fondos únicos usando IA Generativa. Diseñados para no obstruir el texto.
                          </p>
                      </div>

                      <div className="space-y-4 flex-1">
                          <div>
                              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Prompt (Descripción)</label>
                              <textarea
                                value={artPrompt}
                                onChange={(e) => setArtPrompt(e.target.value)}
                                placeholder="Ej. Un bosque encantado, borde de hojas de otoño, galaxia suave, dinosaurios jugando..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none h-24 resize-none"
                              />
                          </div>

                          <div>
                              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Estilo</label>
                              <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => setBackgroundStyle('bw')}
                                    className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 transition-all ${backgroundStyle === 'bw' ? 'bg-slate-800 border-white text-white' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                                  >
                                      <div className="w-4 h-4 rounded-full border border-current"></div>
                                      Blanco y Negro (Line Art)
                                  </button>
                                  <button
                                    onClick={() => setBackgroundStyle('color')}
                                    className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 transition-all ${backgroundStyle === 'color' ? 'bg-gradient-to-br from-pink-900/50 to-indigo-900/50 border-pink-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                                  >
                                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-indigo-500"></div>
                                      Color (Marca de Agua)
                                  </button>
                              </div>
                          </div>

                          <button
                            onClick={handleGenerateArt}
                            disabled={isGeneratingArt || !artPrompt}
                            className="w-full bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 mt-4"
                          >
                              {isGeneratingArt ? <Loader2 className="w-5 h-5 animate-spin"/> : <Wand2 className="w-5 h-5"/>}
                              Generar Arte
                          </button>
                          
                          {isArtActive && backgroundImage && (
                              <button
                                onClick={handleClearArt}
                                className="w-full bg-slate-800 hover:bg-red-900/30 text-slate-300 hover:text-red-400 py-2 rounded-lg flex items-center justify-center gap-2 text-xs border border-slate-700 hover:border-red-800 mt-2"
                              >
                                  <Eraser className="w-4 h-4"/> Quitar Fondo Actual
                              </button>
                          )}
                      </div>
                  </div>

                  {/* Right: Gallery */}
                  <div className="w-full md:w-2/3 bg-slate-900 p-6 overflow-hidden flex flex-col">
                      <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-800">
                          <h3 className="font-bold text-slate-300 flex items-center gap-2">
                              <Layout className="w-5 h-5"/> Mis Plantillas
                          </h3>
                          <button onClick={() => setShowArtStudio(false)} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full"><X className="w-5 h-5"/></button>
                      </div>

                      <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar">
                          {artLibrary.length === 0 && (
                              <div className="col-span-full flex flex-col items-center justify-center text-slate-600 opacity-50 h-64">
                                  <Image className="w-16 h-16 mb-2"/>
                                  <p>No tienes diseños guardados.</p>
                              </div>
                          )}
                          {artLibrary.map((template) => (
                              <div key={template.id} className="group relative aspect-[3/4] bg-white rounded-lg overflow-hidden border border-slate-700 hover:border-pink-500 transition-all shadow-md">
                                  <img src={template.imageBase64} alt={template.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                      <p className="text-white text-xs font-bold truncate">{template.name}</p>
                                      <p className="text-slate-300 text-[10px] capitalize">{template.style}</p>
                                      <div className="flex gap-2 mt-2">
                                          <button 
                                            onClick={() => { handleLoadArt(template); setShowArtStudio(false); }}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1.5 rounded"
                                          >
                                              Aplicar
                                          </button>
                                          <button 
                                            onClick={() => { deleteArtTemplate(template.id); setArtLibrary(getArtLibrary()); }}
                                            className="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded"
                                          >
                                              <Trash2 className="w-4 h-4"/>
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: Settings --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
            <div className="bg-slate-900 text-white w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Settings2 className="w-5 h-5 text-indigo-400"/> Conectar APIs</h2>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={() => setShowDiagnostics(true)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 flex items-center gap-2"
                        >
                            <Activity className="w-3.5 h-3.5 text-emerald-400" /> Diagnóstico
                        </button>
                        <button onClick={() => setShowSettingsModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white"/></button>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6">
                    <p className="text-sm text-slate-400 bg-slate-800 p-3 rounded-lg border border-slate-700">
                        Configura tus proveedores de IA favoritos. Puedes usar claves distintas para la generación lógica (palabras) y visual (temas).
                        Soporte nativo para <strong>Google Gemini, xAI (Grok), DeepSeek</strong> y cualquier modelo compatible con OpenAI.
                    </p>

                    <ProviderSettingsForm 
                        title="Generación de Palabras (Lógica)"
                        icon={BrainCircuit}
                        settings={settings.logicAI}
                        onUpdate={(s) => setSettings({...settings, logicAI: s})}
                    />

                    <ProviderSettingsForm 
                        title="Generación de Diseño (Temas/Colores/Arte)"
                        icon={Palette}
                        settings={settings.designAI}
                        onUpdate={(s) => setSettings({...settings, designAI: s})}
                    />
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-950 flex justify-end gap-2">
                    <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                    <button 
                        onClick={() => {
                            saveSettings(settings);
                            setShowSettingsModal(false);
                        }}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm shadow-lg transition-all"
                    >
                        Guardar Configuración
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL: Diagnostics --- */}
      {showDiagnostics && (
          <SystemDiagnostics settings={settings} onClose={() => setShowDiagnostics(false)} />
      )}

      {/* --- MODAL: Library --- */}
      {showLibraryModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
              <div className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold flex items-center gap-2"><FolderOpen className="w-6 h-6 text-indigo-600"/> Librería de Puzzles</h2>
                    <button onClick={() => setShowLibraryModal(false)}><X className="w-6 h-6 text-gray-500 hover:text-black"/></button>
                </div>
                <div className="p-6 overflow-y-auto bg-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar">
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
                                <div className="flex gap-2 mt-1">
                                    <span className="font-mono text-[10px] bg-gray-100 px-1 rounded">ID: {record.puzzleData.seed}</span>
                                    {record.config.backgroundImage && <span className="text-[10px] bg-pink-100 text-pink-600 px-1 rounded font-bold">ARTE</span>}
                                </div>
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
