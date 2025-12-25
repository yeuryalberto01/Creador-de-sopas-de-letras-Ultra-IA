import React from 'react';

interface MarginControlProps {
    label: string;
    value: number;
    max: number;
    onChange: (val: number) => void;
}

export const MarginControl: React.FC<MarginControlProps> = ({ label, value, max, onChange }) => {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                <span>{label}</span>
                <span className="text-indigo-400">{value.toFixed(1)}"</span>
            </div>
            <input
                type="range"
                min="0.1"
                max={max}
                step="0.1"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 block hover:bg-slate-700 transition-colors"
            />
        </div>
    );
};
