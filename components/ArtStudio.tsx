import React, { useState, useRef, useMemo, useEffect } from 'react';
import { PuzzleInfo, ArtOptions, LayoutConfig, DesignPlan } from '../features/artstudio/lib/types';
import { useArtStudioTransform } from '../features/artstudio/hooks/useArtStudioTransform';
import { PuzzleStructure, measurePuzzleElements } from '../features/artstudio/lib/spatialUtils'; // Import measurement logic
import PuzzleSheet from './PuzzleSheet';
import { GeneratedPuzzle, PuzzleConfig } from '../types';
import {
    Wand2, Save, Undo, Redo, Share2, Download, Maximize2, X, Plus,
    Layout, Type, Image as ImageIcon, Palette, Settings2, Sliders,
    MessageSquare, AlertCircle, Sparkles, BrainCircuit, RefreshCw, ThumbsUp, ThumbsDown, Check, ZoomIn, ZoomOut,
    Database, Trash2, FileDown, ScanEye, PenTool, LayoutTemplate, AlertTriangle, Upload, Dna, Info, Lock, ArrowDownToLine, Cpu, Zap, Layers
} from 'lucide-react';
import * as gpuService from '../services/gpuService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';

// --- TIPOS ---
export interface ArtStudioProps {
    puzzle: GeneratedPuzzle;
    config: PuzzleConfig;
    onClose?: () => void;
    onSave?: (backgroundImage?: string) => void;
    gridSnapshot?: string | null;
    spatialMetrics?: PuzzleStructure | null; // Add this prop
}

const QUICK_THEMES = [
    "Aventura Submarina",
    "Cyberpunk Neon",
    "Pergamino Antiguo",
    "Exploración Espacial",
    "Bosque Encantado",
    "Minimalista Geométrico"
];

