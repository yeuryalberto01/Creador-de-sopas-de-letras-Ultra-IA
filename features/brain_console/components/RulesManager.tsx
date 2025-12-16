import React, { useState, useEffect } from 'react';
import { ScrollText, Plus, Trash2, Power, Sparkles, AlertCircle, Info, Eye, EyeOff, Lightbulb } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';

interface Rule {
    id: string;
    type: 'global' | 'visual' | 'logic' | 'tone';
    content: string;
    active: boolean;
}

interface RuleSuggestion {
    type: string;
    content: string;
    confidence: number;
}

interface RulesManagerProps {
    rules: Rule[];
    onAddRule: (rule: Omit<Rule, 'id'>) => void;
    onDeleteRule: (id: string) => void;
    onToggleRule?: (id: string, active: boolean) => void;
    onRefresh: () => void;
}

const RULES_API_URL = "http://localhost:8000/api/brain";
const SMART_API_URL = "http://localhost:8000/api/ml/smart";

const RULE_TYPES = [
    { value: 'global', label: 'Global', color: 'indigo', description: 'Aplica a todas las generaciones' },
    { value: 'visual', label: 'Visual', color: 'pink', description: 'Afecta estilos y apariencia' },
    { value: 'logic', label: 'Lógica', color: 'blue', description: 'Controla comportamiento' },
    { value: 'tone', label: 'Tono', color: 'amber', description: 'Define el estilo de comunicación' }
];

