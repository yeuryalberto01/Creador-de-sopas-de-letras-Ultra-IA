import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Sparkles, X, ImageIcon, Upload, Sliders, Brain,
    ThumbsUp, ThumbsDown, Loader2, Wand2, CheckSquare,
    Square, Trash2, Check, Eye, Save, RefreshCw, Download,
    Palette, Layout, Zap
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useLiveQuery } from 'dexie-react-hooks';

import {
    getRecommendations, predictSatisfaction, updateUserProfile, analyzeImageFeatures
} from '../services/mlService';
import {
    getArtLibrary, getUserPreferences, saveUserPreference, deleteArtTemplate,
    saveArtTemplate, getTasteProfile, getMLProfile, saveMLProfile,
    saveTasteProfile, exportLearningData
} from '../services/storageService';
import {
    enhancePromptAI, buildArtisticPrompt, generatePuzzleBackground,
    analyzeImageStyle, generateTasteProfile
} from '../services/aiService';
import { THEMATIC_TEMPLATES } from '../constants/thematicTemplates';
import { ARTISTIC_STYLES, ArtisticStyle } from '../constants/artisticStyles';
import { PUZZLE_SKINS } from '../constants/skins';
import { STYLE_PROFILES } from '../constants/styleProfiles';
import { buildImagePrompts } from '../utils/promptBrain';
import { exportPuzzleImage, generateSmartMask } from '../services/puzzleExportService';
import { decoratePuzzleWithNanobanana } from '../services/nanobananaClient';
import { logGeneration, updateRating } from '../services/artStudioFeedback';
import { optimizeAllStyles, StyleImprovement } from '../services/styleOptimizer';

import {
    ImageFilters, AISettings, ArtTemplate, MLUserProfile,
    ThematicTemplate, PuzzleSkin
} from '../types';

interface ArtStudioProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (image: string, filters: ImageFilters, template: string) => void;
    currentImage?: string;
    currentFilters?: ImageFilters;
    selectedTemplate: string;
    aiSettings: AISettings;
}

const DEFAULT_FILTERS: ImageFilters = {
    brightness: 100,
    contrast: 100,
    grayscale: 0,
    blur: 0,
    sepia: 0
};

// Helper Components
const SidebarButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
    <button
        onClick={onClick}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group relative ${active
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
            : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
        title={label}
    >
        <Icon className="w-5 h-5" />
        {/* Tooltip */}
        <div className="absolute left-14 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {label}
        </div>
    </button>
);