// --- COMPONENTE TOOLTIP HOLOGRÁFICO ---
interface TooltipProps {
    text: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom';
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="relative flex items-center justify-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} z-50 px-3 py-1.5 bg-black/90 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg shadow-xl whitespace-nowrap pointer-events-none min-w-max`}
                    >
                        {text}
                        {/* Flecha decorativa */}
                        <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 border-r border-b border-white/20 rotate-45 ${position === 'top' ? '-bottom-1 border-t-0 border-l-0' : '-top-1 border-b-0 border-r-0 rotate-[225deg]'}`}></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

interface TabButtonProps {
    id: string;
    icon: React.ElementType;
    label: string;
    active: boolean;
    onClick: (id: any) => void;
    tooltip?: string;
}

// Extracted component to prevent re-renders
const TabButton: React.FC<TabButtonProps> = ({ id, icon: Icon, label, active, onClick, tooltip }) => (
    <Tooltip text={tooltip || label}>
        <button
            onClick={() => onClick(id)}
            className={`w-full flex flex-col items-center gap-1 py-3 px-4 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all ${active ? 'bg-white/10 text-white shadow-inner' : 'text-white/40 hover:bg-white/5 hover:text-white/70'}`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    </Tooltip>
);

export const ArtStudio: React.FC<ArtStudioProps> = ({ puzzle, config, onClose, onSave, gridSnapshot, spatialMetrics }) => {
    const [options, setOptions] = useState<ArtOptions & { useSmartEnhance?: boolean; smartProvider?: string }>({
        visualStyle: 'editorial_pro',
        styleIntensity: 'medium',
        quality: 'draft_fast',
        userPrompt: '',
        feedback: '',
        useSmartEnhance: false, // Default to standard generation
        smartProvider: "gemini" // Added smartProvider with default value
    });

    const [zoom, setZoom] = useState(0.55);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dataOpacity, setDataOpacity] = useState(100);

    const [progress, setProgress] = useState(0);
    const [loadingStep, setLoadingStep] = useState('');

    const [critiqueTags, setCritiqueTags] = useState<string[]>([]);
    const [critiqueText, setCritiqueText] = useState('');
    const [showCritiquePanel, setShowCritiquePanel] = useState(false);
    const [showClonePanel, setShowClonePanel] = useState(false);

    const [overrideConfig, setOverrideConfig] = useState<Partial<LayoutConfig>>({});
    const [showStylePanel, setShowStylePanel] = useState(false);
    const [editTab, setEditTab] = useState<'global' | 'header' | 'grid' | 'box' | 'footer'>('global');

    const [currentPlan, setCurrentPlan] = useState<DesignPlan | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [visualMetrics, setVisualMetrics] = useState<PuzzleStructure | null>(null); // State for layout visualization

    // GPU Boost State
    const [gpuBoostEnabled, setGpuBoostEnabled] = useState(false);
    const [gpuStatus, setGpuStatus] = useState<{ ready: boolean; gpuName: string | null; vramFreeGB: number | null }>({ ready: false, gpuName: null, vramFreeGB: null });
    const [isCheckingGpu, setIsCheckingGpu] = useState(false);

    const dragStartRef = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const captureRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { isGenerating, isPlanning, isAnalyzingVision, currentVersion, history, executeSmartGeneration, restoreVersion, trainModel, cloneStyleFromUpload, knowledgeBase, clearMemory, downloadDataset } = useArtStudioTransform();

    const datasetSize = useMemo(() => knowledgeBase.logs.length, [knowledgeBase]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        if (isPlanning) {
            setProgress(0);
            setLoadingStep("🧠 CENE-BRAIN Analizando Estructura...");
            interval = setInterval(() => {
                setProgress(prev => Math.min(90, prev + Math.random() * 5));
            }, 300);
        } else if (isGenerating) {
            setProgress(0);
            // Progress Logic: Adapt speed based on provider (Cloud = Fast / Local GPU = Slow)
            const slowMode = gpuBoostEnabled;
            const increment = slowMode ? 0.2 : 1.5; // Much slower for local GPU
            const intervalTime = slowMode ? 300 : 200;

            if (slowMode) setLoadingStep(`🎨 GPU LOCAL CHUGGING ALONG... (Esto puede tardar unos minutos)`);
            else setLoadingStep(`🎨 PINTANDO PIXELES (AI Art Engine)...`);

            let seconds = 0;
            interval = setInterval(() => {
                seconds++;
                if (slowMode && seconds > 30 && seconds < 60) setLoadingStep(`🐢 Renderizado detallado en proceso...`);
                if (slowMode && seconds > 60) setLoadingStep(`☕ Tu GPU está trabajando duro... no cierres.`);

                setProgress(prev => Math.min(99, prev + (Math.random() * increment)));
            }, intervalTime);
        } else if (isAnalyzingVision) {
            setProgress(100);
            setLoadingStep("👁️ VERIFICANDO CALIDAD...");
            interval = setInterval(() => {
                // Keep alive
            }, 1000);
        } else {
            setProgress(100);
        }

        return () => clearInterval(interval);
    }, [isPlanning, isGenerating, isAnalyzingVision]);

    useEffect(() => {
        if (currentVersion?.designPlan) {
            setOverrideConfig(currentVersion.designPlan.layoutConfig);
            setCurrentPlan(currentVersion.designPlan);
        } else if (currentVersion) {
            setOverrideConfig({});
            setCurrentPlan(null);
        }
        setShowCritiquePanel(false);
        setCritiqueTags([]);
        setCritiqueText('');
    }, [currentVersion]);

    // GPU Boost status check
    useEffect(() => {
        checkGpuBoostStatus();
    }, []);

    const checkGpuBoostStatus = async () => {
        setIsCheckingGpu(true);
        try {
            const status = await gpuService.isGPUBoostReady();
            setGpuStatus({
                ready: status.ready,
                gpuName: status.gpuName,
                vramFreeGB: status.vramFreeGB
            });

            // AUTO-ENABLE GPU BOOST if detected!
            if (status.ready) {
                setGpuBoostEnabled(true);
                console.log("🚀 [ART STUDIO] GPU Boost Auto-Enabled");
            }
        } catch (error) {
            console.warn('GPU check failed:', error);
            setGpuStatus({ ready: false, gpuName: null, vramFreeGB: null });
        } finally {
            setIsCheckingGpu(false);
        }
    };

    const toggleGpuBoost = () => {
        if (!gpuStatus.ready && !gpuBoostEnabled) {
            // Refresh status before enabling
            checkGpuBoostStatus();
        }
        setGpuBoostEnabled(!gpuBoostEnabled);
    };

    const baseLayoutConfig: LayoutConfig = useMemo(() => {
        // Use colors ONLY from the actual config to ensure 100% fidelity with "Color" view.
        // If config has themeData, use it. If not, use defaults but do not override with hardcoded "Art Studio" values.
        const activeTheme = config.themeData || puzzle.theme;

        return {
            fontFamilyHeader: config.fontFamilyHeader || 'Playfair Display', // Preserve if exists in config
            fontFamilyGrid: config.fontFamilyGrid || 'Inter',

            // Critical: Use the exact colors from the current view
            textColor: activeTheme?.textColor || config.themeData?.textColor || '#000000',
            gridBorderColor: activeTheme?.primaryColor || config.themeData?.primaryColor || '#000000',
            gridBackground: activeTheme?.backgroundColor || config.themeData?.backgroundColor || 'rgba(255, 255, 255, 0.95)',

            // Use config values or standard defaults, resisting "Art Studio" deviations
            paddingTop: '48px',
            wordListStyle: 'classic',
            headerStyle: 'standard',
            gridRadius: '0px',
            blendMode: 'normal', // Default to normal to match standard view
            gridBorderWidth: '2px',
            textShadow: 'none',
            wordBoxVariant: 'none',
            fontWeight: '700',
            textStrokeWidth: '0px',
            headerBackdrop: 'none',
            lockedSections: [],

            // Preserve original theme colors for reference
            primaryColor: activeTheme?.primaryColor,
            secondaryColor: activeTheme?.secondaryColor
        };
    }, [puzzle.theme, config]);

    // Override config takes precedence (user edits in Studio), then base config (sync with Color view)
    const finalLayoutConfig = { ...baseLayoutConfig, ...overrideConfig };

    // Live Measurement Effect for Visualization (Moved here to access finalLayoutConfig correctly if needed, though mostly depends on DOM)
    useEffect(() => {
        const updateVisuals = () => {
            if (captureRef.current) {
                const m = measurePuzzleElements(captureRef.current);
                setVisualMetrics(m);
            }
        };
        const timer = setTimeout(updateVisuals, 300);
        return () => clearTimeout(timer);
    }, [puzzle, config, finalLayoutConfig, editTab, zoom]);

    const handleSmartGenerate = async (prompt: string, provider: string = 'gemini') => {
        try {
            // 1. Capture Layout Metrics from DOM
            const metrics = measurePuzzleElements(captureRef.current); // Use scoped measurement

            console.log("📐 [ART STUDIO] Spatial Analysis:", metrics);

            const intent = options.userPrompt?.trim() === '' ? "Diseño profesional" : (options.userPrompt || '');

            const puzzleInfo: PuzzleInfo = {
                title: config.title || 'Sopa de Letras',
                levelText: config.difficulty || 'Intermedio',
                words: config.words || [],
                grid: puzzle.grid.map(row => row.map(cell => cell.isValid ? cell.letter : '')),
                headerLeft: config.headerLeft || '',
                headerRight: config.headerRight || ''
            };

            // Pass the CAPTURED metrics, not the prop (which might be stale)
            // Enhanced: pass 'options' which now includes useSmartEnhance
            await executeSmartGeneration(
                puzzleInfo,
                prompt,
                options,
                undefined,
                finalLayoutConfig, // Pass current layout to allow locking
                spatialMetrics,
                provider // Pass the selected smart provider
            );
        } catch (e) { console.error(e); }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            cloneStyleFromUpload(file);
            setShowClonePanel(false);
        }
    };

    // Función de guardado integrada
    const handleApplyChanges = () => {
        if (onSave) {
            // Pasar la imagen de fondo de la versión activa
            onSave(currentVersion?.imageUrl);
        }
        if (onClose) onClose();
    };

    const handleExportPDF = async () => {
        if (!captureRef.current) return;
        setIsExporting(true);

        try {
            const originalTransform = captureRef.current.style.transform;
            // Reset transform for full resolution capture
            captureRef.current.style.transform = 'scale(1)';

            const canvas = await html2canvas(captureRef.current, {
                scale: 3.125, // 300 DPI (approx 8.5in * 96dpi * 3.125 = 2550px)
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false
            });

            // Restore user zoom
            captureRef.current.style.transform = originalTransform;

            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
            pdf.addImage(imgData, 'JPEG', 0, 0, 8.5, 11);
            pdf.save(`Matatiempo_${config.title || 'Puzzle'}_${Date.now()}.pdf`);
        } catch (err) {
            alert("Error exportando PDF");
            console.error(err);
        } finally {
            setIsExporting(false);
        }
    };

    const handleThumbsUp = () => trainModel('like');
    const handleThumbsDownInit = () => setShowCritiquePanel(true);
    const handleTrainNegative = () => trainModel('dislike', critiqueText, critiqueTags);
    const toggleTag = (tag: string) => { if (critiqueTags.includes(tag)) setCritiqueTags(critiqueTags.filter(t => t !== tag)); else setCritiqueTags([...critiqueTags, tag]); };

    const handleMouseDown = (e: React.MouseEvent) => { if (e.button !== 0) return; setIsDragging(true); dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; };
    const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; e.preventDefault(); setPan({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y }); };
    const handleMouseUp = () => { setIsDragging(false); };
    const handleWheel = (e: React.WheelEvent) => { if (e.ctrlKey) { e.preventDefault(); const delta = e.deltaY > 0 ? -0.05 : 0.05; setZoom(z => Math.max(0.2, Math.min(2, z + delta))); } };

    // Controladores de Interacción del PuzzleGrid
    const handleSectionSelect = (section: 'header' | 'grid' | 'box' | 'footer') => {
        setEditTab(section);
        setShowStylePanel(true);
    };

    const handleToggleLock = (section: string) => {
        const currentLocks = overrideConfig.lockedSections || [];
        const isLocked = currentLocks.includes(section);
        let newLocks;

        if (isLocked) {
            newLocks = currentLocks.filter(s => s !== section);
        } else {
            newLocks = [...currentLocks, section];
        }
        setOverrideConfig({ ...overrideConfig, lockedSections: newLocks });
    };

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6">

            {/* LEFT PANEL: THE COCKPIT */}
            <div className="w-full lg:w-[420px] flex-shrink-0 flex flex-col bg-slate-900/60 backdrop-blur-xl rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

                {/* Dataset Status Bar */}
                <div className="px-6 pt-6 pb-2 flex justify-between items-end relative z-10">
                    <div>
                        <Tooltip text="Panel de control principal del motor de IA">
                            <h2 className="text-xl font-display font-bold text-white tracking-tight cursor-help">Panel de Control</h2>
                        </Tooltip>
                        <Tooltip text="Estado de conexión con el modelo Gemini">
                            <div className="flex items-center gap-2 mt-1 cursor-help">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-mono text-emerald-400">ONLINE</span>
                            </div>
                        </Tooltip>
                    </div>
                    <div className="flex flex-col items-end">
                        <Tooltip text="Registros de entrenamiento acumulados para Machine Learning">
                            <div className="flex items-center gap-1 bg-black/40 rounded-full px-3 py-1 border border-white/10 cursor-help">
                                <Database className="w-3 h-3 text-purple-400" />
                                <span className="text-[10px] font-mono text-purple-200">{datasetSize} MUESTRAS</span>
                            </div>
                        </Tooltip>
                        {datasetSize > 0 && (
                            <div className="flex gap-2 mt-2">
                                <Tooltip text="Descargar archivo JSONL para fine-tuning externo">
                                    <button onClick={downloadDataset} className="text-[9px] text-white/40 hover:text-white hover:underline">Descargar</button>
                                </Tooltip>
                                <Tooltip text="Borrar toda la memoria de entrenamiento local">
                                    <button onClick={clearMemory} className="text-[9px] text-red-400/60 hover:text-red-400 hover:underline">Reset</button>
                                </Tooltip>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-6 relative z-10 flex-1 overflow-y-auto custom-scrollbar">

                    {/* THEME SELECTOR */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Tooltip text="Selecciona un tema predefinido para comenzar rápido">
                                <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2 cursor-help">
                                    <Wand2 className="w-3 h-3" /> Inspiración Rápida
                                </label>
                            </Tooltip>
                            <Tooltip text="Extraer estilo, paleta y fuentes de una imagen de referencia">
                                <button onClick={() => setShowClonePanel(!showClonePanel)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-pink-500/10 text-pink-300 text-[9px] font-bold border border-pink-500/20 hover:bg-pink-500/20 transition-all">
                                    <Dna className="w-3 h-3" /> CLONAR ESTILO
                                </button>
                            </Tooltip>
                        </div>

                        {showClonePanel && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-pink-900/20 border border-pink-500/30 rounded-xl p-4 overflow-hidden">
                                <p className="text-[10px] text-pink-200 mb-2">Sube una imagen de referencia. La IA extraerá su paleta, fuentes y estilo para aplicarlo aquí.</p>
                                <div className="relative">
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 border-2 border-dashed border-pink-500/40 rounded-lg text-pink-300 text-xs font-bold hover:bg-pink-500/10 flex items-center justify-center gap-2">
                                        <Upload className="w-4 h-4" /> SUBIR REFERENCIA
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* GPU BOOST PANEL */}
                        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-green-400" />
                                    <span className="text-[11px] font-bold text-green-300 uppercase">GPU Boost</span>
                                    {isCheckingGpu && (
                                        <RefreshCw className="w-3 h-3 text-green-400 animate-spin" />
                                    )}
                                </div>
                                <button
                                    onClick={toggleGpuBoost}
                                    className={`relative w-12 h-6 rounded-full transition-all ${gpuBoostEnabled ? 'bg-green-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${gpuBoostEnabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            {gpuStatus.gpuName && (
                                <div className="mt-2 text-[9px] text-green-200/70">
                                    <span className="flex items-center gap-1">
                                        <Zap className="w-3 h-3" />
                                        {gpuStatus.gpuName} ({gpuStatus.vramFreeGB?.toFixed(1) || '?'}GB libre)
                                    </span>
                                </div>
                            )}
                            {gpuBoostEnabled && !gpuStatus.ready && (
                                <div className="mt-2 text-[9px] text-yellow-300 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    ComfyUI no detectado. Inícialo desde el Launcher.
                                </div>
                            )}
                            {gpuBoostEnabled && gpuStatus.ready && (
                                <div className="flex flex-col gap-2">
                                    <div className={`mt-2 text-[9px] flex items-center gap-1 ${gpuStatus.gpuName ? 'text-green-300' : 'text-yellow-300'}`}>
                                        {gpuStatus.gpuName ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                        {gpuStatus.gpuName ? `GPU Boost activo - Usando ${gpuStatus.gpuName}` : "ComfyUI Online (Modo CPU)"}
                                    </div>

                                    {/* Brain Selector */}
                                    <div className="flex items-center gap-2 mt-1 bg-black/20 p-1.5 rounded-lg border border-white/5">
                                        <span className="text-[10px] text-slate-400">Cerebro:</span>
                                        <select
                                            className="bg-transparent text-[10px] text-indigo-300 border-none outline-none cursor-pointer"
                                            value={options.smartProvider || 'gemini'}
                                            onChange={(e) => setOptions({ ...options, smartProvider: e.target.value })}
                                        >
                                            <option value="gemini">Gemini 2.0 Flash (Google)</option>
                                            <option value="deepseek">DeepSeek R1 (China)</option>
                                            <option value="grok">Grok 2 (xAI)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {QUICK_THEMES.map(theme => (
                                <Tooltip key={theme} text={`Aplicar tema: ${theme}`}>
                                    <button onClick={() => setOptions({ ...options, userPrompt: theme })} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/50 text-[10px] text-slate-300 rounded-lg transition-all active:scale-95">
                                        {theme}
                                    </button>
                                </Tooltip>
                            ))}
                        </div>
                    </div>

                    {/* PROMPT INPUT */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Tooltip text="Describe manualmente lo que quieres ver">
                                <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2 cursor-help">
                                    <PenTool className="w-3 h-3" /> Prompt Manual
                                </label>
                            </Tooltip>

                            {/* SMART ENHANCE TOGGLE */}
                            <Tooltip text="Activar Cerebro Híbrido: Gemini mejora tu prompt y ComfyUI genera la imagen.">
                                <button
                                    onClick={() => setOptions({ ...options, useSmartEnhance: !options.useSmartEnhance })}
                                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all border ${options.useSmartEnhance ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                                >
                                    <BrainCircuit className={`w-3 h-3 ${options.useSmartEnhance ? 'animate-pulse text-white' : ''}`} />
                                    {options.useSmartEnhance ? 'AI PRO OPTIMIZER ON' : 'AI OPTIMIZER OFF'}
                                </button>
                            </Tooltip>

                            <div className="bg-black/40 p-0.5 rounded-lg flex border border-white/10">
                                <Tooltip text="Generación rápida (1K) para pruebas de concepto">
                                    <button onClick={() => setOptions({ ...options, quality: 'draft_fast' })} className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all ${options.quality === 'draft_fast' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>BOCETO</button>
                                </Tooltip>
                                <Tooltip text="Generación optimizada (2K) para impresión">
                                    <button onClick={() => setOptions({ ...options, quality: 'print_300dpi' })} className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all ${options.quality === 'print_300dpi' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'text-slate-500 hover:text-slate-300'}`}>IMP. 2K</button>
                                </Tooltip>
                            </div>
                        </div>

                        <div className="relative group/input">
                            <div className={`absolute inset-0 bg-gradient-to-r ${options.useSmartEnhance ? 'from-pink-500/20 via-purple-500/20 to-indigo-500/20' : 'from-indigo-500/20 to-purple-500/20'} rounded-xl blur opacity-0 group-hover/input:opacity-100 transition-opacity duration-700`}></div>
                            <textarea
                                value={options.userPrompt}
                                onChange={(e) => setOptions({ ...options, userPrompt: e.target.value })}
                                placeholder={options.useSmartEnhance ? "💡 Idea simple: 'un perro astronauta'... (Gemini se encarga de los detalles técnicos)" : "Describe tu visión técnica detallada..."}
                                className={`w-full h-24 bg-black/40 text-white border ${options.useSmartEnhance ? 'border-indigo-500/30 ring-1 ring-indigo-500/20' : 'border-white/10'} rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 relative z-10 placeholder:text-white/20 transition-all`}
                            />
                            {options.useSmartEnhance && (
                                <div className="absolute bottom-3 right-3 z-20 flex gap-1 pointer-events-none">
                                    <span className="text-[10px] text-indigo-300/60 font-mono flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> Gemini 2.0 Flash Active
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* GENERATE BUTTON */}
                    <Tooltip text={options.useSmartEnhance ? "Generar con Potencia Híbrida (Gemini -> ComfyUI)" : "Generación Estándar"}>
                        <button
                            onClick={() => handleSmartGenerate(options.userPrompt, options.smartProvider)}
                            disabled={isPlanning || isGenerating || isAnalyzingVision}
                            className={`w-full py-5 rounded-2xl font-bold text-white text-sm tracking-widest uppercase shadow-2xl relative overflow-hidden group/btn transition-all active:scale-[0.98] ${isPlanning || isGenerating ? 'opacity-80 cursor-wait' : ''}`}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-r ${options.useSmartEnhance ? 'from-pink-600 via-indigo-600 to-purple-600 animate-gradient-fast' : 'from-indigo-600 via-purple-600 to-indigo-600'} transition-all duration-1000 ${isGenerating ? 'animate-gradient' : ''}`}></div>
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : (options.useSmartEnhance ? <BrainCircuit className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />)}
                                {isGenerating ? 'Procesando...' : (options.useSmartEnhance ? 'GENERAR (HYBRID MODE)' : 'GENERAR ARTE')}
                            </span>
                        </button>
                    </Tooltip>

                    {/* VISION REPORT */}
                    <div className="bg-black/30 rounded-xl border border-white/5 p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <Tooltip text="Reporte automático generado por la IA sobre la calidad de la imagen">
                                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2 cursor-help"><ScanEye className="w-3 h-3" /> Análisis Visual</span>
                            </Tooltip>
                            {currentVersion?.visionAnalysis && <span className="text-[9px] text-emerald-400 font-mono">100% COMPLETADO</span>}
                        </div>

                        {currentVersion?.visionAnalysis ? (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/5 rounded-lg p-2 text-center">
                                    <span className="block text-[9px] text-white/40 uppercase mb-1">Contraste</span>
                                    <div className="text-xl font-display font-bold text-white">{currentVersion.visionAnalysis.contrastScore}</div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2 text-center">
                                    <span className="block text-[9px] text-white/40 uppercase mb-1">Obstrucción</span>
                                    <div className={`text-sm font-bold mt-1 ${currentVersion.visionAnalysis.gridObstruction ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {currentVersion.visionAnalysis.gridObstruction ? 'DETECTADA' : 'LIMPIO'}
                                    </div>
                                </div>
                                <div className="col-span-2 bg-white/5 rounded-lg p-3 border-l-2 border-cyan-500">
                                    <p className="text-[10px] text-cyan-100 italic">"{currentVersion.visionAnalysis.critique}"</p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-20 flex items-center justify-center border-2 border-dashed border-white/5 rounded-lg">
                                <span className="text-[9px] text-white/20">Esperando imagen...</span>
                            </div>
                        )}
                    </div>

                </div>

                {/* HISTORY FOOTER */}
                <div className="p-4 bg-black/20 border-t border-white/5 overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        {history.map((version) => (
                            <Tooltip key={version.id} text={`Restaurar versión: ${version.timestamp}`}>
                                <button
                                    onClick={() => restoreVersion(version)}
                                    className={`w-14 h-14 rounded-lg border overflow-hidden relative transition-all hover:scale-105 ${currentVersion?.id === version.id ? 'border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'border-white/10 opacity-50 hover:opacity-100'}`}
                                >
                                    <img src={version.imageUrl} className="w-full h-full object-cover" />
                                    {version.rating && <div className={`absolute top-0 right-0 w-2 h-2 rounded-full m-1 ${version.rating === 'like' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>}
                                </button>
                            </Tooltip>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: THE CANVAS */}
            <div className="flex-1 bg-[#0a0a0a] rounded-[32px] border border-white/10 relative overflow-hidden flex flex-col shadow-2xl group">

                {/* TOP BAR */}
                <div className="absolute top-6 left-6 right-6 z-40 flex justify-between items-start pointer-events-none">
                    <div className="pointer-events-auto flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 p-1.5 rounded-xl shadow-lg">
                        <Tooltip text="Abre el panel para modificar colores, fuentes y posiciones">
                            <button onClick={() => setShowStylePanel(!showStylePanel)} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${showStylePanel ? 'bg-indigo-600 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
                                <Settings2 className="w-3 h-3" /> Editor
                            </button>
                        </Tooltip>
                        <div className="w-px h-4 bg-white/10"></div>
                        <Tooltip text="Exportar diseño actual como PDF de alta resolución (300 DPI)">
                            <button onClick={handleExportPDF} disabled={isExporting || !currentVersion} className="px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 text-emerald-400 hover:bg-emerald-500/10">
                                <FileDown className="w-3 h-3" /> PDF
                            </button>
                        </Tooltip>
                    </div>
                    {/* LOCKED SECTIONS INDICATOR */}
                    <div className="flex gap-2 pointer-events-auto">
                        {finalLayoutConfig.lockedSections?.map(section => (
                            <div key={section} className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[9px] font-bold uppercase">
                                <Lock className="w-3 h-3" /> {section}
                            </div>
                        ))}
                    </div>
                </div>

                {/* EDITOR PANEL (Slide In) */}
                <AnimatePresence>
                    {showStylePanel && (
                        <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }} className="absolute top-20 right-6 bottom-20 w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden">
                            <div className="flex p-2 gap-1 bg-black/40 border-b border-white/5">
                                <TabButton id="global" icon={Layers} label="Global" active={editTab === 'global'} onClick={setEditTab} tooltip="Ajustes de fusión y visibilidad" />
                                <TabButton id="header" icon={Type} label="Título" active={editTab === 'header'} onClick={setEditTab} tooltip="Posición y estilo del título" />
                                <TabButton id="grid" icon={LayoutTemplate} label="Grilla" active={editTab === 'grid'} onClick={setEditTab} tooltip="Apariencia de la sopa de letras" />
                                <TabButton id="box" icon={Palette} label="Caja" active={editTab === 'box'} onClick={setEditTab} tooltip="Estilo del contenedor de palabras" />
                                <TabButton id="footer" icon={ArrowDownToLine} label="Pie" active={editTab === 'footer'} onClick={setEditTab} tooltip="Configuración del pie de página" />
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                                {editTab === 'global' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Modo Fusión</label>
                                            <select className="w-full bg-white/5 border border-white/10 rounded text-xs text-white p-2" value={overrideConfig.blendMode} onChange={(e) => setOverrideConfig({ ...overrideConfig, blendMode: e.target.value as any })}>
                                                <option value="normal">Normal</option>
                                                <option value="multiply">Multiply (Tinta)</option>
                                                <option value="screen">Screen (Luz)</option>
                                                <option value="overlay">Overlay</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Visibilidad Datos</label>
                                            <input type="range" min="0" max="100" value={dataOpacity} onChange={(e) => setDataOpacity(Number(e.target.value))} className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                        </div>
                                    </>
                                )}
                                {editTab === 'grid' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Color Letras</label>
                                            <div className="flex gap-2">
                                                <input type="color" value={overrideConfig.textColor || '#000000'} onChange={(e) => setOverrideConfig({ ...overrideConfig, textColor: e.target.value })} className="h-8 w-8 rounded cursor-pointer bg-transparent border-none" />
                                                <input type="text" value={overrideConfig.textColor || '#000000'} onChange={(e) => setOverrideConfig({ ...overrideConfig, textColor: e.target.value })} className="flex-1 bg-white/5 border border-white/10 rounded text-xs text-white px-2" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Grosor Letra</label>
                                            <select className="w-full bg-white/5 border border-white/10 rounded text-xs text-white p-2" value={overrideConfig.fontWeight} onChange={(e) => setOverrideConfig({ ...overrideConfig, fontWeight: e.target.value })}>
                                                <option value="400">Regular</option>
                                                <option value="700">Bold</option>
                                                <option value="900">Black</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Posición Y (Mover Grilla)</label>
                                            <input type="range" min="-100" max="100" value={overrideConfig.gridOffsetY || 0} onChange={(e) => setOverrideConfig({ ...overrideConfig, gridOffsetY: Number(e.target.value) })} className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                        </div>
                                    </>
                                )}
                                {editTab === 'box' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Estilo Caja</label>
                                            <select className="w-full bg-white/5 border border-white/10 rounded text-xs text-white p-2" value={overrideConfig.wordBoxVariant} onChange={(e) => setOverrideConfig({ ...overrideConfig, wordBoxVariant: e.target.value as any })}>
                                                <option value="none">Ninguna</option>
                                                <option value="border">Borde Simple</option>
                                                <option value="solid">Sólida</option>
                                                <option value="parchment">Pergamino</option>
                                                <option value="tech">Tech HUD</option>
                                                <option value="glass_dark">Cristal Oscuro</option>
                                                <option value="notebook">Cuaderno</option>
                                                <option value="brush">Pincelada</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Posición Y</label>
                                            <input type="range" min="-50" max="50" value={overrideConfig.wordBoxOffsetY || 0} onChange={(e) => setOverrideConfig({ ...overrideConfig, wordBoxOffsetY: Number(e.target.value) })} className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Escala (Tamaño)</label>
                                            <input type="range" min="0.50" max="1.50" step="0.05" value={overrideConfig.wordBoxScale || 1} onChange={(e) => setOverrideConfig({ ...overrideConfig, wordBoxScale: Number(e.target.value) })} className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                        </div>
                                    </>
                                )}
                                {editTab === 'header' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Texto Título (Editar)</label>
                                            <input
                                                type="text"
                                                value={overrideConfig.customTitleText || config.title || ''}
                                                onChange={(e) => setOverrideConfig({ ...overrideConfig, customTitleText: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded text-xs text-white p-2 font-display"
                                                placeholder="Escribe el título..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Fondo Título</label>
                                            <select className="w-full bg-white/5 border border-white/10 rounded text-xs text-white p-2" value={overrideConfig.headerBackdrop} onChange={(e) => setOverrideConfig({ ...overrideConfig, headerBackdrop: e.target.value as any })}>
                                                <option value="none">Ninguno</option>
                                                <option value="glass">Cristal</option>
                                                <option value="brush_stroke">Pincelada</option>
                                                <option value="banner">Banner</option>
                                                <option value="floating_card">Tarjeta</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Posición Y</label>
                                            <input type="range" min="-50" max="50" value={overrideConfig.headerOffsetY || 0} onChange={(e) => setOverrideConfig({ ...overrideConfig, headerOffsetY: Number(e.target.value) })} className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                        </div>
                                    </>
                                )}
                                {editTab === 'footer' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Texto Editorial</label>
                                            <input
                                                type="text"
                                                value={overrideConfig.customFooterText || "IMPRENTAS CENECOMPUC"}
                                                onChange={(e) => setOverrideConfig({ ...overrideConfig, customFooterText: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded text-xs text-white p-2"
                                                placeholder="Editorial..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Estilo Visual</label>
                                            <select className="w-full bg-white/5 border border-white/10 rounded text-xs text-white p-2" value={overrideConfig.footerStyle || 'SIMPLE'} onChange={(e) => setOverrideConfig({ ...overrideConfig, footerStyle: e.target.value as any })}>
                                                <option value="SIMPLE">Simple</option>
                                                <option value="TECH">Tech Terminal</option>
                                                <option value="BARCODE">Etiqueta</option>
                                                <option value="ELEGANT">Elegante</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/50 uppercase">Posición Y</label>
                                            <input type="range" min="-50" max="50" value={overrideConfig.footerOffsetY || 0} onChange={(e) => setOverrideConfig({ ...overrideConfig, footerOffsetY: Number(e.target.value) })} className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* LOADING OVERLAY */}
                <AnimatePresence>
                    {(isPlanning || isGenerating || isAnalyzingVision) && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                            <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mb-4 relative">
                                <motion.div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500" animate={{ width: `${progress}%` }} transition={{ ease: "linear" }}></motion.div>
                            </div>
                            <span className="text-xs font-mono text-indigo-300 animate-pulse">{loadingStep}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* FEEDBACK PANEL */}
                <AnimatePresence>
                    {showCritiquePanel && (
                        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="absolute bottom-6 left-6 right-6 bg-red-950/90 backdrop-blur-xl border border-red-500/30 p-6 rounded-2xl z-50 shadow-2xl flex gap-6 items-start">
                            <div className="p-3 bg-red-500/20 rounded-full shrink-0">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div className="flex-1 space-y-3">
                                <h4 className="text-lg font-bold text-red-100">Reporte de Error</h4>
                                <p className="text-xs text-red-200/60">Selecciona los fallos detectados para re-entrenar el modelo.</p>
                                <div className="flex flex-wrap gap-2">
                                    {['Invadió Grilla', 'Texto Ilegible', 'Mancha Blanca', 'Deformado', 'Estilo Incorrecto'].map(tag => (
                                        <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1.5 text-[10px] uppercase font-bold rounded-lg border transition-all ${critiqueTags.includes(tag) ? 'bg-red-500 text-white border-red-400' : 'bg-transparent text-red-300 border-red-800 hover:border-red-400'}`}>{tag}</button>
                                    ))}
                                </div>
                                <textarea placeholder="Describe el problema..." className="w-full bg-black/20 border border-red-800/50 rounded-lg p-3 text-sm text-red-100 placeholder:text-red-200/20 focus:outline-none focus:border-red-500" value={critiqueText} onChange={(e) => setCritiqueText(e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={handleTrainNegative} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center justify-center gap-2">
                                    <RefreshCw className="w-4 h-4" /> Corregir
                                </button>
                                <button onClick={() => setShowCritiquePanel(false)} className="px-6 py-2 text-red-400 hover:text-red-200 text-xs font-bold uppercase tracking-wider">Cancelar</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* CANVAS CONTAINER */}
                <div
                    ref={containerRef}
                    className="flex-1 cursor-grab active:cursor-grabbing relative flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed overflow-hidden"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    {/* Floating Zoom Controls */}
                    <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-black/80 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-2xl z-50">
                        <button
                            onClick={() => { setZoom(prev => Math.min(prev + 0.1, 3)); }}
                            className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                            className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
                            title="Reset Zoom"
                        >
                            <span className="text-xs font-bold">{Math.round(zoom * 100)}%</span>
                        </button>
                        <button
                            onClick={() => { setZoom(prev => Math.max(prev - 0.1, 0.2)); }}
                            className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-5 h-5" />
                        </button>
                    </div>

                    <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }} className="relative shadow-2xl">
                        <div
                            ref={captureRef}
                            id="puzzle-page-container"
                            className="relative w-[816px] h-[1056px] bg-white shadow-[0_0_100px_rgba(0,0,0,0.5)] origin-center"
                        >
                            {currentVersion?.imageUrl && <img src={currentVersion.imageUrl} className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" />}
                            <div className="relative z-10 w-full h-full transition-opacity duration-300" style={{ opacity: dataOpacity / 100 }}>
                                {gridSnapshot ? (
                                    <img src={gridSnapshot} className="w-full h-full object-contain pointer-events-none" alt="Snapshot" />
                                ) : (
                                    <PuzzleSheet
                                        puzzle={puzzle}
                                        config={{
                                            ...config, // Use passed config first
                                            ...finalLayoutConfig, // Apply ArtStudio specific overrides (colors, fonts, etc.)
                                            backgroundImage: currentVersion?.imageUrl || config.backgroundImage
                                        }}
                                    />
                                )}
                                {/* VISUAL LAYOUT OVERLAY - Shows Art Studio "Vision" */}
                                {visualMetrics && (editTab !== 'global') && (
                                    <div className="absolute inset-0 pointer-events-none z-50">
                                        {/* WORD LIST BOX HIGHLIGHT */}
                                        {(editTab === 'box') && visualMetrics.wordList && (
                                            <div
                                                className="absolute border-2 border-indigo-500 bg-indigo-500/10 flex items-start justify-center transition-all duration-300 animate-pulse"
                                                style={{
                                                    left: `${visualMetrics.wordList.x}%`,
                                                    top: `${visualMetrics.wordList.y}%`,
                                                    width: `${visualMetrics.wordList.width}%`,
                                                    height: `${visualMetrics.wordList.height}%`
                                                }}
                                            >
                                                <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-b shadow-lg flex items-center gap-1">
                                                    <ScanEye className="w-3 h-3" />
                                                    CAJA DETECTADA ({Math.round(visualMetrics.wordList.width)}% x {Math.round(visualMetrics.wordList.height)}%)
                                                </div>
                                            </div>
                                        )}
                                        {/* GRID HIGHLIGHT */}
                                        {(editTab === 'grid') && visualMetrics.grid && (
                                            <div
                                                className="absolute border-2 border-emerald-500 bg-emerald-500/10 flex items-start justify-center transition-all duration-300"
                                                style={{
                                                    left: `${visualMetrics.grid.x}%`,
                                                    top: `${visualMetrics.grid.y}%`,
                                                    width: `${visualMetrics.grid.width}%`,
                                                    height: `${visualMetrics.grid.height}%`
                                                }}
                                            >
                                                <div className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-b shadow-lg">
                                                    GRILLA ({Math.round(visualMetrics.grid.width)}% x {Math.round(visualMetrics.grid.height)}%)
                                                </div>
                                            </div>
                                        )}
                                        {/* TITLE HIGHLIGHT */}
                                        {(editTab === 'header') && visualMetrics.title && (
                                            <div
                                                className="absolute border-2 border-pink-500 bg-pink-500/10 flex items-start justify-center transition-all duration-300"
                                                style={{
                                                    left: `${visualMetrics.title.x}%`,
                                                    top: `${visualMetrics.title.y}%`,
                                                    width: `${visualMetrics.title.width}%`,
                                                    height: `${visualMetrics.title.height}%`
                                                }}
                                            >
                                                <div className="bg-pink-600 text-white text-[10px] font-bold px-2 py-1 rounded-b shadow-lg">
                                                    TÍTULO
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* VALIDATION FLOATING BAR */}
                    <AnimatePresence>
                        {currentVersion && !isGenerating && !showCritiquePanel && (
                            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/80 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full shadow-2xl z-30">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mr-2">Validación</span>
                                <Tooltip text="Guardar como ejemplo positivo (Entrenar IA)">
                                    <button onClick={handleThumbsUp} className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all">
                                        <ThumbsUp className="w-5 h-5" />
                                    </button>
                                </Tooltip>
                                <Tooltip text="Reportar error y regenerar con corrección">
                                    <button onClick={handleThumbsDownInit} className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                                        <ThumbsDown className="w-5 h-5" />
                                    </button>
                                </Tooltip>
                                <Tooltip text="Aplicar Diseño al Puzzle (Guardar)">
                                    <button onClick={handleApplyChanges} className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all ml-4 border border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                                        <Check className="w-5 h-5" />
                                    </button>
                                </Tooltip>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div >

        </div>
    );
};
