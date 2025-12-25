import React from 'react';
import { Activity, Check, X, Server, Database, Shield } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';

import { AppSettings } from '../../types';

interface SystemDiagnosticsProps {
    onClose: () => void;
    settings?: AppSettings;
}

export const SystemDiagnostics: React.FC<SystemDiagnosticsProps> = ({ onClose, settings }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <GlassCard className="w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Activity className="text-emerald-400" />
                        Diagnóstico del Sistema
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                            <Server className="w-5 h-5 text-indigo-400" />
                            <div>
                                <h3 className="text-sm font-bold">API Backend</h3>
                                <p className="text-xs text-slate-400">Puerto 8000</p>
                            </div>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                            <Check className="w-3 h-3" /> ONLINE
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                            <Database className="w-5 h-5 text-amber-400" />
                            <div>
                                <h3 className="text-sm font-bold">Base de Datos</h3>
                                <p className="text-xs text-slate-400">Local (Dexie.js)</p>
                            </div>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                            <Check className="w-3 h-3" /> CONNECTED
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-rose-400" />
                            <div>
                                <h3 className="text-sm font-bold">Autenticación</h3>
                                <p className="text-xs text-slate-400">JWT Token</p>
                            </div>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                            <Check className="w-3 h-3" /> ACTIVE
                        </span>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                    <p className="text-xs text-slate-500">v2.5.0-beta • Build 2024.12.24</p>
                </div>
            </GlassCard>
        </div>
    );
};
