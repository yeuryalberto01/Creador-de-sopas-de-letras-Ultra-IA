
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

// --- ADAPTADOR 2: PYTHON API (Futuro - Para cuando conectes tu backend) ---
/*
class PythonAPIProvider implements IStorageProvider {
  async loadKnowledgeBase() {
     const res = await fetch('http://localhost:8000/api/memory');
     return await res.json();
  }
  // ... implementación real conectada a SQL/Mongo
}
*/

// --- FACTORY: Aquí decides qué motor usar ---
// Para cambiar a Python, solo cambiarías: return new PythonAPIProvider();
export const StorageFactory = {
  getProvider: (): IStorageProvider => {
    return new LocalStorageProvider();
  }
};
