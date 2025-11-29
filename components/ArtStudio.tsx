import React, { useState, useEffect, useRef } from 'react';
import { ArtTemplate, ImageFilters, AISettings } from '../types';
import { generatePuzzleBackground, enhancePromptAI } from '../services/aiService';
import { getArtLibrary, saveArtTemplate, deleteArtTemplate } from '../services/storageService';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Image as ImageIcon, Upload, Sliders, Sparkles, Save, Check, Loader2, Trash2, RefreshCw, Wand2, Eye } from 'lucide-react';
import { generateLayoutMask } from '../utils/layoutMask';

interface ArtStudioProps {
    isOpen: boolean;
    onClose: () => void;
    currentImage?: string;
    currentFilters?: ImageFilters;
    onApply: (image: string, filters: ImageFilters, templateId?: string) => void;
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
    { id: 'bw', label: 'Blanco y Negro', desc: 'Line art simple' },
    { id: 'color', label: 'Color', desc: 'Ilustración vibrante' },
    { id: 'watercolor', label: 'Acuarela', desc: 'Suave y artístico' },
    { id: 'cyberpunk', label: 'Cyberpunk', desc: 'Neón y futurista' },
    { id: 'sketch', label: 'Boceto', desc: 'Lápiz y papel' },
    { id: 'oil', label: 'Óleo', desc: 'Textura de pintura' },
    { id: '3d', label: '3D Render', desc: 'Estilo Pixar/Disney' },
    { id: 'pixel', label: 'Pixel Art', desc: 'Retro 8-bit' },
];

