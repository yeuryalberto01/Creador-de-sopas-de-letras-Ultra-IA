import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateWordListAI, generateThemeAI, generatePuzzleBackground, PROVIDER_PRESETS, testApiConnection, GEMINI_MODELS, DEEPSEEK_MODELS, GROK_MODELS } from './services/aiService';
import { calculateSmartGridSize, generateThemeFromTopic, measurePuzzleElements } from './utils/puzzleGenerator';
import { createPuzzleRemote } from './services/puzzleBackendClient';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadSettings, saveSettings, savePuzzleToLibrary, deletePuzzleFromLibrary, getLibrary, saveArtTemplate, deleteArtTemplate, createBookStack, addPuzzleToStack, deleteBookStack, removePuzzleFromStack, resetLibrary, getBookStacks, getArtLibrary, DEFAULT_SETTINGS, saveCustomTemplate, getCustomTemplates, deleteCustomTemplate } from './services/storageService';
import { exportPuzzleImage } from './services/puzzleExportService';

// --- Components ---
import PuzzleSheet from './components/PuzzleSheet';
import { CollapsibleSection } from './components/ui/CollapsibleSection';
import { Tooltip } from './components/Tooltip';
import { GradientDefs } from './components/ui/GradientDefs';
import { AssetBrowser } from './features/design_library/components/AssetBrowser';
import { MarginControl } from './components/ui/MarginControl';
import { GlassCard } from './components/ui/GlassCard';
import { Toast } from './components/ui/Toast';
import { SystemDiagnostics } from './features/diagnostics/SystemDiagnostics';
import { ProviderSettingsForm } from './features/settings/ProviderSettingsForm';
import { ColorPicker, COLOR_PRESETS, ColorPresetButton } from './components/ui/ColorPicker';
import { EmptyState } from './components/ui/EmptyState';
import { DESIGN_PRESETS, DesignPreset } from './components/presets/designPresets';

// --- Icons ---
import {
    BrainCircuit, Move, Activity, Settings2, Sliders, Sparkles, Wand2, Loader2, Layout,
    Square, Circle, Heart, Star, List, Plus, X, MessageSquare, Type, ScanLine,
    Grid3X3, Palette, BoxSelect, Download, FileJson, Trash2, Save, FileUp, Image as ImageIcon,
    CheckCircle2, Printer, FileText, Layers, Check, Eraser, RefreshCw, FolderOpen,
    AlertTriangle, Book, Eye, Info,
    Briefcase, Zap, Minus, EyeOff // Added missing icons
} from 'lucide-react';

// --- Types ---
import { AppSettings, Difficulty, PuzzleTheme, ShapeType, ImageFilters, FontType, SavedPuzzleRecord, BookStack, LayoutConfig, PuzzleStructure, ToastType, DesignAsset, CustomTemplate, ElementEffects, PuzzleMargins, GeneratedPuzzle, EditorElementId, DesignAssetInstance, PuzzleConfig } from './types';

const DIFFICULTY_PRESETS = {
    [Difficulty.EASY]: { label: 'Fácil', defaultSize: 10, recommendedWords: '5-8', gridRange: [8, 12] },
    [Difficulty.MEDIUM]: { label: 'Medio', defaultSize: 15, recommendedWords: '10-15', gridRange: [12, 18] },
    [Difficulty.HARD]: { label: 'Difícil', defaultSize: 20, recommendedWords: '18-25', gridRange: [16, 25] },
    [Difficulty.EXPERT]: { label: 'Experto', defaultSize: 25, recommendedWords: '25-35', gridRange: [22, 30] }
};

const INITIAL_WORDS = ['SOPA', 'LETRAS', 'REACT', 'VITE', 'TAILWIND'];

