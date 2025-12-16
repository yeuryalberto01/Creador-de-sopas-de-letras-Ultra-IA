import React from 'react';
import { BarChart3, TrendingUp, Brain, Zap, Activity, Sparkles } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';

interface BrainStats {
    count: number;
    success_rate: number;
    total_size_mb: number;
}

interface SmartHealth {
    status: string;
    ml_enabled: boolean;
    embeddings_cached: number;
    model: string;
}

interface Insight {
    pattern_name: string;
    count: number;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
}

interface BrainDashboardProps {
    stats: BrainStats;
    rulesCount: number;
    onRefresh: () => void;
}

const API_URL = "http://localhost:8000/api/ml/smart";

export const BrainDashboard: React.FC<BrainDashboardProps> = ({ stats, rulesCount, onRefresh }) => {
    const [health, setHealth] = React.useState<SmartHealth | null>(null);
    const [insights, setInsights] = React.useState<Insight[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load health status
            const healthRes = await fetch(`${API_URL}/health`);
            if (healthRes.ok) {
                setHealth(await healthRes.json());
            }

            // Load insights
            const insightsRes = await fetch(`${API_URL}/insights`);
            if (insightsRes.ok) {
                const data = await insightsRes.json();
                setInsights(data.insights || []);
            }
        } catch (e) {
            console.error("Dashboard data error:", e);
        } finally {
            setLoading(false);
        }
    };

    const getImpactColor = (impact: string) => {
        switch (impact) {
            case 'positive': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
            case 'negative': return 'text-red-400 bg-red-500/10 border-red-500/30';
            default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
        }
    };

    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        Dashboard de Inteligencia
                    </h2>
                    <p className="text-slate-400 mt-1">Métricas en tiempo real del sistema de aprendizaje</p>
                </div>
                <button
                    onClick={() => { loadData(); onRefresh(); }}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                >
                    <Sparkles className="w-4 h-4" /> Actualizar
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
                <GlassCard className="!p-0 overflow-hidden">
                    <div className="p-4 bg-gradient-to-br from-violet-600/20 to-transparent">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-3xl font-bold text-white">{rulesCount}</div>
                                <div className="text-sm text-slate-400">Reglas Activas</div>
                            </div>
                            <Brain className="w-10 h-10 text-violet-400 opacity-50" />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="!p-0 overflow-hidden">
                    <div className="p-4 bg-gradient-to-br from-indigo-600/20 to-transparent">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-3xl font-bold text-white">{stats.count}</div>
                                <div className="text-sm text-slate-400">Memorias</div>
                            </div>
                            <Activity className="w-10 h-10 text-indigo-400 opacity-50" />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="!p-0 overflow-hidden">
                    <div className="p-4 bg-gradient-to-br from-emerald-600/20 to-transparent">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-3xl font-bold text-white">{stats.success_rate}%</div>
                                <div className="text-sm text-slate-400">Tasa de Éxito</div>
                            </div>
                            <TrendingUp className="w-10 h-10 text-emerald-400 opacity-50" />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="!p-0 overflow-hidden">
                    <div className="p-4 bg-gradient-to-br from-amber-600/20 to-transparent">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-3xl font-bold text-white">
                                    {health?.ml_enabled ? 'ON' : 'OFF'}
                                </div>
                                <div className="text-sm text-slate-400">Motor ML</div>
                            </div>
                            <Zap className={`w-10 h-10 ${health?.ml_enabled ? 'text-amber-400' : 'text-slate-600'} opacity-50`} />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* ML Status */}
            {health && (
                <GlassCard>
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" />
                        Estado del Motor Inteligente
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-cosmic-950 rounded-lg p-4 border border-white/5">
                            <div className="text-xs text-slate-500 uppercase mb-1">Estado</div>
                            <div className={`flex items-center gap-2 ${health.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                <div className={`w-2 h-2 rounded-full animate-pulse ${health.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                                {health.status === 'healthy' ? 'Saludable' : 'Degradado'}
                            </div>
                        </div>
                        <div className="bg-cosmic-950 rounded-lg p-4 border border-white/5">
                            <div className="text-xs text-slate-500 uppercase mb-1">Modelo</div>
                            <div className="text-white font-mono text-sm truncate">{health.model}</div>
                        </div>
                        <div className="bg-cosmic-950 rounded-lg p-4 border border-white/5">
                            <div className="text-xs text-slate-500 uppercase mb-1">Cache Embeddings</div>
                            <div className="text-white">{health.embeddings_cached} vectores</div>
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* Insights */}
            <GlassCard>
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    Patrones Detectados
                </h3>
                {loading ? (
                    <div className="text-center py-8 text-slate-500">Analizando patrones...</div>
                ) : insights.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-lg">
                        No hay suficientes datos para detectar patrones. ¡Continúa entrenando!
                    </div>
                ) : (
                    <div className="space-y-2">
                        {insights.map((insight, idx) => (
                            <div
                                key={idx}
                                className={`flex items-center justify-between p-3 rounded-lg border ${getImpactColor(insight.impact)}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${insight.impact === 'positive' ? 'bg-emerald-400' :
                                            insight.impact === 'negative' ? 'bg-red-400' : 'bg-slate-400'
                                        }`}></div>
                                    <span className="text-sm">{insight.description}</span>
                                </div>
                                <span className="text-xs font-mono opacity-60">{insight.count} ejemplos</span>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>

            {/* Success Rate Visualization */}
            <GlassCard>
                <h3 className="font-bold text-white mb-4">Rendimiento del Sistema</h3>
                <div className="relative h-8 bg-cosmic-950 rounded-full overflow-hidden">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000"
                        style={{ width: `${stats.success_rate}%` }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                        {stats.success_rate}% Éxitos
                    </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">
                    Basado en {stats.count} memorias de entrenamiento
                </p>
            </GlassCard>
        </div>
    );
};
