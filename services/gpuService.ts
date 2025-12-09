/**
 * GPU Service - Cliente para la API de Template Engine (GPU Boost)
 * Maneja la comunicación con los endpoints de ComfyUI y GPU
 */

const API_BASE = 'http://localhost:8000/api/template-engine';

// === Types ===

export interface GPUInfo {
    index: number;
    name: string;
    total_memory_gb: number;
    free_memory_gb: number;
    used_memory_gb: number;
    compute_capability: string;
}

export interface GPUStatus {
    success: boolean;
    data: {
        has_nvidia: boolean;
        has_cuda: boolean;
        cuda_version: string | null;
        pytorch_version: string | null;
        recommended_device: string;
        can_run_ml: boolean;
        gpus: GPUInfo[];
    };
}

export interface ComfyStatus {
    available: boolean;
    url: string;
    system_stats?: {
        system: {
            os: string;
            comfyui_version: string;
        };
        devices: Array<{
            name: string;
            type: string;
            vram_total: number;
            vram_free: number;
        }>;
    };
}

export interface ComfyGenerateRequest {
    prompt: string;
    negative_prompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    cfg_scale?: number;
    seed?: number;
    checkpoint?: string;
}

export interface ComfyDecorateRequest {
    image_base64: string;
    prompt: string;
    negative_prompt?: string;
    denoise?: number;
    steps?: number;
    cfg_scale?: number;
    seed?: number;
    checkpoint?: string;
}

export interface ComfyGenerateResponse {
    success: boolean;
    image: string; // base64
}

// === API Functions ===

/**
 * Get Template Engine module status
 */
export async function getModuleStatus(): Promise<{
    module: string;
    version: string;
    status: string;
    capabilities: string[];
}> {
    const response = await fetch(`${API_BASE}/status`);
    if (!response.ok) throw new Error('Error fetching module status');
    return response.json();
}

/**
 * Get GPU status and CUDA information
 */
export async function getGPUStatus(): Promise<GPUStatus> {
    const response = await fetch(`${API_BASE}/gpu-status`);
    if (!response.ok) throw new Error('Error fetching GPU status');
    return response.json();
}

/**
 * Check if ComfyUI is running and available
 */
export async function getComfyStatus(): Promise<ComfyStatus> {
    const response = await fetch(`${API_BASE}/comfy/status`);
    if (!response.ok) throw new Error('Error fetching ComfyUI status');
    return response.json();
}

/**
 * Clear GPU memory cache
 */
export async function clearGPUCache(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/gpu/clear-cache`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Error clearing GPU cache');
    return response.json();
}

/**
 * Check if enough GPU memory is available
 */
export async function checkGPUMemory(requiredGB: number): Promise<{
    required_gb: number;
    has_enough_memory: boolean;
    recommended_device: string;
    gpus: GPUInfo[];
}> {
    const response = await fetch(`${API_BASE}/gpu/memory-check/${requiredGB}`);
    if (!response.ok) throw new Error('Error checking GPU memory');
    return response.json();
}

/**
 * Generate image using ComfyUI (txt2img)
 * Requires ComfyUI to be running
 */
export async function generateWithComfy(
    request: ComfyGenerateRequest
): Promise<ComfyGenerateResponse> {
    const response = await fetch(`${API_BASE}/comfy/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error generating with ComfyUI');
    }

    return response.json();
}

/**
 * Decorate/enhance puzzle using ComfyUI (img2img)
 * Requires ComfyUI to be running
 */
export async function decorateWithComfy(
    request: ComfyDecorateRequest
): Promise<ComfyGenerateResponse> {
    const response = await fetch(`${API_BASE}/comfy/decorate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error decorating with ComfyUI');
    }

    return response.json();
}

// === Utility Functions ===

/**
 * Check if GPU Boost is available (GPU + ComfyUI ready)
 */
export async function isGPUBoostReady(): Promise<{
    ready: boolean;
    gpuAvailable: boolean;
    comfyAvailable: boolean;
    gpuName: string | null;
    vramFreeGB: number | null;
}> {
    try {
        const [gpuStatus, comfyStatus] = await Promise.all([
            getGPUStatus(),
            getComfyStatus()
        ]);

        const gpuAvailable = gpuStatus.data?.has_cuda && gpuStatus.data?.gpus?.length > 0;
        const comfyAvailable = comfyStatus.available;
        const gpu = gpuStatus.data?.gpus?.[0];

        return {
            ready: gpuAvailable && comfyAvailable,
            gpuAvailable,
            comfyAvailable,
            gpuName: gpu?.name || null,
            vramFreeGB: gpu?.free_memory_gb || null
        };
    } catch {
        return {
            ready: false,
            gpuAvailable: false,
            comfyAvailable: false,
            gpuName: null,
            vramFreeGB: null
        };
    }
}

/**
 * Smart generate - Uses ComfyUI if available, falls back to API
 */
export async function smartGenerate(
    prompt: string,
    options: {
        preferGPU?: boolean;
        width?: number;
        height?: number;
        fallbackFn?: (prompt: string) => Promise<string>;
    } = {}
): Promise<{ image: string; usedGPU: boolean }> {
    const { preferGPU = true, width = 512, height = 512, fallbackFn } = options;

    if (preferGPU) {
        const status = await isGPUBoostReady();

        if (status.ready) {
            try {
                const result = await generateWithComfy({
                    prompt,
                    width,
                    height,
                    steps: 20,
                    cfg_scale: 7.0
                });
                return { image: result.image, usedGPU: true };
            } catch (error) {
                console.warn('GPU generation failed, falling back:', error);
            }
        }
    }

    // Fallback to API if GPU not available or failed
    if (fallbackFn) {
        const image = await fallbackFn(prompt);
        return { image, usedGPU: false };
    }

    throw new Error('GPU not available and no fallback provided');
}

export default {
    getModuleStatus,
    getGPUStatus,
    getComfyStatus,
    clearGPUCache,
    checkGPUMemory,
    generateWithComfy,
    decorateWithComfy,
    isGPUBoostReady,
    smartGenerate
};
