

import { useState, useCallback, useEffect } from 'react';
import { ArtStudioState, GenerationVersion, PuzzleInfo, ArtOptions, TrainingLogEntry, DesignPlan, LayoutConfig } from '../lib/types';
import { PuzzleStructure } from '../lib/spatialUtils';
import { AISettings } from '../../../types';
import { analyzeAndPlanDesign, analyzeGeneratedImageWithVision, extractStyleFromImage, generateWithDirector, DirectorBrief } from '../services/aiService';
import { generatePuzzleBackground } from '../../../services/aiService';
import { analyzeImageContrast } from '../lib/pixelAnalysis';
import { StorageFactory } from '../services/storageService';
import * as gpuService from '../../../services/gpuService';
import { updateUserProfile, analyzeImageFeatures } from '../../../services/mlService';
import { getMLProfile, saveMLProfile } from '../../../services/storageService';

const storage = StorageFactory.getProvider();

// Configuración de API dummy para fallback por ahora si no hay provider seleccionado
const dummySettings: AISettings = { provider: 'gemini', modelName: 'gemini-2.0-flash', apiKey: '' };

export const useArtStudioTransform = () => {
    const [state, setState] = useState<ArtStudioState>({
        isGenerating: false,
        isPlanning: false,
        isAnalyzingVision: false,
        currentVersion: null,
        history: [],
        error: null,
        knowledgeBase: {
            positiveSamples: [],
            negativeSamples: [],
            styleWeights: {},
            logs: []
        }
    });

    useEffect(() => {
        const loadMemory = async () => {
            const kb = await storage.loadKnowledgeBase();
            setState(prev => ({ ...prev, knowledgeBase: kb }));
        };
        loadMemory();
    }, []);

    const clearMemory = useCallback(async () => {
        await storage.clearData();
        setState(prev => ({
            ...prev,
            knowledgeBase: { positiveSamples: [], negativeSamples: [], styleWeights: {}, logs: [] }
        }));
    }, []);

    // Función para CLONAR ESTILO desde una imagen subida
    const cloneStyleFromUpload = useCallback(async (file: File) => {
        setState(prev => ({ ...prev, isPlanning: true, error: null }));

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64 = e.target?.result as string;
                // 1. Ingeniería Inversa
                const extractedPlan = await extractStyleFromImage(base64);

                // 2. Crear un plan completo mezclando lo extraído
                const fullPlan: DesignPlan = {
                    recommendedStyle: extractedPlan.recommendedStyle || 'editorial_pro',
                    concept: "Estilo Clonado de Referencia",
                    background: "Estilo personalizado importado",
                    characters: "Según referencia",
                    gridTreatment: "Adaptado a referencia",
                    wordListTreatment: "Adaptado a referencia",
                    palette: extractedPlan.palette || "Personalizada",
                    decorations: "Según referencia",
                    artStyle: "Clonado",
                    suggestedPrompt: extractedPlan.suggestedPrompt || "A beautifully designed puzzle page background, minimal and clean.",
                    layoutConfig: {
                        // Valores por defecto seguros + lo extraído
                        fontFamilyHeader: 'Playfair Display',
                        fontFamilyGrid: 'Inter',
                        textColor: '#000000',
                        gridBackground: 'rgba(255,255,255,0.9)',
                        gridBorderColor: '#000000',
                        wordListStyle: 'classic',
                        headerStyle: 'standard',
                        wordBoxVariant: 'none',
                        lockedSections: [],
                        ...extractedPlan.layoutConfig
                    }
                };

                setState(prev => ({ ...prev, isPlanning: false, isGenerating: true }));

                // 3. Generar nueva imagen con el prompt extraído
                const result = await gpuService.smartGenerate(
                    fullPlan.suggestedPrompt,
                    {
                        preferGPU: true,
                        width: 512, height: 512, // Draft fast
                        fallbackFn: async (p) => generatePuzzleBackground(dummySettings, p, fullPlan.recommendedStyle)
                    }
                );
                const resultImage = result.image;

                setState(prev => ({ ...prev, isGenerating: false }));

                const newVersion: GenerationVersion = {
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    imageUrl: resultImage,
                    promptUsed: fullPlan.suggestedPrompt,
                    designPlan: fullPlan,
                    optionsSnapshot: {
                        visualStyle: fullPlan.recommendedStyle,
                        styleIntensity: 'full',
                        quality: 'draft_fast',
                        userPrompt: "CLONACIÓN DE ESTILO"
                    }
                };

                setState(prev => ({
                    ...prev,
                    currentVersion: newVersion,
                    history: [newVersion, ...prev.history],
                    error: null
                }));

            } catch (err: any) {
                console.error(err);
                setState(prev => ({ ...prev, isPlanning: false, isGenerating: false, error: "Error al clonar estilo." }));
            }
        };
        reader.readAsDataURL(file);
    }, []);

    const executeSmartGeneration = useCallback(async (
        puzzle: PuzzleInfo,
        userIntent: string,
        options: ArtOptions,
        specificCritique?: string,
        currentConfig?: LayoutConfig, // Configuration to preserve locks
        spatialMetrics?: PuzzleStructure, // Detected spatial configuration
        smartProvider?: string // NEW: Selected AI provider for hybrid mode
    ) => {
        // --- 1. PREPARACIÓN (Director Brief) ---
        setState(prev => ({ ...prev, isPlanning: true, error: null }));

        // Construir el Brief para el Director
        const brief: DirectorBrief = {
            tema: puzzle.title + (userIntent ? ` (${userIntent})` : ""),
            publico: "general", // Podríamos extraerlo de puzzle.levelText
            estilo: options.visualStyle,
            titulo: puzzle.title,
            palabras: puzzle.words,
            modo: options.quality === 'draft_fast' ? 'explorar' : 'producir',
            paleta: [] // Dejar que el Director decida
        };

        try {
            // --- 2. EJECUCIÓN (Backend Director) ---
            setState(prev => ({ ...prev, isPlanning: false, isGenerating: true }));

            console.log("🎬 [FRONTEND] Delegating to Director:", brief);
            const result = await generateWithDirector(brief);

            // --- 3. PROCESAMIENTO ---
            setState(prev => ({ ...prev, isGenerating: false, isAnalyzingVision: true }));

            // El backend ya hizo QC y todo
            const resultImage = result.final_image;

            // Reconstruir un DesignPlan parcial para la UI
            const partialPlan: DesignPlan = {
                recommendedStyle: (result.plan?.art_style as any) || options.visualStyle,
                concept: result.plan?.theme || "Generated by Hybrid Director",
                background: "Director Generated",
                characters: "N/A",
                gridTreatment: "Director Generated",
                wordListTreatment: "Director Generated",
                palette: result.plan?.color_palette?.join(', ') || "Director Palette",
                decorations: "Classic",
                artStyle: result.plan?.art_style || options.visualStyle,
                suggestedPrompt: "Managed by Backend Director",
                layoutConfig: {
                    // Mantener configuración actual del usuario si existe
                    // O usar defaults seguros
                    fontFamilyHeader: currentConfig?.fontFamilyHeader || 'Playfair Display',
                    fontFamilyGrid: currentConfig?.fontFamilyGrid || 'Inter',
                    textColor: currentConfig?.textColor || '#000000',
                    gridBackground: currentConfig?.gridBackground || 'rgba(255,255,255,0.9)',
                    gridBorderColor: currentConfig?.gridBorderColor || '#000000',
                    wordListStyle: currentConfig?.wordListStyle || 'classic',
                    headerStyle: currentConfig?.headerStyle || 'standard',
                    wordBoxVariant: currentConfig?.wordBoxVariant || 'none',
                    lockedSections: currentConfig?.lockedSections || [],
                    headerBackdrop: currentConfig?.headerBackdrop,
                    headerTextColor: currentConfig?.headerTextColor,
                    gridTextColor: currentConfig?.gridTextColor,
                    paddingTop: currentConfig?.paddingTop || '50px'
                }
            };

            // Si hay problemas de QC reportados por el backend
            let visionReport: any = null;
            if (result.qc_result) {
                visionReport = {
                    contrastScore: result.qc_result.title_contrast ? result.qc_result.title_contrast * 10 : 90,
                    gridObstruction: result.qc_result.grid_integrity < 0.9,
                    textLegibility: result.qc_result.passed ? 'high' : 'medium',
                    detectedElements: [],
                    critique: result.qc_result.issues?.join(', ') || "Director Approved"
                };
            }

            const newVersion: GenerationVersion = {
                id: result.generation_id || Date.now().toString(),
                timestamp: Date.now(),
                imageUrl: resultImage.startsWith('data:') ? resultImage : `data:image/png;base64,${resultImage}`,
                promptUsed: "Director Pipeline",
                designPlan: partialPlan,
                visionAnalysis: visionReport,
                optionsSnapshot: {
                    visualStyle: partialPlan.recommendedStyle,
                    styleIntensity: 'full',
                    quality: options.quality,
                    userPrompt: userIntent
                }
            };

            setState(prev => ({
                ...prev,
                isAnalyzingVision: false,
                currentVersion: newVersion,
                history: [newVersion, ...prev.history],
                error: null
            }));

        } catch (err: any) {
            console.error(err);
            setState(prev => ({
                ...prev,
                isPlanning: false,
                isGenerating: false,
                isAnalyzingVision: false,
                error: err.message || "Error desconocido en generación"
            }));
        }
    }, [state.knowledgeBase]);

    const trainModel = useCallback(async (rating: 'like' | 'dislike', critiqueText: string = "", tags: string[] = []) => {
        const current = state.currentVersion;
        if (!current) return;

        // 1. Save Log (raw data)
        const newLog: TrainingLogEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            user_intent: current.optionsSnapshot.userPrompt || "General",
            ai_prompt: current.promptUsed,
            ai_vision_analysis: current.visionAnalysis || null,
            human_rating: rating === 'like' ? 1 : 0,
            human_critique: rating === 'dislike' ? `${tags.join(',')}. ${critiqueText}` : "Good generation",
            tags: tags,
            style_used: current.designPlan?.recommendedStyle || "unknown"
        };
        await storage.saveLog(newLog);

        // 2. Update BRAIN (ML Profile)
        try {
            const currentProfile = await getMLProfile();
            // Infer features for learning
            const features = await analyzeImageFeatures(
                current.optionsSnapshot.userPrompt || "",
                current.designPlan?.recommendedStyle || "editorial_pro"
            );

            const updatedProfile = await updateUserProfile(currentProfile, features, rating, {
                prompt: current.optionsSnapshot.userPrompt || "General",
                styleId: current.designPlan?.recommendedStyle || "unknown",
                reason: critiqueText,
                details: tags.join(', ')
            });

            await saveMLProfile(updatedProfile);
            console.log("🧠 [CENE-BRAIN] User Profile Updated:", updatedProfile);
        } catch (e) {
            console.warn("Failed to update ML profile:", e);
        }

        const updatedKB = await storage.loadKnowledgeBase();

        setState(prev => ({
            ...prev,
            knowledgeBase: updatedKB,
            currentVersion: { ...current, rating, critiqueTags: tags, critiqueText }
        }));

        if (rating === 'dislike') {
            await executeSmartGeneration(
                { title: "Retraining...", levelText: "", words: [], grid: [] } as any,
                current.optionsSnapshot.userPrompt || "",
                current.optionsSnapshot,
                newLog.human_critique,
                current.designPlan?.layoutConfig // Pasar config para preservar bloqueos
            );
        }
    }, [state.currentVersion, executeSmartGeneration]);

    return {
        ...state,
        executeSmartGeneration,
        cloneStyleFromUpload,
        trainModel,
        restoreVersion: (v: GenerationVersion) => setState(prev => ({ ...prev, currentVersion: v })),
        clearMemory,
        downloadDataset: () => {
            const jsonl = state.knowledgeBase.logs.map(log => JSON.stringify(log)).join('\n');
            const blob = new Blob([jsonl], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cene_dataset_${Date.now()}.jsonl`;
            a.click();
        }
    };
};
