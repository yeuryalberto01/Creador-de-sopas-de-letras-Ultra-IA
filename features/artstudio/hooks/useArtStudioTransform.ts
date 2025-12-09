

import { useState, useCallback, useEffect } from 'react';
import { ArtStudioState, GenerationVersion, PuzzleInfo, ArtOptions, TrainingLogEntry, DesignPlan, LayoutConfig } from '../lib/types';
import { AISettings } from '../../../types';
import { analyzeAndPlanDesign, analyzeGeneratedImageWithVision, extractStyleFromImage } from '../services/aiService';
import { generatePuzzleBackground } from '../../../services/aiService';
import { analyzeImageContrast } from '../lib/pixelAnalysis';
import { StorageFactory } from '../services/storageService';
import * as gpuService from '../../../services/gpuService';

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
        currentConfig?: LayoutConfig // Configuración actual para preservar bloqueos
    ) => {
        setState(prev => ({ ...prev, isPlanning: true, error: null }));

        try {
            const plan = await analyzeAndPlanDesign(puzzle, userIntent, state.knowledgeBase, specificCritique);

            // LOGICA DE FUSIÓN INTELIGENTE (LOCK SYSTEM)
            if (currentConfig && currentConfig.lockedSections) {
                const locked = currentConfig.lockedSections;

                // Si Header está bloqueado, restaurar props de header del config viejo
                if (locked.includes('header')) {
                    plan.layoutConfig.fontFamilyHeader = currentConfig.fontFamilyHeader;
                    plan.layoutConfig.headerStyle = currentConfig.headerStyle;
                    plan.layoutConfig.headerBackdrop = currentConfig.headerBackdrop;
                    plan.layoutConfig.headerTextColor = currentConfig.headerTextColor;
                    plan.layoutConfig.headerOffsetY = currentConfig.headerOffsetY;
                    plan.layoutConfig.headerScale = currentConfig.headerScale;
                }
                // Si Grilla está bloqueada
                if (locked.includes('grid')) {
                    plan.layoutConfig.fontFamilyGrid = currentConfig.fontFamilyGrid;
                    plan.layoutConfig.gridTextColor = currentConfig.gridTextColor;
                    plan.layoutConfig.gridBorderColor = currentConfig.gridBorderColor;
                    plan.layoutConfig.gridBackground = currentConfig.gridBackground;
                    plan.layoutConfig.gridBorderWidth = currentConfig.gridBorderWidth;
                    plan.layoutConfig.gridRadius = currentConfig.gridRadius;
                    plan.layoutConfig.gridShadow = currentConfig.gridShadow;
                    plan.layoutConfig.gridOffsetY = currentConfig.gridOffsetY;
                }
                // Si Caja está bloqueada
                if (locked.includes('box')) {
                    plan.layoutConfig.wordListStyle = currentConfig.wordListStyle;
                    plan.layoutConfig.wordBoxVariant = currentConfig.wordBoxVariant;
                    plan.layoutConfig.wordBoxTextColor = currentConfig.wordBoxTextColor;
                    plan.layoutConfig.wordBoxBackground = currentConfig.wordBoxBackground;
                    plan.layoutConfig.wordBoxBorderColor = currentConfig.wordBoxBorderColor;
                    plan.layoutConfig.wordBoxOffsetY = currentConfig.wordBoxOffsetY;
                }

                // Preservar la lista de bloqueos en el nuevo plan
                plan.layoutConfig.lockedSections = locked;
            }

            setState(prev => ({ ...prev, isPlanning: false, isGenerating: true }));

            // Determinar tamaño basado en calidad
            const dim = options.quality === 'print_300dpi' ? 1536 : 768; // 2K vs Draft

            const result = await gpuService.smartGenerate(
                plan.suggestedPrompt,
                {
                    preferGPU: true,
                    width: dim,
                    height: dim,
                    fallbackFn: async (p) => generatePuzzleBackground(dummySettings, p, plan.recommendedStyle)
                }
            );
            const resultImage = result.image;

            setState(prev => ({ ...prev, isGenerating: false, isAnalyzingVision: true }));

            const [visionReport, pixelContrast] = await Promise.all([
                analyzeGeneratedImageWithVision(resultImage),
                analyzeImageContrast(resultImage)
            ]);

            // Aplicar corrección de contraste SOLO si la sección NO está bloqueada por el usuario
            const isHeaderLocked = plan.layoutConfig.lockedSections?.includes('header');
            const isGridLocked = plan.layoutConfig.lockedSections?.includes('grid');
            const isBoxLocked = plan.layoutConfig.lockedSections?.includes('box');

            if (!isHeaderLocked && pixelContrast.isHeaderDark) {
                plan.layoutConfig.textColor = '#FFFFFF';
                plan.layoutConfig.headerBackdrop = plan.layoutConfig.headerBackdrop === 'none' ? 'glass' : plan.layoutConfig.headerBackdrop;
            }
            if (!isGridLocked && !isBoxLocked && pixelContrast.isGridDark) {
                plan.layoutConfig.gridTextColor = '#FFFFFF';
                plan.layoutConfig.wordBoxTextColor = '#FFFFFF';
                if (plan.layoutConfig.wordBoxVariant === 'none') plan.layoutConfig.wordBoxVariant = 'glass_dark';
            }

            const newVersion: GenerationVersion = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                imageUrl: resultImage,
                promptUsed: plan.suggestedPrompt,
                designPlan: plan,
                visionAnalysis: visionReport,
                optionsSnapshot: {
                    visualStyle: plan.recommendedStyle,
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
