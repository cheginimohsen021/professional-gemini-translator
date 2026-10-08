class TranslationService {
  constructor() {
    this.apiClient = null;
    this.translationEngine = new TranslationEngine();
  }

  setApiClient(apiClient) {
    this.apiClient = apiClient;
  }

  async translateText(content, sourceLanguage, targetLanguage, modelName, style = 'natural', settings = {}) {
    if (!this.apiClient) {
      throw new Error('Gemini API client is not initialized');
    }

    const chunks = this.translationEngine.chunkContent(content);
    const translated = [];

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      const prompt = this.translationEngine.buildTranslationPrompt(chunk, sourceLanguage, targetLanguage, style, {
        preserveHtml: settings.preserveHtmlStructure !== false,
        excludeCode: settings.excludeCodeBlocks !== false
      });

      const response = await this.apiClient.generateContent(modelName, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4000
        }
      });

      const extracted = this.extractGeneratedText(response);
      if (!extracted) {
        throw new Error('Gemini returned an empty response for translation.');
      }

      translated.push(extracted);

      if (i < chunks.length - 1) {
        await Utils.sleep(400);
      }
    }

    return this.translationEngine.reconstructChunks(chunks, translated);
  }

  extractGeneratedText(response) {
    if (!response || !Array.isArray(response.candidates) || !response.candidates.length) {
      return null;
    }

    const candidate = response.candidates[0];
    if (!candidate || !candidate.content || !Array.isArray(candidate.content.parts)) {
      return null;
    }

    const texts = candidate.content.parts
      .filter((part) => typeof part.text === 'string')
      .map((part) => part.text);

    return texts.join('\n');
  }
}

window.TranslationService = TranslationService;
