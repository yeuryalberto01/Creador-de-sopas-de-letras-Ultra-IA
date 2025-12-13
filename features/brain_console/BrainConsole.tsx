import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Brain, ThumbsUp, ThumbsDown, Trash2, Search, Filter, Layout, FileJson, Book, Download, Eye, Sparkles, Database, ArrowRight, X, BarChart3 } from 'lucide-react';
import { CustomTemplate, SavedPuzzleRecord } from '../../types';

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

const API_URL = "http://localhost:8000/api/ml";

interface BrainConsoleProps {
    customTemplates?: CustomTemplate[];
    onDeleteTemplate?: (id: string) => void;
    onApplyTemplate?: (template: CustomTemplate) => void;
    puzzleLibrary?: SavedPuzzleRecord[];
    onLoadPuzzle?: (record: SavedPuzzleRecord) => void;
    onDeletePuzzle?: (id: string, name: string) => void;
}

export const BrainConsole: React.FC<BrainConsoleProps> = ({
    customTemplates = [],
    onDeleteTemplate,
    onApplyTemplate,
    puzzleLibrary = [],
    onLoadPuzzle,
    onDeletePuzzle
}) => {
    const [activeModule, setActiveModule] = useState<'memory' | 'templates' | 'archive'>('memory');

    // Neural Memory State
    const [memories, setMemories] = useState<TrainingLog[]>([]);
    const [stats, setStats] = useState<BrainStats>({ count: 0, success_rate: 0, total_size_mb: 0 });
    const [loading, setLoading] = useState(true);
    const [viewFilter, setViewFilter] = useState<'all' | 'success' | 'fail'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMemory, setSelectedMemory] = useState<TrainingLog | null>(null);

    useEffect(() => {
        if (activeModule === 'memory') {
            loadMemories();
            loadStats();
        }
    }, [activeModule]);

    const loadStats = async () => {
        try {
            const res = await fetch(`${API_URL}/stats`);
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error("Stats error", e); }
    };

    const loadMemories = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/retrieve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: searchTerm, limit: 100, min_rating: -2 })
            });
            const data = await response.json();
            setMemories(data);
        } catch (e) {
            console.error("Failed to load brain:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMemory = async (filename: string) => {
        if (!confirm("¿Eliminar este recuerdo permanentemente?")) return;
        try {
            await fetch(`${API_URL}/log/${filename}`, { method: 'DELETE' });
            setSelectedMemory(null);
            loadMemories();
            loadStats();
        } catch (e) { console.error("Delete failed", e); }
    };

    const handleRate = async (filename: string, newRating: number) => {
        try {
            await fetch(`${API_URL}/log/${filename}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: newRating })
            });
            loadMemories();
            loadStats();
        } catch (e) { console.error("Rate failed", e); }
    };

    const filteredMemories = memories.filter(m => {
        if (viewFilter === 'success') return m.rating > 0;
        if (viewFilter === 'fail') return m.rating < 0;
        return true;
    });

    // --- RENDER MODULES ---

    const renderSidebar = () => (
        <div className="w-64 bg-cosmic-900 border-r border-glass-border flex flex-col p-4 gap-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Módulos</div>

            <button
                onClick={() => setActiveModule('memory')}
                className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${activeModule === 'memory' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
                <Brain className="w-5 h-5" />
                <div className="text-left">
                    <div className="font-bold text-sm">Memoria Neuronal</div>
                    <div className="text-[10px] opacity-70">Entrenamiento AI</div>
                </div>
            </button>

            <button
                onClick={() => setActiveModule('templates')}
                className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${activeModule === 'templates' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
                <Layout className="w-5 h-5" />
                <div className="text-left">
                    <div className="font-bold text-sm">Biblioteca Plantillas</div>
                    <div className="text-[10px] opacity-70">{customTemplates.length} Estilos</div>
                </div>
            </button>

            <button
                onClick={() => setActiveModule('archive')}
                className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${activeModule === 'archive' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
                <Database className="w-5 h-5" />
                <div className="text-left">
                    <div className="font-bold text-sm">Archivo Puzzles</div>
                    <div className="text-[10px] opacity-70">{puzzleLibrary.length} Guardados</div>
                </div>
            </button>

            <div className="mt-auto bg-cosmic-950 rounded-lg p-4 border border-glass-border">
                <div className="flex items-center gap-2 mb-2 text-slate-300">
                    <BarChart3 className="w-4 h-4" /> Estadísticas
                </div>
                <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                        <span>Recuerdos:</span>
                        <span className="text-white font-mono">{stats.count}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>Éxito:</span>
                        <span className="text-green-400 font-mono">{stats.success_rate}%</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>Tamaño:</span>
                        <span className="text-blue-400 font-mono">{stats.total_size_mb} MB</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMemoryModule = () => (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-glass-border flex gap-4 items-center bg-cosmic-900/50">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar en recuerdos (prompt, estilo)..."
                        className="w-full bg-cosmic-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-purple-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadMemories()}
                    />
                </div>
                <div className="flex gap-1 bg-cosmic-950 p-1 rounded-lg border border-slate-700">
                    <button onClick={() => setViewFilter('all')} className={`px-3 py-1.5 rounded text-xs font-bold ${viewFilter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>Todos</button>
                    <button onClick={() => setViewFilter('success')} className={`px-3 py-1.5 rounded text-xs font-bold ${viewFilter === 'success' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}>Éxitos</button>
                    <button onClick={() => setViewFilter('fail')} className={`px-3 py-1.5 rounded text-xs font-bold ${viewFilter === 'fail' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>Fallos</button>
                </div>
                <button onClick={loadMemories} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"><Sparkles className="w-5 h-5" /></button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-20 text-slate-500">Analizando red neuronal...</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredMemories.map((mem, idx) => (
                            <GlassCard key={idx} className={`!p-0 cursor-pointer overflow-hidden border transition-all hover:scale-[1.02] ${mem.rating > 0 ? 'border-green-500/20' : 'border-red-500/20'}`}
                                onClick={() => setSelectedMemory(mem)}
                            >
                                <div className="aspect-square relative bg-cosmic-950">
                                    {mem.image_path.startsWith('data:') ? (
                                        <img src={mem.image_path} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-700"><Brain className="w-12 h-12" /></div>
                                    )}
                                    <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${mem.rating > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                        {mem.rating > 0 ? 'LIKE' : 'DISLIKE'}
                                    </div>
                                </div>
                                <div className="p-3">
                                    <div className="text-xs font-bold text-white truncate mb-1">{mem.prompt}</div>
                                    <div className="text-[10px] text-slate-500">{mem.style}</div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                )}
            </div>

            {/* Inspector Modal */}
            {selectedMemory && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-md" onClick={() => setSelectedMemory(null)}>
                    <div className="bg-cosmic-900 border border-glass-border w-full max-w-4xl max-h-full rounded-2xl overflow-hidden flex shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="w-1/2 bg-black flex items-center justify-center p-4">
                            {selectedMemory.image_path.startsWith('data:') ? (
                                <img src={selectedMemory.image_path} className="max-w-full max-h-[80vh] rounded-lg shadow-lg" />
                            ) : (
                                <div className="text-slate-500">Imagen externa</div>
                            )}
                        </div>
                        <div className="w-1/2 p-6 flex flex-col bg-cosmic-800">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-xl font-bold text-white">Detalles del Recuerdo</h2>
                                <button onClick={() => setSelectedMemory(null)}><X className="w-6 h-6 text-slate-400 hover:text-white" /></button>
                            </div>

                            <div className="space-y-4 overflow-y-auto flex-1 mb-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Prompt</label>
                                    <p className="text-sm text-slate-200 bg-cosmic-950 p-2 rounded border border-white/5 mt-1">{selectedMemory.prompt}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Estilo</label>
                                        <p className="text-sm text-white">{selectedMemory.style}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Fecha</label>
                                        <p className="text-sm text-white">{new Date(selectedMemory.timestamp * 1000).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Metadata Técnica</label>
                                    <pre className="text-[10px] text-green-400 bg-black p-2 rounded overflow-auto h-32 mt-1 font-mono">
                                        {JSON.stringify(selectedMemory.meta, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-white/10">
                                <button onClick={() => { handleRate(selectedMemory._filename, 1); setSelectedMemory({ ...selectedMemory, rating: 1 }); }} className="flex-1 bg-green-600/20 hover:bg-green-600 hover:text-white text-green-400 py-2 rounded font-bold transition-all">Mark Success</button>
                                <button onClick={() => { handleRate(selectedMemory._filename, -1); setSelectedMemory({ ...selectedMemory, rating: -1 }); }} className="flex-1 bg-red-600/20 hover:bg-red-600 hover:text-white text-red-400 py-2 rounded font-bold transition-all">Mark Failure</button>
                                <button onClick={() => handleDeleteMemory(selectedMemory._filename)} className="p-2 bg-slate-700 hover:bg-red-600 text-white rounded"><Trash2 className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderTemplatesModule = () => (
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Layout className="w-6 h-6 text-indigo-500" /> Biblioteca de Plantillas
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {customTemplates.map(t => (
                    <GlassCard key={t.id} className="relative group overflow-hidden !p-0">
                        <div className="h-24 bg-gradient-to-br from-indigo-900 to-purple-900 relative">
                            {/* Preview Colors */}
                            <div className="absolute bottom-2 right-2 flex gap-1">
                                <div className="w-3 h-3 rounded-full" style={{ background: t.themeData?.primaryColor }}></div>
                                <div className="w-3 h-3 rounded-full" style={{ background: t.themeData?.secondaryColor }}></div>
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-white mb-1">{t.name}</h3>
                            <div className="flex flex-wrap gap-1 mb-4">
                                <span className="text-[10px] bg-white/10 px-1.5 rounded">{t.designTheme}</span>
                                <span className="text-[10px] bg-white/10 px-1.5 rounded">{t.fontType}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onApplyTemplate?.(t)}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 rounded text-xs font-bold transition-colors"
                                >
                                    Aplicar
                                </button>
                                <button
                                    onClick={() => onDeleteTemplate?.(t.id)}
                                    className="p-1.5 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>
        </div>
    );

    const renderArchiveModule = () => (
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Database className="w-6 h-6 text-amber-500" /> Archivo de Puzzles
            </h2>
            {/* Simple Table Layout for Archive */}
            <div className="bg-cosmic-800 rounded-xl overflow-hidden border border-glass-border">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-cosmic-900 text-xs uppercase font-bold text-slate-500">
                        <tr>
                            <th className="p-4">Nombre</th>
                            <th className="p-4">Dificultad</th>
                            <th className="p-4">Creado</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {puzzleLibrary.map(p => (
                            <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-bold text-white">{p.name}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${p.config.difficulty === 'Fácil' ? 'bg-emerald-900 text-emerald-400' : 'bg-blue-900 text-blue-400'}`}>
                                        {p.config.difficulty}
                                    </span>
                                </td>
                                <td className="p-4">{new Date(p.createdAt).toLocaleDateString()}</td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button
                                        onClick={() => onLoadPuzzle?.(p)}
                                        className="flex items-center gap-1 px-3 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded transition-colors"
                                    >
                                        <Eye className="w-3 h-3" /> Cargar
                                    </button>
                                    <button
                                        onClick={() => onDeletePuzzle?.(p.id, p.name)}
                                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="flex h-[80vh] bg-cosmic-950 rounded-2xl border border-glass-border overflow-hidden">
            {renderSidebar()}
            {activeModule === 'memory' && renderMemoryModule()}
            {activeModule === 'templates' && renderTemplatesModule()}
            {activeModule === 'archive' && renderArchiveModule()}
        </div>
    );
};
