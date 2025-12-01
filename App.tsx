import React, { useState, useEffect, useCallback } from 'react';
import { generateWordListAI, generateThemeAI, generatePuzzleBackground, PROVIDER_PRESETS, testApiConnection, GEMINI_MODELS, DEEPSEEK_MODELS, GROK_MODELS, OPENAI_MODELS } from './services/aiService';
import { generatePuzzle, calculateSmartGridSize, generateThemeFromTopic } from './utils/puzzleGenerator';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadSettings, saveSettings, savePuzzleToLibrary, deletePuzzleFromLibrary, getLibrary, saveArtTemplate, deleteArtTemplate, createBookStack, addPuzzleToStack, deleteBookStack, removePuzzleFromStack, resetLibrary, getBookStacks, getArtLibrary, DEFAULT_SETTINGS } from './services/storageService';
import PuzzleSheet from './components/PuzzleSheet';
import { GradientDefs } from './components/ui/GradientDefs';
import { GlassCard } from './components/ui/GlassCard';
import { Toast, ToastType } from './components/ui/Toast';
import { Difficulty, GeneratedPuzzle, PuzzleTheme, AppSettings, SavedPuzzleRecord, PuzzleConfig, AIProvider, ShapeType, FontType, AISettings, ArtTemplate, PuzzleMargins, BookStack, ImageFilters } from './types';
import { Printer, RefreshCw, Wand2, Settings2, Grid3X3, Type, CheckCircle2, Hash, Dices, Palette, Sparkles, Save, FolderOpen, Trash2, X, BrainCircuit, Paintbrush, Heart, Circle, Square, MessageSquare, Gem, Star, Layout, List, MousePointerClick, ChevronRight, MonitorPlay, AlertTriangle, Check, Loader2, Network, FileDown, Activity, ShieldCheck, AlertCircle, Clock, Fingerprint, Gauge, Image, Eraser, ToggleLeft, ToggleRight, Download, HelpCircle, Move, ScanLine, RotateCcw, Book, Plus, FileJson, Library, ChevronDown, ChevronUp, Layers, Eye, Info, Sliders, FileText } from 'lucide-react';
import { ArtStudio } from './components/ArtStudio';
import { PropertyPanel } from './components/editor/PropertyPanel';
import { EditorElementId } from './components/editor/types';
import { CollapsibleSection } from './components/ui/CollapsibleSection';
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
        w-max max-w-[200px] bg-cosmic-900 text-white text-[10px] font-medium p-2 rounded-md shadow-xl border border-glass-border
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
        <div className="bg-cosmic-900/50 p-2 rounded border border-glass-border/50 hover:border-indigo-500/30 transition-colors">
            <div className="flex justify-between items-center mb-1.5 gap-2">
                <span className="text-[10px] text-slate-400 font-medium">{label}</span>
                <div className="relative flex items-center">
                    <input
                        type="text"
                        inputMode="decimal"
                        value={localText}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className="w-12 text-right bg-cosmic-950 border border-glass-border rounded px-1 py-0.5 text-[10px] font-mono text-accent-300 focus:border-indigo-500 outline-none"
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
            <div className="bg-cosmic-900 text-white w-full max-w-lg rounded-2xl border border-glass-border shadow-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-glass-border flex justify-between items-center bg-cosmic-950">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-400" /> Diagnóstico del Sistema
                    </h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        {results.map((res, idx) => (
                            <div key={idx} className="bg-cosmic-800 p-3 rounded-lg flex items-center justify-between border border-glass-border">
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

                <div className="p-4 border-t border-glass-border bg-cosmic-950 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-accent-600 hover:bg-accent-500 text-white rounded-lg font-bold text-sm shadow-lg transition-all"
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
            provider: preset.id as AIProvider, // Use the ID (grok, deepseek) not the generic type
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
        <div className="bg-cosmic-800/30 rounded-xl p-4 border border-glass-border space-y-4">
            <div className="flex items-center gap-2 text-accent-300 border-b border-white/5 pb-2">
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
                                    className={`w-full text-xs p-2 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 text-center h-16 ${selectedPreset === preset.id
                                        ? 'bg-accent-600/20 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                                        : 'bg-cosmic-800 border-glass-border text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                        }`}
                                >
                                    <Network className={`w-4 h-4 ${selectedPreset === preset.id ? 'text-accent-400' : 'opacity-50'}`} />
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
                            onChange={(e) => {
                                const newKey = e.target.value;
                                let newSettings = { ...settings, apiKey: newKey };

                                // Auto-detect Grok
                                if (newKey.startsWith('xai-') && selectedPreset !== 'grok') {
                                    handlePresetChange('grok');
                                    // handlePresetChange updates state async, so we need to ensure settings are consistent
                                    // But handlePresetChange calls onUpdate, so we might have a race condition if we call onUpdate here too.
                                    // Better approach: Just call handlePresetChange, and let the user re-paste if needed? 
                                    // No, that's annoying.

                                    // Let's manually construct the update for Grok
                                    const grokPreset = PROVIDER_PRESETS['grok'];
                                    newSettings = {
                                        ...newSettings,
                                        provider: grokPreset.id as AIProvider,
                                        baseUrl: grokPreset.baseUrl,
                                        modelName: grokPreset.defaultModel
                                    };
                                    setSelectedPreset('grok');
                                }

                                onUpdate(newSettings);
                            }}
                            placeholder={selectedPreset === 'gemini' ? "Usando variable de entorno (opcional sobreescribir)" : "sk-..."}
                            className="flex-1 bg-cosmic-900 border border-slate-600 rounded px-3 py-2 text-sm font-mono text-accent-300 focus:border-indigo-500 outline-none"
                        />
                        <button
                            onClick={runTest}
                            disabled={testStatus === 'loading'}
                            className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 ${testStatus === 'success' ? 'bg-green-500/20 border-green-500 text-green-400' :
                                testStatus === 'error' ? 'bg-red-500/20 border-red-500 text-red-400' :
                                    'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {testStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Network className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-1 font-bold">Modelo</label>
                    <input
                        type="text"
                        list="model-suggestions"
                        value={settings.modelName}
                        onChange={(e) => onUpdate({ ...settings, modelName: e.target.value })}
                        className="w-full bg-cosmic-900 border border-slate-600 rounded px-3 py-2 text-sm font-mono text-slate-300 focus:border-indigo-500 outline-none"
                    />
                    <datalist id="model-suggestions">
                        {selectedPreset === 'gemini' && GEMINI_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        {selectedPreset === 'deepseek' && DEEPSEEK_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        {selectedPreset === 'grok' && GROK_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        {selectedPreset === 'openai' && OPENAI_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </datalist>
                </div>
                <div className={selectedPreset === 'gemini' ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="block text-xs text-slate-400 mb-1 font-bold">Base URL</label>
                    <input
                        type="text"
                        value={settings.baseUrl || ''}
                        onChange={(e) => onUpdate({ ...settings, baseUrl: e.target.value })}
                        disabled={selectedPreset === 'gemini'}
                        className="w-full bg-cosmic-900 border border-slate-600 rounded px-3 py-2 text-sm font-mono text-slate-400 focus:border-indigo-500 outline-none"
                    />
                </div>
            </div>
        </div>
    );
};

export default function App() {
    // --- Global Settings & Modals ---
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const bookStacks = useLiveQuery(() => getBookStacks(), []) || [];
    const libraryPuzzles = useLiveQuery(() => getLibrary(), []) || [];
    const artLibrary = useLiveQuery(() => getArtLibrary(), []) || [];

    // --- Global Modals & UI State ---
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showArtStudio, setShowArtStudio] = useState(false);
    const [puzzleToDelete, setPuzzleToDelete] = useState<{ id: string, name: string } | null>(null);
    const [puzzleToLoad, setPuzzleToLoad] = useState<SavedPuzzleRecord | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type });
    };

    // --- Panel Resizing State ---
    const [leftPanelWidth, setLeftPanelWidth] = useState(420);
    const [rightPanelWidth, setRightPanelWidth] = useState(320);
    const isResizingLeft = React.useRef(false);
    const isResizingRight = React.useRef(false);

    const startResizingLeft = useCallback(() => {
        isResizingLeft.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const startResizingRight = useCallback(() => {
        isResizingRight.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const stopResizing = useCallback(() => {
        isResizingLeft.current = false;
        isResizingRight.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizingLeft.current) {
            const newWidth = e.clientX;
            if (newWidth > 280 && newWidth < 600) setLeftPanelWidth(newWidth);
        }
        if (isResizingRight.current) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 280 && newWidth < 600) setRightPanelWidth(newWidth);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

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
    const [gridFontSizeScale, setGridFontSizeScale] = useState(1.0); // New state for font scaling
    const [styleMode, setStyleMode] = useState<'bw' | 'color'>('color');
    const [themeData, setThemeData] = useState<PuzzleTheme | undefined>(undefined);

    // --- New Expert Features ---
    const [maskShape, setMaskShape] = useState<ShapeType>('SQUARE');
    const [fontType, setFontType] = useState<FontType>('CLASSIC');
    const [designTheme, setDesignTheme] = useState<'minimal' | 'classic' | 'kids' | 'modern'>('modern'); // New Theme State
    const [isManualTheme, setIsManualTheme] = useState(false); // Track if user manually selected theme
    const [showBorders, setShowBorders] = useState(true); // New: Border Toggle
    const [hiddenMessage, setHiddenMessage] = useState('');
    const [margins, setMargins] = useState<PuzzleMargins>({ top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 });

    // --- Art Features ---
    const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
    const [backgroundStyle, setBackgroundStyle] = useState<'bw' | 'color'>('bw');
    const [backgroundFilters, setBackgroundFilters] = useState<ImageFilters | undefined>(undefined); // New Filter State
    const [overlayOpacity, setOverlayOpacity] = useState(0.85);
    const [textOverlayOpacity, setTextOverlayOpacity] = useState(0.9);
    const [templateId, setTemplateId] = useState<string>('classic'); // New Template State

    const [isArtActive, setIsArtActive] = useState(false);
    const [artPrompt, setArtPrompt] = useState('');
    const [isGeneratingArt, setIsGeneratingArt] = useState(false);

    const [showSolution, setShowSolution] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [isPrintPreview, setIsPrintPreview] = useState(false);

    // --- Seed & Generation ---
    const [seedInput, setSeedInput] = useState('');
    const [currentSeed, setCurrentSeed] = useState('');

    const [generatedPuzzle, setGeneratedPuzzle] = useState<GeneratedPuzzle | null>(null);
    const [renderKey, setRenderKey] = useState(0); // Forces re-render on load

    // --- Save Logic State ---
    const [saveOption, setSaveOption] = useState<'single' | 'existing_book' | 'new_book'>('single');
    const [saveName, setSaveName] = useState('');
    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const [newBookName, setNewBookName] = useState('');
    const [newBookTarget, setNewBookTarget] = useState(40);
    const [activeLibraryTab, setActiveLibraryTab] = useState<'puzzles' | 'books'>('puzzles');

    // --- Editor State ---
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedElement, setSelectedElement] = useState<EditorElementId | null>(null);
    const [isFreeLayout, setIsFreeLayout] = useState(false);
    const [layout, setLayout] = useState<{ [key: string]: { x: number, y: number } }>({});

    // --- Logic ---

    // Sync title to saveName when opening save modal
    useEffect(() => {
        if (showSaveModal) {
            setSaveName(title);
        }
    }, [showSaveModal, title]);

    const handleDifficultyChange = (newDifficulty: Difficulty) => {
        setDifficulty(newDifficulty);
        if (isSmartGrid) {
            const preset = DIFFICULTY_PRESETS[newDifficulty];
            setGridSize(preset.defaultSize);
            setGridRows(preset.defaultSize);
        }

        // Smart Theme Logic: Auto-select theme based on difficulty
        // Smart Theme Logic: Auto-select theme based on difficulty ONLY if not manually overridden
        if (!isManualTheme) {
            switch (newDifficulty) {
                case Difficulty.EASY:
                    setDesignTheme('kids');
                    break;
                case Difficulty.MEDIUM:
                    setDesignTheme('modern');
                    break;
                case Difficulty.HARD:
                    setDesignTheme('classic');
                    break;
            }
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

    // Instant Live Preview: Auto-regenerate when settings change
    useEffect(() => {
        const timer = setTimeout(() => {
            handleGeneratePuzzle();
        }, 100); // 100ms debounce for responsiveness
        return () => clearTimeout(timer);
    }, [handleGeneratePuzzle]);

    // Ensure theme is generated when switching to color mode
    useEffect(() => {
        if (styleMode === 'color' && !themeData) {
            setThemeData(generateThemeFromTopic(topic || 'default'));
        }
    }, [styleMode, themeData, topic]);

    const handleAiGenerate = async () => {
        if (!topic) return;
        setIsGeneratingAI(true);
        try {
            const range = DIFFICULTY_PRESETS[difficulty].recommendedWords.split('-').map(Number);
            const count = Math.ceil((range[0] + range[1]) / 2);

            // Optimization: Run AI calls in parallel
            const wordListPromise = generateWordListAI(settings.logicAI, topic, count, difficulty);

            let themePromise: Promise<PuzzleTheme | null> = Promise.resolve(null);
            if (styleMode === 'color') {
                themePromise = generateThemeAI(settings.designAI, topic);
            }

            const [newWords, aiTheme] = await Promise.all([wordListPromise, themePromise]);

            let newTheme = aiTheme;
            if (styleMode === 'color' && !newTheme) {
                newTheme = generateThemeFromTopic(topic);
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
            showToast("Error generando con AI: " + error.message, 'error');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleArtApply = (image: string, filters: ImageFilters, newTemplateId?: string) => {
        setBackgroundImage(image);
        setBackgroundFilters(filters);
        if (newTemplateId) setTemplateId(newTemplateId);
        setIsArtActive(true);
        // Default opacity settings for new art if not already set
        if (overlayOpacity === 0.85) setOverlayOpacity(0.85);
        if (textOverlayOpacity === 0.9) setTextOverlayOpacity(0.9);
    };

    const executeSave = async () => {
        console.log("[SAVE] Executing save operation...");
        if (!generatedPuzzle) {
            console.error("[SAVE] No generated puzzle found!");
            showToast("Error: No hay puzzle generado para guardar.", 'error');
            return;
        }

        console.log("[SAVE] Save option:", saveOption);
        console.log("[SAVE] Save name:", saveName);

        const config: PuzzleConfig = {
            title, headerLeft, headerRight, footerText, pageNumber,
            difficulty, gridSize, gridHeight: gridRows, words: wordList,
            showSolution, styleMode, themeData, maskShape, hiddenMessage,
            fontType, margins, designTheme, showBorders, templateId, // Save showBorders and templateId
            backgroundImage, backgroundStyle, backgroundFilters, overlayOpacity, textOverlayOpacity,
            isFreeLayout, layout, gridFontSizeScale // Save Smart Layout settings and Font Scale
        };

        try {
            if (saveOption === 'single') {
                // VALIDATION: Prevent "Word Search" default or empty names to avoid duplication confusion
                if (!saveName.trim() || saveName.trim().toLowerCase() === 'sopa de letras') {
                    showToast("Por favor, asigna un nombre único a este archivo.", 'warning');
                    return;
                }
                console.log("[SAVE] Saving single puzzle:", saveName);
                await savePuzzleToLibrary(saveName, config, generatedPuzzle);
                console.log("[SAVE] Single puzzle saved successfully.");
            } else if (saveOption === 'existing_book' && selectedBookId) {
                console.log("[SAVE] Adding to existing book:", selectedBookId);
                const record = {
                    id: crypto.randomUUID(),
                    name: title,
                    createdAt: Date.now(),
                    config,
                    puzzleData: generatedPuzzle
                };
                await addPuzzleToStack(selectedBookId, record);
                console.log("[SAVE] Added to book successfully.");
            } else if (saveOption === 'new_book' && newBookName) {
                console.log("[SAVE] Creating new book:", newBookName);
                const stack = await createBookStack(newBookName, newBookTarget);
                const record = {
                    id: crypto.randomUUID(),
                    name: title,
                    createdAt: Date.now(),
                    config,
                    puzzleData: generatedPuzzle
                };
                await addPuzzleToStack(stack.id, record);
                console.log("[SAVE] New book created and puzzle added.");
            }

            setShowSaveModal(false);
            showToast("¡Guardado exitosamente!", 'success');
        } catch (error: any) {
            console.error("[SAVE] Error saving puzzle:", error);
            showToast("Error al guardar: " + error.message, 'error');
        }
    };

    const handleLoadPuzzle = (record: SavedPuzzleRecord) => {
        // 0. Safety Check
        if (!record) return;

        try {
            const { config, puzzleData } = record;

            // Validate Logic Data Integrity
            if (!puzzleData || !puzzleData.grid) {
                throw new Error("El archivo guardado está dañado o tiene un formato antiguo incompatible.");
            }

            // 1. Restore Config / Metadatos (with Fallbacks)
            setTitle(config.title || 'Sopa de Letras');
            setHeaderLeft(config.headerLeft || '');
            setHeaderRight(config.headerRight || '');
            setFooterText(config.footerText || '');
            setPageNumber(config.pageNumber || '');

            // 2. Restore Logic State
            setDifficulty(config.difficulty || Difficulty.MEDIUM);
            setWordList(Array.isArray(config.words) ? [...config.words] : []);
            setMaskShape(config.maskShape || 'SQUARE');
            setHiddenMessage(config.hiddenMessage || '');

            // 3. Restore Grid Dimensions & Smart Grid Lock
            // Force Smart Grid OFF first to prevent auto-recalc interference
            setIsSmartGrid(false);

            const loadedSize = config.gridSize || 15;
            setGridSize(loadedSize);
            setGridRows(config.gridHeight || loadedSize);

            // 4. Restore Style & Theme
            const loadedStyleMode = config.styleMode || 'bw';
            setStyleMode(loadedStyleMode);

            if (config.themeData) {
                setThemeData({ ...config.themeData });
            } else if (loadedStyleMode === 'bw') {
                setThemeData(undefined); // Clear theme if loading a BW puzzle
            }

            setFontType(config.fontType || 'CLASSIC');
            setDesignTheme(config.designTheme || 'modern'); // Restore designTheme

            if (config.margins) {
                setMargins({ ...config.margins });
            } else {
                setMargins({ top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 });
            }

            setTemplateId(config.templateId || 'classic'); // Restore Template ID

            // 5. Restore Art / Background
            setBackgroundImage(config.backgroundImage);
            setBackgroundStyle(config.backgroundStyle || 'bw');
            setBackgroundFilters(config.backgroundFilters); // Restore Filters
            setIsArtActive(!!config.backgroundImage);
            setOverlayOpacity(config.overlayOpacity ?? 0.85);
            setTextOverlayOpacity(config.textOverlayOpacity ?? 0.9);

            // 6. Restore Smart Layout
            setIsFreeLayout(config.isFreeLayout || false);
            setLayout(config.layout || {});
            setGridFontSizeScale(config.gridFontSizeScale || 1.0);

            // 7. Restore Core Puzzle Data
            setSeedInput(puzzleData.seed || '');
            setCurrentSeed(puzzleData.seed || '');

            // Force Deep Copy of Grid Row by Row to ensure React State Change and remove reference to stored object
            setGeneratedPuzzle({
                ...puzzleData,
                grid: Array.isArray(puzzleData.grid) ? puzzleData.grid.map((row: any[]) =>
                    Array.isArray(row) ? row.map((cell: any) => ({ ...cell })) : []
                ) : []
            });

            // Increment Key to force full re-mount of PuzzleSheet component
            setRenderKey(prev => prev + 1);

            setShowLibraryModal(false);
        } catch (e: any) {
            console.error("Error loading puzzle:", e);
            showToast("Error al cargar el archivo (Datos Corruptos): " + e.message, 'error');
        }

    };

    const handleResetLibrary = () => {
        setShowResetConfirm(true);
    };

    const confirmResetLibrary = async () => {
        try {
            await resetLibrary();
            showToast("Base de datos reseteada correctamente.", 'success');
            setShowResetConfirm(false);
        } catch (e: any) {
            console.error("Error resetting library:", e);
            showToast("Error al resetear: " + e.message, 'error');
        }
    };

    // Helper: Delete puzzle with error handling and logging
    // Helper: Trigger delete confirmation modal
    const handleDeletePuzzle = (puzzleId: string, puzzleName: string) => {
        setPuzzleToDelete({ id: puzzleId, name: puzzleName });
    };

    const confirmDeletePuzzle = async () => {
        if (!puzzleToDelete) return;

        try {
            await deletePuzzleFromLibrary(puzzleToDelete.id);
            setPuzzleToDelete(null);
        } catch (error: any) {
            console.error("Error deleting puzzle:", error);
            showToast("Error al eliminar: " + error.message, 'error');
        }
    };

    // Helper: Trigger load confirmation modal
    const handleLoadPuzzleAsync = (record: SavedPuzzleRecord) => {
        setPuzzleToLoad(record);
    };

    const confirmLoadPuzzle = () => {
        if (!puzzleToLoad) return;

        try {
            console.log("[LOAD] Loading puzzle:", puzzleToLoad.id, puzzleToLoad.name);
            handleLoadPuzzle(puzzleToLoad);
            console.log("[LOAD] Puzzle loaded successfully");
            setPuzzleToLoad(null);
            setShowLibraryModal(false); // Close library modal after load
        } catch (e: any) {
            console.error("[LOAD] Error loading puzzle:", e);
            showToast("Error al cargar el archivo (Datos Corruptos): " + e.message, 'error');
        }
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

    const handleExportImage = () => {
        const element = document.getElementById('puzzle-sheet');
        if (!element || !(window as any).html2canvas) return;

        showToast("Generando imagen de alta resolución...", "info");

        (window as any).html2canvas(element, {
            scale: 3, // High resolution
            useCORS: true,
            backgroundColor: null // Transparent if possible, or white
        }).then((canvas: HTMLCanvasElement) => {
            const link = document.createElement('a');
            link.download = `SopaLetras_${title.replace(/\s+/g, '_')}_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast("Imagen descargada correctamente.", "success");
        }).catch((err: any) => {
            console.error("Export error:", err);
            showToast("Error al exportar imagen.", "error");
        });
    };

    const handleElementDrag = (id: string, x: number, y: number) => {
        if (!isFreeLayout) return; // Only allow dragging in Free Layout mode

        // 1. Update the dragged element's position immediately
        const newLayout = { ...layout, [id]: { x, y } };

        // 2. Collision Detection (Simple Push Mechanism)
        const draggableIds = ['title', 'grid', 'wordList', 'headerLeft', 'headerRight'];
        const draggedEl = document.getElementById(id);

        if (draggedEl) {
            const draggedRect = {
                x: x,
                y: y,
                width: draggedEl.offsetWidth,
                height: draggedEl.offsetHeight,
                centerX: x + draggedEl.offsetWidth / 2,
                centerY: y + draggedEl.offsetHeight / 2
            };

            draggableIds.forEach(otherId => {
                if (otherId === id) return;

                const otherEl = document.getElementById(otherId);
                if (!otherEl) return;

                // Get current position. If it's in newLayout (e.g. previously pushed), use that.
                // Otherwise use DOM offset.
                let otherX = newLayout[otherId]?.x ?? otherEl.offsetLeft;
                let otherY = newLayout[otherId]?.y ?? otherEl.offsetTop;

                const otherRect = {
                    x: otherX,
                    y: otherY,
                    width: otherEl.offsetWidth,
                    height: otherEl.offsetHeight,
                    centerX: otherX + otherEl.offsetWidth / 2,
                    centerY: otherY + otherEl.offsetHeight / 2
                };

                // Check overlap
                if (
                    draggedRect.x < otherRect.x + otherRect.width &&
                    draggedRect.x + draggedRect.width > otherRect.x &&
                    draggedRect.y < otherRect.y + otherRect.height &&
                    draggedRect.y + draggedRect.height > otherRect.y
                ) {
                    // Collision detected! Push other element away.
                    let dx = otherRect.centerX - draggedRect.centerX;
                    let dy = otherRect.centerY - draggedRect.centerY;

                    // Normalize if centers are perfectly aligned
                    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) dx = 1;

                    // Calculate Minimum Translation Vector (MTV)
                    const overlapX = (draggedRect.width + otherRect.width) / 2 - Math.abs(dx);
                    const overlapY = (draggedRect.height + otherRect.height) / 2 - Math.abs(dy);

                    if (overlapX < overlapY) {
                        // Push in X
                        otherX += dx > 0 ? overlapX + 5 : -(overlapX + 5); // Add small buffer
                    } else {
                        // Push in Y
                        otherY += dy > 0 ? overlapY + 5 : -(overlapY + 5); // Add small buffer
                    }

                    // Update layout for the pushed element
                    newLayout[otherId] = { x: otherX, y: otherY };
                }
            });
        }

        setLayout(newLayout);
    };

    const handleExportBookJson = (stack: BookStack) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stack, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${stack.name.replace(/\s+/g, '_')}_API_DATA.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
    };

    return (
        <div className="flex h-screen text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30" style={{ background: 'linear-gradient(135deg, #0a0e27 0%, #1a1535 50%, #0f051d 100%)' }}>
            <GradientDefs />
            {/* Left Sidebar - Controls */}
            <aside style={{ width: leftPanelWidth }} className="panel-glass border-r border-white/10 flex flex-col z-30 shadow-2xl relative transition-all duration-75">
                {/* Drag Handle */}
                <div
                    className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-50 group"
                    onMouseDown={startResizingLeft}
                >
                    <div className="w-0.5 h-full bg-indigo-500/0 group-hover:bg-indigo-500/50 mx-auto transition-colors" />
                </div>

                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-600/20 to-purple-600/20 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-accent-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
                            <BrainCircuit className="w-6 h-6 text-white" stroke="url(#gradient-gold)" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-white leading-tight tracking-tight">SopaCreator AI</h1>
                            <span className="text-[10px] text-accent-400 font-mono tracking-widest uppercase">Pro Edition v4.5</span>
                        </div>
                    </div >
                    <div className="flex gap-2">
                        <Tooltip text={isEditMode ? "Salir del Editor" : "Editor Visual"} position="bottom">
                            <button
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={`p-2 rounded-lg transition-colors ${isEditMode ? 'bg-accent-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                            >
                                <Move className="w-5 h-5" />
                            </button>
                        </Tooltip>
                        <Tooltip text="Diagnóstico del Sistema" position="bottom">
                            <button onClick={() => setShowDiagnostics(true)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-emerald-400">
                                <Activity className="w-4 h-4" />
                            </button>
                        </Tooltip>
                        <Tooltip text="Configuración Global API" position="bottom">
                            <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
                                <Settings2 className="w-5 h-5" />
                            </button>
                        </Tooltip>
                    </div>
                </div >

                {/* Scrollable Controls */}
                < div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar" >
                    {
                        isEditMode ? (
                            <PropertyPanel
                                selectedElement={selectedElement}
                                config={{
                                    title, headerLeft, headerRight, footerText, pageNumber,
                                    difficulty, gridSize, gridHeight: gridRows, words: wordList,
                                    showSolution, styleMode, themeData, maskShape, hiddenMessage,
                                    fontType, margins, designTheme, showBorders, templateId,
                                    backgroundImage, backgroundStyle, backgroundFilters, overlayOpacity, textOverlayOpacity
                                }}
                                onUpdateConfig={(updates) => {
                                    if (updates.title !== undefined) setTitle(updates.title);
                                    if (updates.fontType !== undefined) setFontType(updates.fontType);
                                    if (updates.gridSize !== undefined) {
                                        setGridSize(updates.gridSize);
                                        setGridRows(updates.gridSize);
                                    }
                                    if (updates.margins !== undefined) setMargins(updates.margins);
                                    if (updates.overlayOpacity !== undefined) setOverlayOpacity(updates.overlayOpacity);
                                    if (updates.textOverlayOpacity !== undefined) setTextOverlayOpacity(updates.textOverlayOpacity);
                                }
                                }
                            />
                        ) : (
                            <div className="p-5 space-y-8">

                                {/* Sección 1: Generación AI - Improved Visuals */}
                                <div className="space-y-3 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-4 rounded-xl border border-white/10 shadow-lg relative group transition-all hover:border-indigo-500/30">
                                    <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                                        <Sparkles className="w-12 h-12 text-indigo-500 blur-sm" />
                                    </div>
                                    <h2 className="text-xs font-bold text-accent-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <Wand2 className="w-4 h-4" /> Generador Inteligente
                                    </h2>

                                    <div className="space-y-3 relative z-10">
                                        <label className="text-xs font-medium text-slate-400">Tema o Tópico</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={topic}
                                                onChange={(e) => setTopic(e.target.value)}
                                                placeholder="Ej: Dinosaurios, Espacio..."
                                                className="flex-1 bg-cosmic-900 border border-glass-border rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none text-white placeholder-slate-600 shadow-inner"
                                                onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                                            />
                                            <button
                                                onClick={handleAiGenerate}
                                                disabled={isGeneratingAI || !topic}
                                                className="btn-primary p-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center w-11 h-11 rounded-lg shadow-lg shadow-indigo-500/20"
                                            >
                                                {isGeneratingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Sección 2: Configuración Básica */}
                                <CollapsibleSection title="Estructura" icon={Layout} defaultOpen={true}>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Dificultad</label>
                                                <select
                                                    value={difficulty}
                                                    onChange={(e) => handleDifficultyChange(e.target.value as Difficulty)}
                                                    className="w-full bg-cosmic-900 border border-glass-border rounded-lg px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-slate-800 transition-colors"
                                                >
                                                    {Object.values(Difficulty).map(d => (
                                                        <option key={d} value={d}>{DIFFICULTY_PRESETS[d].label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Forma Máscara</label>
                                                <div className="flex bg-cosmic-900 border border-glass-border rounded-lg p-1 gap-1">
                                                    {(['SQUARE', 'CIRCLE', 'HEART', 'STAR'] as ShapeType[]).map(shape => (
                                                        <button
                                                            key={shape}
                                                            onClick={() => setMaskShape(shape)}
                                                            className={`flex-1 p-1.5 rounded flex items-center justify-center transition-all ${maskShape === shape ? 'bg-accent-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                                            title={shape}
                                                        >
                                                            {shape === 'SQUARE' && <Square className="w-3.5 h-3.5" />}
                                                            {shape === 'CIRCLE' && <Circle className="w-3.5 h-3.5" />}
                                                            {shape === 'HEART' && <Heart className="w-3.5 h-3.5" />}
                                                            {shape === 'STAR' && <Star className="w-3.5 h-3.5" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-2 border-t border-white/5">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Dimensiones Grilla</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-500">Auto-ajuste</span>
                                                    <button
                                                        onClick={() => setIsSmartGrid(!isSmartGrid)}
                                                        className={`w-9 h-5 rounded-full transition-colors relative ${isSmartGrid ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                                    >
                                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform left-1 ${isSmartGrid ? 'translate-x-4' : 'translate-x-0'}`} />
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
                                                            if (maskShape !== 'SQUARE') setGridRows(parseInt(e.target.value));
                                                        }}
                                                        className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs text-center focus:border-indigo-500 outline-none"
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
                                                        className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs text-center disabled:opacity-50 focus:border-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CollapsibleSection>

                                {/* Sección 3: Palabras */}
                                <CollapsibleSection title={`Vocabulario (${wordList.length})`} icon={List} defaultOpen={true}>
                                    <div className="space-y-3">
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
                                                className="flex-1 bg-cosmic-900 border border-glass-border rounded-l-lg px-3 py-2 text-xs focus:border-indigo-500 outline-none text-white font-mono"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (manualWord.trim()) {
                                                        setWordList(prev => [...prev, manualWord.trim().replace(/[^A-ZÑ]/g, '')]);
                                                        setManualWord('');
                                                    }
                                                }}
                                                className="bg-slate-700 hover:bg-slate-600 px-3 rounded-r-lg text-white transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 max-h-[150px] overflow-y-auto content-start bg-cosmic-900/50 p-2 rounded-lg border border-slate-800 custom-scrollbar">
                                            {wordList.map((w, i) => (
                                                <span key={i} className="bg-cosmic-800 text-slate-300 text-[10px] px-2 py-1 rounded border border-glass-border flex items-center gap-1 group hover:border-indigo-500/50 transition-colors">
                                                    {w}
                                                    <button
                                                        onClick={() => setWordList(prev => prev.filter((_, idx) => idx !== i))}
                                                        className="hover:text-red-400 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                            {wordList.length === 0 && <span className="text-[10px] text-slate-600 italic w-full text-center py-4">Lista vacía. Añade palabras o usa la IA.</span>}
                                        </div>

                                        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-[10px] text-amber-200/80 flex gap-2 items-start mt-2">
                                            <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
                                            <div className="w-full">
                                                <label className="block font-bold mb-1 text-amber-400">Mensaje Oculto (Opcional)</label>
                                                <input
                                                    type="text"
                                                    value={hiddenMessage}
                                                    onChange={(e) => setHiddenMessage(e.target.value)}
                                                    placeholder="Se revela con las letras sobrantes..."
                                                    className="w-full bg-transparent border-b border-amber-500/30 outline-none text-amber-100 placeholder-amber-500/40 py-1 focus:border-amber-500/60 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CollapsibleSection>

                                {/* Sección 5: Textos */}
                                <CollapsibleSection title="Metadatos" icon={Type} defaultOpen={false}>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 block">Título Principal</label>
                                            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs focus:border-indigo-500 outline-none" placeholder="Título Principal" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 block">Subtítulo Izq</label>
                                                <input value={headerLeft} onChange={e => setHeaderLeft(e.target.value)} className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs focus:border-indigo-500 outline-none" placeholder="Subtítulo Izq" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 block">Subtítulo Der</label>
                                                <input value={headerRight} onChange={e => setHeaderRight(e.target.value)} className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs focus:border-indigo-500 outline-none" placeholder="Subtítulo Der" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-[9px] text-slate-500 block">Pie de página</label>
                                                <input value={footerText} onChange={e => setFooterText(e.target.value)} className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs focus:border-indigo-500 outline-none" placeholder="Pie de página" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 block"># Pág</label>
                                                <input value={pageNumber} onChange={e => setPageNumber(e.target.value)} className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs text-center focus:border-indigo-500 outline-none" placeholder="#" />
                                            </div>
                                        </div>
                                    </div>
                                </CollapsibleSection>

                                {/* Sección 6: Márgenes */}
                                <CollapsibleSection title="Márgenes (Pulgadas)" icon={Move} defaultOpen={false}>
                                    <div className="grid grid-cols-2 gap-3">
                                        <MarginControl
                                            label="Superior"
                                            value={margins.top}
                                            max={3.0}
                                            onChange={(val) => setMargins({ ...margins, top: val })}
                                        />
                                        <MarginControl
                                            label="Inferior"
                                            value={margins.bottom}
                                            max={3.0}
                                            onChange={(val) => setMargins({ ...margins, bottom: val })}
                                        />
                                        <MarginControl
                                            label="Izquierdo"
                                            value={margins.left}
                                            max={3.0}
                                            onChange={(val) => setMargins({ ...margins, left: val })}
                                        />
                                        <MarginControl
                                            label="Derecho"
                                            value={margins.right}
                                            max={3.0}
                                            onChange={(val) => setMargins({ ...margins, right: val })}
                                        />
                                    </div>
                                </CollapsibleSection>
                            </div>
                        )}
                </div >


            </aside >

            {/* --- MAIN PREVIEW AREA --- */}
            < main className="flex-1 h-full bg-transparent relative flex flex-col overflow-hidden" >
                {/* Background Noise Layer */}
                < div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0" ></div >

                {/* Top Toolbar - Floating Fixed */}
                < div className="absolute top-6 left-1/2 -translate-x-1/2 bg-cosmic-800/90 backdrop-blur-md p-2 rounded-xl border border-slate-600 flex items-center gap-3 shadow-xl z-40 pointer-events-auto transition-transform hover:scale-105" >
                    <button
                        onClick={() => setShowSolution(!showSolution)}
                        className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-sm ${showSolution ? 'bg-accent-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'}`}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        {showSolution ? 'Ocultar Solución' : 'Ver Solución'}
                    </button>

                    <div className="w-px h-8 bg-slate-600 mx-1"></div>

                    <button
                        onClick={handleExportPDF}
                        disabled={isExportingPDF}
                        className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-all flex items-center gap-2 font-bold text-sm"
                    >
                        {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        PDF
                    </button>

                    <button
                        onClick={handleExportImage}
                        className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 font-bold text-sm"
                    >
                        <Image className="w-4 h-4" />
                        Imagen
                    </button>

                    <div className="w-px h-8 bg-slate-600 mx-1"></div>

                    <button
                        onClick={() => setIsPrintPreview(!isPrintPreview)}
                        className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-sm ${isPrintPreview ? 'bg-white text-black shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'}`}
                        title="Vista de Impresión (Fondo Blanco)"
                    >
                        <FileText className="w-4 h-4" />
                        {isPrintPreview ? 'Modo Impresión' : 'Vista Previa'}
                    </button>
                </div >

                {/* Scrollable Canvas Area */}
                < div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar w-full flex flex-col items-center pt-24 pb-20 px-8 relative z-10" >
                    {/* Paper Container */}
                    < div id="puzzle-sheet" className="relative scale-[0.85] xl:scale-100 transition-transform duration-500 shadow-2xl origin-top puzzle-preview-frame" >
                        <PuzzleSheet
                            puzzle={generatedPuzzle}
                            config={{
                                ...settings,
                                title, headerLeft, headerRight, footerText, pageNumber,
                                difficulty, gridSize, gridHeight: gridRows, words: wordList, showSolution,
                                styleMode, themeData, maskShape, hiddenMessage, fontType, margins,
                                designTheme, showBorders,
                                backgroundImage, backgroundStyle, backgroundFilters, overlayOpacity, textOverlayOpacity,
                                templateId,
                                isFreeLayout,
                                layout,
                                gridFontSizeScale // Pass to PuzzleSheet
                            }}
                            isEditMode={isEditMode}
                            selectedElement={selectedElement}
                            onSelectElement={setSelectedElement}
                            isPrintPreview={isPrintPreview}
                            onDrag={handleElementDrag}
                        />
                    </div >
                </div >

            </main >

            {/* Right Sidebar - Design & Export */}
            <aside style={{ width: rightPanelWidth }} className="panel-glass border-l border-white/10 flex flex-col z-30 shadow-2xl relative">
                {/* Drag Handle */}
                <div
                    className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-50 group"
                    onMouseDown={startResizingRight}
                >
                    <div className="w-0.5 h-full bg-indigo-500/0 group-hover:bg-indigo-500/50 mx-auto transition-colors" />
                </div>
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm">
                    <h2 className="font-bold text-lg text-white flex items-center gap-2">
                        <Palette className="w-5 h-5" stroke="url(#gradient-accent)" /> Diseño
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-8 space-y-8">
                    {/* Section 4: Estilo y Arte (Moved) */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-1">
                            <Palette className="w-3 h-3" /> Estilo Visual
                        </h2>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <button
                                onClick={() => { setStyleMode('bw'); setBackgroundImage(undefined); }}
                                className={`p-2 rounded border flex flex-col items-center gap-1 ${styleMode === 'bw' && !backgroundImage ? 'bg-slate-700 border-white text-white' : 'bg-cosmic-800 border-glass-border text-slate-400'}`}
                            >
                                <div className="w-4 h-4 bg-white border border-black rounded-sm"></div>
                                B/N Clásico
                            </button>
                            <button
                                onClick={() => { setStyleMode('color'); setBackgroundImage(undefined); }}
                                className={`p-2 rounded border flex flex-col items-center gap-1 ${styleMode === 'color' && !backgroundImage ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-cosmic-800 border-glass-border text-slate-400'}`}
                            >
                                <div className="w-4 h-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-sm"></div>
                                Color Digital
                            </button>
                        </div>

                        {/* New Design Theme Selector */}
                        <div className="space-y-1 pt-2 border-t border-slate-800/50">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Tema Visual</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['modern', 'classic', 'kids', 'minimal'] as const).map(theme => (
                                    <button
                                        key={theme}
                                        onClick={() => { setDesignTheme(theme); setIsManualTheme(true); }}
                                        className={`text-[10px] py-1.5 rounded border capitalize transition-all ${designTheme === theme
                                            ? 'bg-accent-600 border-indigo-500 text-white shadow-sm'
                                            : 'bg-cosmic-800 border-glass-border text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {theme}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Free Layout Toggle */}
                        <div className="flex items-center justify-between bg-cosmic-800 p-2 rounded-lg mt-2 border border-glass-border">
                            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                                <Layout className="w-3 h-3" /> Lienzo Libre
                            </label>
                            <button
                                onClick={() => setIsFreeLayout(!isFreeLayout)}
                                className={`w-11 h-6 rounded-full transition-all relative shadow-inner ${isFreeLayout ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md left-1 ${isFreeLayout ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-800/50">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Art Studio (IA)</label>
                            <button
                                onClick={() => setShowArtStudio(true)}
                                className="w-full btn-primary flex items-center justify-center gap-2 group"
                            >
                                <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
                                Abrir Art Studio
                            </button>
                            <p className="text-[10px] text-slate-500 text-center">
                                Genera, sube y edita imágenes de fondo.
                            </p>
                        </div>

                        {/* New: Design Controls when Image Active */}
                        {backgroundImage && (
                            <div className="space-y-3 bg-cosmic-800/50 p-2 rounded-lg border border-glass-border mt-2">
                                <div className="relative group w-full h-16 bg-cosmic-900 rounded-lg overflow-hidden border border-slate-600">
                                    <img src={backgroundImage} className="w-full h-full object-cover opacity-70" alt="bg" />
                                    <button
                                        onClick={() => setBackgroundImage(undefined)}
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all font-xs font-bold uppercase tracking-wider"
                                    >
                                        <Eraser className="w-4 h-4 mr-1" /> Quitar Fondo
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-400">
                                        <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> Opacidad Grilla</span>
                                        <span>{Math.round(overlayOpacity * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.05"
                                        value={overlayOpacity}
                                        onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 block"
                                    />
                                </div>

                                <div className="space-y-1 border-t border-glass-border pt-2">
                                    <div className="flex justify-between text-[10px] text-slate-400">
                                        <span className="flex items-center gap-1"><Type className="w-3 h-3" /> Opacidad Textos</span>
                                        <span>{Math.round(textOverlayOpacity * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.05"
                                        value={textOverlayOpacity}
                                        onChange={(e) => setTextOverlayOpacity(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 block"
                                    />
                                    <div className="flex justify-between text-[8px] text-slate-500 px-0.5">
                                        <span>Transparente</span>
                                        <span>Sólido</span>
                                    </div>
                                </div>
                            </div>
                        )}


                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Tipografía</label>
                            <div className="grid grid-cols-4 gap-1">
                                {(['CLASSIC', 'MODERN', 'FUN', 'SCHOOL'] as FontType[]).map(ft => (
                                    <button
                                        key={ft}
                                        onClick={() => setFontType(ft)}
                                        className={`text-[9px] py-1 rounded border ${fontType === ft ? 'bg-accent-600 border-indigo-500 text-white' : 'bg-cosmic-800 border-glass-border text-slate-400'}`}
                                    >
                                        {ft === 'CLASSIC' ? 'Mono' : ft === 'MODERN' ? 'Sans' : ft === 'FUN' ? 'Fun' : 'Sch'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Grid Visual Settings (Moved) */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-1">
                            <Grid3X3 className="w-3 h-3" /> Ajustes Grilla
                        </h2>
                        {/* Grid Font Size Scale */}
                        <div className="mt-2">
                            <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                                <span>Tamaño Letra</span>
                                <span>{Math.round(gridFontSizeScale * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.5" max="2.0" step="0.1"
                                value={gridFontSizeScale}
                                onChange={(e) => setGridFontSizeScale(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 block"
                            />
                        </div>

                        {/* Border Toggle */}
                        <div className="flex items-center justify-between bg-cosmic-800 p-2 rounded-lg">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Mostrar Bordes</label>
                            <button
                                onClick={() => setShowBorders(!showBorders)}
                                className={`w-11 h-6 rounded-full transition-all relative shadow-inner ${showBorders ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md left-1 ${showBorders ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </section>
                </div>

                {/* Footer Actions (Moved) */}
                <div className="p-4 bg-[#11111b] border-t border-glass-border/50 flex flex-col gap-2 shadow-lg z-20">
                    <button
                        onClick={() => handleGeneratePuzzle()}
                        className="btn-primary cta-breathing w-full flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        <RefreshCw className="w-5 h-5" /> Regenerar Sopa
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setShowLibraryModal(true)} className="py-2 bg-cosmic-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center gap-2 text-xs font-medium border border-glass-border transition-colors">
                            <FolderOpen className="w-4 h-4" /> Biblioteca
                        </button>
                        <button onClick={() => setShowSaveModal(true)} className="py-2 bg-cosmic-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center gap-2 text-xs font-medium border border-glass-border transition-colors">
                            <Save className="w-4 h-4" /> Guardar
                        </button>
                    </div>
                </div>
            </aside >

            <ArtStudio
                isOpen={showArtStudio}
                onClose={() => setShowArtStudio(false)}
                currentImage={backgroundImage}
                currentFilters={backgroundFilters}
                onApply={handleArtApply}
                aiSettings={settings.designAI}
                selectedTemplate={templateId}
            />

            {/* --- MODALS --- */}

            {/* Settings Modal */}
            {
                showSettingsModal && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-cosmic-900 text-white w-full max-w-2xl rounded-2xl border border-glass-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                            <div className="p-4 border-b border-glass-border flex justify-between items-center bg-cosmic-950">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Settings2 className="w-6 h-6 text-indigo-500" /> Configuración de IA
                                </h2>
                                <button onClick={() => setShowSettingsModal(false)}><X className="w-6 h-6 text-slate-400 hover:text-white" /></button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                                <ProviderSettingsForm
                                    title="Inteligencia Lógica (Generación de Palabras)"
                                    icon={BrainCircuit}
                                    settings={settings.logicAI}
                                    onUpdate={(s) => setSettings({ ...settings, logicAI: s })}
                                />
                                <div className="w-full h-px bg-cosmic-800"></div>
                                <ProviderSettingsForm
                                    title="Inteligencia Visual (Colores y Estilos)"
                                    icon={Palette}
                                    settings={settings.designAI}
                                    onUpdate={(s) => setSettings({ ...settings, designAI: s })}
                                />
                            </div>

                            <div className="p-4 border-t border-glass-border bg-cosmic-950 flex justify-end gap-2">
                                <button
                                    onClick={() => { saveSettings(settings); setShowSettingsModal(false); }}
                                    className="px-6 py-2 bg-accent-600 hover:bg-accent-500 text-white rounded-lg font-bold shadow-lg transition-all"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Save Options Modal */}
            {
                showSaveModal && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-cosmic-900 text-white w-full max-w-md rounded-2xl border border-glass-border shadow-2xl overflow-hidden">
                            <div className="p-4 border-b border-glass-border flex justify-between items-center bg-cosmic-950">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Save className="w-5 h-5 text-emerald-400" /> Guardar Proyecto
                                </h2>
                                <button onClick={() => setShowSaveModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 p-3 rounded-lg border border-glass-border hover:bg-cosmic-800 cursor-pointer transition-colors">
                                        <input
                                            type="radio"
                                            name="saveOption"
                                            checked={saveOption === 'single'}
                                            onChange={() => setSaveOption('single')}
                                            className="accent-indigo-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-sm">Guardar Individual</div>
                                            <div className="text-[10px] text-slate-400">Guarda como puzzle suelto en la biblioteca.</div>
                                        </div>
                                    </label>

                                    {/* New Input for Single Save Name */}
                                    {saveOption === 'single' && (
                                        <div className="ml-6 mt-2 animate-in fade-in slide-in-from-top-2">
                                            <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Nombre del Archivo (En Biblioteca)</label>
                                            <input
                                                type="text"
                                                value={saveName}
                                                onChange={(e) => setSaveName(e.target.value)}
                                                className="w-full bg-cosmic-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                                                placeholder="Ej: Biología Unidad 1"
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1">Este nombre identificará tu trabajo guardado.</p>
                                        </div>
                                    )}

                                    <label className="flex items-center gap-2 p-3 rounded-lg border border-glass-border hover:bg-cosmic-800 cursor-pointer transition-colors">
                                        <input
                                            type="radio"
                                            name="saveOption"
                                            checked={saveOption === 'existing_book'}
                                            onChange={() => setSaveOption('existing_book')}
                                            className="accent-indigo-500"
                                            disabled={bookStacks.length === 0}
                                        />
                                        <div className={`flex-1 ${bookStacks.length === 0 ? 'opacity-50' : ''}`}>
                                            <div className="font-bold text-sm">Añadir a Libro Existente</div>
                                            <div className="text-[10px] text-slate-400">Agrega una página a una colección.</div>
                                        </div>
                                    </label>

                                    {saveOption === 'existing_book' && bookStacks.length > 0 && (
                                        <div className="ml-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <select
                                                value={selectedBookId}
                                                onChange={(e) => setSelectedBookId(e.target.value)}
                                                className="w-full bg-cosmic-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                                            >
                                                <option value="">-- Seleccionar Libro --</option>
                                                {bookStacks.map(b => <option key={b.id} value={b.id}>{b.name} ({b.puzzles.length} págs)</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <label className="flex items-center gap-2 p-3 rounded-lg border border-glass-border hover:bg-cosmic-800 cursor-pointer transition-colors">
                                        <input
                                            type="radio"
                                            name="saveOption"
                                            checked={saveOption === 'new_book'}
                                            onChange={() => setSaveOption('new_book')}
                                            className="accent-indigo-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-sm">Crear Nuevo Libro</div>
                                            <div className="text-[10px] text-slate-400">Inicia una nueva colección de sopas.</div>
                                        </div>
                                    </label>

                                    {saveOption === 'new_book' && (
                                        <div className="ml-6 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <input
                                                type="text"
                                                placeholder="Nombre del Libro (ej. Animales)"
                                                value={newBookName}
                                                onChange={(e) => setNewBookName(e.target.value)}
                                                className="w-full bg-cosmic-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                                            />
                                            <div className="flex items-center gap-2">
                                                <label className="text-[10px] text-slate-400">Meta de Páginas:</label>
                                                <input
                                                    type="number"
                                                    value={newBookTarget}
                                                    onChange={(e) => setNewBookTarget(parseInt(e.target.value))}
                                                    className="w-16 bg-cosmic-800 border border-slate-600 rounded px-2 py-1 text-xs text-white text-center"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 border-t border-glass-border bg-cosmic-950 flex justify-end gap-2">
                                <button
                                    onClick={executeSave}
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg transition-all"
                                >
                                    Confirmar Guardado
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Library Modal */}
            {
                showLibraryModal && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-cosmic-900 text-white w-full max-w-4xl rounded-2xl border border-glass-border shadow-2xl overflow-hidden h-[80vh] flex flex-col">
                            <div className="p-4 border-b border-glass-border flex justify-between items-center bg-cosmic-950">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <FolderOpen className="w-6 h-6 text-amber-500" /> Biblioteca de Puzzles
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleResetLibrary}
                                        className="bg-red-900/40 hover:bg-red-900 border border-red-800 text-red-200 px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Resetear Todo
                                    </button>
                                    <button onClick={() => setShowLibraryModal(false)}><X className="w-6 h-6 text-slate-400 hover:text-white" /></button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-glass-border bg-cosmic-800/50">
                                <button
                                    onClick={() => setActiveLibraryTab('puzzles')}
                                    className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeLibraryTab === 'puzzles' ? 'border-indigo-500 text-accent-400 bg-cosmic-800' : 'border-transparent text-slate-400 hover:text-white'}`}
                                >
                                    <FileJson className="w-4 h-4" /> Puzzles Sueltos ({libraryPuzzles.length})
                                </button>
                                <button
                                    onClick={() => setActiveLibraryTab('books')}
                                    className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeLibraryTab === 'books' ? 'border-amber-500 text-amber-400 bg-cosmic-800' : 'border-transparent text-slate-400 hover:text-white'}`}
                                >
                                    <Book className="w-4 h-4" /> Libros / Colecciones ({bookStacks.length})
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-cosmic-900">

                                {/* Tab: Puzzles */}
                                {activeLibraryTab === 'puzzles' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {libraryPuzzles.length === 0 && (
                                            <div className="col-span-full text-center py-20 text-slate-500 italic flex flex-col items-center">
                                                <FolderOpen className="w-12 h-12 mb-2 opacity-20" />
                                                No hay puzzles guardados aún.
                                            </div>
                                        )}
                                        {libraryPuzzles.map((p) => (
                                            <div key={p.id} className="bg-cosmic-800 border border-glass-border rounded-xl p-4 hover:border-indigo-500/50 transition-all group relative">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-bold text-white truncate pr-6" title={p.name}>{p.name}</h3>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${p.config.difficulty === 'Fácil' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        p.config.difficulty === 'Intermedio' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-purple-500/20 text-purple-400'
                                                        }`}>{p.config.difficulty}</span>
                                                </div>
                                                <div className="text-xs text-slate-400 mb-4 font-mono">
                                                    Creado: {new Date(p.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleLoadPuzzleAsync(p)}
                                                        className="flex-1 bg-accent-600 hover:bg-accent-500 py-1.5 rounded text-xs font-bold transition-colors"
                                                    >
                                                        Cargar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePuzzle(p.id, p.name)}
                                                        className="px-3 bg-slate-700 hover:bg-red-900/50 hover:text-red-400 rounded text-xs transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}


                                {/* Tab: Books */}
                                {activeLibraryTab === 'books' && (
                                    <div className="space-y-4">
                                        {bookStacks.length === 0 && (
                                            <div className="col-span-full text-center py-20 text-slate-500 italic flex flex-col items-center">
                                                <Book className="w-12 h-12 mb-2 opacity-20" />
                                                No hay libros creados. Usa la opción "Guardar &gt; Crear Nuevo Libro".
                                            </div>
                                        )}
                                        {bookStacks.map((book) => (
                                            <div key={book.id} className="bg-cosmic-800 border border-glass-border rounded-xl overflow-hidden">
                                                <div className="p-4 bg-cosmic-800 border-b border-glass-border flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-amber-500/20 p-2 rounded text-amber-400">
                                                            <Book className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-lg text-white">{book.name}</h3>
                                                            <div className="text-xs text-slate-400 flex items-center gap-2">
                                                                <span>Progreso: {book.puzzles.length} / {book.targetCount} páginas</span>
                                                                <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-amber-500 transition-all"
                                                                        style={{ width: `${Math.min(100, (book.puzzles.length / book.targetCount) * 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleExportBookJson(book)}
                                                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
                                                            title="Descargar JSON del Libro"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`¿Eliminar libro "${book.name}" y todas sus páginas?`)) {
                                                                    deleteBookStack(book.id);
                                                                }
                                                            }}
                                                            className="p-2 hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-400"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Pages List */}
                                                {book.puzzles.length > 0 && (
                                                    <div className="bg-cosmic-900/50 p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                                        {book.puzzles.map((page, idx) => (
                                                            <div key={page.id} className="flex items-center justify-between p-2 bg-cosmic-800 rounded border border-glass-border/50 text-xs">
                                                                <div className="flex items-center gap-2 truncate">
                                                                    <span className="font-mono text-slate-500 w-5">#{idx + 1}</span>
                                                                    <span className="truncate max-w-[100px]" title={page.name}>{page.name}</span>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={() => handleLoadPuzzle(page)}
                                                                        className="p-1 hover:text-accent-400"
                                                                        title="Editar"
                                                                    >
                                                                        <Eye className="w-3 h-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (confirm('¿Quitar página del libro?')) {
                                                                                removePuzzleFromStack(book.id, page.id);
                                                                            }
                                                                        }}
                                                                        className="p-1 hover:text-red-400"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {showDiagnostics && <SystemDiagnostics settings={settings} onClose={() => setShowDiagnostics(false)} />}

            {/* Delete Confirmation Modal */}
            {
                puzzleToDelete && (
                    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <GlassCard className="max-w-md w-full !p-6 !bg-cosmic-900 !border-glass-border">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-red-500" /> Confirmar Eliminación
                            </h3>
                            <p className="text-slate-300 mb-6">
                                ¿Estás seguro de que deseas eliminar el puzzle <span className="text-white font-bold">"{puzzleToDelete.name}"</span>?
                                Esta acción no se puede deshacer.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setPuzzleToDelete(null)}
                                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-cosmic-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeletePuzzle}
                                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-900/20"
                                >
                                    Sí, Eliminar
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                )
            }

            {/* Load Confirmation Modal */}
            {
                puzzleToLoad && (
                    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <GlassCard className="max-w-md w-full !p-6 !bg-cosmic-900 !border-glass-border">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <Info className="w-6 h-6 text-blue-500" /> Confirmar Carga
                            </h3>
                            <p className="text-slate-300 mb-6">
                                ¿Deseas cargar el puzzle <span className="font-bold text-white">"{puzzleToLoad.name}"</span>?
                                <br /><br />
                                <span className="text-yellow-400 text-sm">Cualquier cambio no guardado en el tablero actual se perderá.</span>
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setPuzzleToLoad(null)}
                                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-cosmic-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmLoadPuzzle}
                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20"
                                >
                                    <Download className="w-4 h-4" /> Cargar
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                )
            }

            {/* Reset Confirmation Modal */}
            {
                showResetConfirm && (
                    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <GlassCard className="max-w-md w-full !p-6 !bg-cosmic-900 !border-red-500/50">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-red-500" /> ⚠️ ZONA DE PELIGRO
                            </h3>
                            <p className="text-slate-300 mb-6">
                                ¿Estás seguro de que quieres <span className="font-bold text-red-400">RESETEAR TODO</span>?
                                <br /><br />
                                <span className="text-red-400 text-sm">Esto borrará PERMANENTEMENTE todos tus puzzles, libros y configuraciones guardadas. Esta acción NO se puede deshacer.</span>
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-cosmic-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmResetLibrary}
                                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-red-900/20"
                                >
                                    <Trash2 className="w-4 h-4" /> SÍ, BORRAR TODO
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                )
            }

            {/* Toast Container */}
            {
                toast && (
                    <div className="fixed bottom-4 right-4 z-[100]">
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            onClose={() => setToast(null)}
                        />
                    </div>
                )
            }
        </div >
    );
}

