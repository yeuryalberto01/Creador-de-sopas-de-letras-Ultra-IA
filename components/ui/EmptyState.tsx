import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, actionLabel, onAction, className = '' }) => {
    return (
        <div className={`col-span-full flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in duration-500 ${className}`}>
            <div className="bg-white/5 p-4 rounded-full mb-4 ring-1 ring-white/10 shadow-inner">
                <Icon className="w-8 h-8 text-slate-400 opacity-60" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-1">{title}</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto mb-6 leading-relaxed">{description}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};
