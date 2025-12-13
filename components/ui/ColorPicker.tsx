import React from 'react';

interface ColorPickerProps {
    label: string;
    value: string;
    onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {

    // Helper to safely convert any format to Hex for the input
    const getSafeHex = (colorVal: string): string => {
        if (!colorVal) return "#000000";
        if (colorVal.startsWith('#')) return colorVal;

        if (colorVal.startsWith('hsl')) {
            try {
                // Parse HSL: hsl(345, 70%, 40%)
                const matches = colorVal.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
                if (matches) {
                    const h = parseInt(matches[1]);
                    const s = parseInt(matches[2]);
                    const l = parseInt(matches[3]);

                    const lVal = l / 100;
                    const a = s * Math.min(lVal, 1 - lVal) / 100;
                    const f = (n: number) => {
                        const k = (n + h / 30) % 12;
                        const color = lVal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                        return Math.round(255 * color).toString(16).padStart(2, '0');
                    };
                    return `#${f(0)}${f(8)}${f(4)}`;
                }
            } catch (e) {
                console.warn("Error converting HSL to Hex", e);
            }
        }
        return "#000000"; // Fallback
    };

    return (
        <div className="flex flex-col gap-1">
            <label className="text-[9px] font-medium text-white/60 uppercase tracking-wide truncate">{label}</label>
            <div className="flex items-center gap-1.5">
                <div className="relative flex-shrink-0">
                    <input
                        type="color"
                        value={getSafeHex(value)}
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
                        // Allow typing HSL or Hex
                        onChange(val);
                    }}
                    className="w-full min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white font-mono focus:border-indigo-500/50 focus:outline-none transition-all"
                    placeholder="#FFF or hsl(...)"
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

