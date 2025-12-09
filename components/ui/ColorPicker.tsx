import React from 'react';

interface ColorPickerProps {
    label: string;
    value: string;
    onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[9px] font-medium text-white/60 uppercase tracking-wide truncate">{label}</label>
            <div className="flex items-center gap-1.5">
                <div className="relative flex-shrink-0">
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border border-white/20 hover:border-white/40 transition-colors appearance-none bg-transparent"
                        style={{ backgroundColor: value }}
                    />
                    <div
                        className="absolute inset-0.5 rounded-sm pointer-events-none"
                        style={{ backgroundColor: value }}
                    />
                </div>
                <input
                    type="text"
                    value={value.toUpperCase()}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                            onChange(val);
                        }
                    }}
                    className="w-full min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white font-mono focus:border-indigo-500/50 focus:outline-none transition-all"
                    placeholder="#FFF"
                />
            </div>
        </div>
    );
};

// Preset color palettes for quick selection
export const COLOR_PRESETS = [
    { name: 'Índigo', primary: '#6366f1', secondary: '#818cf8', text: '#1f2937', bg: '#f3f4f6' },
    { name: 'Esmeralda', primary: '#10b981', secondary: '#34d399', text: '#064e3b', bg: '#ecfdf5' },
    { name: 'Rosa', primary: '#ec4899', secondary: '#f472b6', text: '#831843', bg: '#fdf2f8' },
    { name: 'Ámbar', primary: '#f59e0b', secondary: '#fbbf24', text: '#78350f', bg: '#fffbeb' },
    { name: 'Cian', primary: '#06b6d4', secondary: '#22d3ee', text: '#164e63', bg: '#ecfeff' },
    { name: 'Violeta', primary: '#8b5cf6', secondary: '#a78bfa', text: '#4c1d95', bg: '#f5f3ff' },
    { name: 'Rojo', primary: '#ef4444', secondary: '#f87171', text: '#7f1d1d', bg: '#fef2f2' },
    { name: 'Azul', primary: '#3b82f6', secondary: '#60a5fa', text: '#1e3a8a', bg: '#eff6ff' },
];

interface ColorPresetButtonProps {
    preset: typeof COLOR_PRESETS[0];
    onClick: () => void;
    isActive: boolean;
}

export const ColorPresetButton: React.FC<ColorPresetButtonProps> = ({ preset, onClick, isActive }) => (
    <button
        onClick={onClick}
        className={`relative group flex flex-col items-center justify-center gap-0.5 p-1.5 rounded transition-all ${isActive
            ? 'bg-white/15 ring-1 ring-white/40'
            : 'hover:bg-white/5'
            }`}
        title={preset.name}
    >
        <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: preset.primary }} />
            <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: preset.secondary }} />
        </div>
        <span className="text-[7px] text-white/40 group-hover:text-white/70 truncate max-w-full">{preset.name}</span>
    </button>
);

