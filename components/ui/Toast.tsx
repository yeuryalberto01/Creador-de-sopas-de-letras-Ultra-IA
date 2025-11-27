import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const styles = {
        success: 'bg-emerald-500/20 border-emerald-500 text-emerald-200',
        error: 'bg-red-500/20 border-red-500 text-red-200',
        info: 'bg-blue-500/20 border-blue-500 text-blue-200',
        warning: 'bg-amber-500/20 border-amber-500 text-amber-200'
    };

    const icons = {
        success: <CheckCircle2 className="w-5 h-5" />,
        error: <AlertCircle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />,
        warning: <AlertTriangle className="w-5 h-5" />
    };

    return (
        <div className={`
      flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl
      animate-slide-up min-w-[300px]
      ${styles[type]}
    `}>
            {icons[type]}
            <span className="text-sm font-medium flex-1">{message}</span>
            <button onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
