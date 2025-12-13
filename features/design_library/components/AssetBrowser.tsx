
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ASSET_CATEGORIES } from '../data';
import { AssetItem } from './AssetItem';
import { DesignAsset } from '../types';
import { getDesignAssets, saveDesignAsset, loadSettings } from '../../../services/storageService';
import { generateDesignAsset } from '../../../services/aiService';
import { Loader2, Sparkles } from 'lucide-react';

export const AssetBrowser: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
    const [isGenerating, setIsGenerating] = useState(false);
    const [promptInput, setPromptInput] = useState("");
    const [showInput, setShowInput] = useState(false);

    // Load assets from local DB
    const assets = useLiveQuery(() => getDesignAssets(), []) || [];

    const filteredAssets = selectedCategory === 'Todos'
        ? assets
        : assets.filter(a => a.category === selectedCategory);

    const handleGenerate = async () => {
        if (!promptInput.trim()) return;

        setIsGenerating(true);
        try {
            const settings = await loadSettings(); // Get API Key
            const result = await generateDesignAsset(settings.designAI, promptInput, 'color', 4);

            // Save all generated assets
            const assetsToSave = result.assets.map((assetItem, index) => ({
                id: crypto.randomUUID(),
                name: `${promptInput} ${index + 1}`,
                type: 'decoration',
                isAdaptable: true,
                category: 'Generados',
                svgContent: assetItem.raw_svg,
                defaultWidth: "100px",
                defaultHeight: "100px"
            })) as DesignAsset[];

            await Promise.all(assetsToSave.map(a => saveDesignAsset(a)));

            setSelectedCategory('Generados');
            setPromptInput("");
            setShowInput(false);
        } catch (error) {
            console.error(error);
            alert("Error al generar elemento: " + error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, asset: DesignAsset) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'DESIGN_ASSET',
            assetId: asset.id,
            svgContent: asset.svgContent,
            width: asset.defaultWidth,
            height: asset.defaultHeight
        }));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className="flex flex-col h-full bg-cosmic-900 border-l border-glass-border w-full min-w-[300px]">
            {/* Header */}
            <div className="p-4 border-b border-glass-border bg-cosmic-950">
                <h2 className="font-bold text-white flex items-center gap-2">
                    <span>✨</span> Biblioteca de Diseño
                </h2>
                <p className="text-xs text-slate-400 mt-1">Arrastra elementos a tu diseño</p>
            </div>

            {/* Categories */}
            <div className="flex gap-2 p-3 overflow-x-auto border-b border-glass-border no-scrollbar bg-cosmic-900/50">
                {ASSET_CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`
                            px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors border
                            ${selectedCategory === cat
                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-medium shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                                : 'bg-cosmic-800 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200'}
                        `}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {!assets ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 pb-20">
                        {filteredAssets.map(asset => (
                            <AssetItem
                                key={asset.id}
                                asset={asset}
                                onDragStart={handleDragStart}
                            />
                        ))}
                    </div>
                )}

                {assets && filteredAssets.length === 0 && (
                    <div className="p-8 text-center text-slate-500 text-sm italic">
                        No hay elementos en esta categoría.
                        <br />
                        <span className="text-xs opacity-70">Usa "Generar" para crear nuevos.</span>
                    </div>
                )}
            </div>

            {/* AI Generator Trigger */}
            <div className="p-4 border-t border-glass-border bg-cosmic-950">
                {!showInput ? (
                    <button
                        onClick={() => setShowInput(true)}
                        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 group"
                    >
                        <span className="group-hover:scale-110 transition-transform">✨</span>
                        Generar Nuevo Elemento
                    </button>
                ) : (
                    <div className="flex flex-col gap-2 animate-fadeIn">
                        <textarea
                            value={promptInput}
                            onChange={(e) => setPromptInput(e.target.value)}
                            placeholder="Describe el elemento (ej: marco floral, estrella neon)..."
                            className="w-full p-2 text-sm bg-cosmic-800 border border-glass-border rounded-lg text-white focus:outline-none focus:border-indigo-500 resize-none h-20 placeholder-slate-500"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleGenerate();
                                }
                            }}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !promptInput.trim()}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                {isGenerating ? <Loader2 className="animate-spin w-3 h-3" /> : "Crear"}
                            </button>
                            <button
                                onClick={() => setShowInput(false)}
                                disabled={isGenerating}
                                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
