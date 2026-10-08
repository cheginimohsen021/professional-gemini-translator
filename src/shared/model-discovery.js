class ModelDiscovery {
  constructor(apiClient, storageManager) {
    this.apiClient = apiClient;
    this.storageManager = storageManager;
  }

  isLikelyTextModel(modelName) {
    const name = String(modelName || '').toLowerCase();
    if (!name) return false;

    if (/(embed|embedding|image|video|audio|tts|voice|transcription|vision)/i.test(name)) {
      return false;
    }

    if (/gemini/i.test(name)) {
      return true;
    }

    return false;
  }

  supportsGenerateContent(model) {
    if (!model) {
      return false;
    }

    if (Array.isArray(model.supportedGenerationMethods)) {
      return model.supportedGenerationMethods.includes('generateContent');
    }

    // Some models omit the field; if the name looks like a text model, allow it.
    return this.isLikelyTextModel(model.name);
  }

  async fetchAvailableModels() {
    const allModels = [];
    let nextPageToken = null;
    let pages = 0;

    do {
      const data = await this.apiClient.listModels(100, nextPageToken);
      if (!Array.isArray(data.models)) {
        throw new Error('Invalid model list payload returned by Gemini API');
      }

      allModels.push(...data.models);
      nextPageToken = data.nextPageToken;
      pages += 1;

      if (pages >= 10) {
        break;
      }
    } while (nextPageToken);

    const filtered = allModels.filter((model) => {
      if (!model || !model.name) {
        return false;
      }

      const name = model.name.toLowerCase();
      const allowed = this.isLikelyTextModel(model.name) && this.supportsGenerateContent(model);

      if (!allowed) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const aIsFlash = /flash/i.test(a.name);
      const bIsFlash = /flash/i.test(b.name);
      if (aIsFlash && !bIsFlash) return 1;
      if (!aIsFlash && bIsFlash) return -1;
      return b.name.localeCompare(a.name);
    });

    await this.storageManager.setCachedModels(filtered);
    return filtered;
  }

  async getAvailableModels(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = await this.storageManager.getCachedModels();
      if (cached && Array.isArray(cached) && cached.length) {
        return cached;
      }
    }

    return this.fetchAvailableModels();
  }

  formatModelForUI(model) {
    const id = model.name;
    const displayName = id
      .replace(/^models\//i, '')
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return {
      id,
      name: id,
      displayName,
      inputTokenLimit: model.inputTokenLimit || 'unknown',
      outputTokenLimit: model.outputTokenLimit || 'unknown',
      description: `Gemini model: ${displayName}`
    };
  }
}

window.ModelDiscovery = ModelDiscovery;
