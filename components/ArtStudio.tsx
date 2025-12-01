import React, { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon, Upload, Sliders, Sparkles, Save, Check, Loader2, Trash2, RefreshCw, Wand2, Eye, ThumbsUp, ThumbsDown, Brain, Download, CheckSquare, Square } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getArtLibrary, saveArtTemplate, deleteArtTemplate, saveUserPreference, exportLearningData, saveTasteProfile, getTasteProfile, getUserPreferences } from '../services/storageService';
import { enhancePromptAI, createContextAwarePrompt, generatePuzzleBackground, analyzeImageStyle, generateTasteProfile } from '../services/aiService';
import { ArtTemplate, ImageFilters, AISettings } from '../types';

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

const STYLE_PRESETS = [
    { id: 'bw', label: 'Blanco y Negro', desc: 'Line art, high contrast, coloring book style' },
    { id: 'color', label: 'Color Vibrante', desc: 'Digital art, vibrant colors, detailed' },
    { id: 'watercolor', label: 'Acuarela', desc: 'Soft, artistic, painterly texture' },
    { id: '3d', label: '3D Render', desc: 'Pixar style, cute, isometric' },
    { id: 'pixel', label: 'Pixel Art', desc: 'Retro game style, 8-bit' },
];

export const ArtStudio: React.FC<ArtStudioProps> = ({ isOpen, onClose, onApply, currentImage, currentFilters, selectedTemplate, aiSettings }) => {
    const [activeTab, setActiveTab] = useState<'generate' | 'gallery' | 'upload' | 'adjust' | 'learning'>('generate');
    const [previewImage, setPreviewImage] = useState<string | undefined>(currentImage);
    const [filters, setFilters] = useState<ImageFilters>(currentFilters || DEFAULT_FILTERS);
    const [targetTemplate, setTargetTemplate] = useState<string>(selectedTemplate);

    // AI Generation State
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState<string>('bw');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [useSmartDesign, setUseSmartDesign] = useState(true); // Default to Smart Design
    const [statusLog, setStatusLog] = useState<string[]>([]);

    // Style Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedStyle, setAnalyzedStyle] = useState<string | null>(null);
    const [customStyles, setCustomStyles] = useState<{ id: string, label: string, desc: string }[]>([]);

    // Feedback State
    const [feedbackGiven, setFeedbackGiven] = useState(false);

    // Learning State
    const [tasteProfile, setTasteProfile] = useState<string>('');
    const [isConsolidating, setIsConsolidating] = useState(false);

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
    }, []);

    // Gallery State
    const artLibrary = useLiveQuery(() => getArtLibrary(), []) || [];
    const preferences = useLiveQuery(() => getUserPreferences(), []) || [];

    // Create a map of artTemplateId -> preference type
    const preferenceMap = React.useMemo(() => {
        const map = new Map<string, 'like' | 'dislike'>();
        preferences.forEach(p => {
            if (p.artTemplateId) {
                map.set(p.artTemplateId, p.type);
            }
        });
        return map;
    }, [preferences]);

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

        // Prompt to consolidate
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
            setFilters(currentFilters || DEFAULT_FILTERS);
        }
    }, [isOpen, currentImage, currentFilters]);

    const addLog = (msg: string) => setStatusLog(prev => [...prev, msg]);

    const generateLayoutMask = async (elementId: string): Promise<string> => {
        // Placeholder: return a white 1x1 pixel base64
        // In a real implementation, this would use html2canvas on the puzzle grid
        return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwH9A6KKKAP/2Q==";
    };

    const handleEnhancePrompt = async () => {
        if (!prompt) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhancePromptAI(aiSettings, prompt);
            setPrompt(enhanced);
        } catch (e) {
            console.error("Error enhancing prompt:", e);
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        setStatusLog([]); // Clear logs
        addLog(`Starting... Smart: ${useSmartDesign}`);

        try {
            let bgBase64: string;

            // Check if selected style is custom
            const customStyle = customStyles.find(s => s.id === style);
            let finalPrompt = prompt;
            let styleParam = style;

            if (customStyle) {
                // If custom style, append description to prompt and use 'custom' or 'color' as base style
                finalPrompt = `${prompt}. Art Style: ${customStyle.desc}`;
                styleParam = 'custom'; // Or whatever the backend expects for generic/custom
                addLog(`Using Custom Style: ${customStyle.label}`);
            }

            if (useSmartDesign) {
                // 1. Context Aware Prompting
                addLog(`Refining prompt for ${targetTemplate}...`);
                const contextPrompt = await createContextAwarePrompt(aiSettings, finalPrompt, targetTemplate);
                addLog("Prompt refined.");

                // 2. Capture Layout Mask
                addLog("Generating layout mask...");
                let mask = await generateLayoutMask('puzzle-sheet');

                if (!mask) {
                    addLog("WARNING: Mask generation failed. Using fallback.");
                    mask = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwH9A6KKKAP/2Q==";
                }
                addLog(`Mask generated (${mask.length} chars)`);

                // 3. Call Smart Design Endpoint
                const url = `${aiSettings.baseUrl}/api/ai/generate-smart-design`;
                addLog(`Sending to: ${url}`);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': aiSettings.apiKey || ''
                    },
                    body: JSON.stringify({
                        prompt: contextPrompt, // Use the refined prompt
                        mask_image: mask,
                        style: styleParam
                    })
                });

                addLog(`Response status: ${response.status} ${response.statusText}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    addLog(`API Error: ${JSON.stringify(errorData)}`);
                    throw new Error(errorData.detail || "Error en Smart Design");
                }

                const data = await response.json();
                bgBase64 = data.image;
                addLog("Image received successfully");

            } else {
                // Legacy Generation
                addLog("Using Legacy Generation...");
                bgBase64 = await generatePuzzleBackground(aiSettings, finalPrompt, styleParam);
            }

            setPreviewImage(bgBase64);

            // Auto-save to gallery
            const newTemplate: ArtTemplate = {
                id: crypto.randomUUID(),
                name: prompt.slice(0, 20),
                prompt: prompt,
                imageBase64: bgBase64,
                style: style,
                createdAt: Date.now()
            };
            await saveArtTemplate(newTemplate);
            setActiveTab('adjust'); // Switch to adjust to see result clearly
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

                // Save uploaded image to gallery? Maybe optional. Let's save it.
                const newTemplate: ArtTemplate = {
                    id: crypto.randomUUID(),
                    name: file.name,
                    prompt: "Uploaded Image",
                    imageBase64: base64,
                    style: 'color', // Assume color for uploads
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
        // Find current template ID if possible (this is tricky for preview, but for gallery it's easy)
        // For the main preview, we might not have the ID readily available unless we track it.
        // But the user asked for GALLERY persistence.

        await saveUserPreference(type, prompt, style);
        setFeedbackGiven(true);
        addLog(`Feedback enviado: ${type}`);
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-cosmic-900 w-full max-w-5xl h-[85vh] rounded-2xl border border-glass-border shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-glass-border flex justify-between items-center bg-cosmic-950">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-accent-400" />
                        <h2 className="text-xl font-bold text-white">Art Studio <span className="text-xs text-accent-400 ml-2 border border-indigo-500/30 px-2 py-0.5 rounded-full">AI Powered</span></h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-cosmic-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">

                    {/* Sidebar / Controls */}
                    <div className="w-80 bg-cosmic-900 border-r border-glass-border flex flex-col">

                        {/* Tabs */}
                        <div className="flex border-b border-glass-border">
                            <button
                                onClick={() => setActiveTab('generate')}
                                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'generate' ? 'text-accent-400 bg-cosmic-800 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Sparkles className="w-4 h-4" /> Generar
                            </button>
                            <button
                                onClick={() => setActiveTab('gallery')}
                                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'gallery' ? 'text-accent-400 bg-cosmic-800 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <ImageIcon className="w-4 h-4" /> Galería
                            </button>
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'upload' ? 'text-accent-400 bg-cosmic-800 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Upload className="w-4 h-4" /> Subir
                            </button>
                            <button
                                onClick={() => setActiveTab('adjust')}
                                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'adjust' ? 'text-accent-400 bg-cosmic-800 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Sliders className="w-4 h-4" /> Ajustar
                            </button>
                            <button
                                onClick={() => setActiveTab('learning')}
                                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'learning' ? 'text-accent-400 bg-cosmic-800 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Brain className="w-4 h-4" /> Cerebro
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                            {activeTab === 'generate' && (
                                <div className="space-y-4">
                                    {/* Smart Design Toggle */}
                                    <div className="bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-bold text-accent-300 flex items-center gap-1">
                                                <Eye className="w-3 h-3" /> Diseño Inteligente
                                            </label>
                                            <button
                                                onClick={() => setUseSmartDesign(!useSmartDesign)}
                                                className={`w-8 h-4 rounded-full transition-colors relative ${useSmartDesign ? 'bg-indigo-500' : 'bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${useSmartDesign ? 'left-4.5 translate-x-1' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-indigo-200/60 leading-tight">
                                            La IA "verá" tu sopa de letras y diseñará un marco que respete el texto y la forma.
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-slate-400">Prompt (Descripción)</label>
                                            <button
                                                onClick={handleEnhancePrompt}
                                                disabled={!prompt || isEnhancing}
                                                className="text-[10px] bg-indigo-500/10 hover:bg-accent-500/20 text-accent-400 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                            >
                                                {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                                Mejorar con IA
                                            </button>
                                        </div>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder={useSmartDesign ? "Ej: Enredaderas de flores rodeando el corazón..." : "Un paisaje de montañas nevadas..."}
                                            className="w-full h-24 bg-cosmic-800 border border-glass-border rounded-lg p-3 text-sm text-slate-200 focus:border-indigo-500 outline-none resize-none"
                                        />
                                    </div>

                                    {/* Template Selection */}
                                    <div className="bg-cosmic-800 p-3 rounded-lg border border-glass-border mb-4">
                                        <label className="text-xs font-bold text-slate-400 mb-2 block">Modo de Diseño</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setTargetTemplate('classic')}
                                                className={`flex-1 py-2 px-3 rounded text-xs font-bold transition-colors ${targetTemplate !== 'thematic'
                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                    }`}
                                            >
                                                Clásico / Tech
                                            </button>
                                            <button
                                                onClick={() => setTargetTemplate('thematic')}
                                                className={`flex-1 py-2 px-3 rounded text-xs font-bold transition-colors ${targetTemplate === 'thematic'
                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                    }`}
                                            >
                                                Temático (Full Page)
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                                            {targetTemplate === 'thematic'
                                                ? "Genera un diseño de página completa donde el puzzle se integra en el arte."
                                                : "Genera un fondo para el área del puzzle o la página, manteniendo la estructura clásica."}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-2">Estilo Artístico</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                            {/* Custom Styles Section */}
                                            {customStyles.length > 0 && (
                                                <div className="col-span-2 text-[10px] font-bold text-accent-400 mt-1 mb-1 border-b border-glass-border pb-1">
                                                    Mis Estilos
                                                </div>
                                            )}
                                            {customStyles.map(preset => (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => setStyle(preset.id)}
                                                    className={`p-2 rounded-lg border text-left transition-all ${style === preset.id
                                                        ? 'bg-accent-600/20 border-indigo-500 text-white shadow-sm'
                                                        : 'bg-cosmic-800 border-glass-border text-slate-400 hover:bg-slate-700'
                                                        }`}
                                                >
                                                    <div className="text-xs font-bold truncate">{preset.label}</div>
                                                    <div className="text-[9px] opacity-70 truncate">{preset.desc}</div>
                                                </button>
                                            ))}

                                            {/* Default Styles Section */}
                                            {customStyles.length > 0 && (
                                                <div className="col-span-2 text-[10px] font-bold text-slate-500 mt-2 mb-1 border-b border-glass-border pb-1">
                                                    Predefinidos
                                                </div>
                                            )}
                                            {STYLE_PRESETS.map(preset => (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => setStyle(preset.id)}
                                                    className={`p-2 rounded-lg border text-left transition-all ${style === preset.id
                                                        ? 'bg-accent-600/20 border-indigo-500 text-white shadow-sm'
                                                        : 'bg-cosmic-800 border-glass-border text-slate-400 hover:bg-slate-700'
                                                        }`}
                                                >
                                                    <div className="text-xs font-bold">{preset.label}</div>
                                                    <div className="text-[9px] opacity-70">{preset.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !prompt}
                                        className="w-full py-3 bg-accent-600 hover:bg-accent-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-bold shadow-lg flex items-center justify-center gap-2"
                                    >
                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {useSmartDesign ? 'Generar Diseño Inteligente' : 'Generar Imagen'}
                                    </button>

                                    {/* Debug Status Display */}
                                    <div ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }} className="mt-2 p-2 bg-black/50 rounded text-[10px] font-mono text-green-400 h-20 overflow-y-auto border border-glass-border">
                                        {statusLog.map((log, i) => <div key={i}>{log}</div>)}
                                    </div>
                                </div>
                            )}


                            {activeTab === 'gallery' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center bg-cosmic-800 p-2 rounded-lg border border-glass-border">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setIsSelectionMode(!isSelectionMode);
                                                    setSelectedItems(new Set());
                                                }}
                                                className={`p-1.5 rounded-md transition-colors flex items-center gap-2 text-xs font-bold ${isSelectionMode ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                            >
                                                {isSelectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                {isSelectionMode ? 'Cancelar Selección' : 'Seleccionar Varios'}
                                            </button>
                                            {isSelectionMode && (
                                                <span className="text-xs text-slate-400">
                                                    {selectedItems.size} seleccionados
                                                </span>
                                            )}
                                        </div>

                                        {isSelectionMode && selectedItems.size > 0 && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleBulkFeedback('like')}
                                                    className="p-1.5 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-md transition-colors"
                                                    title="Me gusta a todos"
                                                >
                                                    <ThumbsUp className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleBulkFeedback('dislike')}
                                                    className="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-md transition-colors"
                                                    title="No me gusta a todos"
                                                >
                                                    <ThumbsDown className="w-4 h-4" />
                                                </button>
                                                <div className="w-px h-4 bg-slate-600 mx-1"></div>
                                                <button
                                                    onClick={handleBulkDelete}
                                                    className="p-1.5 bg-slate-700 hover:bg-red-900/50 text-slate-300 hover:text-red-400 rounded-md transition-colors"
                                                    title="Eliminar seleccionados"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {artLibrary.map(item => (
                                            <div
                                                key={item.id}
                                                className={`relative group aspect-square bg-cosmic-800 rounded-lg overflow-hidden border cursor-pointer transition-all ${isSelectionMode && selectedItems.has(item.id)
                                                    ? 'border-indigo-500 ring-2 ring-indigo-500/50'
                                                    : 'border-glass-border hover:border-slate-500'
                                                    }`}
                                                onClick={() => {
                                                    if (isSelectionMode) {
                                                        toggleSelection(item.id);
                                                    } else {
                                                        setPreviewImage(item.imageBase64);
                                                    }
                                                }}
                                            >
                                                <img src={item.imageBase64} alt={item.name} className={`w-full h-full object-cover transition-opacity ${isSelectionMode && selectedItems.has(item.id) ? 'opacity-70' : ''}`} />

                                                {/* Selection Checkbox Overlay */}
                                                {isSelectionMode && (
                                                    <div className="absolute top-2 right-2">
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedItems.has(item.id) ? 'bg-indigo-600 border-indigo-500' : 'bg-black/50 border-white/50'}`}>
                                                            {selectedItems.has(item.id) && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                    </div>
                                                )}

                                                {!isSelectionMode && (
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                saveUserPreference('like', item.prompt, item.style, item.id);
                                                                addLog("Feedback: Me gusta (Guardado)");
                                                            }}
                                                            className={`p-2 rounded-full transition-all ${preferenceMap.get(item.id) === 'like' ? 'bg-green-600 text-white scale-110 ring-2 ring-white' : 'bg-green-500/80 text-white hover:bg-green-600 hover:scale-110'}`}
                                                            title="Me gusta"
                                                        >
                                                            <ThumbsUp className="w-4 h-4" fill={preferenceMap.get(item.id) === 'like' ? "currentColor" : "none"} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                saveUserPreference('dislike', item.prompt, item.style, item.id);
                                                                addLog("Feedback: No me gusta (Guardado)");
                                                            }}
                                                            className={`p-2 rounded-full transition-all ${preferenceMap.get(item.id) === 'dislike' ? 'bg-red-600 text-white scale-110 ring-2 ring-white' : 'bg-red-500/80 text-white hover:bg-red-600 hover:scale-110'}`}
                                                            title="No me gusta"
                                                        >
                                                            <ThumbsDown className="w-4 h-4" fill={preferenceMap.get(item.id) === 'dislike' ? "currentColor" : "none"} />
                                                        </button>
                                                        <div className="w-px h-6 bg-white/30 mx-1"></div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteArtTemplate(item.id); }}
                                                            className="p-2 bg-slate-700/80 text-white rounded-full hover:bg-slate-600 hover:scale-110 transition-all"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {artLibrary.length === 0 && (
                                            <div className="col-span-2 text-center py-8 text-slate-500 text-sm">
                                                No hay imágenes guardadas.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'upload' && (
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-glass-border rounded-xl bg-cosmic-800/50">
                                        <Upload className="w-10 h-10 text-slate-500 mb-3" />
                                        <p className="text-slate-400 text-xs mb-3">Arrastra o selecciona una imagen de referencia</p>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium"
                                        >
                                            Seleccionar Archivo
                                        </button>
                                    </div>

                                    {previewImage && (
                                        <div className="bg-cosmic-800 p-3 rounded-lg border border-glass-border">
                                            <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
                                                <Sparkles className="w-3 h-3 text-accent-400" />
                                                Análisis de Estilo IA
                                            </h3>

                                            {!analyzedStyle ? (
                                                <button
                                                    onClick={handleAnalyzeStyle}
                                                    disabled={isAnalyzing}
                                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                                                >
                                                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                                    Analizar Estilo de esta Imagen
                                                </button>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="p-2 bg-black/30 rounded text-[10px] text-slate-300 max-h-24 overflow-y-auto border border-glass-border">
                                                        {analyzedStyle}
                                                    </div>
                                                    <button
                                                        onClick={saveAnalyzedStyle}
                                                        className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                                                    >
                                                        <Save className="w-3 h-3" /> Guardar como Nuevo Estilo
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'adjust' && (
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-xs font-bold text-slate-400">Brillo</label>
                                            <span className="text-xs text-accent-400">{filters.brightness}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="200"
                                            value={filters.brightness}
                                            onChange={(e) => setFilters({ ...filters, brightness: Number(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-xs font-bold text-slate-400">Contraste</label>
                                            <span className="text-xs text-accent-400">{filters.contrast}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="200"
                                            value={filters.contrast}
                                            onChange={(e) => setFilters({ ...filters, contrast: Number(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-xs font-bold text-slate-400">Escala de Grises</label>
                                            <span className="text-xs text-accent-400">{filters.grayscale}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="100"
                                            value={filters.grayscale}
                                            onChange={(e) => setFilters({ ...filters, grayscale: Number(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-xs font-bold text-slate-400">Desenfoque (Blur)</label>
                                            <span className="text-xs text-accent-400">{filters.blur}px</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="20" step="0.5"
                                            value={filters.blur}
                                            onChange={(e) => setFilters({ ...filters, blur: Number(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-xs font-bold text-slate-400">Sepia</label>
                                            <span className="text-xs text-accent-400">{filters.sepia}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="100"
                                            value={filters.sepia}
                                            onChange={(e) => setFilters({ ...filters, sepia: Number(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>

                                    <button
                                        onClick={() => setFilters(DEFAULT_FILTERS)}
                                        className="w-full py-2 border border-slate-600 text-slate-400 hover:bg-cosmic-800 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Resetear Filtros
                                    </button>
                                </div>
                            )}

                            {activeTab === 'learning' && (
                                <div className="space-y-6">
                                    <div className="bg-cosmic-800 p-4 rounded-lg border border-glass-border">
                                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                            <Brain className="w-4 h-4 text-accent-400" />
                                            Perfil de Gustos (IA)
                                        </h3>
                                        <p className="text-xs text-slate-400 mb-4">
                                            La IA analiza tus "Me gusta" y "No me gusta" para entender tu estilo único.
                                        </p>

                                        <div className="bg-black/30 p-3 rounded-lg border border-glass-border min-h-[100px] mb-4">
                                            {tasteProfile ? (
                                                <p className="text-xs text-slate-200 italic">"{tasteProfile}"</p>
                                            ) : (
                                                <p className="text-xs text-slate-500 text-center py-4">
                                                    Aún no hay un perfil consolidado. Genera imágenes y vota para crear uno.
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleConsolidate}
                                            disabled={isConsolidating}
                                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 mb-2"
                                        >
                                            {isConsolidating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            Consolidar Aprendizaje
                                        </button>
                                    </div>

                                    <div className="bg-cosmic-800 p-4 rounded-lg border border-glass-border">
                                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                            <Download className="w-4 h-4 text-green-400" />
                                            Exportar Datos
                                        </h3>
                                        <p className="text-xs text-slate-400 mb-4">
                                            Descarga tu historial de votos y tu perfil de gustos para llevarlos a otro dispositivo.
                                        </p>
                                        <button
                                            onClick={handleExport}
                                            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                                        >
                                            <Download className="w-3 h-3" /> Descargar JSON
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 bg-slate-100 flex flex-col relative">
                        {/* Background Pattern - Subtle on light */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

                        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative z-10">
                            <div className={`relative transition-all duration-300 ${previewImage ? 'shadow-2xl' : 'border-2 border-dashed border-slate-300 bg-white/50'} p-1 bg-white rounded-sm`}>
                                {previewImage ? (
                                    <div className="relative bg-white">
                                        <img
                                            src={previewImage}
                                            alt="Preview"
                                            className="max-h-[60vh] object-contain border border-slate-100"
                                            style={{ filter: getFilterString() }}
                                        />
                                    </div>
                                ) : (
                                    <div className="w-96 h-96 flex flex-col items-center justify-center text-slate-400 bg-white">
                                        <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                                        <p className="font-medium">Vista Previa de Impresión</p>
                                        <p className="text-xs opacity-70 mt-2 text-center px-8">
                                            Aquí verás cómo quedará el diseño en la hoja blanca.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center relative z-20">

                            {/* Feedback UI */}
                            {previewImage && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 mr-2">¿Te gusta este diseño?</span>
                                    <button
                                        onClick={() => handleFeedback('like')}
                                        disabled={feedbackGiven}
                                        className={`p-2 rounded-full transition-all ${feedbackGiven
                                            ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400'
                                            : 'hover:bg-green-100 text-slate-400 hover:text-green-600 hover:scale-110'}`}
                                        title="Me gusta (La IA aprenderá de esto)"
                                    >
                                        <ThumbsUp className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleFeedback('dislike')}
                                        disabled={feedbackGiven}
                                        className={`p-2 rounded-full transition-all ${feedbackGiven
                                            ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400'
                                            : 'hover:bg-red-100 text-slate-400 hover:text-red-600 hover:scale-110'}`}
                                        title="No me gusta (La IA evitará esto)"
                                    >
                                        <ThumbsDown className="w-5 h-5" />
                                    </button>
                                    {feedbackGiven && <span className="text-xs text-green-600 font-medium animate-fade-in">¡Gracias!</span>}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2 text-slate-500 hover:text-slate-800 font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleApply}
                                    disabled={!previewImage}
                                    className="px-8 py-2 bg-accent-600 hover:bg-accent-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all"
                                >
                                    <Check className="w-4 h-4" /> Aplicar al Puzzle
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>


        </div>
    );
};
