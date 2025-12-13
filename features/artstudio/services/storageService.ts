
import { KnowledgeBase, TrainingLogEntry } from "../lib/types";

// --- INTERFAZ DEL CONTRATO (LO QUE CUALQUIER BASE DE DATOS DEBE CUMPLIR) ---
export interface IStorageProvider {
  loadKnowledgeBase(): Promise<KnowledgeBase>;
  saveKnowledgeBase(data: KnowledgeBase): Promise<void>;
  saveLog(log: TrainingLogEntry): Promise<void>;
  clearData(): Promise<void>;
}

// --- ADAPTADOR 1: NAVEGADOR (LocalStorage) - Implementación actual ---
class LocalStorageProvider implements IStorageProvider {
  private readonly KEY = 'CENE_DATASET_MASTER_V1';

  async loadKnowledgeBase(): Promise<KnowledgeBase> {
    const data = localStorage.getItem(this.KEY);
    if (!data) {
      return {
        positiveSamples: [],
        negativeSamples: [],
        styleWeights: {},
        logs: []
      };
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error("Error corrupt memory:", e);
      return { positiveSamples: [], negativeSamples: [], styleWeights: {}, logs: [] };
    }
  }

  async saveKnowledgeBase(data: KnowledgeBase): Promise<void> {
    // Simulamos un pequeño delay para parecer una DB real
    await new Promise(resolve => requestAnimationFrame(resolve));
    localStorage.setItem(this.KEY, JSON.stringify(data));
  }

  async saveLog(log: TrainingLogEntry): Promise<void> {
    const kb = await this.loadKnowledgeBase();
    kb.logs.push(log);
    // Actualizar pesos simples
    const styleKey = log.style_used;
    const currentWeight = kb.styleWeights[styleKey] || 1.0;
    // Algoritmo simple de refuerzo
    const newWeight = log.human_rating === 1
      ? Math.min(3.0, currentWeight + 0.1)
      : Math.max(0.1, currentWeight - 0.2);

    kb.styleWeights[styleKey] = newWeight;

    await this.saveKnowledgeBase(kb);
  }

  async clearData(): Promise<void> {
    localStorage.removeItem(this.KEY);
  }
}

// --- ADAPTADOR 2: API BACKEND (NEURAL BRAIN) ---
class APIStorageProvider implements IStorageProvider {
  private readonly API_URL = 'http://localhost:8000/api/ml';

  async loadKnowledgeBase(): Promise<KnowledgeBase> {
    try {
      // 1. Fetch recent logs to rebuild state
      const response = await fetch(`${this.API_URL}/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: "", limit: 100, min_rating: -2 }) // Empty prompt gets recent
      });

      if (!response.ok) throw new Error("Backend unavailable");

      const logs: TrainingLogEntry[] = await response.json();

      // 2. Reconstruct partial KnowledgeBase from logs
      // Note: This is a simplified reconstruction. In a full system, backend would agg these.
      const kb: KnowledgeBase = {
        positiveSamples: [],
        negativeSamples: [],
        styleWeights: {},
        logs: logs
      };

      logs.forEach(log => {
        // Re-populate samples lists
        if (log.human_rating === 1) kb.positiveSamples.push(log as any);
        else kb.negativeSamples.push(log as any);

        // Re-calc weights (simple moving average approximation)
        const currentW = kb.styleWeights[log.style_used] || 1.0;
        kb.styleWeights[log.style_used] = log.human_rating === 1
          ? Math.min(3.0, currentW + 0.1)
          : Math.max(0.1, currentW - 0.2);
      });

      return kb;
    } catch (e) {
      console.error("Failed to load from Neural Brain:", e);
      // Fallback to empty if offline
      return { positiveSamples: [], negativeSamples: [], styleWeights: {}, logs: [] };
    }
  }

  async saveKnowledgeBase(data: KnowledgeBase): Promise<void> {
    // Backend manages state via individual log files. 
    // We don't save the aggregate object back to avoid race conditions.
    // Ops are atomic via saveLog.
  }

  async saveLog(log: TrainingLogEntry): Promise<void> {
    try {
      // Send to backend for permanent storage on disk (Training Path)
      await fetch(`${this.API_URL}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
    } catch (e) {
      console.error("Failed to save log to Neural Brain:", e);
    }
  }

  async clearData(): Promise<void> {
    // Optional: Implement a clear endpoint if needed
    // await fetch(`${this.API_URL}/clear`, { method: 'POST' });
  }
}

// --- FACTORY: Usando Neural Brain API ---
export const StorageFactory = {
  getProvider: (): IStorageProvider => {
    return new APIStorageProvider();
  }
};
