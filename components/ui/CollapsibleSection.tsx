import React, { useState } from 'react';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    defaultOpen?: boolean;
    className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    icon: Icon,
    children,
    defaultOpen = true,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`border border-white/10 rounded-xl overflow-hidden bg-cosmic-900/40 backdrop-blur-sm transition-all duration-300 ${isOpen ? 'shadow-lg shadow-black/20' : ''} ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-3 transition-colors text-left group ${isOpen ? 'bg-white/5' : 'hover:bg-white/5'}`}
            >
                <div className="flex items-center gap-3 text-slate-300 font-bold text-xs uppercase tracking-wider group-hover:text-white transition-colors">
                    {Icon && <Icon className={`w-4 h-4 transition-colors ${isOpen ? 'text-accent-400' : 'text-slate-500 group-hover:text-accent-400'}`} />}
                    {title}
                </div>
                {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-accent-400" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                )}
            </button>

            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="p-4 pt-2 border-t border-white/5 space-y-4">
                    {children}
                </div>
            </div>
        </div>
    );
};
