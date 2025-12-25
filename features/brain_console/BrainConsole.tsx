import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import {
    Brain,
    BarChart3,
    Beaker,
    ScrollText,
    Database,
    Layout,
    Book,
    ArrowLeft,
    Trash2,
    Sparkles,
    Zap
} from 'lucide-react';
import { CustomTemplate, SavedPuzzleRecord, Difficulty } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { getCustomTemplates, deleteCustomTemplate, getLibrary, deletePuzzleFromLibrary } from '../../services/storageService';
import { useNavigate } from 'react-router-dom';

// Import subcomponents
import { BrainDashboard } from './components/BrainDashboard';
import { PromptLab } from './components/PromptLab';
import { RulesManager } from './components/RulesManager';
import { MemoryExplorer } from './components/MemoryExplorer';

interface TrainingLog {
    prompt: string;
    image_path: string;
    style: string;
    rating: number;
    timestamp: number;
    meta?: any;
    _filename: string;
}

interface BrainStats {
    count: number;
    success_rate: number;
    total_size_mb: number;
}

interface Rule {
    id: string;
    type: 'global' | 'visual' | 'logic' | 'tone';
    content: string;
    active: boolean;
}

const ML_API_URL = "http://localhost:8000/api/ml";
const RULES_API_URL = "http://localhost:8000/api/brain";

type ModuleType = 'dashboard' | 'lab' | 'rules' | 'memory' | 'templates' | 'archive';

const MODULES = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: 'from-violet-600 to-indigo-600' },
    { id: 'lab', label: 'Prompt Lab', icon: Beaker, color: 'from-cyan-600 to-teal-600' },
    { id: 'rules', label: 'Reglas', icon: ScrollText, color: 'from-emerald-600 to-green-600' },
    { id: 'memory', label: 'Memorias', icon: Database, color: 'from-purple-600 to-fuchsia-600' },
    { id: 'templates', label: 'Plantillas', icon: Layout, color: 'from-indigo-600 to-violet-600' },
    { id: 'archive', label: 'Archivo', icon: Book, color: 'from-amber-600 to-orange-600' },
];

