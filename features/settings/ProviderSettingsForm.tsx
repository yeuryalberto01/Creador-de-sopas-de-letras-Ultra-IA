import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { X, Cpu, Palette } from 'lucide-react';
import { AISettings } from '../../types';

interface ProviderSettingsFormProps {
    settings: AISettings;
    onUpdate: (newSettings: AISettings) => void;
    onClose?: () => void; // Made optional as it might not be used in all contexts
    title?: string; // Add title prop seen in usage
    icon?: any; // Add icon prop seen in usage
}

export const ProviderSettingsForm: React.FC<ProviderSettingsFormProps> = ({ settings, onUpdate, onClose, title, icon: Icon }) => {

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <GlassCard className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Cpu className="text-indigo-400" />
                        Configuración IA
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-indigo-400" /> Motor Lógico (Texto)
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="flex flex-col items-center p-3 rounded-lg border border-indigo-500/50 bg-indigo-500/10 text-indigo-200">
                                <span className="font-bold text-xs">Gemini 2.5 Flash</span>
                                <span className="text-[10px] opacity-70">Google</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-pink-400" /> Motor Creativo (Arte)
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="flex flex-col items-center p-3 rounded-lg border border-pink-500/50 bg-pink-500/10 text-pink-200">
                                <span className="font-bold text-xs">Imagen 4.0 Ultra</span>
                                <span className="text-[10px] opacity-70">Google</span>
                            </button>
                        </div>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/80">
                        Nota: Actualmente los proveedores están bloqueados por la configuración del servidor.
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors"
                    >
                        Guardar Cambios
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};
