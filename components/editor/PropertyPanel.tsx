
import React from 'react';
import { EditorElementId } from './types';
import { PuzzleConfig } from '../../types';
import { Type, Palette, Move, Maximize, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';

interface PropertyPanelProps {
    selectedElement: EditorElementId | null;
    config: PuzzleConfig;
    onUpdateConfig: (updates: Partial<PuzzleConfig>) => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedElement, config, onUpdateConfig }) => {
    const renderGlobalSettings = () => (
        <div className="space-y-6 p-5">
            <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-1">
                    <Move className="w-3 h-3" /> Márgenes
                </h2>
                <div className="grid grid-cols-2 gap-2">
                    {['top', 'bottom', 'left', 'right'].map((m) => (
                        <div key={m}>
                            <label className="text-[10px] text-slate-500 capitalize">{m}</label>
                            <input
                                type="number"
                                step="0.1"
                                value={config.margins[m as keyof typeof config.margins]}
                                onChange={(e) => onUpdateConfig({
                                    margins: { ...config.margins, [m]: parseFloat(e.target.value) }
                                })}
                                className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-1">
                    <Type className="w-3 h-3" /> Tipografía
                </h2>
                <select
                    value={config.fontType}
                    onChange={(e) => onUpdateConfig({ fontType: e.target.value as any })}
                    className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                >
                    <option value="CLASSIC">Clásica (Mono)</option>
                    <option value="MODERN">Moderna (Sans)</option>
                    <option value="FUN">Divertida</option>
                    <option value="SCHOOL">Escolar</option>
                </select>
            </div>

            <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-1">
                    <Maximize className="w-3 h-3" /> Tamaño Grilla
                </h2>
                <input
                    type="number"
                    min="5" max="30"
                    value={config.gridSize}
                    onChange={(e) => onUpdateConfig({ gridSize: parseInt(e.target.value) })}
                    className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                />
            </div>

            <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-1">
                    <Palette className="w-3 h-3" /> Opacidad Fondos
                </h2>

                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Fondo Grilla</span>
                        <span>{Math.round((config.overlayOpacity ?? 0.9) * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0" max="1" step="0.05"
                        value={config.overlayOpacity ?? 0.9}
                        onChange={(e) => onUpdateConfig({ overlayOpacity: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 block"
                    />
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Fondo Palabras</span>
                        <span>{Math.round((config.textOverlayOpacity ?? 0.8) * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0" max="1" step="0.05"
                        value={config.textOverlayOpacity ?? 0.8}
                        onChange={(e) => onUpdateConfig({ textOverlayOpacity: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 block"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col">
            <div className="p-5 border-b border-glass-border/50 bg-[#11111b]">
                <h3 className="text-xs font-bold text-accent-400 flex items-center gap-2 uppercase tracking-widest">
                    <Move className="w-4 h-4" />
                    {selectedElement ? `Editar: ${selectedElement}` : 'Configuración Global'}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {!selectedElement && renderGlobalSettings()}

                {/* Dynamic controls based on selection */}
                {selectedElement === 'title' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Texto Título</label>
                            <input
                                type="text"
                                value={config.title}
                                onChange={(e) => onUpdateConfig({ title: e.target.value })}
                                className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-sm text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Tipografía</label>
                            <select
                                value={config.fontType}
                                onChange={(e) => onUpdateConfig({ fontType: e.target.value as any })}
                                className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                            >
                                <option value="CLASSIC">Clásica</option>
                                <option value="MODERN">Moderna</option>
                                <option value="FUN">Divertida</option>
                                <option value="SCHOOL">Escolar</option>
                            </select>
                        </div>
                    </div>
                )}

                {selectedElement === 'grid' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Tamaño Grilla</label>
                            <input
                                type="number"
                                min="5" max="30"
                                value={config.gridSize}
                                onChange={(e) => onUpdateConfig({ gridSize: parseInt(e.target.value) })}
                                className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
