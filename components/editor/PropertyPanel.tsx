
import React from 'react';
import { EditorElementId } from './types';
import { PuzzleConfig } from '../../types';
// Types needed for presets
import { Type, Palette, Move, Maximize, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Layout, List, Square, Circle, Heart, Star, X, Plus, Grid3X3, Zap, Briefcase, GraduationCap, Sparkles } from 'lucide-react';
import { CollapsibleSection } from '../../components/ui/CollapsibleSection';
import { EffectsPanel } from './EffectsPanel';

interface PropertyPanelProps {
    selectedElement: EditorElementId | null;
    config: PuzzleConfig;
    onUpdateConfig: (updates: Partial<PuzzleConfig>) => void;
}

// 🎨 PRESETS DE ESTILO RÁPIDO
const STYLE_PRESETS = {
    'REGULAR': {
        icon: <Grid3X3 className="w-4 h-4" />,
        label: 'Estándar',
        config: {
            gridBorderColor: '#000000',
            gridBorderWidth: '2px',
            gridRadius: '8px',
            gridBackground: '#ffffff',
            fontFamilyGrid: 'MODERN',
            boldGrid: true,
            gridShadow: '4px 4px 0px rgba(0,0,0,0.2)',
            gridEffects: { shadowEnabled: true, shadowColor: '#000000', shadowBlur: 0, shadowOffsetX: 4, shadowOffsetY: 4 }
        }
    },
    'PROFESSIONAL': { // El "Hard Mode" solicitado
        icon: <Briefcase className="w-4 h-4" />,
        label: 'Profesional',
        config: {
            gridBorderColor: '#000000',
            gridBorderWidth: '3px',
            gridRadius: '0px',
            gridBackground: '#ffffff',
            fontFamilyGrid: 'MODERN',
            boldGrid: true,
            gridShadow: '6px 6px 0px #000000', // Sombra dura y sólida
            gridEffects: {
                shadowEnabled: true,
                shadowColor: '#000000',
                shadowBlur: 0,
                shadowOffsetX: 6,
                shadowOffsetY: 6,
                outlineEnabled: true,
                outlineColor: '#000000',
                outlineWidth: 2
            }
        }
    },
    'KIDS': {
        icon: <Sparkles className="w-4 h-4" />,
        label: 'Infantil',
        config: {
            gridBorderColor: '#ff90e8',
            gridBorderWidth: '4px',
            gridRadius: '24px',
            gridBackground: '#fff0f5',
            fontFamilyGrid: 'FUN',
            boldGrid: true,
            gridShadow: '0 8px 0px #ff90e8',
            gridEffects: {
                shadowEnabled: true,
                shadowColor: '#ff90e8',
                shadowBlur: 0,
                shadowOffsetY: 8
            }
        }
    },
    'CLASSIC': {
        icon: <GraduationCap className="w-4 h-4" />,
        label: 'Clásico',
        config: {
            gridBorderColor: '#000000',
            gridBorderWidth: '1px',
            gridRadius: '0px',
            gridBackground: 'transparent',
            fontFamilyGrid: 'CLASSIC',
            boldGrid: false,
            gridShadow: 'none',
            gridEffects: { shadowEnabled: false }
        }
    }
};

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedElement, config, onUpdateConfig }) => {

    // Función para aplicar un preset
    const applyPreset = (presetKey: keyof typeof STYLE_PRESETS) => {
        const preset = STYLE_PRESETS[presetKey];
        // Hacemos un merge inteligente de las propiedades
        onUpdateConfig({
            ...preset.config as any
        });
    };

    const renderVocabularySection = () => (
        <CollapsibleSection title={`Vocabulario (${config.words?.length || 0})`} icon={List} defaultOpen={true}>
            <div className="space-y-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Añadir..."
                        className="flex-1 bg-cosmic-900 border border-glass-border rounded-l px-2 py-1 text-xs text-white outline-none"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const val = e.currentTarget.value.trim().toUpperCase().replace(/[^A-ZÑ]/g, '');
                                if (val) {
                                    onUpdateConfig({ words: [...(config.words || []), val] });
                                    e.currentTarget.value = '';
                                }
                            }
                        }}
                    />
                </div>
                <div className="flex flex-wrap gap-1 bg-cosmic-900/30 p-2 rounded border border-white/5 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {(config.words || []).map((w, i) => (
                        <span key={i} className="bg-cosmic-800 text-[9px] px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
                            {w}
                            <button className="hover:text-red-400" onClick={() => {
                                const newWords = [...(config.words || [])];
                                newWords.splice(i, 1);
                                onUpdateConfig({ words: newWords });
                            }}><X className="w-2 h-2" /></button>
                        </span>
                    ))}
                </div>
            </div>
        </CollapsibleSection>
    );

    const renderGlobalSettings = () => (
        <div className="space-y-6 p-5">
            {/* --- LAYOUT & MARGINS --- */}
            <CollapsibleSection title="Márgenes y Estructura" icon={Move} defaultOpen={true}>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        {['top', 'bottom', 'left', 'right'].map((m) => (
                            <div key={m}>
                                <label className="text-[10px] text-slate-500 capitalize">{m}</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.margins?.[m as keyof typeof config.margins] ?? 0.5}
                                    onChange={(e) => onUpdateConfig({
                                        margins: { ...config.margins, [m]: parseFloat(e.target.value) } as any
                                    })}
                                    className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </CollapsibleSection>

            {/* --- VISUAL STYLE --- */}
            <CollapsibleSection title="Estilo Visual" icon={Palette} defaultOpen={false}>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tema</label>
                        <select
                            value={config.designTheme || 'modern'}
                            onChange={(e) => onUpdateConfig({ designTheme: e.target.value as any })}
                            className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-xs text-white outline-none"
                        >
                            <option value="modern">Moderno</option>
                            <option value="classic">Clásico</option>
                            <option value="kids">Infantil</option>
                            <option value="minimal">Minimalista</option>
                            <option value="invisible">Invisible (AI v8)</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onUpdateConfig({ styleMode: 'color' })}
                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded border transition-colors ${config.styleMode === 'color' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-transparent border-slate-700 text-slate-500 hover:text-slate-300'}`}
                        >
                            Color
                        </button>
                        <button
                            onClick={() => onUpdateConfig({ styleMode: 'bw' })}
                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded border transition-colors ${config.styleMode === 'bw' ? 'bg-slate-200 border-white text-black' : 'bg-transparent border-slate-700 text-slate-500 hover:text-slate-300'}`}
                        >
                            B/N
                        </button>
                    </div>
                </div>
            </CollapsibleSection>

            {renderVocabularySection()}
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

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                {!selectedElement && renderGlobalSettings()}

                {/* Header / Title Settings */}
                {selectedElement === 'header' && (
                    <div className="space-y-6">
                        <CollapsibleSection title="Cabecera" icon={Type} defaultOpen={true}>
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
                                    <label className="text-xs font-bold text-slate-400 uppercase">Tipografía Cabecera</label>
                                    <select
                                        value={config.fontFamilyHeader || 'MODERN'}
                                        onChange={(e) => onUpdateConfig({ fontFamilyHeader: e.target.value as any })}
                                        className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                                    >
                                        <option value="CLASSIC">Clásica (Courier)</option>
                                        <option value="MODERN">Moderna (Montserrat)</option>
                                        <option value="FUN">Divertida (Comic Sans)</option>
                                        <option value="SCHOOL">Escolar (Times)</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-slate-400">Negrita</label>
                                    <button
                                        onClick={() => onUpdateConfig({ boldHeader: !config.boldHeader })}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${config.boldHeader ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform left-0.5 ${config.boldHeader ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Header Izquierda</label>
                                    <input
                                        type="text"
                                        value={config.headerLeft || ''}
                                        onChange={(e) => onUpdateConfig({ headerLeft: e.target.value })}
                                        placeholder="Ej: Dificultad: Fácil"
                                        className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Header Derecha (Opcional)</label>
                                    <input
                                        type="text"
                                        value={config.headerRight || ''}
                                        onChange={(e) => onUpdateConfig({ headerRight: e.target.value })}
                                        placeholder="Ej: Página 1 (dejar vacío si no se necesita)"
                                        className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </CollapsibleSection>

                        <EffectsPanel
                            effects={config.headerEffects || {}}
                            onChange={(effects) => onUpdateConfig({ headerEffects: effects })}
                            elementName="Header"
                        />
                    </div>
                )}

                {/* Grid Settings */}
                {selectedElement === 'grid' && (
                    <div className="space-y-6">
                        <CollapsibleSection title="Grilla" icon={Grid3X3} defaultOpen={true}>
                            <div className="space-y-4">
                                <div className="bg-cosmic-800/50 p-2 rounded-lg border border-white/5 space-y-2 mb-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                        <Zap className="w-3 h-3 text-yellow-400" /> Presets Rápidos
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(STYLE_PRESETS).map(([key, preset]) => (
                                            <button
                                                key={key}
                                                onClick={() => applyPreset(key as any)}
                                                className="flex items-center gap-2 px-2 py-2 rounded bg-cosmic-900 hover:bg-indigo-900/50 border border-white/5 hover:border-indigo-500/50 transition-all group"
                                            >
                                                <div className="p-1.5 rounded-md bg-white/5 text-slate-400 group-hover:text-white transition-colors">
                                                    {preset.icon}
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-300 group-hover:text-white">
                                                    {preset.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Tamaño Grilla (NxN)</label>
                                    <input
                                        type="number"
                                        min="5" max="30"
                                        value={config.gridSize}
                                        onChange={(e) => onUpdateConfig({ gridSize: parseInt(e.target.value) })}
                                        className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Tipografía Grilla</label>
                                    <select
                                        value={config.fontFamilyGrid || 'CLASSIC'}
                                        onChange={(e) => onUpdateConfig({ fontFamilyGrid: e.target.value as any })}
                                        className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                                    >
                                        <option value="CLASSIC">Clásica (Courier)</option>
                                        <option value="MODERN">Moderna (Montserrat)</option>
                                        <option value="FUN">Divertida (Comic Sans)</option>
                                        <option value="SCHOOL">Escolar (Times)</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-slate-400">Negrita</label>
                                    <button
                                        onClick={() => onUpdateConfig({ boldGrid: !config.boldGrid })}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${config.boldGrid ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform left-0.5 ${config.boldGrid ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-slate-400">Mostrar Solución</label>
                                    <button
                                        onClick={() => onUpdateConfig({ showSolution: !config.showSolution })}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${config.showSolution ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform left-0.5 ${config.showSolution ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-slate-400">Mostrar Bordes</label>
                                    <button
                                        onClick={() => onUpdateConfig({ showBorders: !config.showBorders })}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${config.showBorders ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform left-0.5 ${config.showBorders ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        </CollapsibleSection>

                        <EffectsPanel
                            effects={config.gridEffects || {}}
                            onChange={(effects) => onUpdateConfig({ gridEffects: effects })}
                            elementName="Grilla"
                        />
                    </div>
                )}

                {/* Word List Settings */}
                {selectedElement === 'wordList' && (
                    <div className="space-y-6">
                        <CollapsibleSection title="Tipografía" icon={Type} defaultOpen={true}>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Tipografía Lista</label>
                                <select
                                    value={config.fontFamilyWordList || 'MODERN'}
                                    onChange={(e) => onUpdateConfig({ fontFamilyWordList: e.target.value as any })}
                                    className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                                >
                                    <option value="CLASSIC">Clásica (Courier)</option>
                                    <option value="MODERN">Moderna (Montserrat)</option>
                                    <option value="FUN">Divertida (Comic Sans)</option>
                                    <option value="SCHOOL">Escolar (Times)</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-slate-400">Negrita</label>
                                <button
                                    onClick={() => onUpdateConfig({ boldWordList: !config.boldWordList })}
                                    className={`w-8 h-4 rounded-full transition-colors relative ${config.boldWordList ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform left-0.5 ${config.boldWordList ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </CollapsibleSection>

                        <EffectsPanel
                            effects={config.wordListEffects || {}}
                            onChange={(effects) => onUpdateConfig({ wordListEffects: effects })}
                            elementName="Lista de Palabras"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
