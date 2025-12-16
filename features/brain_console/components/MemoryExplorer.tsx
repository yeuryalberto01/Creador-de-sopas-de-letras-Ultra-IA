import React, { useState, useEffect } from 'react';
import { Database, Search, Filter, ThumbsUp, ThumbsDown, Trash2, X, Calendar, Eye, CheckSquare, Square } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';

interface TrainingLog {
    prompt: string;
    image_path: string;
    style: string;
    rating: number;
    timestamp: number;
    meta?: any;
    _filename: string;
    _similarity?: number;
}

interface MemoryExplorerProps {
    memories: TrainingLog[];
    loading: boolean;
    onSearch: (term: string) => void;
    onDelete: (filename: string) => void;
    onRate: (filename: string, rating: number) => void;
    onRefresh: () => void;
}

const API_URL = "http://localhost:8000/api/ml";

export const MemoryExplorer: React.FC<MemoryExplorerProps> = ({
    memories,
    loading,
    onSearch,
    onDelete,
    onRate,
    onRefresh
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewFilter, setViewFilter] = useState<'all' | 'success' | 'fail'>('all');
    const [selectedMemory, setSelectedMemory] = useState<TrainingLog | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [bulkMode, setBulkMode] = useState(false);

    const handleSearch = () => {
        onSearch(searchTerm);
    };

    const filteredMemories = memories.filter(m => {
        if (viewFilter === 'success') return m.rating > 0;
        if (viewFilter === 'fail') return m.rating < 0;
        return true;
    });

    const toggleSelection = (filename: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(filename)) {
            newSet.delete(filename);
        } else {
            newSet.add(filename);
        }
        setSelectedItems(newSet);
    };

    const handleBulkApprove = async () => {
        for (const filename of selectedItems) {
            await onRate(filename, 1);
        }
        setSelectedItems(new Set());
    };

    const handleBulkReject = async () => {
        for (const filename of selectedItems) {
            await onRate(filename, -1);
        }
        setSelectedItems(new Set());
    };

    const handleBulkDelete = async () => {
        if (!confirm(`¿Eliminar ${selectedItems.size} memorias?`)) return;
        for (const filename of selectedItems) {
            await onDelete(filename);
        }
        setSelectedItems(new Set());
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Search & Filters */}
            <div className="p-4 border-b border-glass-border bg-cosmic-900/50 space-y-4">
                <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por prompt, estilo..."
                            className="w-full bg-cosmic-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-purple-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex gap-1 bg-cosmic-950 p-1 rounded-lg border border-slate-700">
                        <button
                            onClick={() => setViewFilter('all')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewFilter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Todos ({memories.length})
                        </button>
                        <button
                            onClick={() => setViewFilter('success')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewFilter === 'success' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Éxitos ({memories.filter(m => m.rating > 0).length})
                        </button>
                        <button
                            onClick={() => setViewFilter('fail')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewFilter === 'fail' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Fallos ({memories.filter(m => m.rating < 0).length})
                        </button>
                    </div>

                    <button
                        onClick={() => setBulkMode(!bulkMode)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${bulkMode
                                ? 'bg-indigo-600 text-white'
                                : 'bg-cosmic-800 text-slate-400 hover:text-white border border-white/10'
                            }`}
                    >
                        <CheckSquare className="w-4 h-4" />
                        Selección múltiple
                    </button>

                    <button
                        onClick={onRefresh}
                        className="p-2.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <Filter className="w-5 h-5" />
                    </button>
                </div>

                {/* Bulk Actions */}
                {bulkMode && selectedItems.size > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-indigo-600/20 rounded-lg border border-indigo-500/30">
                        <span className="text-sm text-indigo-300">
                            {selectedItems.size} seleccionados
                        </span>
                        <div className="flex-1"></div>
                        <button
                            onClick={handleBulkApprove}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center gap-1"
                        >
                            <ThumbsUp className="w-3 h-3" /> Aprobar
                        </button>
                        <button
                            onClick={handleBulkReject}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded flex items-center gap-1"
                        >
                            <ThumbsDown className="w-3 h-3" /> Rechazar
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-red-600 text-white text-xs font-bold rounded flex items-center gap-1"
                        >
                            <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                    </div>
                )}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-20 text-slate-500">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        Analizando memorias...
                    </div>
                ) : filteredMemories.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <Database className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p>No hay memorias que mostrar</p>
                        <p className="text-xs mt-2">Las memorias se crean cuando calificas generaciones</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {filteredMemories.map((mem, idx) => (
                            <div
                                key={idx}
                                className={`relative group rounded-xl overflow-hidden border transition-all cursor-pointer ${selectedItems.has(mem._filename)
                                        ? 'ring-2 ring-indigo-500 border-indigo-500'
                                        : mem.rating > 0
                                            ? 'border-emerald-500/20 hover:border-emerald-500/50'
                                            : 'border-red-500/20 hover:border-red-500/50'
                                    } hover:scale-[1.02] bg-cosmic-900`}
                                onClick={() => bulkMode ? toggleSelection(mem._filename) : setSelectedMemory(mem)}
                            >
                                {/* Selection Checkbox */}
                                {bulkMode && (
                                    <div className="absolute top-2 left-2 z-10">
                                        {selectedItems.has(mem._filename) ? (
                                            <CheckSquare className="w-5 h-5 text-indigo-400" />
                                        ) : (
                                            <Square className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                )}

                                {/* Image */}
                                <div className="aspect-square relative bg-cosmic-950">
                                    {mem.image_path.startsWith('data:') ? (
                                        <img src={mem.image_path} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                                            <Database className="w-12 h-12" />
                                        </div>
                                    )}
                                    <div className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase ${mem.rating > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                        }`}>
                                        {mem.rating > 0 ? 'ÉXITO' : 'FALLO'}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-3">
                                    <div className="text-xs font-bold text-white truncate mb-1">{mem.prompt}</div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-500">{mem.style}</span>
                                        <span className="text-[10px] text-slate-600">
                                            {new Date(mem.timestamp * 1000).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedMemory(mem); }}
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg"
                                    >
                                        <Eye className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedMemory && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-md"
                    onClick={() => setSelectedMemory(null)}
                >
                    <div
                        className="bg-cosmic-900 border border-glass-border w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden flex shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Image Side */}
                        <div className="w-1/2 bg-black flex items-center justify-center p-4">
                            {selectedMemory.image_path.startsWith('data:') ? (
                                <img
                                    src={selectedMemory.image_path}
                                    className="max-w-full max-h-[80vh] rounded-lg shadow-lg"
                                    alt=""
                                />
                            ) : (
                                <div className="text-slate-500">Imagen no disponible</div>
                            )}
                        </div>

                        {/* Details Side */}
                        <div className="w-1/2 p-6 flex flex-col bg-cosmic-800 overflow-y-auto">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-xl font-bold text-white">Detalles del Recuerdo</h2>
                                <button onClick={() => setSelectedMemory(null)}>
                                    <X className="w-6 h-6 text-slate-400 hover:text-white" />
                                </button>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Prompt</label>
                                    <p className="text-sm text-slate-200 bg-cosmic-950 p-3 rounded-lg border border-white/5 mt-1">
                                        {selectedMemory.prompt}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Estilo</label>
                                        <p className="text-sm text-white mt-1">{selectedMemory.style}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Fecha</label>
                                        <p className="text-sm text-white mt-1 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-500" />
                                            {new Date(selectedMemory.timestamp * 1000).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Metadata Técnica</label>
                                    <pre className="text-[10px] text-green-400 bg-black p-3 rounded-lg overflow-auto max-h-32 mt-1 font-mono">
                                        {JSON.stringify(selectedMemory.meta, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-white/10 mt-4">
                                <button
                                    onClick={() => {
                                        onRate(selectedMemory._filename, 1);
                                        setSelectedMemory({ ...selectedMemory, rating: 1 });
                                    }}
                                    className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${selectedMemory.rating > 0
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white'
                                        }`}
                                >
                                    <ThumbsUp className="w-5 h-5" /> Éxito
                                </button>
                                <button
                                    onClick={() => {
                                        onRate(selectedMemory._filename, -1);
                                        setSelectedMemory({ ...selectedMemory, rating: -1 });
                                    }}
                                    className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${selectedMemory.rating < 0
                                            ? 'bg-red-600 text-white'
                                            : 'bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white'
                                        }`}
                                >
                                    <ThumbsDown className="w-5 h-5" /> Fallo
                                </button>
                                <button
                                    onClick={() => {
                                        onDelete(selectedMemory._filename);
                                        setSelectedMemory(null);
                                    }}
                                    className="p-3 bg-slate-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
