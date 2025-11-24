import React, { useState, useEffect, useCallback } from 'react';
import { generateWordListAI, generateThemeAI, PROVIDER_PRESETS, testApiConnection } from './services/aiService';
import { generatePuzzle, calculateSmartGridSize, generateThemeFromTopic } from './utils/puzzleGenerator';
import { loadSettings, saveSettings, savePuzzleToLibrary, getLibrary, deletePuzzleFromLibrary } from './services/storageService';
import PuzzleSheet from './components/PuzzleSheet';
import { Difficulty, GeneratedPuzzle, PuzzleTheme, AppSettings, SavedPuzzleRecord, PuzzleConfig, AIProvider, ShapeType, FontType, AISettings } from './types';
import { Printer, RefreshCw, Wand2, Settings2, Grid3X3, Type, CheckCircle2, Hash, Dices, Palette, Sparkles, Save, FolderOpen, Trash2, X, BrainCircuit, Paintbrush, Heart, Circle, Square, MessageSquare, Gem, Star, Layout, List, MousePointerClick, ChevronRight, MonitorPlay, AlertTriangle, Check, Loader2, Network, FileDown, Activity, ShieldCheck, AlertCircle, Clock } from 'lucide-react';

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

        // Test 4: Design API
        // Only run if providers are different or strictly if keys exist
        const designStart = performance.now();
        const designTest = await testApiConnection(settings.designAI);
        const designTime = Math.round(performance.now() - designStart);
        newResults.push({
            name: `API Diseño (${settings.designAI.provider})`,
            status: designTest.success ? 'success' : 'error',
            message: designTest.message + (designTest.success ? ` (${designTime}ms)` : "")
        });
        if (!designTest.success) hasError = true;

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
  const [libraryPuzzles, setLibraryPuzzles] = useState<SavedPuzzleRecord[]>([]);

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
  const [isSmartGrid, setIsSmartGrid] = useState(true); 
  const [styleMode, setStyleMode] = useState<'bw' | 'color'>('bw');
  const [themeData, setThemeData] = useState<PuzzleTheme | undefined>(undefined);
  
  // --- New Expert Features ---
  const [maskShape, setMaskShape] = useState<ShapeType>('SQUARE');
  const [fontType, setFontType] = useState<FontType>('CLASSIC');
  const [hiddenMessage, setHiddenMessage] = useState('');

  const [showSolution, setShowSolution] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
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
        // If shape is not square, we usually need more space to fit same words
        let shapeMultiplier = maskShape === 'SQUARE' ? 1.0 : 1.3;
        sizeToUse = Math.ceil(calculateSmartGridSize(wordsToUse, difficulty) * shapeMultiplier);
        setGridSize(sizeToUse);
    }

    // 2. Theme Logic
    if (forceTheme) {
        setThemeData(forceTheme);
    } else if (styleMode === 'color' && !themeData) {
        const themeSource = topic || seedToUse || 'default';
        setThemeData(generateThemeFromTopic(themeSource));
    }

    // 3. Generate
    const puzzle = generatePuzzle(sizeToUse, wordsToUse, difficulty, seedToUse, maskShape, hiddenMessage);
    setGeneratedPuzzle(puzzle);
    setCurrentSeed(puzzle.seed);
    
  }, [gridSize, wordList, difficulty, seedInput, isSmartGrid, styleMode, topic, themeData, maskShape, hiddenMessage]);

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
        const newWords = await generateWordListAI(settings.logicAI, topic, 15, difficulty);
        
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

  // --- Library Operations ---

  const handleSaveToLibrary = () => {
    if (!generatedPuzzle) return;
    
    const config: PuzzleConfig = {
        title, headerLeft, headerRight, footerText, pageNumber, 
        difficulty, gridSize, words: wordList, 
        showSolution, seed: currentSeed, styleMode, themeData,
        maskShape, hiddenMessage, fontType
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
      setIsSmartGrid(false); 
      setWordList(record.config.words);
      setSeedInput(record.config.seed || '');
      setStyleMode(record.config.styleMode);
      setThemeData(record.config.themeData);
      
      // New Features Load
      setMaskShape(record.config.maskShape || 'SQUARE');
      setHiddenMessage(record.config.hiddenMessage || '');
      setFontType(record.config.fontType || 'CLASSIC');
      
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
            <p className="text-slate-500 text-[10px] mt-1 tracking-wider uppercase font-medium ml-1">Generador Profesional v3.5</p>
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
            
            {/* SECTION 1: CONTENT (Words & AI) */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2">
                    <List className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">1. Contenido</span>
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
                    {settings.logicAI.provider === 'gemini' && !process.env.API_KEY && !settings.logicAI.apiKey && (
                         <p className="text-[9px] text-amber-500 mt-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Configura tu API Key en el engranaje superior.
                         </p>
                    )}
                </div>

                {/* Word Management */}
                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                     <label className="text-[10px] uppercase text-slate-500 font-bold mb-2 block">
                        Palabras ({wordList.length})
                    </label>
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
                        {wordList.length === 0 && <span className="text-slate-500 text-xs italic">Agrega palabras para comenzar...</span>}
                    </div>
                </div>
            </div>

            {/* SECTION 2: GRID CONFIG (Programmable) */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2">
                    <MonitorPlay className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">2. Grilla Programable</span>
                </div>

                <div className="bg-slate-800 p-1 rounded-lg flex mb-4">
                    <button 
                        onClick={() => setIsSmartGrid(true)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${isSmartGrid ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Auto (IA)
                    </button>
                    <button 
                         onClick={() => setIsSmartGrid(false)}
                         className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${!isSmartGrid ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Manual
                    </button>
                </div>

                {isSmartGrid ? (
                    <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-center">
                        <BrainCircuit className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-50" />
                        <p className="text-xs text-indigo-200">
                            La IA calculará el tamaño óptimo ({calculateSmartGridSize(wordList, difficulty)}x{calculateSmartGridSize(wordList, difficulty)}) para asegurar que todas las palabras encajen perfectamente.
                        </p>
                    </div>
                ) : (
                    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-4">
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] uppercase text-slate-400 font-bold">Tamaño</label>
                            <span className="text-sm font-mono text-indigo-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                                {gridSize} x {gridSize}
                            </span>
                        </div>
                        <input 
                            type="range" 
                            min="10" 
                            max="30" 
                            value={gridSize} 
                            onChange={(e) => setGridSize(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>10 (Pequeño)</span>
                            <span>30 (Enorme)</span>
                        </div>
                    </div>
                )}

                <div className="space-y-2 pt-2">
                    <label className="text-[10px] uppercase text-slate-500 font-bold block">Dificultad (Direcciones)</label>
                    <div className="grid grid-cols-3 gap-2">
                         {Object.values(Difficulty).map((d) => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`py-2 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                                difficulty === d 
                                    ? 'bg-slate-200 text-slate-900 border-slate-200' 
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                                }`}
                            >
                                {d}
                            </button>
                         ))}
                    </div>
                </div>
            </div>

            {/* SECTION 3: DESIGN */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2">
                    <Paintbrush className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">3. Diseño</span>
                </div>
                
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
                    <span className="text-xs text-slate-300 ml-1">Modo Color</span>
                    <button 
                        onClick={() => setStyleMode(prev => prev === 'bw' ? 'color' : 'bw')}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${styleMode === 'color' ? 'bg-gradient-to-r from-pink-500 to-indigo-500' : 'bg-slate-600'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform duration-300 ${styleMode === 'color' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>
            
             {/* SECTION 4: META DETAILS */}
            <div className="space-y-3">
                 <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2">
                    <Type className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">4. Textos</span>
                </div>
                
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="Título Principal" />
                
                <div className="flex gap-2">
                    <input type="text" value={headerLeft} onChange={(e) => setHeaderLeft(e.target.value)} className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 outline-none" placeholder="Subtítulo Izq" />
                    <input type="text" value={headerRight} onChange={(e) => setHeaderRight(e.target.value)} className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 outline-none" placeholder="Subtítulo Der" />
                </div>

                <div className="relative">
                     <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                     <input 
                        type="text" 
                        value={hiddenMessage}
                        onChange={(e) => setHiddenMessage(e.target.value)}
                        placeholder="Mensaje oculto (letras sobrantes)..."
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 pl-8 py-2 text-xs text-indigo-300 placeholder-slate-600 outline-none focus:border-indigo-500"
                    />
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
      <main className="flex-1 bg-gray-200/50 relative overflow-hidden flex flex-col items-center justify-center p-8 print:bg-white print:p-0 print:m-0 print:w-full print:h-full print:absolute print:top-0 print:left-0 print:z-50 print:overflow-visible">
        
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
        <div className="relative shadow-2xl print:shadow-none transition-transform duration-300 origin-center scale-[0.65] sm:scale-[0.75] md:scale-[0.85] lg:scale-[0.9] xl:scale-100 print:scale-100 print:transform-none print:m-0 print:p-0">
           <PuzzleSheet 
             puzzle={generatedPuzzle}
             config={{
               title, headerLeft, headerRight, footerText, pageNumber, 
               difficulty, gridSize, words: wordList, showSolution, 
               styleMode, themeData, seed: currentSeed,
               maskShape, hiddenMessage, fontType
             }}
           />
        </div>

      </main>

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
                        title="Generación de Diseño (Temas/Colores)"
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