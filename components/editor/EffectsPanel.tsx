import React, { useState } from 'react';
import { ElementEffects } from '../../types';
import {
    Sparkles, Sun, Square, RotateCw, Eye,
    ChevronDown, ChevronRight, Palette, Droplets,
    Maximize2, CircleDot
} from 'lucide-react';

interface EffectsPanelProps {
    effects: ElementEffects;
    onChange: (effects: ElementEffects) => void;
    elementName: string;
}

// 🎨 Preset de colores vibrantes
const COLOR_PRESETS = [
    '#000000', '#374151', '#6366f1', '#8b5cf6', '#ec4899',
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6'
];

// ✨ Card de Efecto Colapsable
const EffectCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    enabled: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    color: string;
}> = ({ title, icon, enabled, onToggle, children, color }) => {
    const [isOpen, setIsOpen] = useState(enabled);

    return (
        <div
            className={`
                relative overflow-hidden rounded-xl border transition-all duration-300
                ${enabled
                    ? 'border-white/20 bg-gradient-to-br from-white/10 to-white/5'
                    : 'border-white/5 bg-white/5 hover:bg-white/10'}
            `}
        >
            {/* Glow effect when enabled */}
            {enabled && (
                <div
                    className="absolute inset-0 opacity-20 blur-xl"
                    style={{ background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)` }}
                />
            )}

            {/* Header */}
            <button
                onClick={() => { setIsOpen(!isOpen); if (!enabled) onToggle(); }}
                className="relative w-full flex items-center justify-between p-3 text-left group"
            >
                <div className="flex items-center gap-3">
                    <div
                        className={`
                            p-2 rounded-lg transition-all duration-300
                            ${enabled
                                ? 'bg-gradient-to-br from-white/20 to-white/10 shadow-lg'
                                : 'bg-white/5 group-hover:bg-white/10'}
                        `}
                        style={{ boxShadow: enabled ? `0 4px 20px ${color}40` : 'none' }}
                    >
                        <div style={{ color: enabled ? color : '#94a3b8' }}>
                            {icon}
                        </div>
                    </div>
                    <span className={`font-semibold text-sm ${enabled ? 'text-white' : 'text-slate-400'}`}>
                        {title}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Toggle Switch */}
                    <div
                        onClick={(e) => { e.stopPropagation(); onToggle(); }}
                        className={`
                            relative w-10 h-5 rounded-full cursor-pointer transition-all duration-300
                            ${enabled ? 'bg-gradient-to-r' : 'bg-slate-700'}
                        `}
                        style={{
                            background: enabled
                                ? `linear-gradient(90deg, ${color}, ${color}cc)`
                                : undefined
                        }}
                    >
                        <div
                            className={`
                                absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-lg
                                transition-transform duration-300
                                ${enabled ? 'translate-x-5' : 'translate-x-0.5'}
                            `}
                        />
                    </div>

                    {/* Expand Arrow */}
                    <div className={`transition-transform duration-300 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                    </div>
                </div>
            </button>

            {/* Content */}
            <div
                className={`
                    overflow-hidden transition-all duration-300
                    ${isOpen && enabled ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
                `}
            >
                <div className="px-3 pb-3 space-y-3 relative">
                    {children}
                </div>
            </div>
        </div>
    );
};

// 🎚️ Slider Premium
const PremiumSlider: React.FC<{
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    label: string;
    unit?: string;
    color?: string;
}> = ({ value, min, max, onChange, label, unit = '', color = '#6366f1' }) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-slate-400">{label}</span>
                <span className="text-white font-mono">{value}{unit}</span>
            </div>
            <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
                    style={{
                        width: `${percentage}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`
                    }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 transition-all duration-150"
                    style={{ left: `calc(${percentage}% - 8px)`, borderColor: color }}
                />
            </div>
        </div>
    );
};

// 🎨 Color Picker Premium
const ColorPicker: React.FC<{
    value: string;
    onChange: (color: string) => void;
    label: string;
}> = ({ value, onChange, label }) => {
    return (
        <div className="space-y-2">
            <span className="text-xs text-slate-400">{label}</span>
            <div className="flex gap-1.5 flex-wrap">
                {COLOR_PRESETS.map((color) => (
                    <button
                        key={color}
                        onClick={() => onChange(color)}
                        className={`
                            w-6 h-6 rounded-lg transition-all duration-200
                            ${value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-110'}
                        `}
                        style={{ backgroundColor: color }}
                    />
                ))}
                {/* Custom Color */}
                <div className="relative">
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute inset-0 w-6 h-6 opacity-0 cursor-pointer"
                    />
                    <div
                        className="w-6 h-6 rounded-lg border-2 border-dashed border-slate-500 flex items-center justify-center"
                        style={{ backgroundColor: value }}
                    >
                        <Palette className="w-3 h-3 text-slate-400" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🎛️ Panel Principal de Efectos
export const EffectsPanel: React.FC<EffectsPanelProps> = ({ effects, onChange, elementName }) => {
    const updateEffect = (key: keyof ElementEffects, value: any) => {
        onChange({ ...effects, [key]: value });
    };

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Efectos Visuales
                </span>
            </div>

            {/* Shadow Effect */}
            <EffectCard
                title="Sombra"
                icon={<Sun className="w-4 h-4" />}
                enabled={effects.shadowEnabled || false}
                onToggle={() => updateEffect('shadowEnabled', !effects.shadowEnabled)}
                color="#f97316"
            >
                <PremiumSlider
                    label="Desenfoque"
                    value={effects.shadowBlur || 10}
                    min={0}
                    max={50}
                    onChange={(v) => updateEffect('shadowBlur', v)}
                    unit="px"
                    color="#f97316"
                />
                <PremiumSlider
                    label="Desplazamiento X"
                    value={effects.shadowOffsetX || 0}
                    min={-30}
                    max={30}
                    onChange={(v) => updateEffect('shadowOffsetX', v)}
                    unit="px"
                    color="#f97316"
                />
                <PremiumSlider
                    label="Desplazamiento Y"
                    value={effects.shadowOffsetY || 5}
                    min={-30}
                    max={30}
                    onChange={(v) => updateEffect('shadowOffsetY', v)}
                    unit="px"
                    color="#f97316"
                />
                <ColorPicker
                    label="Color de Sombra"
                    value={effects.shadowColor || '#000000'}
                    onChange={(c) => updateEffect('shadowColor', c)}
                />
            </EffectCard>

            {/* Outline Effect */}
            <EffectCard
                title="Contorno"
                icon={<Square className="w-4 h-4" />}
                enabled={effects.outlineEnabled || false}
                onToggle={() => updateEffect('outlineEnabled', !effects.outlineEnabled)}
                color="#6366f1"
            >
                <PremiumSlider
                    label="Grosor"
                    value={effects.outlineWidth || 2}
                    min={1}
                    max={10}
                    onChange={(v) => updateEffect('outlineWidth', v)}
                    unit="px"
                    color="#6366f1"
                />
                <ColorPicker
                    label="Color del Contorno"
                    value={effects.outlineColor || '#6366f1'}
                    onChange={(c) => updateEffect('outlineColor', c)}
                />
                <div className="space-y-1">
                    <span className="text-xs text-slate-400">Estilo</span>
                    <div className="flex gap-2">
                        {(['solid', 'dashed', 'dotted', 'double'] as const).map((style) => (
                            <button
                                key={style}
                                onClick={() => updateEffect('outlineStyle', style)}
                                className={`
                                    px-3 py-1 text-xs rounded-lg border transition-all
                                    ${effects.outlineStyle === style
                                        ? 'bg-indigo-500/20 border-indigo-500 text-white'
                                        : 'border-slate-600 text-slate-400 hover:border-slate-500'}
                                `}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>
            </EffectCard>

            {/* Background Effect */}
            <EffectCard
                title="Fondo"
                icon={<Droplets className="w-4 h-4" />}
                enabled={effects.backgroundEnabled || false}
                onToggle={() => updateEffect('backgroundEnabled', !effects.backgroundEnabled)}
                color="#22c55e"
            >
                <ColorPicker
                    label="Color de Fondo"
                    value={effects.backgroundColor || '#ffffff'}
                    onChange={(c) => updateEffect('backgroundColor', c)}
                />
                <PremiumSlider
                    label="Opacidad"
                    value={effects.backgroundOpacity ?? 100}
                    min={0}
                    max={100}
                    onChange={(v) => updateEffect('backgroundOpacity', v)}
                    unit="%"
                    color="#22c55e"
                />
                <PremiumSlider
                    label="Bordes Redondeados"
                    value={effects.borderRadius || 0}
                    min={0}
                    max={30}
                    onChange={(v) => updateEffect('borderRadius', v)}
                    unit="px"
                    color="#22c55e"
                />
            </EffectCard>

            {/* Transform Effect */}
            <EffectCard
                title="Transformar"
                icon={<RotateCw className="w-4 h-4" />}
                enabled={(effects.rotation !== 0 && effects.rotation !== undefined) ||
                    (effects.scale !== 1 && effects.scale !== undefined)}
                onToggle={() => {
                    if (effects.rotation === 0 || effects.rotation === undefined) {
                        updateEffect('rotation', 0);
                    }
                }}
                color="#ec4899"
            >
                <PremiumSlider
                    label="Rotación"
                    value={effects.rotation || 0}
                    min={-45}
                    max={45}
                    onChange={(v) => updateEffect('rotation', v)}
                    unit="°"
                    color="#ec4899"
                />
                <PremiumSlider
                    label="Escala"
                    value={(effects.scale || 1) * 100}
                    min={50}
                    max={150}
                    onChange={(v) => updateEffect('scale', v / 100)}
                    unit="%"
                    color="#ec4899"
                />
            </EffectCard>

            {/* Opacity Effect */}
            <EffectCard
                title="Visibilidad"
                icon={<Eye className="w-4 h-4" />}
                enabled={effects.opacity !== undefined && effects.opacity !== 100}
                onToggle={() => updateEffect('opacity', effects.opacity === 100 ? 80 : 100)}
                color="#14b8a6"
            >
                <PremiumSlider
                    label="Opacidad General"
                    value={effects.opacity ?? 100}
                    min={0}
                    max={100}
                    onChange={(v) => updateEffect('opacity', v)}
                    unit="%"
                    color="#14b8a6"
                />
                <PremiumSlider
                    label="Desenfoque"
                    value={effects.blur || 0}
                    min={0}
                    max={10}
                    onChange={(v) => updateEffect('blur', v)}
                    unit="px"
                    color="#14b8a6"
                />
            </EffectCard>
        </div>
    );
};

export default EffectsPanel;
