class OptionsController {
  constructor() {
    this.storageManager = new StorageManager();
  }

  async init() {
    this.cacheElements();
    this.bindEvents();
    await this.loadApiKey();
  }

  cacheElements() {
    this.apiKeyInput = document.getElementById('api-key-input');
    this.toggleBtn = document.getElementById('toggle-api-key-btn');
    this.saveBtn = document.getElementById('save-api-key-btn');
    this.testBtn = document.getElementById('test-api-key-btn');
    this.removeBtn = document.getElementById('remove-api-key-btn');
    this.statusBox = document.getElementById('api-status');
  }

  bindEvents() {
    this.toggleBtn.addEventListener('click', () => this.toggleVisibility());
    this.saveBtn.addEventListener('click', () => this.saveApiKey());
    this.testBtn.addEventListener('click', () => this.testApiKey());
    this.removeBtn.addEventListener('click', () => this.removeApiKey());
  }

  async loadApiKey() {
    const key = await this.storageManager.getApiKey();
    if (key) {
      this.apiKeyInput.value = key;
    }
  }

  toggleVisibility() {
    const isPassword = this.apiKeyInput.type === 'password';
    this.apiKeyInput.type = isPassword ? 'text' : 'password';
    this.toggleBtn.textContent = isPassword ? 'Hide' : 'Show';
  }

  showStatus(message, type = 'info') {
    this.statusBox.textContent = message;
    this.statusBox.className = `status-box ${type}`;
    this.statusBox.classList.remove('hidden');
  }

  async saveApiKey() {
    const value = this.apiKeyInput.value.trim();
    if (!value) {
      this.showStatus('Please enter a Gemini API key.', 'error');
      return;
    }

    if (!GeminiApiClient.isValidApiKeyFormat(value)) {
      this.showStatus('The API key format appears invalid. Please verify it and try again.', 'error');
      return;
    }

    try {
      await this.storageManager.setApiKey(value);
      this.showStatus('API key saved successfully.', 'success');
    } catch (error) {
      this.showStatus(Utils.formatErrorMessage(error), 'error');
    }
  }

  async testApiKey() {
    const value = this.apiKeyInput.value.trim();
    if (!value) {
      this.showStatus('Please enter a Gemini API key.', 'error');
      return;
    }

    try {
      this.showStatus('Testing API key...', 'info');
      const client = new GeminiApiClient(value);
      const valid = await client.testApiKey();
      if (valid) {
        this.showStatus('API key is valid and can access Gemini models.', 'success');
      } else {
        this.showStatus('The API key is not accepted or model access is unavailable.', 'error');
      }
    } catch (error) {
      this.showStatus(Utils.formatErrorMessage(error), 'error');
    }
  }

  async removeApiKey() {
    if (!window.confirm('Remove the stored Gemini API key?')) {
      return;
    }

    try {
      await this.storageManager.clearApiKey();
      this.apiKeyInput.value = '';
      this.showStatus('API key removed.', 'success');
    } catch (error) {
      this.showStatus(Utils.formatErrorMessage(error), 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const controller = new OptionsController();
  await controller.init();
});
