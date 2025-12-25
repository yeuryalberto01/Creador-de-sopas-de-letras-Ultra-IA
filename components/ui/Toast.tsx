import React, { useEffect } from 'react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';
import { ToastType } from '../../types';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <Check className="w-4 h-4 text-emerald-400" />;
            case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
            case 'info': return <Info className="w-4 h-4 text-blue-400" />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200';
            case 'error': return 'bg-red-500/10 border-red-500/20 text-red-200';
            case 'warning': return 'bg-amber-500/10 border-amber-500/20 text-amber-200';
            case 'info': return 'bg-blue-500/10 border-blue-500/20 text-blue-200';
        }
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-bottom-4 ${getColors()}`}>
            {getIcon()}
            <span className="text-sm font-medium">{message}</span>
            <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors ml-2">
                <X className="w-3 h-3" />
            </button>
        </div>
    );
};