export default function EditorPage() {
    // --- Global Settings & Modals ---
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const bookStacks = useLiveQuery(() => getBookStacks(), []) || [];
    const libraryPuzzles = useLiveQuery(() => getLibrary(), []) || [];
    const artLibrary = useLiveQuery(() => getArtLibrary(), []) || [];

    // --- Global Modals & UI State ---
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showArtStudio, setShowArtStudio] = useState(false);
    const navigate = useNavigate(); // Navigation hook

    // Snapshot State for Art Studio Sync
    // Snapshot State for Art Studio Sync
    const [gridSnapshot, setGridSnapshot] = useState<string | null>(null);

    // Layout & Config State
    const [overrideConfig, setOverrideConfig] = useState<Partial<LayoutConfig>>({});
    const [puzzleMetrics, setPuzzleMetrics] = useState<PuzzleStructure | null>(null);

    const [artStudioInitialTab, setArtStudioInitialTab] = useState<'generate' | 'transform' | 'gallery' | 'upload' | 'adjust' | 'learning'>('generate');
    const [capturedPuzzleImage, setCapturedPuzzleImage] = useState<string | undefined>(undefined);
    const [puzzleToDelete, setPuzzleToDelete] = useState<{ id: string, name: string } | null>(null);
    const [puzzleToLoad, setPuzzleToLoad] = useState<SavedPuzzleRecord | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type });
    };

    // --- Panel Resizing State ---
    const [leftPanelWidth, setLeftPanelWidth] = useState(420);
    const [rightPanelWidth, setRightPanelWidth] = useState(320);
    const isResizingLeft = React.useRef(false);
    const isResizingRight = React.useRef(false);

    const startResizingLeft = useCallback(() => {
        isResizingLeft.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const startResizingRight = useCallback(() => {
        isResizingRight.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const stopResizing = useCallback(() => {
        isResizingLeft.current = false;
        isResizingRight.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizingLeft.current) {
            const newWidth = e.clientX;
            if (newWidth > 280 && newWidth < 600) setLeftPanelWidth(newWidth);
        }
        if (isResizingRight.current) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 280 && newWidth < 600) setRightPanelWidth(newWidth);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    // --- Puzzle Config State ---
    const [title, setTitle] = useState('Sopa de Letras');
    const [headerLeft, setHeaderLeft] = useState(''); // Empty to allow dynamic default
    const [headerRight, setHeaderRight] = useState(''); // Vacío para libros
    const [footerText, setFooterText] = useState('Generado con SopaCreator AI');
    const [pageNumber, setPageNumber] = useState('');

    const [topic, setTopic] = useState('');
    const [manualWord, setManualWord] = useState('');
    const [wordList, setWordList] = useState<string[]>(INITIAL_WORDS);
    const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
    // --- Smart Features ---
    const [gridSize, setGridSize] = useState<number>(15);
    const [gridRows, setGridRows] = useState<number>(15);
    const [isSmartGrid, setIsSmartGrid] = useState(true);
    const [gridFontSizeScale, setGridFontSizeScale] = useState(1.0); // New state for font scaling
    const [styleMode, setStyleMode] = useState<'bw' | 'color'>('color');
    const [themeData, setThemeData] = useState<PuzzleTheme | undefined>(undefined);

    // --- New Expert Features ---
    const [maskShape, setMaskShape] = useState<ShapeType>('SQUARE');
    const [fontType, setFontType] = useState<FontType>('CLASSIC'); // Legacy global
    // Independent Typography per Smart Object
    const [fontFamilyHeader, setFontFamilyHeader] = useState<FontType>('MODERN');
    const [fontFamilyGrid, setFontFamilyGrid] = useState<FontType>('CLASSIC');
    const [fontFamilyWordList, setFontFamilyWordList] = useState<FontType>('MODERN');
    // Bold toggles per element
    const [boldHeader, setBoldHeader] = useState(true);
    const [boldGrid, setBoldGrid] = useState(false);
    const [boldWordList, setBoldWordList] = useState(false);
    // 🎨 Canvas Effects per Element
    const [headerEffects, setHeaderEffects] = useState<ElementEffects>({});
    const [gridEffects, setGridEffects] = useState<ElementEffects>({});
    const [wordListEffects, setWordListEffects] = useState<ElementEffects>({});
    const [designTheme, setDesignTheme] = useState<'minimal' | 'classic' | 'kids' | 'modern' | 'invisible'>('modern'); // New Theme State
    const [isManualTheme, setIsManualTheme] = useState(false); // Track if user manually selected theme
    const [showBorders, setShowBorders] = useState(true); // New: Border Toggle
    const [hiddenMessage, setHiddenMessage] = useState('');
    const [margins, setMargins] = useState<PuzzleMargins>({ top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 });

    // --- Footer & Metadata State ---
    const [editorial, setEditorial] = useState('Editorial Propia');
    const [volume, setVolume] = useState('Vol. 1');
    const [footerStyle, setFooterStyle] = useState<any>('COMMERCIAL'); // Using any to avoid import cycle issues temporarily, or explicit cast
    const [showQrCode, setShowQrCode] = useState(false);

    // --- Art Features ---
    const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
    const [backgroundStyle, setBackgroundStyle] = useState<'bw' | 'color'>('bw');
    const [backgroundFilters, setBackgroundFilters] = useState<ImageFilters | undefined>(undefined); // New Filter State
    const [overlayOpacity, setOverlayOpacity] = useState(0.85);
    const [textOverlayOpacity, setTextOverlayOpacity] = useState(0.9);
    const [templateId, setTemplateId] = useState<string>('classic'); // New Template State

    const [isArtActive, setIsArtActive] = useState(false);
    const [artPrompt, setArtPrompt] = useState('');
    const [isGeneratingArt, setIsGeneratingArt] = useState(false);

    const [showSolution, setShowSolution] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [isPrintPreview, setIsPrintPreview] = useState(false);

    // --- Seed & Generation ---
    const [seedInput, setSeedInput] = useState('');
    const [currentSeed, setCurrentSeed] = useState('');

    const [generatedPuzzle, setGeneratedPuzzle] = useState<GeneratedPuzzle | null>(null);
    const [renderKey, setRenderKey] = useState(0); // Forces re-render on load

    // --- Save Logic State ---
    const [saveOption, setSaveOption] = useState<'single' | 'existing_book' | 'new_book'>('single');
    const [saveName, setSaveName] = useState('');
    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const [newBookName, setNewBookName] = useState('');
    const [newBookTarget, setNewBookTarget] = useState(40);
    const [activeLibraryTab, setActiveLibraryTab] = useState<'puzzles' | 'books'>('books');

    // --- Editor State ---
    const [isEditMode, setIsEditMode] = useState(true);
    const [activeSidebarTab, setActiveSidebarTab] = useState<'properties' | 'library'>('properties');
    const [selectedElement, setSelectedElement] = useState<EditorElementId | null>(null);
    const [isFreeLayout, setIsFreeLayout] = useState(false);
    const [layout, setLayout] = useState<{ [key: string]: { x: number, y: number } }>({});
    const [designAssets, setDesignAssets] = useState<DesignAssetInstance[]>([]); // New State for Assets

    // --- Custom Templates State ---
    const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [templateName, setTemplateName] = useState('');

    // --- Logic ---

    // Load custom templates on mount
    useEffect(() => {
        const loadTemplates = async () => {
            const templates = await getCustomTemplates();
            setCustomTemplates(templates);
        };
        loadTemplates();
    }, []);

    // Save current config as template
    const handleSaveAsTemplate = async () => {
        if (!templateName.trim()) return;

        const newTemplate: CustomTemplate = {
            id: crypto.randomUUID(),
            name: templateName.trim(),
            createdAt: Date.now(),
            designTheme: designTheme,
            showBorders: showBorders,
            themeData: themeData || { primaryColor: '#6366f1', secondaryColor: '#818cf8', textColor: '#1f2937', backgroundColor: '#f3f4f6' },
            margins: margins,
            fontType: fontType
        };

        await saveCustomTemplate(newTemplate);
        setCustomTemplates(prev => [newTemplate, ...prev]);
        setShowSaveTemplateModal(false);
        setTemplateName('');
        showToast('Plantilla guardada correctamente', 'success');
    };

    // Apply template to current config
    const applyTemplate = (template: CustomTemplate) => {
        setDesignTheme(template.designTheme);
        setShowBorders(template.showBorders);
        setThemeData(template.themeData);
        setMargins(template.margins);
        setFontType(template.fontType);
        setStyleMode('color'); // Templates are always color mode
        showToast(`Plantilla "${template.name}" aplicada`, 'success');
    };

    // Delete template
    const handleDeleteTemplate = async (id: string) => {
        await deleteCustomTemplate(id);
        setCustomTemplates(prev => prev.filter(t => t.id !== id));
        showToast('Plantilla eliminada', 'success');
    };

    // Sync title to saveName when opening save modal
    useEffect(() => {
        if (showSaveModal) {
            setSaveName(title);
        }
    }, [showSaveModal, title]);

    const handleDifficultyChange = (newDifficulty: Difficulty) => {
        setDifficulty(newDifficulty);
        if (isSmartGrid) {
            const preset = DIFFICULTY_PRESETS[newDifficulty];
            setGridSize(preset.defaultSize);
            setGridRows(preset.defaultSize);
        }

        // Smart Theme Logic: Auto-select theme based on difficulty
        // Smart Theme Logic: Auto-select theme based on difficulty ONLY if not manually overridden
        if (!isManualTheme) {
            switch (newDifficulty) {
                case Difficulty.EASY:
                    setDesignTheme('kids');
                    break;
                case Difficulty.MEDIUM:
                    setDesignTheme('modern');
                    break;
                case Difficulty.HARD:
                    setDesignTheme('classic');
                    break;
            }
        }
    };

    const handleGeneratePuzzle = useCallback(async (forceSeed?: string, forceWords?: string[], forceTheme?: PuzzleTheme, forceNewSeed: boolean = false) => {
        // [FIX] Deterministic Grid: Prefer currentSeed if we are just updating settings (not forcing new)
        let seedToUse = forceSeed;
        if (!seedToUse) {
            if (forceNewSeed) {
                seedToUse = undefined; // Will trigger random generation
            } else if (seedInput.trim() !== '') {
                seedToUse = seedInput;
            } else {
                // If we have a current seed and we are just adjusting settings, KEEP IT!
                // prevent "shape change" or "auto-adjust" from re-rolling the dice
                seedToUse = currentSeed || undefined;
            }
        }
        const wordsToUse = forceWords || wordList;

        let widthToUse = gridSize;
        let heightToUse = gridRows;

        if (isSmartGrid) {
            const calculated = calculateSmartGridSize(wordsToUse, difficulty);
            const presetSize = DIFFICULTY_PRESETS[difficulty].defaultSize;
            let shapeMultiplier = maskShape === 'SQUARE' ? 1.0 : 1.3;
            let sizeToUse = Math.max(presetSize, Math.ceil(calculated * shapeMultiplier));
            const [min, max] = DIFFICULTY_PRESETS[difficulty].gridRange;
            sizeToUse = Math.max(min, Math.min(sizeToUse, max));
            widthToUse = sizeToUse;
            heightToUse = sizeToUse;
            setGridSize(widthToUse);
            setGridRows(heightToUse);
        }

        if (forceTheme) {
            setThemeData(forceTheme);
        } else if (styleMode === 'color' && !themeData) {
            // Only generate default theme if really needed, avoiding topic dependency trigger
            // const themeSource = topic || seedToUse || 'default'; 
            // setThemeData(generateThemeFromTopic(themeSource));
        }

        try {
            // Remote Call: createPuzzleRemote(words, width, height, difficulty, seed, hiddenMessage)
            const puzzle = await createPuzzleRemote(wordsToUse, widthToUse, heightToUse, difficulty, seedToUse, hiddenMessage);
            setGeneratedPuzzle(puzzle);
            setCurrentSeed(puzzle.seed);
        } catch (error) {
            console.error("Error generating puzzle:", error);
            showToast("Error generando sopa: " + (error as any).message, 'error');
        }


    }, [gridSize, gridRows, wordList, difficulty, seedInput, isSmartGrid, maskShape, hiddenMessage]); // Removed 'topic'

    // Instant Live Preview: Auto-regenerate when settings change
    useEffect(() => {
        const timer = setTimeout(() => {
            handleGeneratePuzzle();
        }, 100); // 100ms debounce for responsiveness
        return () => clearTimeout(timer);
    }, [handleGeneratePuzzle]);

    // Ensure theme is generated when switching to color mode
    useEffect(() => {
        if (styleMode === 'color' && !themeData) {
            // Only auto-generate theme if switching modes, not on topic change
            setThemeData(generateThemeFromTopic('default'));
        }
    }, [styleMode, themeData]); // Removed 'topic'

    const handleAiGenerate = async () => {
        if (!topic) return;
        setIsGeneratingAI(true);
        try {
            const range = DIFFICULTY_PRESETS[difficulty].recommendedWords.split('-').map(Number);
            const count = Math.ceil((range[0] + range[1]) / 2);

            // Optimization: Run AI calls in parallel
            const wordListPromise = generateWordListAI(settings.logicAI, topic, count, difficulty);

            let themePromise: Promise<PuzzleTheme | null> = Promise.resolve(null);
            if (styleMode === 'color') {
                themePromise = generateThemeAI(settings.designAI, topic);
            }

            const [newWords, aiTheme] = await Promise.all([wordListPromise, themePromise]);

            let newTheme = aiTheme;
            if (styleMode === 'color' && !newTheme) {
                newTheme = generateThemeFromTopic(topic);
            }

            if (newWords.length > 0) {
                setWordList(newWords);
                setSeedInput('');
                if (newTheme) setThemeData(newTheme);
                setTimeout(() => {
                    // Force new seed for AI generation
                    handleGeneratePuzzle(undefined, newWords, newTheme || undefined, true);
                }, 50);
            }
        } catch (error: any) {
            showToast("Error generando con AI: " + error.message, 'error');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleArtApply = (image: string, filters: ImageFilters, newTemplateId?: string) => {
        setBackgroundImage(image);
        setBackgroundFilters(filters);
        if (newTemplateId) setTemplateId(newTemplateId);
        setIsArtActive(true);
        // Default opacity settings for new art if not already set
        if (overlayOpacity === 0.85) setOverlayOpacity(0.85);
        if (textOverlayOpacity === 0.9) setTextOverlayOpacity(0.9);
    };

    const executeSave = async () => {
        console.log("[SAVE] Executing save operation...");
        if (!generatedPuzzle) {
            console.error("[SAVE] No generated puzzle found!");
            showToast("Error: No hay puzzle generado para guardar.", 'error');
            return;
        }

        console.log("[SAVE] Save option:", saveOption);
        console.log("[SAVE] Save name:", saveName);

        const config: PuzzleConfig = {
            title, headerLeft, headerRight, footerText, pageNumber,
            difficulty, gridSize, gridHeight: gridRows, words: wordList,
            showSolution, styleMode, themeData, maskShape, hiddenMessage,
            fontType, margins, designTheme, showBorders, templateId, // Save showBorders and templateId
            backgroundImage, backgroundStyle, backgroundFilters, overlayOpacity, textOverlayOpacity,
            isFreeLayout, layout, gridFontSizeScale // Save Smart Layout settings and Font Scale
        };

        try {
            if (saveOption === 'single') {
                // VALIDATION: Prevent "Word Search" default or empty names to avoid duplication confusion
                if (!saveName.trim() || saveName.trim().toLowerCase() === 'sopa de letras') {
                    showToast("Por favor, asigna un nombre único a este archivo.", 'warning');
                    return;
                }
                console.log("[SAVE] Saving single puzzle:", saveName);
                await savePuzzleToLibrary(saveName, config, generatedPuzzle);
                console.log("[SAVE] Single puzzle saved successfully.");
            } else if (saveOption === 'existing_book' && selectedBookId) {
                console.log("[SAVE] Adding to existing book:", selectedBookId);
                const record = {
                    id: crypto.randomUUID(),
                    name: title,
                    createdAt: Date.now(),
                    config,
                    puzzleData: generatedPuzzle
                };
                await addPuzzleToStack(selectedBookId, record);
                console.log("[SAVE] Added to book successfully.");
            } else if (saveOption === 'new_book' && newBookName) {
                console.log("[SAVE] Creating new book:", newBookName);
                const stack = await createBookStack(newBookName, newBookTarget);
                const record = {
                    id: crypto.randomUUID(),
                    name: title,
                    createdAt: Date.now(),
                    config,
                    puzzleData: generatedPuzzle
                };
                await addPuzzleToStack(stack.id, record);
                console.log("[SAVE] New book created and puzzle added.");
            }

            setShowSaveModal(false);
            showToast("¡Guardado exitosamente!", 'success');
        } catch (error: any) {
            console.error("[SAVE] Error saving puzzle:", error);
            showToast("Error al guardar: " + error.message, 'error');
        }
    };

    const handleLoadPuzzle = (record: SavedPuzzleRecord) => {
        // 0. Safety Check
        if (!record) return;

        try {
            const { config, puzzleData } = record;

            // Validate Logic Data Integrity
            if (!puzzleData || !puzzleData.grid) {
                throw new Error("El archivo guardado está dañado o tiene un formato antiguo incompatible.");
            }

            // 1. Restore Config / Metadatos (with Fallbacks)
            setTitle(config.title || 'Sopa de Letras');
            setHeaderLeft(config.headerLeft || '');
            setHeaderRight(config.headerRight || '');
            setFooterText(config.footerText || '');
            setPageNumber(config.pageNumber || '');

            // 2. Restore Logic State
            setDifficulty(config.difficulty || Difficulty.MEDIUM);
            setWordList(Array.isArray(config.words) ? [...config.words] : []);
            setMaskShape(config.maskShape || 'SQUARE');
            setHiddenMessage(config.hiddenMessage || '');

            // 3. Restore Grid Dimensions & Smart Grid Lock
            // Force Smart Grid OFF first to prevent auto-recalc interference
            setIsSmartGrid(false);

            const loadedSize = config.gridSize || 15;
            setGridSize(loadedSize);
            setGridRows(config.gridHeight || loadedSize);

            // 4. Restore Style & Theme
            const loadedStyleMode = config.styleMode || 'bw';
            setStyleMode(loadedStyleMode);

            if (config.themeData) {
                setThemeData({ ...config.themeData });
            } else if (loadedStyleMode === 'bw') {
                setThemeData(undefined); // Clear theme if loading a BW puzzle
            }

            setFontType(config.fontType || 'CLASSIC');
            setDesignTheme(config.designTheme || 'modern'); // Restore designTheme

            if (config.margins) {
                setMargins({ ...config.margins });
            } else {
                setMargins({ top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 });
            }

            setTemplateId(config.templateId || 'classic'); // Restore Template ID

            // 5. Restore Art / Background
            setBackgroundImage(config.backgroundImage);
            setBackgroundStyle(config.backgroundStyle || 'bw');
            setBackgroundFilters(config.backgroundFilters); // Restore Filters
            setIsArtActive(!!config.backgroundImage);
            setOverlayOpacity(config.overlayOpacity ?? 0.85);
            setTextOverlayOpacity(config.textOverlayOpacity ?? 0.9);

            // 6. Restore Smart Layout
            setIsFreeLayout(config.isFreeLayout || false);
            setLayout(config.layout || {});
            setGridFontSizeScale(config.gridFontSizeScale || 1.0);

            // 7. Restore Core Puzzle Data
            setSeedInput(puzzleData.seed || '');
            setCurrentSeed(puzzleData.seed || '');

            // Force Deep Copy of Grid Row by Row to ensure React State Change and remove reference to stored object
            setGeneratedPuzzle({
                ...puzzleData,
                grid: Array.isArray(puzzleData.grid) ? puzzleData.grid.map((row: any[]) =>
                    Array.isArray(row) ? row.map((cell: any) => ({ ...cell })) : []
                ) : []
            });

            // Increment Key to force full re-mount of PuzzleSheet component
            setRenderKey(prev => prev + 1);

            setShowLibraryModal(false);
        } catch (e: any) {
            console.error("Error loading puzzle:", e);
            showToast("Error al cargar el archivo (Datos Corruptos): " + e.message, 'error');
        }

    };

    const handleResetLibrary = () => {
        setShowResetConfirm(true);
    };

    const confirmResetLibrary = async () => {
        try {
            await resetLibrary();
            showToast("Base de datos reseteada correctamente.", 'success');
            setShowResetConfirm(false);
        } catch (e: any) {
            console.error("Error resetting library:", e);
            showToast("Error al resetear: " + e.message, 'error');
        }
    };

    // Helper: Delete puzzle with error handling and logging
    // Helper: Trigger delete confirmation modal
    const handleDeletePuzzle = (puzzleId: string, puzzleName: string) => {
        setPuzzleToDelete({ id: puzzleId, name: puzzleName });
    };

    const confirmDeletePuzzle = async () => {
        if (!puzzleToDelete) return;

        try {
            await deletePuzzleFromLibrary(puzzleToDelete.id);
            setPuzzleToDelete(null);
        } catch (error: any) {
            console.error("Error deleting puzzle:", error);
            showToast("Error al eliminar: " + error.message, 'error');
        }
    };

    // Helper: Trigger load confirmation modal
    const handleLoadPuzzleAsync = (record: SavedPuzzleRecord) => {
        setPuzzleToLoad(record);
    };

    const confirmLoadPuzzle = () => {
        if (!puzzleToLoad) return;

        try {
            console.log("[LOAD] Loading puzzle:", puzzleToLoad.id, puzzleToLoad.name);
            handleLoadPuzzle(puzzleToLoad);
            console.log("[LOAD] Puzzle loaded successfully");
            setPuzzleToLoad(null);
            setShowLibraryModal(false); // Close library modal after load
        } catch (e: any) {
            console.error("[LOAD] Error loading puzzle:", e);
            showToast("Error al cargar el archivo (Datos Corruptos): " + e.message, 'error');
        }
    };

    const handleExportPDF = () => {
        setIsExportingPDF(true);
        setTimeout(() => {
            const element = document.getElementById('puzzle-sheet');
            if (!element) return;

            const opt = {
                margin: 0,
                filename: `SopaLetras_${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            (window as any).html2pdf().set(opt).from(element).save().then(() => {
                setIsExportingPDF(false);
            });
        }, 500);
    };

    const handleExportImage = () => {
        const element = document.getElementById('puzzle-sheet');
        if (!element || !(window as any).html2canvas) return;

        showToast("Generando imagen de alta resolución...", "info");

        (window as any).html2canvas(element, {
            scale: 3, // High resolution
            useCORS: true,
            backgroundColor: null // Transparent if possible, or white
        }).then((canvas: HTMLCanvasElement) => {
            const link = document.createElement('a');
            link.download = `SopaLetras_${title.replace(/\s+/g, '_')}_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast("Imagen descargada correctamente.", "success");
        }).catch((err: any) => {
            console.error("Export error:", err);
            showToast("Error al exportar imagen.", "error");
        });
    };

    const capturePuzzleSnapshot = async () => {
        const element = document.getElementById('puzzle-sheet');
        if (!element || !(window as any).html2canvas) return null;

        try {
            // High quality capture but transparent background if possible to overlay on art provided by Studio
            // We use onclone to modify the cloned DOM before capture, forcing transparency on the white paper.
            const canvas = await (window as any).html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: null, // Important: let the canvas be transparent
                onclone: (clonedDoc: any) => {
                    const clonedElement = clonedDoc.getElementById('puzzle-sheet');
                    if (clonedElement && clonedElement.firstChild) {
                        // The first child is the ClassicTemplate (or other) root div which typically has bg-white.
                        // We force it to transparent so the Art Studio background shows through.
                        (clonedElement.firstChild as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0)';

                        // Also try to find the internal 'pageStyle' container if nested
                        // But usually top-level is sufficient for ClassicTemplate.
                    }
                }
            });
            return canvas.toDataURL('image/png');
        } catch (e) {
            console.error("Snapshot error:", e);
            return null;
        }
    };

    const handleElementDrag = (id: string, x: number, y: number) => {
        if (!isFreeLayout) return; // Only allow dragging in Free Layout mode

        // 1. Update the dragged element's position immediately
        const newLayout = { ...layout, [id]: { x, y } };

        // 2. Collision Detection (Simple Push Mechanism)
        const draggableIds = ['title', 'grid', 'wordList', 'headerLeft', 'headerRight', 'footerEditorial', 'footerVolume', 'footerQR'];
        const draggedEl = document.getElementById(id);

        if (draggedEl) {
            const draggedRect = {
                x: x,
                y: y,
                width: draggedEl.offsetWidth,
                height: draggedEl.offsetHeight,
                centerX: x + draggedEl.offsetWidth / 2,
                centerY: y + draggedEl.offsetHeight / 2
            };

            draggableIds.forEach(otherId => {
                if (otherId === id) return;

                const otherEl = document.getElementById(otherId);
                if (!otherEl) return;

                // Get current position. If it's in newLayout (e.g. previously pushed), use that.
                // Otherwise use DOM offset.
                let otherX = newLayout[otherId]?.x ?? otherEl.offsetLeft;
                let otherY = newLayout[otherId]?.y ?? otherEl.offsetTop;

                const otherRect = {
                    x: otherX,
                    y: otherY,
                    width: otherEl.offsetWidth,
                    height: otherEl.offsetHeight,
                    centerX: otherX + otherEl.offsetWidth / 2,
                    centerY: otherY + otherEl.offsetHeight / 2
                };

                // Check overlap
                if (
                    draggedRect.x < otherRect.x + otherRect.width &&
                    draggedRect.x + draggedRect.width > otherRect.x &&
                    draggedRect.y < otherRect.y + otherRect.height &&
                    draggedRect.y + draggedRect.height > otherRect.y
                ) {
                    // Collision detected! Push other element away.
                    let dx = otherRect.centerX - draggedRect.centerX;
                    let dy = otherRect.centerY - draggedRect.centerY;

                    // Normalize if centers are perfectly aligned
                    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) dx = 1;

                    // Calculate Minimum Translation Vector (MTV)
                    const overlapX = (draggedRect.width + otherRect.width) / 2 - Math.abs(dx);
                    const overlapY = (draggedRect.height + otherRect.height) / 2 - Math.abs(dy);

                    if (overlapX < overlapY) {
                        // Push in X
                        otherX += dx > 0 ? overlapX + 5 : -(overlapX + 5); // Add small buffer
                    } else {
                        // Push in Y
                        otherY += dy > 0 ? overlapY + 5 : -(overlapY + 5); // Add small buffer
                    }

                    // Update layout for the pushed element
                    newLayout[otherId] = { x: otherX, y: otherY };
                }
            });
        }

        setLayout(newLayout);
    };

    const handleExportBookJson = (stack: BookStack) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stack, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${stack.name.replace(/\s+/g, '_')}_API_DATA.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
    };

    // Memoize config to prevent re-renders of PuzzleSheet when unrelated state changes
    const puzzleConfig: PuzzleConfig = useMemo(() => ({
        ...settings,
        title,
        headerLeft: headerLeft || `DIFICULTAD: ${(DIFFICULTY_PRESETS[difficulty]?.label || difficulty).toUpperCase()}`,
        headerRight, footerText, pageNumber,
        difficulty, gridSize, gridHeight: gridRows, words: wordList, showSolution,
        styleMode, themeData, maskShape, hiddenMessage, fontType, margins,
        designTheme, showBorders,
        editorial, volume, footerStyle, showQrCode, // New Footer Fields
        backgroundImage, backgroundStyle, backgroundFilters, overlayOpacity, textOverlayOpacity,
        templateId,
        isFreeLayout,
        layout,
        gridFontSizeScale,
        // Independent typography per element
        fontFamilyHeader,
        fontFamilyGrid,
        fontFamilyWordList,
        // Bold toggles
        boldHeader,
        boldGrid,
        boldWordList,
        // 🎨 Canvas Effects
        headerEffects,
        gridEffects,
        wordListEffects
    }), [
        settings,
        title, headerLeft, headerRight, footerText, pageNumber,
        difficulty, gridSize, gridRows, wordList, showSolution,
        styleMode, themeData, maskShape, hiddenMessage, fontType, margins,
        designTheme, showBorders,
        editorial, volume, footerStyle, showQrCode, // New Footer Fields
        backgroundImage, backgroundStyle, backgroundFilters, overlayOpacity, textOverlayOpacity,
        templateId,
        isFreeLayout,
        layout,
        gridFontSizeScale,
        designAssets,
        fontFamilyHeader, fontFamilyGrid, fontFamilyWordList,
        boldHeader, boldGrid, boldWordList,
        headerEffects, gridEffects, wordListEffects
    ]);

    return (
        <div className="flex h-screen text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30" style={{ background: 'linear-gradient(135deg, #0a0e27 0%, #1a1535 50%, #0f051d 100%)' }}>
            <GradientDefs />
            {/* Left Sidebar - Controls */}
            <aside style={{ width: leftPanelWidth }} className="panel-glass border-r border-white/10 flex flex-col z-30 shadow-2xl relative transition-all duration-75 bg-cosmic-950/80 backdrop-blur-xl">
                {/* Drag Handle */}
                <div
                    className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-50 group"
                    onMouseDown={startResizingLeft}
                >
                    <div className="w-0.5 h-full bg-indigo-500/0 group-hover:bg-indigo-500/50 mx-auto transition-colors" />
                </div>

                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-900/20 to-purple-900/20 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-indigo-600 to-accent-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                            <BrainCircuit className="w-6 h-6 text-white" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-white leading-tight tracking-tight font-display">SopaCreator AI</h1>
                            <span className="text-[10px] text-accent-400 font-mono tracking-widest uppercase flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Nano Banana Pro
                            </span>
                        </div>
                    </div >
                    <div className="flex gap-1">
                        <Tooltip text={isEditMode ? "Salir del Editor" : "Editor Visual"} position="bottom">
                            <button
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={`p-2 rounded-lg transition-all ${isEditMode ? 'bg-accent-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                            >
                                <Move className="w-4 h-4" />
                            </button>
                        </Tooltip>
                        <Tooltip text="Diagnóstico del Sistema" position="bottom">
                            <button onClick={() => setShowDiagnostics(true)} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-300 hover:text-emerald-400">
                                <Activity className="w-4 h-4" />
                            </button>
                        </Tooltip>
                        <Tooltip text="Configuración Global API" position="bottom">
                            <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-300 hover:text-white">
                                <Settings2 className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    </div>
                    {isEditMode && (
                        <div className="flex bg-cosmic-800 p-0.5 rounded-lg border border-glass-border ml-2">
                            <button
                                onClick={() => setActiveSidebarTab('properties')}
                                className={`p-1.5 rounded transition-colors ${activeSidebarTab === 'properties' ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:text-white'}`}
                                title="Propiedades"
                            >
                                <Sliders className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setActiveSidebarTab('library')}
                                className={`p-1.5 rounded transition-colors ${activeSidebarTab === 'library' ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:text-white'}`}
                                title="Biblioteca de Diseño"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div >

                {/* Scrollable Controls */}
                < div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar" >
                    {
                        isEditMode ? (
                            activeSidebarTab === 'library' ? (
                                <AssetBrowser />
                            ) : (
                                <div className="p-10 text-slate-300 text-center">
                                    Property Panel Disabled
                                </div>
                                /*
                                <PropertyPanel
                                    selectedElement={selectedElement}
                                    config={puzzleConfig}
                                    onUpdateConfig={(updates) => {
                                        if (updates.title !== undefined) setTitle(updates.title);
                                        if (updates.fontType !== undefined) setFontType(updates.fontType);
                                        if (updates.gridSize !== undefined) {
                                            setGridSize(updates.gridSize);
                                            setGridRows(updates.gridSize);
                                        }
                                        if (updates.margins !== undefined) setMargins(updates.margins);
                                        if (updates.overlayOpacity !== undefined) setOverlayOpacity(updates.overlayOpacity);
                                        if (updates.textOverlayOpacity !== undefined) setTextOverlayOpacity(updates.textOverlayOpacity);

                                        // New Global Settings Handlers
                                        if (updates.words !== undefined) setWordList(updates.words);
                                        if (updates.editorial !== undefined) setEditorial(updates.editorial);
                                        if (updates.volume !== undefined) setVolume(updates.volume);
                                        if (updates.showQrCode !== undefined) setShowQrCode(updates.showQrCode);
                                        if (updates.designTheme !== undefined) setDesignTheme(updates.designTheme);
                                        if (updates.styleMode !== undefined) setStyleMode(updates.styleMode);
                                        if (updates.showBorders !== undefined) setShowBorders(updates.showBorders);

                                        // Element-specific handlers
                                        if (updates.showSolution !== undefined) setShowSolution(updates.showSolution);
                                        if (updates.headerLeft !== undefined) setHeaderLeft(updates.headerLeft);
                                        if (updates.headerRight !== undefined) setHeaderRight(updates.headerRight);

                                        // Independent typography per element
                                        if (updates.fontFamilyHeader !== undefined) setFontFamilyHeader(updates.fontFamilyHeader as FontType);
                                        if (updates.fontFamilyGrid !== undefined) setFontFamilyGrid(updates.fontFamilyGrid as FontType);
                                        if (updates.fontFamilyWordList !== undefined) setFontFamilyWordList(updates.fontFamilyWordList as FontType);

                                        // Bold toggles
                                        if (updates.boldHeader !== undefined) setBoldHeader(updates.boldHeader);
                                        if (updates.boldGrid !== undefined) setBoldGrid(updates.boldGrid);
                                        if (updates.boldWordList !== undefined) setBoldWordList(updates.boldWordList);

                                        // 🎨 Canvas Effects
                                        if (updates.headerEffects !== undefined) setHeaderEffects(updates.headerEffects);
                                        if (updates.gridEffects !== undefined) setGridEffects(updates.gridEffects);
                                        if (updates.wordListEffects !== undefined) setWordListEffects(updates.wordListEffects);
                                    }}
                                />
                                */
                            )
                        ) : (
                            <div className="p-6 space-y-6">

                                {/* Sección 1: Generación AI - Nano Banana Style */}
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                                    <div className="relative space-y-4 bg-cosmic-900/80 p-5 rounded-xl border border-white/10 shadow-xl">
                                        <div className="absolute top-0 right-0 p-3 opacity-30 group-hover:opacity-100 transition-opacity duration-500">
                                            <Sparkles className="w-8 h-8 text-indigo-400 blur-[1px]" />
                                        </div>

                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                                                <Wand2 className="w-4 h-4 text-indigo-400" />
                                            </div>
                                            <h2 className="text-xs font-bold text-white uppercase tracking-widest">
                                                Generador Inteligente
                                            </h2>
                                        </div>

                                        <div className="space-y-3 relative z-10">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-300 uppercase mb-1.5 block">Tema o Tópico</label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1 group/input">
                                                        <input
                                                            type="text"
                                                            value={topic}
                                                            onChange={(e) => setTopic(e.target.value)}
                                                            placeholder="Ej: Dinosaurios, Espacio..."
                                                            className="w-full bg-cosmic-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none text-white placeholder-slate-600 shadow-inner group-hover/input:border-white/20"
                                                            onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                                                        />
                                                        <div className="absolute inset-0 rounded-xl ring-1 ring-white/5 pointer-events-none"></div>
                                                    </div>
                                                    <button
                                                        onClick={handleAiGenerate}
                                                        disabled={isGeneratingAI || !topic}
                                                        className="bg-gradient-to-br from-indigo-600 to-accent-600 hover:from-indigo-500 hover:to-accent-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center w-12 rounded-xl shadow-lg shadow-indigo-500/20 transition-all border border-white/10"
                                                    >
                                                        {isGeneratingAI ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sección 2: Configuración Básica */}
                                <CollapsibleSection title="Estructura" icon={Layout} defaultOpen={true}>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-300 uppercase mb-1.5 block">Dificultad</label>
                                                <select
                                                    value={difficulty}
                                                    onChange={(e) => handleDifficultyChange(e.target.value as Difficulty)}
                                                    className="w-full bg-cosmic-900 border border-glass-border rounded-lg px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-slate-800 transition-colors"
                                                >
                                                    {Object.values(Difficulty).map(d => (
                                                        <option key={d} value={d}>{DIFFICULTY_PRESETS[d].label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-300 uppercase mb-1.5 block">Forma Máscara</label>
                                                <div className="flex bg-cosmic-900 border border-glass-border rounded-lg p-1 gap-1">
                                                    {(['SQUARE', 'CIRCLE', 'HEART', 'STAR'] as ShapeType[]).map(shape => (
                                                        <button
                                                            key={shape}
                                                            onClick={() => setMaskShape(shape)}
                                                            className={`flex-1 p-1.5 rounded flex items-center justify-center transition-all ${maskShape === shape ? 'bg-accent-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                                            title={shape}
                                                        >
                                                            {shape === 'SQUARE' && <Square className="w-3.5 h-3.5" />}
                                                            {shape === 'CIRCLE' && <Circle className="w-3.5 h-3.5" />}
                                                            {shape === 'HEART' && <Heart className="w-3.5 h-3.5" />}
                                                            {shape === 'STAR' && <Star className="w-3.5 h-3.5" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-2 border-t border-white/5">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-300 uppercase">Dimensiones Grilla</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-500">Auto-ajuste</span>
                                                    <button
                                                        onClick={() => setIsSmartGrid(!isSmartGrid)}
                                                        className={`w-9 h-5 rounded-full transition-colors relative ${isSmartGrid ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                                    >
                                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform left-1 ${isSmartGrid ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className={`grid grid-cols-2 gap-3 transition-opacity ${isSmartGrid ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                                <div>
                                                    <label className="text-[9px] text-slate-500 block mb-1">Columnas (Ancho)</label>
                                                    <input
                                                        type="number"
                                                        min="5" max="30"
                                                        value={gridSize}
                                                        onChange={(e) => {
                                                            setGridSize(parseInt(e.target.value));
                                                            if (maskShape !== 'SQUARE') setGridRows(parseInt(e.target.value));
                                                        }}
                                                        className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs text-center focus:border-indigo-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-slate-500 block mb-1">Filas (Alto)</label>
                                                    <input
                                                        type="number"
                                                        min="5" max="30"
                                                        value={gridRows}
                                                        onChange={(e) => setGridRows(parseInt(e.target.value))}
                                                        disabled={maskShape !== 'SQUARE'}
                                                        className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs text-center disabled:opacity-50 focus:border-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CollapsibleSection>

                                {/* Sección 3: Palabras */}
                                <CollapsibleSection title={`Vocabulario (${wordList.length})`} icon={List} defaultOpen={true}>
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={manualWord}
                                                onChange={(e) => setManualWord(e.target.value.toUpperCase())}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && manualWord.trim()) {
                                                        setWordList(prev => [...prev, manualWord.trim().replace(/[^A-ZÑ]/g, '')]);
                                                        setManualWord('');
                                                    }
                                                }}
                                                placeholder="Añadir palabra..."
                                                className="flex-1 bg-cosmic-900 border border-glass-border rounded-l-lg px-3 py-2 text-xs focus:border-indigo-500 outline-none text-white font-mono"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (manualWord.trim()) {
                                                        setWordList(prev => [...prev, manualWord.trim().replace(/[^A-ZÑ]/g, '')]);
                                                        setManualWord('');
                                                    }
                                                }}
                                                className="bg-slate-700 hover:bg-slate-600 px-3 rounded-r-lg text-white transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 max-h-[150px] overflow-y-auto content-start bg-cosmic-900/50 p-2 rounded-lg border border-slate-800 custom-scrollbar">
                                            {wordList.map((w, i) => (
                                                <span key={i} className="bg-cosmic-800 text-slate-300 text-[10px] px-2 py-1 rounded border border-glass-border flex items-center gap-1 group hover:border-indigo-500/50 transition-colors">
                                                    {w}
                                                    <button
                                                        onClick={() => setWordList(prev => prev.filter((_, idx) => idx !== i))}
                                                        className="hover:text-red-400 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                            {wordList.length === 0 && <span className="text-[10px] text-slate-600 italic w-full text-center py-4">Lista vacía. Añade palabras o usa la IA.</span>}
                                        </div>

                                        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-[10px] text-amber-200/80 flex gap-2 items-start mt-2">
                                            <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
                                            <div className="w-full">
                                                <label className="block font-bold mb-1 text-amber-400">Mensaje Oculto (Opcional)</label>
                                                <input
                                                    type="text"
                                                    value={hiddenMessage}
                                                    onChange={(e) => setHiddenMessage(e.target.value)}
                                                    placeholder="Se revela con las letras sobrantes..."
                                                    className="w-full bg-transparent border-b border-amber-500/30 outline-none text-amber-100 placeholder-amber-500/40 py-1 focus:border-amber-500/60 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CollapsibleSection>

                                {/* Sección 5: Metadatos & Pie de Página */}
                                <CollapsibleSection title="Info. Pie de Página" icon={Type} defaultOpen={false}>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 block">Título Principal</label>
                                            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs focus:border-indigo-500 outline-none" placeholder="Título Principal" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 block">Editorial / Copyright</label>
                                                <input value={editorial} onChange={e => setEditorial(e.target.value)} className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs focus:border-indigo-500 outline-none" placeholder="© 2024..." />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 block">Volumen / Serie</label>
                                                <input value={volume} onChange={e => setVolume(e.target.value)} className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs focus:border-indigo-500 outline-none" placeholder="Vol. 1" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 block">Estilo Pie</label>
                                                <select
                                                    value={footerStyle}
                                                    onChange={e => setFooterStyle(e.target.value)}
                                                    className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs focus:border-indigo-500 outline-none"
                                                >
                                                    <option value="SIMPLE">Simple</option>
                                                    <option value="COMMERCIAL">Comercial</option>
                                                    <option value="MODERN">Moderno</option>
                                                    <option value="MINIMAL_QR">Minimal QR</option>
                                                    <option value="TECH">Tech</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1 flex items-end">
                                                <button
                                                    onClick={() => setShowQrCode(!showQrCode)}
                                                    className={`w-full py-1.5 rounded text-xs border transition-colors flex items-center justify-center gap-2 ${showQrCode ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-cosmic-900 border-glass-border text-slate-500'}`}
                                                >
                                                    <ScanLine className="w-3 h-3" />
                                                    {showQrCode ? 'QR Activo' : 'Activar QR'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-glass-border/30">
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 block">Header Izq</label>
                                                <input value={headerLeft} onChange={e => setHeaderLeft(e.target.value)} className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs focus:border-indigo-500 outline-none" placeholder="Nombre..." />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 block">Header Der</label>
                                                <input value={headerRight} onChange={e => setHeaderRight(e.target.value)} className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs focus:border-indigo-500 outline-none" placeholder="Fecha..." />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-[9px] text-slate-500 block">Texto Extra (Simple)</label>
                                                <input value={footerText} onChange={e => setFooterText(e.target.value)} className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs focus:border-indigo-500 outline-none" placeholder="Pie de página" disabled={footerStyle !== 'SIMPLE'} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 block"># Pág</label>
                                                <input value={pageNumber} onChange={e => setPageNumber(e.target.value)} className="w-full bg-cosmic-900 border border-glass-border rounded px-2 py-1.5 text-xs text-center focus:border-indigo-500 outline-none" placeholder="#" />
                                            </div>
                                        </div>
                                    </div>
                                </CollapsibleSection>

                                {/* Sección 6: Márgenes */}
                                <CollapsibleSection title="Márgenes (Pulgadas)" icon={Move} defaultOpen={false}>
                                    <div className="grid grid-cols-2 gap-3">
                                        <MarginControl
                                            label="Superior"
                                            value={margins.top}
                                            max={3.0}
                                            onChange={(val) => setMargins({ ...margins, top: val })}
                                        />
                                        <MarginControl
                                            label="Inferior"
                                            value={margins.bottom}
                                            max={3.0}
                                            onChange={(val) => setMargins({ ...margins, bottom: val })}
                                        />
                                        <MarginControl
                                            label="Izquierdo"
                                            value={margins.left}
                                            max={3.0}
                                            onChange={(val) => setMargins({ ...margins, left: val })}
                                        />
                                        <MarginControl
                                            label="Derecho"
                                            value={margins.right}
                                            max={3.0}
                                            onChange={(val) => setMargins({ ...margins, right: val })}
                                        />
                                    </div>
                                </CollapsibleSection>
                            </div>
                        )}
                </div >


            </aside >

            {/* --- MAIN PREVIEW AREA --- */}
            < main className="flex-1 h-full bg-transparent relative flex flex-col overflow-hidden" >
                {/* Background Noise Layer */}
                < div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0" ></div >

                {/* Top Toolbar - Floating Fixed */}
                < div className="absolute top-6 left-1/2 -translate-x-1/2 bg-cosmic-800/90 backdrop-blur-md p-2 rounded-xl border border-slate-600 flex items-center gap-3 shadow-xl z-40 pointer-events-auto transition-transform hover:scale-105" >
                    <button
                        onClick={() => setShowSolution(!showSolution)}
                        className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-sm ${showSolution ? 'bg-accent-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'}`}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        {showSolution ? 'Ocultar Solución' : 'Ver Solución'}
                    </button>

                    <div className="w-px h-8 bg-slate-600 mx-1"></div>

                    <button
                        onClick={handleExportPDF}
                        disabled={isExportingPDF}
                        className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-all flex items-center gap-2 font-bold text-sm"
                    >
                        {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        PDF
                    </button>

                    <button
                        onClick={handleExportImage}
                        className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 font-bold text-sm"
                    >
                        <ImageIcon className="w-4 h-4" />
                        Imagen
                    </button>

                    <div className="w-px h-8 bg-slate-600 mx-1"></div>

                    <button
                        onClick={() => setIsPrintPreview(!isPrintPreview)}
                        className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-sm ${isPrintPreview ? 'bg-white text-black shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'}`}
                        title="Vista de Impresión (Fondo Blanco)"
                    >
                        <FileText className="w-4 h-4" />
                        {isPrintPreview ? 'Modo Impresión' : 'Vista Previa'}
                    </button>
                </div >

                {/* Scrollable Canvas Area */}
                < div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar w-full flex flex-col items-center pt-24 pb-20 px-8 relative z-10" >
                    {/* Paper Container */}
                    <div
                        id="puzzle-sheet"
                        className="relative scale-[0.85] xl:scale-100 transition-transform duration-500 shadow-2xl origin-top puzzle-preview-frame"
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            try {
                                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                                if (data.type === 'DESIGN_ASSET') {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    // Calculate relative position (approximate, considering scale if needed)
                                    // For now, center drop or use offset. 
                                    const x = (e.clientX - rect.left);
                                    const y = (e.clientY - rect.top);

                                    const newAsset: DesignAssetInstance = {
                                        id: crypto.randomUUID(),
                                        assetId: data.assetId,
                                        x,
                                        y,
                                        width: data.width || '100px', // Default size
                                        height: data.height || 'auto',
                                        svgContent: data.svgContent,
                                        isAdaptable: true
                                    };
                                    setDesignAssets(prev => [...prev, newAsset]);

                                    // Switch to edit mode if not already
                                    if (!isEditMode) setIsEditMode(true);
                                }
                            } catch (err) {
                                console.error("Drop Error", err);
                            }
                        }}
                    >
                        <PuzzleSheet
                            puzzle={generatedPuzzle}
                            config={puzzleConfig}
                            isEditMode={isEditMode}
                            selectedElement={selectedElement}
                            onSelectElement={setSelectedElement}

                            isPrintPreview={isPrintPreview}
                            onDrag={handleElementDrag}
                            onDoubleClick={(id) => {
                                setActiveSidebarTab('properties');
                                setSelectedElement(id);
                            }}
                        />
                    </div >
                </div >

            </main >

            {/* Right Sidebar - Design & Export */}
            <aside style={{ width: rightPanelWidth }} className="panel-glass border-l border-white/10 flex flex-col z-30 shadow-2xl relative bg-cosmic-950/80 backdrop-blur-xl">
                {/* Drag Handle */}
                <div
                    className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-50 group"
                    onMouseDown={startResizingRight}
                >
                    <div className="w-0.5 h-full bg-indigo-500/0 group-hover:bg-indigo-500/50 mx-auto transition-colors" />
                </div>
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-sm">
                    <h2 className="font-bold text-lg text-white flex items-center gap-3">
                        <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg shadow-lg shadow-purple-500/20">
                            <Palette className="w-5 h-5 text-white" />
                        </div>
                        Diseño Visual
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-6 space-y-8">
                    {/* Section 4: Estilo y Arte (Moved) */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Palette className="w-4 h-4 text-purple-400" /> Estilo & Tema
                        </h2>

                        {/* SYSTEM PRESETS */}
                        <div className="mb-6">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Estilos Predefinidos (IA)</span>
                            <div className="grid grid-cols-2 gap-2">
                                {DESIGN_PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => {
                                            // 1. Apply Theme (Structure/Shape)
                                            setDesignTheme(preset.designTheme);
                                            setShowBorders(preset.showBorders);

                                            // 2. Apply Colors (Palette)
                                            if (preset.themeData) setThemeData(preset.themeData);

                                            // Ensure we switch to color logic
                                            if (preset.id !== 'preset_invisible') {
                                                setStyleMode('color');
                                                setBackgroundImage(undefined);
                                            }

                                            // CRITICAL FIX: Do NOT overwrite Layout Format (Margins/Fonts)
                                            // The user wants these to remain fixed unless explicitly changed in their respective settings panels.
                                            // if (preset.fontType) setFontType(preset.fontType);
                                            // if (preset.margins) setMargins(preset.margins);

                                            showToast(`Estilo "${preset.label}" aplicado (Formato mantenido)`, 'success');
                                        }}
                                        className="group relative flex items-center justify-between p-3 rounded-xl border border-white/5 bg-cosmic-800 hover:bg-cosmic-700 hover:border-indigo-500/50 transition-all text-left"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-200 group-hover:text-white">{preset.label}</span>
                                            <span className="text-[9px] text-slate-500 truncate max-w-[100px]">{preset.id.replace('preset_', '')}</span>
                                        </div>
                                        <div className="flex -space-x-1">
                                            {preset.previewColors.map((color, idx) => (
                                                <div
                                                    key={idx}
                                                    className="w-3 h-3 rounded-full border border-white/10 ring-1 ring-black/20"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => { setStyleMode('bw'); setBackgroundImage(undefined); }}
                                className={`group relative p-4 rounded-xl border transition-all duration-300 overflow-hidden ${styleMode === 'bw' && !backgroundImage ? 'bg-white/10 border-white/30 shadow-lg shadow-white/5' : 'bg-cosmic-900/50 border-white/5 hover:border-white/20 hover:bg-white/5'}`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex flex-col items-center gap-3 relative z-10">
                                    <div className="w-8 h-8 bg-white border-2 border-slate-200 rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-300"></div>
                                    <span className={`text-xs font-bold ${styleMode === 'bw' && !backgroundImage ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>B/N Clásico</span>
                                </div>
                            </button>
                            <button
                                onClick={() => { setStyleMode('color'); setBackgroundImage(undefined); }}
                                className={`group relative p-4 rounded-xl border transition-all duration-300 overflow-hidden ${styleMode === 'color' && !backgroundImage ? 'bg-indigo-500/20 border-indigo-500/50 shadow-lg shadow-indigo-500/20' : 'bg-cosmic-900/50 border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/10'}`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex flex-col items-center gap-3 relative z-10">
                                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-300"></div>
                                    <span className={`text-xs font-bold ${styleMode === 'color' && !backgroundImage ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>Color Digital</span>
                                </div>
                            </button>
                        </div>

                        {/* Color Control Panel - Only visible when Color Digital mode is active */}
                        {styleMode === 'color' && (
                            <div className="mt-4 p-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20 overflow-hidden">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-[11px] font-bold text-white/80 flex items-center gap-1.5">
                                        <Palette className="w-3 h-3 text-indigo-400" />
                                        Colores Personalizados
                                    </h4>
                                </div>

                                {/* Quick Presets */}
                                <div className="mb-3">
                                    <span className="text-[9px] text-white/40 uppercase tracking-wider block mb-1">Paletas Rápidas</span>
                                    <div className="grid grid-cols-4 gap-1">
                                        {COLOR_PRESETS.map((preset) => (
                                            <ColorPresetButton
                                                key={preset.name}
                                                preset={preset}
                                                isActive={themeData?.primaryColor === preset.primary}
                                                onClick={() => setThemeData({
                                                    primaryColor: preset.primary,
                                                    secondaryColor: preset.secondary,
                                                    textColor: preset.text,
                                                    backgroundColor: preset.bg
                                                })}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Individual Color Pickers */}
                                <div className="grid grid-cols-2 gap-2">
                                    <ColorPicker
                                        label="Principal"
                                        value={themeData?.primaryColor || '#6366f1'}
                                        onChange={(c) => setThemeData(prev => ({ ...prev, primaryColor: c } as PuzzleTheme))}
                                    />
                                    <ColorPicker
                                        label="Secundario"
                                        value={themeData?.secondaryColor || '#818cf8'}
                                        onChange={(c) => setThemeData(prev => ({ ...prev, secondaryColor: c } as PuzzleTheme))}
                                    />
                                    <ColorPicker
                                        label="Texto"
                                        value={themeData?.textColor || '#1f2937'}
                                        onChange={(c) => setThemeData(prev => ({ ...prev, textColor: c } as PuzzleTheme))}
                                    />
                                    <ColorPicker
                                        label="Fondo"
                                        value={themeData?.backgroundColor || '#f3f4f6'}
                                        onChange={(c) => setThemeData(prev => ({ ...prev, backgroundColor: c } as PuzzleTheme))}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 pt-4 border-t border-white/5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2 block">Estilo de Estructura (Formas y Fuentes)</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['classic', 'modern', 'kids', 'minimal', 'invisible'] as const).map(theme => {
                                    const isActive = designTheme === theme;
                                    // Visual Preview Config based on Theme Type
                                    const getThemeIcon = () => {
                                        switch (theme) {
                                            case 'modern': return <Zap className="w-4 h-4" />;
                                            case 'kids': return <Star className="w-4 h-4" />;
                                            case 'minimal': return <Minus className="w-4 h-4" />;
                                            case 'invisible': return <EyeOff className="w-4 h-4" />;
                                            default: return <Briefcase className="w-4 h-4" />;
                                        }
                                    };

                                    const getThemeLabel = () => {
                                        switch (theme) {
                                            case 'modern': return 'Moderno';
                                            case 'kids': return 'Kids / Pop';
                                            case 'minimal': return 'Minimal';
                                            case 'invisible': return 'Invisible';
                                            default: return 'Clásico';
                                        }
                                    }

                                    return (
                                        <button
                                            key={theme}
                                            onClick={() => { setDesignTheme(theme); setIsManualTheme(true); }}
                                            className={`relative h-14 rounded-xl border transition-all duration-200 overflow-hidden group text-left px-3 flex items-center justify-between ${isActive
                                                ? 'bg-white/10 border-white/40 shadow-lg'
                                                : 'bg-cosmic-900/50 border-white/5 hover:bg-white/5 hover:border-white/20'
                                                }`}
                                            // Dynamic Border Color using CURRENT THEME DATA to show "It adapts to your color"
                                            style={{
                                                borderColor: isActive ? (themeData?.primaryColor || '#6366f1') : undefined
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`p-1.5 rounded-lg ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}
                                                    style={{
                                                        backgroundColor: isActive ? (themeData?.primaryColor || '#6366f1') : 'transparent'
                                                    }}
                                                >
                                                    {getThemeIcon()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                        {getThemeLabel()}
                                                    </span>
                                                    {isActive && <span className="text-[9px] text-white/50 leading-none">Activo</span>}
                                                </div>
                                            </div>

                                            {/* Subtle indicator of shape */}
                                            <div
                                                className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 border-2 opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none`}
                                                style={{
                                                    borderRadius: theme === 'modern' ? '8px' : theme === 'kids' ? '12px' : theme === 'classic' ? '2px' : '0px',
                                                    borderColor: themeData?.primaryColor || 'currentColor',
                                                    borderStyle: theme === 'invisible' ? 'dashed' : 'solid'
                                                }}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Mostrar Bordes</label>
                            <button
                                onClick={() => setShowBorders(!showBorders)}
                                className={`w-9 h-5 rounded-full transition-colors relative ${showBorders ? 'bg-indigo-500' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform left-1 ${showBorders ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>


                        {/* Custom Templates Section */}
                        <div className="space-y-2 pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Layers className="w-3 h-3" /> Mis Plantillas
                                </label>
                                <button
                                    onClick={() => setShowSaveTemplateModal(true)}
                                    className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/30 transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Guardar Actual
                                </button>
                            </div>

                            {customTemplates.length === 0 ? (
                                <p className="text-[10px] text-white/30 text-center py-3">
                                    No tienes plantillas guardadas.<br />
                                    Configura los colores y estilos, luego guarda como plantilla.
                                </p>
                            ) : (
                                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                    {customTemplates.map(template => (
                                        <div
                                            key={template.id}
                                            className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="flex gap-0.5 flex-shrink-0">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: template.themeData.primaryColor }} />
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: template.themeData.secondaryColor }} />
                                                </div>
                                                <span className="text-[10px] text-white/80 truncate">{template.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                <button
                                                    onClick={() => applyTemplate(template)}
                                                    className="p-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
                                                    title="Aplicar plantilla"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTemplate(template.id)}
                                                    className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                                                    title="Eliminar plantilla"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between bg-cosmic-900/50 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                            <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2 group-hover:text-white transition-colors">
                                <Layout className="w-4 h-4 text-indigo-400" /> Lienzo Libre
                            </label>
                            <button
                                onClick={() => setIsFreeLayout(!isFreeLayout)}
                                className={`w-12 h-7 rounded-full transition-all relative shadow-inner ${isFreeLayout ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-slate-800'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md left-1 ${isFreeLayout ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Art Studio (IA)</label>

                            <div className="grid grid-cols-2 gap-2">

                                <button
                                    onClick={async () => {
                                        setArtStudioInitialTab('generate');
                                        const snap = await capturePuzzleSnapshot();
                                        if (snap) setGridSnapshot(snap);
                                        // Measure Layout
                                        const metrics = measurePuzzleElements();
                                        setPuzzleMetrics(metrics);
                                        setShowArtStudio(true);
                                    }}
                                    className="w-full relative overflow-hidden group rounded-xl p-[1px]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="relative bg-cosmic-950 rounded-xl p-3 flex flex-col items-center justify-center gap-2 group-hover:bg-cosmic-900 transition-colors h-20">
                                        <Sparkles className="w-5 h-5 text-indigo-400 group-hover:text-white transition-colors" />
                                        <span className="font-bold text-[10px] text-slate-200 group-hover:text-white transition-colors text-center">Abrir Estudio</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => navigate('/brain')}
                                    className="w-full relative overflow-hidden group rounded-xl p-[1px]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-purple-600 opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="relative bg-cosmic-950 rounded-xl p-3 flex flex-col items-center justify-center gap-2 group-hover:bg-cosmic-900 transition-colors h-20">
                                        <BrainCircuit className="w-5 h-5 text-purple-400 group-hover:text-white transition-colors" />
                                        <span className="font-bold text-[10px] text-slate-200 group-hover:text-white transition-colors text-center">Entrenar Cerebro</span>
                                    </div>
                                </button>
                            </div>

                            <p className="text-[10px] text-slate-500 text-center">
                                Genera arte o entrena el modelo con tus correcciones.
                            </p>
                        </div>

                        {/* New: Design Controls when Image Active */}
                        {backgroundImage && (
                            <div className="space-y-4 bg-cosmic-900/50 p-4 rounded-xl border border-white/10 mt-2 backdrop-blur-sm">
                                <div className="relative group w-full h-24 bg-cosmic-950 rounded-lg overflow-hidden border border-white/10 shadow-inner">
                                    <img src={backgroundImage} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" alt="bg" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <button
                                            onClick={() => setBackgroundImage(undefined)}
                                            className="bg-red-500/80 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 backdrop-blur-sm transition-all transform hover:scale-105"
                                        >
                                            <Eraser className="w-3 h-3" /> Quitar
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                                            <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> Opacidad Grilla</span>
                                            <span className="text-indigo-400">{Math.round(overlayOpacity * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0" max="1" step="0.05"
                                            value={overlayOpacity}
                                            onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 block hover:bg-slate-700 transition-colors"
                                        />
                                    </div>

                                    <div className="space-y-1 pt-2 border-t border-white/5">
                                        <div className="flex justify-between text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                                            <span className="flex items-center gap-1"><Type className="w-3 h-3" /> Opacidad Textos</span>
                                            <span className="text-indigo-400">{Math.round(textOverlayOpacity * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0" max="1" step="0.05"
                                            value={textOverlayOpacity}
                                            onChange={(e) => setTextOverlayOpacity(parseFloat(e.target.value))}
                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 block hover:bg-slate-700 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}


                        <div className="space-y-2 pt-2">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Tipografía</label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {(['CLASSIC', 'MODERN', 'FUN', 'SCHOOL'] as FontType[]).map(ft => (
                                    <button
                                        key={ft}
                                        onClick={() => setFontType(ft)}
                                        className={`text-[9px] py-2 rounded-lg border transition-all duration-200 ${fontType === ft
                                            ? 'bg-accent-600 border-accent-500 text-white shadow-md shadow-accent-500/20 font-bold'
                                            : 'bg-cosmic-900/50 border-white/5 text-slate-300 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        {ft === 'CLASSIC' ? 'Mono' : ft === 'MODERN' ? 'Sans' : ft === 'FUN' ? 'Fun' : 'Sch'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Grid Visual Settings (Moved) */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                            <Grid3X3 className="w-4 h-4 text-emerald-400" /> Ajustes Grilla
                        </h2>
                        {/* Grid Font Size Scale */}
                        <div className="mt-2 space-y-2">
                            <div className="flex justify-between text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                                <span>Tamaño Letra</span>
                                <span className="text-emerald-400">{Math.round(gridFontSizeScale * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.5" max="2.0" step="0.1"
                                value={gridFontSizeScale}
                                onChange={(e) => setGridFontSizeScale(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 block hover:bg-slate-700 transition-colors"
                            />
                        </div>

                        {/* Border Toggle */}
                        <div className="flex items-center justify-between bg-cosmic-900/50 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                            <label className="text-xs font-bold text-slate-300 uppercase group-hover:text-white transition-colors">Mostrar Bordes</label>
                            <button
                                onClick={() => setShowBorders(!showBorders)}
                                className={`w-12 h-7 rounded-full transition-all relative shadow-inner ${showBorders ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-slate-800'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md left-1 ${showBorders ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </section>
                </div>

                {/* Footer Actions (Moved) */}
                <div className="p-6 bg-cosmic-950/90 border-t border-white/10 flex flex-col gap-3 shadow-2xl z-20 backdrop-blur-xl">
                    <button
                        onClick={() => handleGeneratePuzzle()}
                        className="btn-primary cta-breathing w-full flex items-center justify-center gap-2 active:scale-[0.98] py-3 text-sm font-bold shadow-lg shadow-indigo-500/20"
                    >
                        <RefreshCw className="w-5 h-5" /> Regenerar Sopa
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setShowLibraryModal(true)} className="py-2 bg-cosmic-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center gap-2 text-xs font-medium border border-glass-border transition-colors">
                            <FolderOpen className="w-4 h-4" /> Biblioteca
                        </button>
                        <button onClick={() => setShowSaveModal(true)} className="py-2 bg-cosmic-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center gap-2 text-xs font-medium border border-glass-border transition-colors">
                            <Save className="w-4 h-4" /> Guardar
                        </button>
                    </div>
                </div>
            </aside >

            {showArtStudio && generatedPuzzle && (
                <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4 lg:p-8 backdrop-blur-md overflow-hidden animate-in fade-in duration-300">
                    <button
                        onClick={() => setShowArtStudio(false)}
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-50 p-2 rounded-full hover:bg-white/10"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <div className="w-full h-full max-w-[1600px]">
                        {/* 
                        <ArtStudio
                            puzzle={generatedPuzzle}
                            config={{
                                title: title || 'Sopa de Letras',
                                headerLeft: headerLeft,
                                headerRight: headerRight,
                                difficulty: difficulty,
                                gridSize: gridSize,
                                gridHeight: gridRows,
                                words: wordList || [],
                                showSolution: showSolution,
                                styleMode: styleMode,
                                themeData: generatedPuzzle.theme,
                                backgroundImage: backgroundImage,
                                designTheme: designTheme,
                                showBorders: showBorders,
                                margins: margins,
                                fontType: fontType,
                                maskShape: maskShape,

                                templateId: templateId
                            }}
                            gridSnapshot={gridSnapshot}
                            spatialMetrics={puzzleMetrics}
                            onClose={() => setShowArtStudio(false)}
                            onSave={(imgUrl) => {
                                // Save Background Image from Art Studio
                                if (imgUrl) {
                                    setBackgroundImage(imgUrl);
                                }
                                setShowArtStudio(false);
                                setToast({ message: "Diseño aplicado correctamente", type: "success" });
                            }}
                        />
                        */}
                        <div className="flex flex-col items-center justify-center h-full text-white bg-cosmic-800 rounded-xl border border-white/10">
                            <h2 className="text-2xl font-bold mb-4">Art Studio Disabled</h2>
                            <p className="text-slate-300">Component disabled for debugging.</p>
                        </div>
                    </div>
                </div>
            )
            }

            {
                showArtStudio && !generatedPuzzle && (
                    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center backdrop-blur-md">
                        <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl text-center">
                            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Error de Datos</h3>
                            <p className="text-red-200 mb-6">Debes generar una sopa de letras antes de abrir el estudio.</p>
                            <button onClick={() => setShowArtStudio(false)} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold">Cerrar</button>
                        </div>
                    </div>
                )
            }

            {/* --- MODALS --- */}

            {/* Settings Modal */}
            {
                showSettingsModal && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-cosmic-900 text-white w-full max-w-2xl rounded-2xl border border-glass-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                            <div className="p-4 border-b border-glass-border flex justify-between items-center bg-cosmic-950">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Settings2 className="w-6 h-6 text-indigo-500" /> Configuración de IA
                                </h2>
                                <button onClick={() => setShowSettingsModal(false)}><X className="w-6 h-6 text-slate-300 hover:text-white" /></button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                                <ProviderSettingsForm
                                    title="Inteligencia Lógica (Generación de Palabras)"
                                    icon={BrainCircuit}
                                    settings={settings.logicAI}
                                    onUpdate={(s) => setSettings({ ...settings, logicAI: s })}
                                />
                                <div className="w-full h-px bg-cosmic-800"></div>
                                <ProviderSettingsForm
                                    title="Inteligencia Visual (Colores y Estilos)"
                                    icon={Palette}
                                    settings={settings.designAI}
                                    onUpdate={(s) => setSettings({ ...settings, designAI: s })}
                                />
                            </div>

                            <div className="p-4 border-t border-glass-border bg-cosmic-950 flex justify-end gap-2">
                                <button
                                    onClick={() => { saveSettings(settings); setShowSettingsModal(false); }}
                                    className="px-6 py-2 bg-accent-600 hover:bg-accent-500 text-white rounded-lg font-bold shadow-lg transition-all"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Save Template Modal */}
            {
                showSaveTemplateModal && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-cosmic-900 text-white w-full max-w-sm rounded-2xl border border-glass-border shadow-2xl overflow-hidden">
                            <div className="p-4 border-b border-glass-border flex justify-between items-center bg-cosmic-950">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-indigo-400" /> Guardar Plantilla
                                </h2>
                                <button onClick={() => setShowSaveTemplateModal(false)}>
                                    <X className="w-5 h-5 text-slate-300 hover:text-white" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs text-slate-300 mb-1 block">Nombre de la plantilla</label>
                                    <input
                                        type="text"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="Ej: Mi estilo favorito"
                                        className="w-full bg-cosmic-800 border border-glass-border rounded-lg px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                                        autoFocus
                                    />
                                </div>

                                {/* Preview of what will be saved */}
                                <div className="bg-cosmic-800/50 rounded-lg p-3 space-y-2">
                                    <span className="text-[10px] text-slate-500 uppercase">Se guardará:</span>
                                    <div className="flex flex-wrap gap-2 text-[10px]">
                                        <span className="bg-white/10 px-2 py-1 rounded">Tema: {designTheme}</span>
                                        <span className="bg-white/10 px-2 py-1 rounded">Fuente: {fontType}</span>
                                        <span className="bg-white/10 px-2 py-1 rounded">Bordes: {showBorders ? 'Sí' : 'No'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] text-slate-500">Colores:</span>
                                        <div className="flex gap-1">
                                            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: themeData?.primaryColor || '#6366f1' }} />
                                            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: themeData?.secondaryColor || '#818cf8' }} />
                                            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: themeData?.textColor || '#1f2937' }} />
                                            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: themeData?.backgroundColor || '#f3f4f6' }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowSaveTemplateModal(false)}
                                        className="flex-1 py-3 rounded-lg border border-glass-border text-slate-300 hover:bg-white/5 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveAsTemplate}
                                        disabled={!templateName.trim()}
                                        className="flex-1 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-4 h-4" /> Guardar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Save Options Modal */}
            {
                showSaveModal && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-cosmic-900 text-white w-full max-w-md rounded-2xl border border-glass-border shadow-2xl overflow-hidden">
                            <div className="p-4 border-b border-glass-border flex justify-between items-center bg-cosmic-950">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Save className="w-5 h-5 text-emerald-400" /> Guardar Proyecto
                                </h2>
                                <button onClick={() => setShowSaveModal(false)}><X className="w-5 h-5 text-slate-300 hover:text-white" /></button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 p-3 rounded-lg border border-glass-border hover:bg-cosmic-800 cursor-pointer transition-colors">
                                        <input
                                            type="radio"
                                            name="saveOption"
                                            checked={saveOption === 'single'}
                                            onChange={() => setSaveOption('single')}
                                            className="accent-indigo-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-sm">Guardar Individual</div>
                                            <div className="text-[10px] text-slate-300">Guarda como puzzle suelto en la biblioteca.</div>
                                        </div>
                                    </label>

                                    {/* New Input for Single Save Name */}
                                    {saveOption === 'single' && (
                                        <div className="ml-6 mt-2 animate-in fade-in slide-in-from-top-2">
                                            <label className="text-[10px] text-slate-300 font-bold uppercase mb-1 block">Nombre del Archivo (En Biblioteca)</label>
                                            <input
                                                type="text"
                                                value={saveName}
                                                onChange={(e) => setSaveName(e.target.value)}
                                                className="w-full bg-cosmic-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                                                placeholder="Ej: Biología Unidad 1"
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1">Este nombre identificará tu trabajo guardado.</p>
                                        </div>
                                    )}

                                    <label className="flex items-center gap-2 p-3 rounded-lg border border-glass-border hover:bg-cosmic-800 cursor-pointer transition-colors">
                                        <input
                                            type="radio"
                                            name="saveOption"
                                            checked={saveOption === 'existing_book'}
                                            onChange={() => setSaveOption('existing_book')}
                                            className="accent-indigo-500"
                                            disabled={bookStacks.length === 0}
                                        />
                                        <div className={`flex-1 ${bookStacks.length === 0 ? 'opacity-50' : ''}`}>
                                            <div className="font-bold text-sm">Añadir a Libro Existente</div>
                                            <div className="text-[10px] text-slate-300">Agrega una página a una colección.</div>
                                        </div>
                                    </label>

                                    {saveOption === 'existing_book' && bookStacks.length > 0 && (
                                        <div className="ml-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <select
                                                value={selectedBookId}
                                                onChange={(e) => setSelectedBookId(e.target.value)}
                                                className="w-full bg-cosmic-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                                            >
                                                <option value="">-- Seleccionar Libro --</option>
                                                {bookStacks.map(b => <option key={b.id} value={b.id}>{b.name} ({b.puzzles.length} págs)</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <label className="flex items-center gap-2 p-3 rounded-lg border border-glass-border hover:bg-cosmic-800 cursor-pointer transition-colors">
                                        <input
                                            type="radio"
                                            name="saveOption"
                                            checked={saveOption === 'new_book'}
                                            onChange={() => setSaveOption('new_book')}
                                            className="accent-indigo-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-sm">Crear Nuevo Libro</div>
                                            <div className="text-[10px] text-slate-300">Inicia una nueva colección de sopas.</div>
                                        </div>
                                    </label>

                                    {saveOption === 'new_book' && (
                                        <div className="ml-6 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <input
                                                type="text"
                                                placeholder="Nombre del Libro (ej. Animales)"
                                                value={newBookName}
                                                onChange={(e) => setNewBookName(e.target.value)}
                                                className="w-full bg-cosmic-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                                            />
                                            <div className="flex items-center gap-2">
                                                <label className="text-[10px] text-slate-300">Meta de Páginas:</label>
                                                <input
                                                    type="number"
                                                    value={newBookTarget}
                                                    onChange={(e) => setNewBookTarget(parseInt(e.target.value))}
                                                    className="w-16 bg-cosmic-800 border border-slate-600 rounded px-2 py-1 text-xs text-white text-center"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 border-t border-glass-border bg-cosmic-950 flex justify-end gap-2">
                                <button
                                    onClick={executeSave}
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg transition-all"
                                >
                                    Confirmar Guardado
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Library Modal */}
            {
                showLibraryModal && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-cosmic-900 text-white w-full max-w-4xl rounded-2xl border border-glass-border shadow-2xl overflow-hidden h-[80vh] flex flex-col">
                            <div className="p-4 border-b border-glass-border flex justify-between items-center bg-cosmic-950">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <FolderOpen className="w-6 h-6 text-amber-500" /> Biblioteca de Puzzles
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleResetLibrary}
                                        className="bg-red-900/40 hover:bg-red-900 border border-red-800 text-red-200 px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Resetear Todo
                                    </button>
                                    <button onClick={() => setShowLibraryModal(false)}><X className="w-6 h-6 text-slate-300 hover:text-white" /></button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-glass-border bg-cosmic-800/50">
                                <button
                                    onClick={() => setActiveLibraryTab('puzzles')}
                                    className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeLibraryTab === 'puzzles' ? 'border-indigo-500 text-accent-400 bg-cosmic-800' : 'border-transparent text-slate-300 hover:text-white'}`}
                                >
                                    <FileJson className="w-4 h-4" /> Puzzles Sueltos ({libraryPuzzles.length})
                                </button>
                                <button
                                    onClick={() => setActiveLibraryTab('books')}
                                    className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeLibraryTab === 'books' ? 'border-amber-500 text-amber-400 bg-cosmic-800' : 'border-transparent text-slate-300 hover:text-white'}`}
                                >
                                    <Book className="w-4 h-4" /> Libros / Colecciones ({bookStacks.length})
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-cosmic-900">

                                {/* Tab: Puzzles */}
                                {activeLibraryTab === 'puzzles' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {libraryPuzzles.length === 0 && (
                                            <EmptyState
                                                icon={FolderOpen}
                                                title="Biblioteca Vacía"
                                                description="Aún no has guardado ningún puzzle. ¡Crea uno nuevo y guárdalo para verlo aquí!"
                                            />
                                        )}
                                        {libraryPuzzles.map((p) => (
                                            <div key={p.id} className="bg-cosmic-800 border border-glass-border rounded-xl p-4 hover:border-indigo-500/50 transition-all group relative">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-bold text-white truncate pr-6" title={p.name}>{p.name}</h3>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${p.config.difficulty === 'Fácil' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        p.config.difficulty === 'Intermedio' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-purple-500/20 text-purple-400'
                                                        }`}>{p.config.difficulty}</span>
                                                </div>
                                                <div className="text-xs text-slate-300 mb-4 font-mono">
                                                    Creado: {new Date(p.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleLoadPuzzleAsync(p)}
                                                        className="flex-1 bg-accent-600 hover:bg-accent-500 py-1.5 rounded text-xs font-bold transition-colors"
                                                    >
                                                        Cargar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePuzzle(p.id, p.name)}
                                                        className="px-3 bg-slate-700 hover:bg-red-900/50 hover:text-red-400 rounded text-xs transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}


                                {/* Tab: Books */}
                                {activeLibraryTab === 'books' && (
                                    <div className="space-y-4">
                                        {bookStacks.length === 0 && (
                                            <EmptyState
                                                icon={Book}
                                                title="Ningún Libro Creado"
                                                description="Organiza tus puzzles en colecciones o libros. Usa la opción 'Guardar > Crear Nuevo Libro' para empezar."
                                            />
                                        )}
                                        {bookStacks.map((book) => (
                                            <div key={book.id} className="bg-cosmic-800 border border-glass-border rounded-xl overflow-hidden">
                                                <div className="p-4 bg-cosmic-800 border-b border-glass-border flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-amber-500/20 p-2 rounded text-amber-400">
                                                            <Book className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-lg text-white">{book.name}</h3>
                                                            <div className="text-xs text-slate-300 flex items-center gap-2">
                                                                <span>Progreso: {book.puzzles.length} / {book.targetCount} páginas</span>
                                                                <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-amber-500 transition-all"
                                                                        style={{ width: `${Math.min(100, (book.puzzles.length / book.targetCount) * 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleExportBookJson(book)}
                                                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white"
                                                            title="Descargar JSON del Libro"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`¿Eliminar libro "${book.name}" y todas sus páginas?`)) {
                                                                    deleteBookStack(book.id);
                                                                }
                                                            }}
                                                            className="p-2 hover:bg-red-900/30 rounded-lg text-slate-300 hover:text-red-400"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Pages List */}
                                                {book.puzzles.length > 0 && (
                                                    <div className="bg-cosmic-900/50 p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                                        {book.puzzles.map((page, idx) => (
                                                            <div key={page.id} className="flex items-center justify-between p-2 bg-cosmic-800 rounded border border-glass-border/50 text-xs">
                                                                <div className="flex items-center gap-2 truncate">
                                                                    <span className="font-mono text-slate-500 w-5">#{idx + 1}</span>
                                                                    <span className="truncate max-w-[100px]" title={page.name}>{page.name}</span>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={() => handleLoadPuzzle(page)}
                                                                        className="p-1 hover:text-accent-400"
                                                                        title="Editar"
                                                                    >
                                                                        <Eye className="w-3 h-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (confirm('¿Quitar página del libro?')) {
                                                                                removePuzzleFromStack(book.id, page.id);
                                                                            }
                                                                        }}
                                                                        className="p-1 hover:text-red-400"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {showDiagnostics && <SystemDiagnostics settings={settings} onClose={() => setShowDiagnostics(false)} />}

            {/* Delete Confirmation Modal */}
            {
                puzzleToDelete && (
                    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <GlassCard className="max-w-md w-full !p-6 !bg-cosmic-900 !border-glass-border">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-red-500" /> Confirmar Eliminación
                            </h3>
                            <p className="text-slate-300 mb-6">
                                ¿Estás seguro de que deseas eliminar el puzzle <span className="text-white font-bold">"{puzzleToDelete.name}"</span>?
                                Esta acción no se puede deshacer.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setPuzzleToDelete(null)}
                                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-cosmic-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeletePuzzle}
                                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-900/20"
                                >
                                    Sí, Eliminar
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                )
            }

            {/* Load Confirmation Modal */}
            {
                puzzleToLoad && (
                    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <GlassCard className="max-w-md w-full !p-6 !bg-cosmic-900 !border-glass-border">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <Info className="w-6 h-6 text-blue-500" /> Confirmar Carga
                            </h3>
                            <p className="text-slate-300 mb-6">
                                ¿Deseas cargar el puzzle <span className="font-bold text-white">"{puzzleToLoad.name}"</span>?
                                <br /><br />
                                <span className="text-yellow-400 text-sm">Cualquier cambio no guardado en el tablero actual se perderá.</span>
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setPuzzleToLoad(null)}
                                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-cosmic-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmLoadPuzzle}
                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20"
                                >
                                    <Download className="w-4 h-4" /> Cargar
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                )
            }

            {/* Reset Confirmation Modal */}
            {
                showResetConfirm && (
                    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <GlassCard className="max-w-md w-full !p-6 !bg-cosmic-900 !border-red-500/50">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-red-500" /> ⚠️ ZONA DE PELIGRO
                            </h3>
                            <p className="text-slate-300 mb-6">
                                ¿Estás seguro de que quieres <span className="font-bold text-red-400">RESETEAR TODO</span>?
                                <br /><br />
                                <span className="text-red-400 text-sm">Esto borrará PERMANENTEMENTE todos tus puzzles, libros y configuraciones guardadas. Esta acción NO se puede deshacer.</span>
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-cosmic-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmResetLibrary}
                                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-red-900/20"
                                >
                                    <Trash2 className="w-4 h-4" /> SÍ, BORRAR TODO
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                )
            }

            {/* Brain Console View */}

            {/* Toast Container */}
            {
                toast && (
                    <div className="fixed bottom-4 right-4 z-[100]">
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            onClose={() => setToast(null)}
                        />
                    </div>
                )
            }
        </div >
    );
}

