class GeminiApiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.timeoutMs = 30000;
  }

  static isValidApiKeyFormat(apiKey) {
    if (typeof apiKey !== 'string') {
      return false;
    }
    return apiKey.trim().length > 20;
  }

  async request(endpoint, { method = 'GET', body = null, params = {} } = {}) {
    const query = new URLSearchParams({ key: this.apiKey, ...params });
    const url = `${this.baseUrl}${endpoint}?${query.toString()}`;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (_) {
          // ignore parse errors
        }

        const message = errorData.error?.message || `HTTP ${response.status}`;
        const error = new Error(message);
        error.code = response.status;
        error.isAuthError = response.status === 401 || response.status === 403;
        error.isRateLimitError = response.status === 429;
        error.isQuotaError = response.status === 429;
        error.raw = errorData;
        throw error;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out while contacting Gemini API');
      }
      throw error;
    }
  }

  async listModels(pageSize = 100, pageToken = null) {
    const params = { pageSize: String(pageSize) };
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await this.request('/models', { params });
    return {
      models: Array.isArray(response.models) ? response.models : [],
      nextPageToken: response.nextPageToken || null
    };
  }

  async generateContent(model, requestBody) {
    const modelName = model.startsWith('models/') ? model : `models/${model}`;
    return this.request(`/${modelName}:generateContent`, {
      method: 'POST',
      body: requestBody
    });
  }

  async testApiKey() {
    try {
      const result = await this.listModels(10);
      return Array.isArray(result.models);
    } catch (error) {
      return false;
    }
  }
}

window.GeminiApiClient = GeminiApiClient;
