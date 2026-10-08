const DEFAULT_SETTINGS = {
  sourceLanguage: 'auto',
  targetLanguage: 'en',
  selectedModel: '',
  translationStyle: 'natural',
  preserveHtmlStructure: true,
  excludeCodeBlocks: true
};

class StorageManager {
  constructor() {
    this.storage = chrome.storage.local;
    this.keys = {
      apiKey: 'gemini_api_key',
      cacheModels: 'gemini_cached_models',
      cacheStamp: 'gemini_cached_models_stamp',
      settings: 'gemini_settings',
      history: 'gemini_translation_history'
    };
    this.cacheTtlMs = 24 * 60 * 60 * 1000;
  }

  async getApiKey() {
    const result = await this.storage.get(this.keys.apiKey);
    return result[this.keys.apiKey] || null;
  }

  async setApiKey(apiKey) {
    if (typeof apiKey !== 'string') {
      throw new Error('API key must be a string');
    }
    await this.storage.set({ [this.keys.apiKey]: apiKey.trim() });
  }

  async clearApiKey() {
    await this.storage.remove(this.keys.apiKey);
  }

  async getCachedModels() {
    const result = await this.storage.get([this.keys.cacheModels, this.keys.cacheStamp]);
    const cached = result[this.keys.cacheModels];
    const stamp = result[this.keys.cacheStamp];

    if (!cached || !stamp) {
      return null;
    }

    if (Date.now() - stamp > this.cacheTtlMs) {
      return null;
    }

    return cached;
  }

  async setCachedModels(models) {
    if (!Array.isArray(models)) {
      throw new Error('Cached model list must be an array');
    }

    await this.storage.set({
      [this.keys.cacheModels]: models,
      [this.keys.cacheStamp]: Date.now()
    });
  }

  async clearCachedModels() {
    await this.storage.remove([this.keys.cacheModels, this.keys.cacheStamp]);
  }

  async getSettings() {
    const result = await this.storage.get(this.keys.settings);
    return { ...DEFAULT_SETTINGS, ...(result[this.keys.settings] || {}) };
  }

  async updateSettings(updates) {
    const current = await this.getSettings();
    const merged = { ...current, ...updates };
    await this.storage.set({ [this.keys.settings]: merged });
    return merged;
  }

  async addHistory(entry) {
    const result = await this.storage.get(this.keys.history);
    const existing = Array.isArray(result[this.keys.history]) ? result[this.keys.history] : [];
    const next = [...existing, { ...entry, timestamp: Date.now() }].slice(-50);
    await this.storage.set({ [this.keys.history]: next });
  }

  async getHistory(limit = 10) {
    const result = await this.storage.get(this.keys.history);
    const history = Array.isArray(result[this.keys.history]) ? result[this.keys.history] : [];
    return history.slice(-limit).reverse();
  }
}

window.StorageManager = StorageManager;