export const ArtStudio: React.FC<ArtStudioProps> = ({
    isOpen,
    onClose,
    currentImage,
    currentFilters,
    onApply,
    aiSettings
}) => {
    const [activeTab, setActiveTab] = useState<'generate' | 'gallery' | 'upload' | 'adjust'>('generate');
    const [previewImage, setPreviewImage] = useState<string | undefined>(currentImage);
    const [filters, setFilters] = useState<ImageFilters>(currentFilters || DEFAULT_FILTERS);

    // AI Generation State
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState<string>('bw');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [useSmartDesign, setUseSmartDesign] = useState(true); // Default to Smart Design
    const [statusLog, setStatusLog] = useState<string[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('classic');

    const addLog = (msg: string) => setStatusLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

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

    // Gallery State
    const artLibrary = useLiveQuery(() => getArtLibrary(), []) || [];

    // Upload State
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setPreviewImage(currentImage);
            setFilters(currentFilters || DEFAULT_FILTERS);
        }
    }, [isOpen, currentImage, currentFilters]);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        setStatusLog([]); // Clear logs
        addLog(`Starting... Smart: ${useSmartDesign}`);

        try {
            let bgBase64: string;

            if (useSmartDesign) {
                // 1. Capture Layout Mask
                addLog("Generating layout mask...");
                const mask = await generateLayoutMask('puzzle-sheet');
                if (!mask) {
                    addLog("ERROR: Mask generation failed");
                    throw new Error("No se pudo capturar la estructura del puzzle.");
                }
                addLog(`Mask generated (${mask.length} chars)`);

                // 2. Call Smart Design Endpoint
                const url = `${aiSettings.baseUrl}/api/ai/generate-smart-design`;
                addLog(`Sending to: ${url}`);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': aiSettings.apiKey || ''
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        mask_image: mask,
                        style: style
                    })
                });

                addLog(`Response status: ${response.status}`);
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
                bgBase64 = await generatePuzzleBackground(aiSettings, prompt, style);
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
            // Default to classic if not specified via the buttons above
            // But actually, the Apply button at the bottom should probably just apply the image
            // The template selection is a bit weird here. Let's make the Apply button use a state for template.
            onApply(previewImage, filters, selectedTemplate);
            onClose();
        }
    };

    const getFilterString = () => {
        return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%) blur(${filters.blur}px) sepia(${filters.sepia}%)`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 w-full max-w-5xl h-[85vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-xl font-bold text-white">Art Studio <span className="text-xs text-indigo-400 ml-2 border border-indigo-500/30 px-2 py-0.5 rounded-full">AI Powered</span></h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">

                    {/* Sidebar / Controls */}
                    <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col">

                        {/* Tabs */}
                        <div className="flex border-b border-slate-700">
                            <button
                                onClick={() => setActiveTab('generate')}
                                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'generate' ? 'text-indigo-400 bg-slate-800 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Sparkles className="w-4 h-4" /> Generar
                            </button>
                            <button
                                onClick={() => setActiveTab('gallery')}
                                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'gallery' ? 'text-indigo-400 bg-slate-800 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <ImageIcon className="w-4 h-4" /> Galería
                            </button>
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'upload' ? 'text-indigo-400 bg-slate-800 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Upload className="w-4 h-4" /> Subir
                            </button>
                            <button
                                onClick={() => setActiveTab('adjust')}
                                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'adjust' ? 'text-indigo-400 bg-slate-800 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Sliders className="w-4 h-4" /> Ajustar
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                            {activeTab === 'generate' && (
                                <div className="space-y-4">
                                    {/* Smart Design Toggle */}
                                    <div className="bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-bold text-indigo-300 flex items-center gap-1">
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
                                                className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                            >
                                                {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                                Mejorar con IA
                                            </button>
                                        </div>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder={useSmartDesign ? "Ej: Enredaderas de flores rodeando el corazón..." : "Un paisaje de montañas nevadas..."}
                                            className="w-full h-24 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:border-indigo-500 outline-none resize-none"
                                        />
                                    </div>


                                    {/* Template Selector */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-2">Plantilla de Diseño</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setSelectedTemplate('classic')}
                                                className={`p-2 rounded-lg border text-left transition-all ${selectedTemplate === 'classic'
                                                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                                    }`}
                                            >
                                                <div className="text-xs font-bold">Clásico</div>
                                                <div className="text-[9px] opacity-70">Diseño estándar</div>
                                            </button>
                                            <button
                                                onClick={() => setSelectedTemplate('tech')}
                                                className={`p-2 rounded-lg border text-left transition-all ${selectedTemplate === 'tech'
                                                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                                    }`}
                                            >
                                                <div className="text-xs font-bold">Tech / Dev</div>
                                                <div className="text-[9px] opacity-70">Estilo moderno IT</div>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-2">Estilo Artístico</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                            {STYLE_PRESETS.map(preset => (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => setStyle(preset.id)}
                                                    className={`p-2 rounded-lg border text-left transition-all ${style === preset.id
                                                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
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
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-bold shadow-lg flex items-center justify-center gap-2"
                                    >
                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {useSmartDesign ? 'Generar Diseño Inteligente' : 'Generar Imagen'}
                                    </button>

                                    {/* Debug Status Display */}
                                    <div className="mt-2 p-2 bg-black/50 rounded text-[10px] font-mono text-green-400 h-20 overflow-y-auto border border-slate-700">
                                        {statusLog.map((log, i) => <div key={i}>{log}</div>)}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'gallery' && (
                                <div className="grid grid-cols-2 gap-2">
                                    {artLibrary.map(item => (
                                        <div key={item.id} className="relative group aspect-square bg-slate-800 rounded-lg overflow-hidden border border-slate-700 cursor-pointer" onClick={() => setPreviewImage(item.imageBase64)}>
                                            <img src={item.imageBase64} alt={item.name} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteArtTemplate(item.id); }}
                                                    className="p-1.5 bg-red-500/80 text-white rounded-full hover:bg-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {artLibrary.length === 0 && (
                                        <div className="col-span-2 text-center py-8 text-slate-500 text-sm">
                                            No hay imágenes guardadas.
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'upload' && (
                                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50">
                                    <Upload className="w-12 h-12 text-slate-500 mb-4" />
                                    <p className="text-slate-400 text-sm mb-4">Arrastra o selecciona una imagen</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium"
                                    >
                                        Seleccionar Archivo
                                    </button>
                                </div>
                            )}

                            {activeTab === 'adjust' && (
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-xs font-bold text-slate-400">Brillo</label>
                                            <span className="text-xs text-indigo-400">{filters.brightness}%</span>
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
                                            <span className="text-xs text-indigo-400">{filters.contrast}%</span>
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
                                            <span className="text-xs text-indigo-400">{filters.grayscale}%</span>
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
                                            <span className="text-xs text-indigo-400">{filters.blur}px</span>
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
                                            <span className="text-xs text-indigo-400">{filters.sepia}%</span>
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
                                        className="w-full py-2 border border-slate-600 text-slate-400 hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Resetear Filtros
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-950 flex flex-col">
                        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
                            {previewImage ? (
                                <div className="relative shadow-2xl max-h-full max-w-full">
                                    <img
                                        src={previewImage}
                                        alt="Preview"
                                        className="max-h-[60vh] object-contain border-4 border-white shadow-xl"
                                        style={{ filter: getFilterString() }}
                                    />
                                </div>
                            ) : (
                                <div className="text-slate-600 flex flex-col items-center">
                                    <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                                    <p>Selecciona o genera una imagen para previsualizar</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 text-slate-300 hover:text-white font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={!previewImage}
                                className="px-8 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-bold shadow-lg flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" /> Aplicar al Puzzle
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>

    );
};