export const RulesManager: React.FC<RulesManagerProps> = ({
    rules,
    onAddRule,
    onDeleteRule,
    onToggleRule,
    onRefresh
}) => {
    const [activeTab, setActiveTab] = useState<string>('all');
    const [newRuleContent, setNewRuleContent] = useState('');
    const [newRuleType, setNewRuleType] = useState<'global' | 'visual' | 'logic' | 'tone'>('global');
    const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [showInactive, setShowInactive] = useState(true);

    useEffect(() => {
        loadSuggestions();
    }, []);

    const loadSuggestions = async () => {
        setLoadingSuggestions(true);
        try {
            const res = await fetch(`${SMART_API_URL}/suggest-rules`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data.suggestions || []);
            }
        } catch (e) {
            console.error("Error loading suggestions:", e);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleAddRule = async () => {
        if (!newRuleContent.trim()) return;
        onAddRule({
            type: newRuleType,
            content: newRuleContent,
            active: true
        });
        setNewRuleContent('');
    };

    const handleToggleRule = async (rule: Rule) => {
        try {
            await fetch(`${RULES_API_URL}/rules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...rule, active: !rule.active })
            });
            onRefresh();
        } catch (e) {
            console.error("Toggle error:", e);
        }
    };

    const handleApplySuggestion = (suggestion: RuleSuggestion) => {
        setNewRuleType(suggestion.type as any);
        setNewRuleContent(suggestion.content);
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'global': return 'bg-indigo-500';
            case 'visual': return 'bg-pink-500';
            case 'logic': return 'bg-blue-500';
            case 'tone': return 'bg-amber-500';
            default: return 'bg-slate-500';
        }
    };

    const getTypeBorder = (type: string) => {
        switch (type) {
            case 'global': return 'border-indigo-500/30 hover:border-indigo-500/60';
            case 'visual': return 'border-pink-500/30 hover:border-pink-500/60';
            case 'logic': return 'border-blue-500/30 hover:border-blue-500/60';
            case 'tone': return 'border-amber-500/30 hover:border-amber-500/60';
            default: return 'border-slate-500/30';
        }
    };

    const filteredRules = rules.filter(r => {
        if (activeTab !== 'all' && r.type !== activeTab) return false;
        if (!showInactive && !r.active) return false;
        return true;
    });

    const rulesByType = {
        all: rules.length,
        global: rules.filter(r => r.type === 'global').length,
        visual: rules.filter(r => r.type === 'visual').length,
        logic: rules.filter(r => r.type === 'logic').length,
        tone: rules.filter(r => r.type === 'tone').length
    };

    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-600 to-green-600 rounded-xl">
                            <ScrollText className="w-6 h-6" />
                        </div>
                        Gestor de Reglas
                    </h2>
                    <p className="text-slate-400 mt-1">Define las directivas que guiarán a la IA</p>
                </div>
                <button
                    onClick={() => setShowInactive(!showInactive)}
                    className="flex items-center gap-2 px-3 py-2 bg-cosmic-800 hover:bg-cosmic-700 rounded-lg border border-white/10 text-sm text-slate-400 transition-colors"
                >
                    {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {showInactive ? 'Mostrando todas' : 'Solo activas'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-cosmic-900 rounded-xl">
                {[
                    { value: 'all', label: 'Todas' },
                    ...RULE_TYPES.map(t => ({ value: t.value, label: t.label }))
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab.value
                                ? 'bg-emerald-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab.label}
                        <span className="bg-black/20 px-1.5 rounded text-xs">
                            {rulesByType[tab.value as keyof typeof rulesByType]}
                        </span>
                    </button>
                ))}
            </div>

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
                <GlassCard className="border-amber-500/20">
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-400" />
                        Sugerencias del Sistema
                        <span className="text-xs text-amber-400/60 font-normal ml-2">
                            (basadas en patrones de fallo)
                        </span>
                    </h3>
                    <div className="space-y-2">
                        {suggestions.map((s, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg hover:border-amber-500/40 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${getTypeColor(s.type)}`}></div>
                                    <span className="text-sm text-slate-300">{s.content}</span>
                                </div>
                                <button
                                    onClick={() => handleApplySuggestion(s)}
                                    className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded transition-all"
                                >
                                    Usar
                                </button>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}

            {/* New Rule Input */}
            <GlassCard>
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-400" />
                    Nueva Regla
                </h3>
                <div className="space-y-4">
                    {/* Type Selector */}
                    <div className="grid grid-cols-4 gap-2">
                        {RULE_TYPES.map(t => (
                            <button
                                key={t.value}
                                onClick={() => setNewRuleType(t.value as any)}
                                className={`p-3 rounded-lg border-2 transition-all ${newRuleType === t.value
                                        ? `${getTypeBorder(t.value)} bg-white/5`
                                        : 'border-transparent bg-cosmic-950 hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center gap-2 justify-center">
                                    <div className={`w-3 h-3 rounded-full ${getTypeColor(t.value)}`}></div>
                                    <span className="text-sm font-bold text-white">{t.label}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">{t.description}</div>
                            </button>
                        ))}
                    </div>

                    {/* Content Input */}
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newRuleContent}
                            onChange={(e) => setNewRuleContent(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                            placeholder="Escribe la directiva (ej: 'Los puzzles infantiles deben usar colores brillantes y alegres')"
                            className="flex-1 bg-cosmic-950 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                        />
                        <button
                            onClick={handleAddRule}
                            disabled={!newRuleContent.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-6 rounded-lg transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </GlassCard>

            {/* Rules List */}
            <div className="space-y-2">
                {filteredRules.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                        <Info className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No hay reglas en esta categoría</p>
                        <p className="text-xs mt-1">Añade una regla arriba para comenzar</p>
                    </div>
                ) : (
                    filteredRules.map(rule => (
                        <div
                            key={rule.id}
                            className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${rule.active
                                    ? `bg-white/5 ${getTypeBorder(rule.type)}`
                                    : 'bg-cosmic-950 border-white/5 opacity-50'
                                }`}
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getTypeColor(rule.type)}`}></div>
                                <div className="flex-1 min-w-0">
                                    <span className={`text-sm ${rule.active ? 'text-white' : 'text-slate-500'}`}>
                                        {rule.content}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] uppercase font-bold text-slate-500">{rule.type}</span>
                                        {!rule.active && (
                                            <span className="text-[10px] bg-slate-800 px-1.5 rounded text-slate-500">
                                                INACTIVA
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleToggleRule(rule)}
                                    className={`p-2 rounded-lg transition-colors ${rule.active
                                            ? 'hover:bg-amber-500/20 text-amber-400'
                                            : 'hover:bg-emerald-500/20 text-emerald-400'
                                        }`}
                                    title={rule.active ? 'Desactivar' : 'Activar'}
                                >
                                    <Power className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onDeleteRule(rule.id)}
                                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
