import React, { useState } from 'react';
import { Beaker, Sparkles, TrendingUp, AlertTriangle, CheckCircle, XCircle, Search, Wand2 } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';

interface PredictionResult {
    success_probability: number;
    similar_examples: Array<{
        prompt: string;
        style: string;
        rating: number;
        similarity: number;
    }>;
    suggestions: string[];
    reasoning: string;
}

interface PromptLabProps {
    onTestComplete?: (result: PredictionResult) => void;
}

const API_URL = "http://localhost:8000/api/ml/smart";

export const PromptLab: React.FC<PromptLabProps> = ({ onTestComplete }) => {
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PredictionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handlePredict = async () => {
        if (!prompt.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, style })
            });

            if (!response.ok) throw new Error('Error en la predicción');

            const data = await response.json();
            setResult(data);
            onTestComplete?.(data);
        } catch (e) {
            console.error("Prediction error:", e);
            setError("No se pudo conectar con el motor de predicción");
        } finally {
            setLoading(false);
        }
    };

    const handleFindSimilar = async () => {
        if (!prompt.trim()) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/similar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, style })
            });

            if (response.ok) {
                const data = await response.json();
                setResult(prev => prev ? { ...prev, similar_examples: data.similar } : {
                    success_probability: 0,
                    similar_examples: data.similar,
                    suggestions: [],
                    reasoning: "Búsqueda de similitud"
                });
            }
        } catch (e) {
            console.error("Similarity search error:", e);
        } finally {
            setLoading(false);
        }
    };

    const getProbabilityColor = (prob: number) => {
        if (prob >= 0.7) return 'text-emerald-400';
        if (prob >= 0.4) return 'text-amber-400';
        return 'text-red-400';
    };

    const getProbabilityBg = (prob: number) => {
        if (prob >= 0.7) return 'from-emerald-600/30 to-emerald-600/10';
        if (prob >= 0.4) return 'from-amber-600/30 to-amber-600/10';
        return 'from-red-600/30 to-red-600/10';
    };

    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full custom-scrollbar">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-xl">
                        <Beaker className="w-6 h-6" />
                    </div>
                    Laboratorio de Prompts
                </h2>
                <p className="text-slate-400 mt-1">
                    Prueba tus prompts y predice su probabilidad de éxito
                </p>
            </div>

            {/* Input Section */}
            <GlassCard className="border-cyan-500/20">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                            Prompt a Analizar
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Escribe el prompt que quieres probar (ej: 'Genera una sopa de letras infantil con tema de animales')"
                            className="w-full h-32 bg-cosmic-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 outline-none resize-none"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                                Estilo (opcional)
                            </label>
                            <input
                                type="text"
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                placeholder="ej: cartoon, minimalista, educativo..."
                                className="w-full bg-cosmic-950 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handlePredict}
                            disabled={loading || !prompt.trim()}
                            className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <Wand2 className="w-5 h-5" />
                            {loading ? 'Analizando...' : 'Predecir Éxito'}
                        </button>
                        <button
                            onClick={handleFindSimilar}
                            disabled={loading || !prompt.trim()}
                            className="bg-cosmic-800 hover:bg-cosmic-700 text-slate-300 font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 border border-white/10"
                        >
                            <Search className="w-5 h-5" />
                            Buscar Similares
                        </button>
                    </div>
                </div>
            </GlassCard>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {/* Probability Card */}
                    <GlassCard className={`!p-0 overflow-hidden bg-gradient-to-br ${getProbabilityBg(result.success_probability)}`}>
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-slate-400 uppercase font-bold mb-1">
                                        Probabilidad de Éxito
                                    </div>
                                    <div className={`text-5xl font-bold ${getProbabilityColor(result.success_probability)}`}>
                                        {Math.round(result.success_probability * 100)}%
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2">{result.reasoning}</div>
                                </div>
                                <div className={`p-4 rounded-full ${getProbabilityColor(result.success_probability)} bg-current/10`}>
                                    {result.success_probability >= 0.7 ? (
                                        <CheckCircle className="w-12 h-12" />
                                    ) : result.success_probability >= 0.4 ? (
                                        <AlertTriangle className="w-12 h-12" />
                                    ) : (
                                        <XCircle className="w-12 h-12" />
                                    )}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-4 h-3 bg-black/30 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${result.success_probability >= 0.7 ? 'bg-emerald-500' :
                                            result.success_probability >= 0.4 ? 'bg-amber-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${result.success_probability * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Suggestions */}
                    {result.suggestions.length > 0 && (
                        <GlassCard>
                            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                                Sugerencias del Sistema
                            </h3>
                            <div className="space-y-2">
                                {result.suggestions.map((suggestion, idx) => (
                                    <div key={idx} className="bg-cosmic-950 rounded-lg p-3 border border-white/5 text-sm text-slate-300">
                                        {suggestion}
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    )}

                    {/* Similar Examples */}
                    {result.similar_examples.length > 0 && (
                        <GlassCard>
                            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-400" />
                                Ejemplos Similares
                            </h3>
                            <div className="space-y-2">
                                {result.similar_examples.map((example, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${example.rating > 0
                                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                                : 'bg-red-500/5 border-red-500/20'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-white truncate">{example.prompt}</div>
                                            <div className="text-xs text-slate-500">{example.style}</div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                            <span className="text-xs text-slate-500">
                                                {Math.round(example.similarity * 100)}% similar
                                            </span>
                                            <div className={`px-2 py-1 rounded text-xs font-bold ${example.rating > 0
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {example.rating > 0 ? 'ÉXITO' : 'FALLO'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!result && !loading && (
                <div className="text-center py-16 text-slate-500">
                    <Beaker className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Escribe un prompt y haz clic en "Predecir Éxito"</p>
                    <p className="text-xs mt-2">El sistema analizará patrones de tus entrenamientos anteriores</p>
                </div>
            )}
        </div>
    );
};