export const BrainConsole: React.FC = () => {
    const navigate = useNavigate();
    const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');

    // Data from Dexie
    const customTemplates = useLiveQuery(() => getCustomTemplates(), []) || [];
    const puzzleLibrary = useLiveQuery(() => getLibrary(), []) || [];

    // State
    const [memories, setMemories] = useState<TrainingLog[]>([]);
    const [stats, setStats] = useState<BrainStats>({ count: 0, success_rate: 0, total_size_mb: 0 });
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(false);

    // Load data on mount and module change
    useEffect(() => {
        loadStats();
        loadRules();
        if (activeModule === 'memory') {
            loadMemories('');
        }
    }, [activeModule]);

    const loadStats = async () => {
        try {
            const res = await fetch(`${ML_API_URL}/stats`);
            if (res.ok) setStats(await res.json());
        } catch (e) {
            console.error("Stats error:", e);
        }
    };

    const loadRules = async () => {
        try {
            const res = await fetch(`${RULES_API_URL}/rules`);
            if (res.ok) {
                const data = await res.json();
                setRules(data.rules || []);
            }
        } catch (e) {
            console.error("Rules error:", e);
        }
    };

    const loadMemories = async (searchTerm: string) => {
        setLoading(true);
        try {
            const response = await fetch(`${ML_API_URL}/retrieve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: searchTerm, limit: 100, min_rating: -2 })
            });
            const data = await response.json();
            setMemories(data);
        } catch (e) {
            console.error("Failed to load memories:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = async (rule: Omit<Rule, 'id'>) => {
        const newRule = { ...rule, id: crypto.randomUUID() };
        try {
            await fetch(`${RULES_API_URL}/rules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRule)
            });
            loadRules();
        } catch (e) {
            console.error("Add rule error:", e);
        }
    };

    const handleDeleteRule = async (id: string) => {
        if (!confirm("¿Eliminar esta regla?")) return;
        try {
            await fetch(`${RULES_API_URL}/rules/${id}`, { method: 'DELETE' });
            loadRules();
        } catch (e) {
            console.error("Delete rule error:", e);
        }
    };

    const handleDeleteMemory = async (filename: string) => {
        try {
            await fetch(`${ML_API_URL}/log/${filename}`, { method: 'DELETE' });
            loadMemories('');
            loadStats();
        } catch (e) {
            console.error("Delete memory error:", e);
        }
    };

    const handleRateMemory = async (filename: string, rating: number) => {
        try {
            await fetch(`${ML_API_URL}/log/${filename}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating })
            });
            loadMemories('');
            loadStats();
        } catch (e) {
            console.error("Rate error:", e);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (confirm('¿Eliminar esta plantilla?')) {
            await deleteCustomTemplate(id);
        }
    };

    const handleDeletePuzzle = async (id: string, name: string) => {
        if (confirm(`¿Eliminar puzzle "${name}"?`)) {
            await deletePuzzleFromLibrary(id);
        }
    };

    // Render current module content
    const renderContent = () => {
        switch (activeModule) {
            case 'dashboard':
                return (
                    <BrainDashboard
                        stats={stats}
                        rulesCount={rules.filter(r => r.active).length}
                        onRefresh={() => { loadStats(); loadRules(); }}
                    />
                );
            case 'lab':
                return <PromptLab />;
            case 'rules':
                return (
                    <RulesManager
                        rules={rules}
                        onAddRule={handleAddRule}
                        onDeleteRule={handleDeleteRule}
                        onRefresh={loadRules}
                    />
                );
            case 'memory':
                return (
                    <MemoryExplorer
                        memories={memories}
                        loading={loading}
                        onSearch={loadMemories}
                        onDelete={handleDeleteMemory}
                        onRate={handleRateMemory}
                        onRefresh={() => loadMemories('')}
                    />
                );
            case 'templates':
                return renderTemplatesModule();
            case 'archive':
                return renderArchiveModule();
            default:
                return null;
        }
    };

    const renderTemplatesModule = () => (
        <div className="p-6 overflow-y-auto h-full custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl">
                        <Layout className="w-6 h-6" />
                    </div>
                    Biblioteca de Plantillas
                </h2>
                <span className="text-sm text-slate-500">{customTemplates.length} plantillas</span>
            </div>

            {customTemplates.length === 0 ? (
                <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                    <Layout className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>No hay plantillas guardadas</p>
                    <p className="text-xs mt-2">Crea plantillas desde el editor principal</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {customTemplates.map(t => (
                        <GlassCard key={t.id} className="relative group overflow-hidden !p-0">
                            <div className="h-24 bg-gradient-to-br from-indigo-900 to-purple-900 relative">
                                <div className="absolute bottom-2 right-2 flex gap-1">
                                    <div className="w-4 h-4 rounded-full border-2 border-white/30" style={{ background: t.themeData?.primaryColor }}></div>
                                    <div className="w-4 h-4 rounded-full border-2 border-white/30" style={{ background: t.themeData?.secondaryColor }}></div>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-white mb-2">{t.name}</h3>
                                <div className="flex flex-wrap gap-1 mb-4">
                                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded">{t.designTheme}</span>
                                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded">{t.fontType}</span>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 text-center py-2 bg-white/5 rounded text-xs text-slate-400">
                                        Visible en Editor
                                    </div>
                                    <button
                                        onClick={() => handleDeleteTemplate(t.id)}
                                        className="p-2 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );

    const renderArchiveModule = () => (
        <div className="p-6 overflow-y-auto h-full custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl">
                        <Book className="w-6 h-6" />
                    </div>
                    Archivo de Puzzles
                </h2>
                <span className="text-sm text-slate-500">{puzzleLibrary.length} guardados</span>
            </div>

            {puzzleLibrary.length === 0 ? (
                <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                    <Book className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>No hay puzzles archivados</p>
                    <p className="text-xs mt-2">Guarda puzzles desde el editor principal</p>
                </div>
            ) : (
                <div className="bg-cosmic-800 rounded-xl overflow-hidden border border-glass-border">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-cosmic-900 text-xs uppercase font-bold text-slate-500">
                            <tr>
                                <th className="p-4">Nombre</th>
                                <th className="p-4">Dificultad</th>
                                <th className="p-4">Palabras</th>
                                <th className="p-4">Creado</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {puzzleLibrary.map(p => (
                                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-bold text-white">{p.name}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${p.config.difficulty === Difficulty.EASY ? 'bg-emerald-900/50 text-emerald-400' :
                                            p.config.difficulty === Difficulty.MEDIUM ? 'bg-amber-900/50 text-amber-400' :
                                                'bg-red-900/50 text-red-400'
                                            }`}>
                                            {p.config.difficulty}
                                        </span>
                                    </td>
                                    <td className="p-4">{p.config.words?.length || '?'} palabras</td>
                                    <td className="p-4">{new Date(p.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDeletePuzzle(p.id, p.name)}
                                            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-cosmic-950 overflow-hidden">
            {/* Top Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border bg-cosmic-900/80 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-violet-900/30">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-xl text-white">Brain Training Center</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-mono">v3.0</span>
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] text-emerald-400">Sistema Activo</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-slate-400">{rules.filter(r => r.active).length}</span>
                        <span className="text-slate-600">reglas</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Database className="w-4 h-4 text-purple-400" />
                        <span className="text-slate-400">{stats.count}</span>
                        <span className="text-slate-600">memorias</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-400">{stats.success_rate}%</span>
                        <span className="text-slate-600">éxito</span>
                    </div>
                </div>
            </div>

            {/* Module Navigation */}
            <div className="px-6 py-3 border-b border-glass-border bg-cosmic-900/50">
                <div className="flex gap-2">
                    {MODULES.map(mod => {
                        const Icon = mod.icon;
                        const isActive = activeModule === mod.id;
                        return (
                            <button
                                key={mod.id}
                                onClick={() => setActiveModule(mod.id as ModuleType)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${isActive
                                    ? `bg-gradient-to-r ${mod.color} text-white shadow-lg`
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {mod.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-gradient-to-br from-cosmic-950 via-cosmic-950 to-violet-950/30">
                {renderContent()}
            </div>
        </div>
    );
};
