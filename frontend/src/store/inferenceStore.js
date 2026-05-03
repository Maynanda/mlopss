import { create } from 'zustand'
import { inferenceApi } from '../api/models'

const createTick = (modelId, get) => async () => {
  try {
    const res = await inferenceApi.getLiveData(modelId);
    if (res.data?.data?.length > 0) {
      const newRow = res.data.data[0];
      get().updatePanel(modelId, { formData: newRow });
      
      const dataRow = {};
      for (const key of Object.keys(newRow)) {
        dataRow[key] = isNaN(newRow[key]) || newRow[key] === '' ? newRow[key] : Number(newRow[key]);
      }
      const predRes = await inferenceApi.predict(modelId, [dataRow]);
      get().updatePanel(modelId, { result: predRes.data });
    }
  } catch (e) {
    console.error("Auto-poll error", e);
  }
};

export const useInferenceStore = create((set, get) => ({
  panels: {}, // { [modelId]: { formData, result, loading, explaining, autoPoll, pollInterval, intervalId } }
  hasInitialized: false,
  
  setInitialized: () => set({ hasInitialized: true }),
  
  addPanel: (modelId, feature_columns) => {
    const panels = get().panels;
    if (panels[modelId]) return;
    
    const initData = {};
    feature_columns.forEach(c => initData[c] = '');
    
    set({
      panels: {
        ...panels,
        [modelId]: {
          formData: initData,
          result: null,
          loading: false,
          explaining: false,
          autoPoll: false,
          pollInterval: 2000,
          intervalId: null
        }
      }
    });
  },
  
  removePanel: (modelId) => {
    const panels = { ...get().panels };
    const p = panels[modelId];
    if (p && p.intervalId) clearInterval(p.intervalId);
    delete panels[modelId];
    set({ panels });
  },

  updatePanel: (modelId, updates) => {
    set(state => ({
      panels: {
        ...state.panels,
        [modelId]: { ...state.panels[modelId], ...updates }
      }
    }));
  },

  toggleAutoPoll: (modelId) => {
    const p = get().panels[modelId];
    if (!p) return;
    
    if (p.autoPoll) {
      // Turn off
      if (p.intervalId) clearInterval(p.intervalId);
      get().updatePanel(modelId, { autoPoll: false, intervalId: null });
    } else {
      // Turn on
      const tick = createTick(modelId, get);
      tick(); // Run immediately
      const id = setInterval(tick, p.pollInterval);
      get().updatePanel(modelId, { autoPoll: true, intervalId: id });
    }
  },

  setPollInterval: (modelId, interval) => {
    const p = get().panels[modelId];
    if (!p) return;
    
    get().updatePanel(modelId, { pollInterval: interval });
    
    if (p.autoPoll) {
      if (p.intervalId) clearInterval(p.intervalId);
      const tick = createTick(modelId, get);
      const newId = setInterval(tick, interval);
      get().updatePanel(modelId, { intervalId: newId });
    }
  }
}));
