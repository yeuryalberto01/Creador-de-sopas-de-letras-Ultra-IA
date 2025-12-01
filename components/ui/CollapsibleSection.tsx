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
        <div className={`border border-white/5 rounded-xl overflow-hidden bg-white/5 ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left"
            >
                <div className="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider">
                    {Icon && <Icon className="w-4 h-4 text-indigo-400" />}
                    {title}
                </div>
                {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
            </button>

            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="p-3 pt-0 border-t border-white/5">
                    {children}
                </div>
            </div>
        </div>
    );
};
