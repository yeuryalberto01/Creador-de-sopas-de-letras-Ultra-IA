
import React, { useState, useEffect } from 'react';
import { X, Plus, Book, Trash2, Calendar, FileText, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { Collection, CollectionItem, getCollections, createCollection, deleteCollection, getCollectionItems } from '../../services/puzzleBackendClient';
import { GeneratedPuzzle } from '../../types';

interface LibraryManagerProps {
    isOpen: boolean;
    onClose: () => void;
    currentPuzzle: GeneratedPuzzle | null; // Needed for "Add Current" flow
    onLoadPuzzle: (puzzle: GeneratedPuzzle) => void;
}

export const LibraryManager: React.FC<LibraryManagerProps> = ({ isOpen, onClose, currentPuzzle, onLoadPuzzle }) => {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(false);

    // View State
    const [view, setView] = useState<'list' | 'details'>('list');
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
    const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);

    // Create Modal State
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadCollections();
        }
    }, [isOpen]);

    const loadCollections = async () => {
        setLoading(true);
        try {
            const data = await getCollections();
            setCollections(data);
        } catch (e) {
            console.error("Error loading collections", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        try {
            await createCollection(newTitle, newDesc);
            setNewTitle('');
            setNewDesc('');
            setShowCreate(false);
            loadCollections();
        } catch (e) {
            console.error("Error creating collection", e);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("¿Seguro que quieres eliminar este libro y todas sus sopas?")) {
            await deleteCollection(id);
            if (selectedCollection?.id === id) {
                setView('list');
                setSelectedCollection(null);
            }
            loadCollections();
        }
    };

    const openCollection = async (col: Collection) => {
        setSelectedCollection(col);
        setView('details');
        setLoading(true);
        try {
            const items = await getCollectionItems(col.id);
            setCollectionItems(items);
        } catch (e) {
            console.error("Error items", e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-cosmic-900 w-full max-w-4xl h-[80vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-cosmic-950/50">
                    <div className="flex items-center gap-3">
                        {view === 'details' && (
                            <button onClick={() => setView('list')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Book className="w-6 h-6 text-indigo-400" />
                                {view === 'list' ? 'Estudio de Producción' : selectedCollection?.title}
                            </h2>
                            <p className="text-xs text-slate-400">
                                {view === 'list' ? 'Gestiona tus libros y colecciones' : `${collectionItems.length} Sopas de letras`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-cosmic-900/30 p-6 relative">

                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-cosmic-900/50 backdrop-blur-[1px]">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    )}

                    {view === 'list' ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Create New Card */}
                                <button
                                    onClick={() => setShowCreate(true)}
                                    className="h-40 rounded-xl border-2 border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 flex flex-col items-center justify-center gap-2 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Plus className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <span className="font-bold text-slate-400 group-hover:text-indigo-300">Nuevo Libro</span>
                                </button>

                                {/* Collection Listings */}
                                {collections.map(col => (
                                    <div
                                        key={col.id}
                                        onClick={() => openCollection(col)}
                                        className="h-40 bg-cosmic-800 rounded-xl p-4 border border-white/5 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer transition-all relative group overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: col.cover_color || '#6366f1' }} />

                                        <div className="flex justify-between items-start mb-2 pl-3">
                                            <div className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400">
                                                {col.item_count || 0} Puzzles
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(col.id, e)}
                                                className="p-1.5 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="pl-3 mt-4">
                                            <h3 className="font-bold text-white text-lg line-clamp-1">{col.title}</h3>
                                            <p className="text-xs text-slate-400 line-clamp-2 mt-1">{col.description || 'Sin descripción'}</p>
                                        </div>

                                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-indigo-600 p-1.5 rounded-full shadow-lg">
                                                <ChevronRight className="w-4 h-4 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        // Details View
                        <div className="space-y-6">
                            {collectionItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                                    <FileText className="w-16 h-16 opacity-20" />
                                    <p>Este libro está vacío.</p>
                                    <p className="text-sm">Ve al editor y usa "Guardar &rarr; Añadir a Libro" para agregar sopas.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {collectionItems.map((item, idx) => (
                                        <div key={item.id} className="bg-cosmic-800 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors group cursor-pointer" onClick={() => onLoadPuzzle(item.puzzle_data)}>
                                            <div className="aspect-[3/4] bg-white rounded flex items-center justify-center mb-3 relative overflow-hidden">
                                                {/* Preview Placeholder */}
                                                <div className="scale-[0.25] origin-top-left absolute top-0 left-0 w-[400%] h-[400%] p-4 text-black bg-white pointer-events-none select-none">
                                                    {/* Rough Grid Preview */}
                                                    <div className="font-mono text-[8px] leading-none whitespace-pre wrap overflow-hidden p-8 border">
                                                        {item.puzzle_data.grid?.map(r => r.map(c => c.letter).join(' ')).join('\n') || 'GRID'}
                                                    </div>
                                                </div>

                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <span className="bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">Cargar</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-300">Pág {idx + 1}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">
                                                    {item.puzzle_data.width}x{item.puzzle_data.height}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer / Create Modal Overlay */}
                {showCreate && (
                    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-cosmic-900 border border-white/10 p-6 rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-lg font-bold text-white mb-4">Nuevo Libro</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Título</label>
                                    <input
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        className="w-full bg-cosmic-950 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                                        placeholder="Ej: Animales Vol. 1"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Descripción</label>
                                    <textarea
                                        value={newDesc}
                                        onChange={e => setNewDesc(e.target.value)}
                                        className="w-full bg-cosmic-950 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none h-20 resize-none"
                                        placeholder="Opcional..."
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancelar</button>
                                    <button onClick={handleCreate} disabled={!newTitle.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold">Crear Libro</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