const FilterSlider = ({ label, value, min, max, onChange }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void }) => (
    <div className="space-y-2">
        <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-medium">{label}</span>
            <span className="text-slate-200">{value}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 hover:[&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:transition-colors"
        />
    </div>
);

export const ArtStudio: React.FC<ArtStudioProps> = ({ isOpen, onClose, onApply, currentImage, currentFilters, selectedTemplate, aiSettings }) => {
    const [activeTab, setActiveTab] = useState<'generate' | 'gallery' | 'upload' | 'adjust' | 'learning'>('generate');
    const [previewImage, setPreviewImage] = useState<string | undefined>(currentImage);
    const [originalImage, setOriginalImage] = useState<string | undefined>(currentImage);
    const [filters, setFilters] = useState<ImageFilters>(currentFilters || DEFAULT_FILTERS);
    const [targetTemplate, setTargetTemplate] = useState<string>(selectedTemplate);

    // AI Generation State (Art Studio 2.0)
    const [selectedSkin, setSelectedSkin] = useState<PuzzleSkin | null>(null);
    const [userPrompt, setUserPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationId, setGenerationId] = useState<string | null>(null);
    const [statusLog, setStatusLog] = useState<string[]>([]);

    // Legacy State (kept for compatibility if needed, but primary flow is new)
    const [isEnhancing, setIsEnhancing] = useState(false);

    // Style Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedStyle, setAnalyzedStyle] = useState<string | null>(null);
    const [customStyles, setCustomStyles] = useState<{ id: string, label: string, desc: string }[]>([]);

    // Feedback State
    const [feedbackGiven, setFeedbackGiven] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [feedbackReason, setFeedbackReason] = useState('');
    const [feedbackDetails, setFeedbackDetails] = useState('');

    // Learning State
    const [tasteProfile, setTasteProfile] = useState<string>('');
    const [mlProfile, setMlProfile] = useState<MLUserProfile | null>(null);
    const [isConsolidating, setIsConsolidating] = useState(false);

    // Style Optimization State
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [styleImprovements, setStyleImprovements] = useState<StyleImprovement[]>([]);
    const [showOptimizationModal, setShowOptimizationModal] = useState(false);

    // Load custom styles and taste profile
    useEffect(() => {
        const saved = localStorage.getItem('custom_styles');
        if (saved) {
            try {
                setCustomStyles(JSON.parse(saved));
            } catch (e) {
                console.error("Error loading custom styles", e);
            }
        }
        getTasteProfile().then(p => setTasteProfile(p || ''));
        getMLProfile().then(p => setMlProfile(p));
    }, []);

    // Gallery State
    const artLibrary = useLiveQuery(() => getArtLibrary(), []) || [];
    const preferences = useLiveQuery(() => getUserPreferences(), []) || [];

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedItems(newSet);
    };

    const handleBulkFeedback = async (type: 'like' | 'dislike') => {
        if (selectedItems.size === 0) return;

        const items = artLibrary.filter(item => selectedItems.has(item.id));
        for (const item of items) {
            await saveUserPreference(type, item.prompt, item.style, item.id);
        }

        addLog(`Feedback masivo enviado: ${type} (${items.length} imágenes)`);
        setIsSelectionMode(false);
        setSelectedItems(new Set());

        if (confirm(`Has calificado ${items.length} imágenes. ¿Quieres actualizar tu perfil de gustos ahora?`)) {
            setActiveTab('learning');
            handleConsolidate();
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return;
        if (!confirm(`¿Estás seguro de eliminar ${selectedItems.size} imágenes?`)) return;

        for (const id of selectedItems) {
            await deleteArtTemplate(id);
        }

        addLog(`Eliminadas ${selectedItems.size} imágenes.`);
        setIsSelectionMode(false);
        setSelectedItems(new Set());
    };

    // Upload State
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setPreviewImage(currentImage);
            setOriginalImage(currentImage);
            setFilters(currentFilters || DEFAULT_FILTERS);
        }
    }, [isOpen]);

    const addLog = (msg: string) => setStatusLog(prev => [...prev, msg]);

    const handleEnhancePrompt = async () => {
        if (!userPrompt) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhancePromptAI(aiSettings, userPrompt);
            setUserPrompt(enhanced);
        } catch (e) {
            console.error("Error enhancing prompt:", e);
        } finally {
            setIsEnhancing(false);
        }
    };

    // --- ART STUDIO 2.0 GENERATION LOGIC ---
    const handleGenerate2 = async () => {
        if (!selectedSkin && !userPrompt) {
            alert("Por favor selecciona un estilo o escribe un prompt.");
            return;
        }

        setIsGenerating(true);
        setStatusLog([]);
        addLog("Iniciando Art Studio 2.0...");

        try {
            // 1. Capture Base Puzzle Image (High Res)
            addLog("Capturando maqueta del puzzle...");
            // Assuming 'puzzle-sheet' is the ID of the main puzzle container in the DOM
            const { imageBase64: puzzleImage, width, height } = await exportPuzzleImage('puzzle-sheet');
            setOriginalImage(puzzleImage); // Update original reference

            // 2. Generate Smart Mask (Protect Grid & Words)
            addLog("Generando máscara de protección...");
            const maskImage = await generateSmartMask('puzzle-sheet');

            // 3. Build Intelligent Prompts
            addLog("Construyendo prompt inteligente...");
            const { positive, negative, profileId } = buildImagePrompts(userPrompt, selectedSkin?.styleProfileId, mlProfile);
            addLog(`Estilo detectado: ${profileId}`);

            // 4. Call Nanobanana API (Inpainting)
            addLog(`Enviando a IA (${aiSettings.provider})...`);
            const result = await decoratePuzzleWithNanobanana({
                puzzleImageBase64: puzzleImage,
                maskImageBase64: maskImage,
                positivePrompt: positive,
                negativePrompt: negative,
                aiSettings
            });

            // 5. Update UI
            setPreviewImage(result.imageBase64);
            addLog("¡Diseño generado con éxito!");

            // 6. Log for Feedback
            const newGenId = crypto.randomUUID();
            setGenerationId(newGenId);
            logGeneration({
                userPrompt,
                styleProfileId: profileId,
                positivePrompt: positive,
                negativePrompt: negative,
                cfgScale: 7, // Default
                steps: 30    // Default
            });

            // 7. Auto-save to gallery
            const newTemplate: ArtTemplate = {
                id: newGenId,
                name: selectedSkin ? selectedSkin.name : (userPrompt.slice(0, 20) || "Diseño IA"),
                prompt: positive,
                imageBase64: result.imageBase64,
                style: profileId,
                createdAt: Date.now()
            };
            await saveArtTemplate(newTemplate);

        } catch (e: any) {
            console.error("Error generating art:", e);
            addLog(`Error: ${e.message}`);
            alert("Error generando arte: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                const base64 = event.target.result as string;
                setPreviewImage(base64);

                const newTemplate: ArtTemplate = {
                    id: crypto.randomUUID(),
                    name: file.name,
                    prompt: "Uploaded Image",
                    imageBase64: base64,
                    style: 'color',
                    createdAt: Date.now()
                };
                saveArtTemplate(newTemplate);
                setActiveTab('adjust');
            }
        };
        reader.readAsDataURL(file);
    };

    const handleApply = () => {
        if (previewImage) {
            onApply(previewImage, filters, targetTemplate);
            onClose();
        }
    };

    const getFilterString = () => {
        return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%) blur(${filters.blur}px) sepia(${filters.sepia}%)`;
    };

    const handleAnalyzeStyle = async () => {
        if (!previewImage) return;
        setIsAnalyzing(true);
        try {
            const styleDesc = await analyzeImageStyle(aiSettings, previewImage);
            setAnalyzedStyle(styleDesc);
            addLog("Estilo analizado con éxito.");
        } catch (e: any) {
            console.error("Error analyzing style:", e);
            addLog(`Error analizando estilo: ${e.message}`);
            alert("Error analizando estilo: " + e.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const saveAnalyzedStyle = () => {
        if (!analyzedStyle) return;
        const newStyle = {
            id: crypto.randomUUID(),
            label: `Custom ${customStyles.length + 1}`,
            desc: analyzedStyle
        };
        const updated = [...customStyles, newStyle];
        setCustomStyles(updated);
        localStorage.setItem('custom_styles', JSON.stringify(updated));
        setAnalyzedStyle(null);
        addLog("Estilo guardado.");
    };

    const handleFeedback = async (type: 'like' | 'dislike') => {
        if (type === 'dislike') {
            setIsFeedbackModalOpen(true);
            return;
        }
        await submitFeedback('like');
    };

    const submitFeedback = async (type: 'like' | 'dislike', reason?: string, details?: string) => {
        if (generationId) {
            updateRating(generationId, type === 'like' ? 1 : -1, reason, details);
        }

        await saveUserPreference(type, userPrompt || "Generated Design", selectedSkin?.styleProfileId || "custom");
        setFeedbackGiven(true);
        setIsFeedbackModalOpen(false);
        setFeedbackReason('');
        setFeedbackDetails('');
        addLog(`Feedback enviado: ${type}`);

        // ML Training
        if (mlProfile) {
            const features = await analyzeImageFeatures(userPrompt, selectedSkin?.styleProfileId || 'default', undefined);
            const updatedProfile = await updateUserProfile(mlProfile, features, type, {
                prompt: userPrompt,
                styleId: selectedSkin?.styleProfileId || 'default',
                reason,
                details
            });
            setMlProfile(updatedProfile);
            await saveMLProfile(updatedProfile);
            addLog("Cerebro IA actualizado.");
        }
    };

    const handleConsolidate = async () => {
        setIsConsolidating(true);
        try {
            const prefs = await getUserPreferences();
            const profile = await generateTasteProfile(aiSettings, prefs);
            setTasteProfile(profile);
            await saveTasteProfile(profile);
            addLog("Perfil de gustos actualizado.");
        } catch (e: any) {
            console.error(e);
            addLog("Error consolidando perfil: " + e.message);
        } finally {
            setIsConsolidating(false);
        }
    };

    const handleExport = async () => {
        const json = await exportLearningData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sopa-ia-learning-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addLog("Datos de aprendizaje exportados.");
    };

    const handleOptimizeStyles = async () => {
        setIsOptimizing(true);
        try {
            addLog("Analizando estilos con IA...");
            const improvements = await optimizeAllStyles({ apiKey: aiSettings.apiKey, baseUrl: aiSettings.baseUrl });
            setStyleImprovements(improvements);
            setShowOptimizationModal(true);
            addLog(`Se encontraron ${improvements.length} sugerencias de mejora.`);
        } catch (e: any) {
            console.error(e);
            addLog("Error optimizando estilos: " + e.message);
            alert("Error optimizando estilos: " + e.message);
        } finally {
            setIsOptimizing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center overflow-hidden">
            {/* Feedback Modal */}
            {isFeedbackModalOpen && (
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-cosmic-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ThumbsDown className="w-5 h-5 text-red-500" />
                                ¿Qué podemos mejorar?
                            </h3>
                            <button onClick={() => setIsFeedbackModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-slate-400 mb-4">
                            Ayúdanos a entender por qué no te gustó este resultado para que la IA aprenda.
                        </p>

                        <div className="space-y-3 mb-6">
                            {['Texto ilegible / deformado', 'Colores extraños', 'Estilo incorrecto', 'Composición desordenada', 'Otro'].map(reason => (
                                <button
                                    key={reason}
                                    onClick={() => setFeedbackReason(reason)}
                                    className={`w-full p-3 rounded-xl text-left text-sm transition-all border ${feedbackReason === reason
                                        ? 'bg-red-500/20 border-red-500 text-white'
                                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                                        }`}
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={feedbackDetails}
                            onChange={(e) => setFeedbackDetails(e.target.value)}
                            placeholder="Detalles adicionales (opcional)..."
                            className="w-full h-24 bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-slate-200 focus:border-red-500 outline-none resize-none mb-6"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsFeedbackModalOpen(false)}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors font-medium text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => submitFeedback('dislike', feedbackReason, feedbackDetails)}
                                disabled={!feedbackReason}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Enviar Feedback
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Style Optimization Modal */}
            {showOptimizationModal && (
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-cosmic-900 border border-white/10 rounded-2xl p-6 max-w-4xl w-full shadow-2xl animate-in fade-in zoom-in duration-300 my-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Brain className="w-5 h-5 text-indigo-500" />
                                Sugerencias de Mejora (IA)
                            </h3>
                            <button onClick={() => setShowOptimizationModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-slate-400 mb-6">
                            Gemini ha analizado tu historial de feedback y sugiere las siguientes mejoras a los prompts.
                        </p>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {styleImprovements.map((improvement) => (
                                <div key={improvement.styleId} className="bg-black/30 border border-white/10 rounded-xl p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-bold text-white">{improvement.styleId}</h4>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(
                                                    `Base: ${improvement.suggestedBasePrompt}\n\nNegative: ${improvement.suggestedNegativePrompt}`
                                                );
                                                alert('Sugerencias copiadas al portapapeles');
                                            }}
                                            className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                                        >
                                            Copiar
                                        </button>
                                    </div>

                                    <div className="text-xs text-slate-300 mb-3 italic">
                                        {improvement.reasoning}
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div>
                                            <span className="text-slate-500 font-medium">Base Prompt Actual:</span>
                                            <p className="text-slate-400 mt-1 pl-2 border-l-2 border-red-500/30">{improvement.currentBasePrompt}</p>
                                        </div>
                                        <div>
                                            <span className="text-green-500 font-medium">Base Prompt Sugerido:</span>
                                            <p className="text-slate-200 mt-1 pl-2 border-l-2 border-green-500/50">{improvement.suggestedBasePrompt}</p>
                                        </div>
                                        <div className="mt-3">
                                            <span className="text-slate-500 font-medium">Negative Prompt Actual:</span>
                                            <p className="text-slate-400 mt-1 pl-2 border-l-2 border-red-500/30">{improvement.currentNegativePrompt}</p>
                                        </div>
                                        <div>
                                            <span className="text-green-500 font-medium">Negative Prompt Sugerido:</span>
                                            <p className="text-slate-200 mt-1 pl-2 border-l-2 border-green-500/50">{improvement.suggestedNegativePrompt}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowOptimizationModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors font-medium text-sm"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => {
                                    alert('Para aplicar los cambios, copia los prompts sugeridos y actualiza manualmente el archivo styleProfiles.ts.');
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors"
                            >
                                Instrucciones para Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full h-full flex flex-col bg-cosmic-950 text-slate-200">

                {/* Top Bar */}
                <div className="h-14 border-b border-white/10 bg-cosmic-900 flex items-center justify-between px-4 shrink-0 z-50">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-1.5 rounded-lg">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="font-bold text-white tracking-tight">Art Studio <span className="text-[10px] text-accent-400 font-mono uppercase tracking-widest ml-1">2.0</span></h2>
                        </div>
                        <div className="h-6 w-px bg-white/10 mx-2"></div>
                        <div className="flex items-center gap-1">
                            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors" title="Deshacer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-undo-2"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" /></svg>
                            </button>
                            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors" title="Rehacer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-redo-2"><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-xs text-slate-400 mr-2">
                            {previewImage ? 'Cambios sin guardar' : 'Listo para crear'}
                        </div>
                        <button
                            onClick={handleApply}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" /> Aplicar Diseño
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main Editor Area */}
                <div className="flex-1 flex overflow-hidden relative">

                    {/* 1. Slim Sidebar */}
                    <div className="w-16 bg-cosmic-900 border-r border-white/5 flex flex-col items-center py-4 gap-4 z-40 shrink-0">
                        <SidebarButton
                            active={activeTab === 'generate'}
                            onClick={() => setActiveTab('generate')}
                            icon={Sparkles}
                            label="Diseño"
                        />
                        <SidebarButton
                            active={activeTab === 'gallery'}
                            onClick={() => setActiveTab('gallery')}
                            icon={ImageIcon}
                            label="Galería"
                        />
                        <SidebarButton
                            active={activeTab === 'upload'}
                            onClick={() => setActiveTab('upload')}
                            icon={Upload}
                            label="Subidos"
                        />
                        <SidebarButton
                            active={activeTab === 'adjust'}
                            onClick={() => setActiveTab('adjust')}
                            icon={Sliders}
                            label="Ajustes"
                        />
                        <div className="w-8 h-px bg-white/10 my-2"></div>
                        <SidebarButton
                            active={activeTab === 'learning'}
                            onClick={() => setActiveTab('learning')}
                            icon={Brain}
                            label="IA Core"
                        />
                    </div>

                    {/* 2. Drawer - Contextual Panel */}
                    <div className="w-80 bg-cosmic-800/50 border-r border-white/5 flex flex-col backdrop-blur-sm z-30 shrink-0 transition-all duration-300">
                        <div className="p-4 border-b border-white/5">
                            <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                                {activeTab === 'generate' && <><Palette className="w-4 h-4 text-indigo-400" /> Estilos & Skins</>}
                                {activeTab === 'gallery' && <><ImageIcon className="w-4 h-4 text-indigo-400" /> Tu Biblioteca</>}
                                {activeTab === 'upload' && <><Upload className="w-4 h-4 text-indigo-400" /> Subir Archivos</>}
                                {activeTab === 'adjust' && <><Sliders className="w-4 h-4 text-indigo-400" /> Ajustes de Imagen</>}
                                {activeTab === 'learning' && <><Brain className="w-4 h-4 text-indigo-400" /> Aprendizaje IA</>}
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">

                            {/* --- GENERATE TAB (ART STUDIO 2.0) --- */}
                            {activeTab === 'generate' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">

                                    {/* Prompt Input */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tu Idea</label>
                                            <button onClick={handleEnhancePrompt} disabled={!userPrompt} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                                                <Wand2 className="w-3 h-3" /> Mejorar
                                            </button>
                                        </div>
                                        <textarea
                                            value={userPrompt}
                                            onChange={(e) => setUserPrompt(e.target.value)}
                                            placeholder="Ej: RD cultura, superhéroes, espacio..."
                                            className="w-full h-24 bg-cosmic-950/50 border border-white/10 rounded-xl p-3 text-sm text-slate-200 focus:border-indigo-500 outline-none resize-none transition-colors focus:bg-cosmic-950"
                                        />
                                    </div>

                                    {/* Skin Selector */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Elige un Estilo (Skin)</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {PUZZLE_SKINS.map(skin => (
                                                <button
                                                    key={skin.id}
                                                    onClick={() => setSelectedSkin(skin)}
                                                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group flex items-start gap-3 ${selectedSkin?.id === skin.id
                                                        ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500'
                                                        : 'bg-cosmic-900/50 border-white/5 text-slate-400 hover:bg-white/5'
                                                        }`}
                                                >
                                                    <div className="text-2xl">{skin.previewEmoji}</div>
                                                    <div>
                                                        <div className="text-xs font-bold">{skin.name}</div>
                                                        <div className="text-[10px] opacity-70 leading-tight mt-1">{skin.description}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleGenerate2}
                                        disabled={isGenerating || (!userPrompt && !selectedSkin)}
                                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                        Generar Diseño IA
                                    </button>

                                    {statusLog.length > 0 && (
                                        <div className="p-3 bg-black/30 rounded-xl border border-white/5 text-[10px] font-mono text-emerald-400 max-h-32 overflow-y-auto">
                                            {statusLog.map((log, i) => <div key={i} className="mb-1 last:mb-0">{log}</div>)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- GALLERY TAB --- */}
                            {activeTab === 'gallery' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tu Biblioteca</h4>
                                        <button
                                            onClick={() => setIsSelectionMode(!isSelectionMode)}
                                            className={`text-[10px] px-2 py-1 rounded border transition-colors ${isSelectionMode ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}
                                        >
                                            {isSelectionMode ? 'Cancelar' : 'Seleccionar'}
                                        </button>
                                    </div>

                                    {isSelectionMode && selectedItems.size > 0 && (
                                        <div className="flex gap-2 p-2 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
                                            <button onClick={() => handleBulkFeedback('like')} className="flex-1 py-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded text-[10px] font-bold transition-colors">
                                                <ThumbsUp className="w-3 h-3 mx-auto mb-1" /> Like ({selectedItems.size})
                                            </button>
                                            <button onClick={handleBulkDelete} className="flex-1 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-[10px] font-bold transition-colors">
                                                <Trash2 className="w-3 h-3 mx-auto mb-1" /> Borrar ({selectedItems.size})
                                            </button>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        {artLibrary.map(item => (
                                            <div key={item.id} className="relative group">
                                                <button
                                                    onClick={() => isSelectionMode ? toggleSelection(item.id) : setPreviewImage(item.imageBase64)}
                                                    className={`relative aspect-square rounded-lg overflow-hidden border transition-all w-full ${selectedItems.has(item.id)
                                                        ? 'border-indigo-500 ring-2 ring-indigo-500/50'
                                                        : 'border-white/5 hover:border-indigo-500'
                                                        }`}
                                                >
                                                    <img src={item.imageBase64} alt="Gallery" className="w-full h-full object-cover" />
                                                    {!isSelectionMode && (
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Usar</span>
                                                        </div>
                                                    )}
                                                </button>
                                                {isSelectionMode && (
                                                    <div className="absolute top-1 right-1 pointer-events-none">
                                                        {selectedItems.has(item.id) ? (
                                                            <CheckSquare className="w-4 h-4 text-indigo-500 bg-white rounded-sm" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-white/50 bg-black/50 rounded-sm" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {artLibrary.length === 0 && <div className="text-center text-slate-500 text-xs py-10">Tu galería está vacía.</div>}
                                </div>
                            )}

                            {/* --- UPLOAD TAB --- */}
                            {activeTab === 'upload' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-40 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-indigo-500/50 hover:bg-white/5 transition-all cursor-pointer group"
                                    >
                                        <div className="p-3 bg-white/5 rounded-full group-hover:bg-indigo-500/20 transition-colors">
                                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-400" />
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium">Click para subir imagen</p>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

                                    {previewImage && (
                                        <div className="p-3 bg-cosmic-900/50 rounded-xl border border-white/5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-400">Análisis de Estilo</span>
                                                <button
                                                    onClick={handleAnalyzeStyle}
                                                    disabled={isAnalyzing}
                                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                                >
                                                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                                    Analizar
                                                </button>
                                            </div>

                                            {analyzedStyle && (
                                                <div className="space-y-2 animate-in fade-in">
                                                    <p className="text-[10px] text-slate-300 bg-black/20 p-2 rounded border border-white/5 italic">
                                                        "{analyzedStyle}"
                                                    </p>
                                                    <button
                                                        onClick={saveAnalyzedStyle}
                                                        className="w-full py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-bold flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        <Save className="w-3 h-3" /> Guardar como Estilo
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- ADJUST TAB --- */}
                            {activeTab === 'adjust' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="space-y-4">
                                        <FilterSlider label="Brillo" value={filters.brightness} min={0} max={200} onChange={(v) => setFilters({ ...filters, brightness: v })} />
                                        <FilterSlider label="Contraste" value={filters.contrast} min={0} max={200} onChange={(v) => setFilters({ ...filters, contrast: v })} />
                                        <FilterSlider label="Saturación" value={100 - filters.grayscale} min={0} max={100} onChange={(v) => setFilters({ ...filters, grayscale: 100 - v })} />
                                        <FilterSlider label="Desenfoque" value={filters.blur} min={0} max={20} onChange={(v) => setFilters({ ...filters, blur: v })} />
                                        <FilterSlider label="Sepia" value={filters.sepia} min={0} max={100} onChange={(v) => setFilters({ ...filters, sepia: v })} />
                                    </div>
                                </div>
                            )}

                            {/* --- LEARNING TAB --- */}
                            {activeTab === 'learning' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="bg-cosmic-800 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-3 bg-indigo-600/20 rounded-full">
                                                <Brain className="w-8 h-8 text-accent-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">Perfil de Gustos IA</h3>
                                                <p className="text-sm text-slate-400">El sistema aprende de tus "Me gusta" para mejorar.</p>
                                            </div>
                                        </div>

                                        {mlProfile ? (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-black/30 p-3 rounded-lg">
                                                    <div className="text-xs font-bold text-slate-500 mb-1">Temas Favoritos</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {mlProfile.topThemes.map(theme => (
                                                            <span key={theme} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs border border-indigo-500/30">
                                                                {theme}
                                                            </span>
                                                        ))}
                                                        {mlProfile.topThemes.length === 0 && <span className="text-xs text-slate-600">Aún no hay datos suficientes.</span>}
                                                    </div>
                                                </div>
                                                <div className="bg-black/30 p-3 rounded-lg">
                                                    <div className="text-xs font-bold text-slate-500 mb-1">Estadísticas</div>
                                                    <div className="text-xs text-slate-300">
                                                        <div>Total Feedback: <span className="text-white font-bold">{mlProfile.totalFeedback}</span></div>
                                                        <div>Tasa de Acierto: <span className="text-green-400 font-bold">{Math.round(mlProfile.likeRate * 100)}%</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-slate-500 text-sm">Cargando perfil...</div>
                                        )}

                                        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                            <button
                                                onClick={handleOptimizeStyles}
                                                disabled={isOptimizing}
                                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                            >
                                                {isOptimizing ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Analizando...</>
                                                ) : (
                                                    <><Brain className="w-4 h-4" /> 🧠 Optimizar Estilos con IA</>
                                                )}
                                            </button>
                                            <button
                                                onClick={handleExport}
                                                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                                            >
                                                <Download className="w-4 h-4" /> Exportar Datos de Aprendizaje (JSON)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Canvas Area - The "Work" Space */}
                    <div className="flex-1 bg-[#1e1e2e] relative overflow-hidden flex items-center justify-center p-8">
                        {/* Dot Pattern Background */}
                        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                        {/* Canvas Container */}
                        <div className="relative shadow-2xl shadow-black/50 transition-all duration-500 group">
                            {previewImage ? (
                                <div className="relative">
                                    <img
                                        src={previewImage}
                                        alt="Canvas"
                                        className="max-h-[80vh] max-w-full rounded-lg object-contain bg-white"
                                        style={{ filter: getFilterString() }}
                                    />
                                    {/* Overlay Controls on Hover */}
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <button onClick={() => handleFeedback('like')} className="p-2 bg-black/60 hover:bg-green-600 text-white rounded-lg backdrop-blur-sm transition-colors">
                                            <ThumbsUp className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleFeedback('dislike')} className="p-2 bg-black/60 hover:bg-red-600 text-white rounded-lg backdrop-blur-sm transition-colors">
                                            <ThumbsDown className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Comparison Toggle (if original exists and is different) */}
                                    {originalImage && originalImage !== previewImage && (
                                        <div className="absolute bottom-4 right-4">
                                            <button
                                                onMouseDown={() => setPreviewImage(originalImage)}
                                                onMouseUp={() => setPreviewImage(previewImage)} // This logic is slightly flawed as previewImage is state, need a temp ref or just swap logic
                                                onMouseLeave={() => setPreviewImage(previewImage)} // Reset if mouse leaves
                                                className="px-3 py-1 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm border border-white/10"
                                            >
                                                Mantener para ver original
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-[500px] h-[600px] bg-white rounded-lg flex flex-col items-center justify-center text-slate-300 gap-4 border border-dashed border-slate-300">
                                    <ImageIcon className="w-16 h-16 opacity-20" />
                                    <p className="text-sm font-medium opacity-50">Tu diseño aparecerá aquí</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
