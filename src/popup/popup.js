class PopupController {
  constructor() {
    this.messageValidator = new MessageValidator();
    this.storageManager = new StorageManager();
    this.currentMode = 'page';
    this.selectedFile = null;
    this.lastResult = null;
  }

  async init() {
    this.cacheElements();
    this.bindEvents();
    await this.syncUiWithApiState();
    await this.loadSettings();
  }

  cacheElements() {
    this.settingsBtn = document.getElementById('settings-btn');
    this.setupKeyBtn = document.getElementById('setup-key-btn');
    this.setupSection = document.getElementById('setup-section');
    this.mainSection = document.getElementById('main-section');
    this.progressSection = document.getElementById('progress-section');
    this.resultsSection = document.getElementById('results-section');
    this.statusBar = document.getElementById('status-bar');
    this.errorBox = document.getElementById('error-box');
    this.sourceLang = document.getElementById('source-lang');
    this.targetLang = document.getElementById('target-lang');
    this.modelSelect = document.getElementById('model-select');
    this.modelInfo = document.getElementById('model-info');
    this.styleSelect = document.getElementById('style-select');
    this.preserveHtml = document.getElementById('preserve-html');
    this.excludeCode = document.getElementById('exclude-code');
    this.translatePageBtn = document.getElementById('translate-page-btn');
    this.translateFileBtn = document.getElementById('translate-file-btn');
    this.fileUploadBtn = document.getElementById('file-upload-btn');
    this.fileInput = document.getElementById('file-input');
    this.fileName = document.getElementById('file-name');
    this.progressText = document.getElementById('progress-text');
    this.refreshModelsBtn = document.getElementById('refresh-models-btn');
    this.closeResultsBtn = document.getElementById('close-results-btn');
    this.copyResultBtn = document.getElementById('copy-result-btn');
    this.translatedText = document.getElementById('translated-text');
    this.originalText = document.getElementById('original-text');
    this.tabButtons = document.querySelectorAll('.tab');
    this.modeButtons = document.querySelectorAll('.mode');
    this.modePanels = document.querySelectorAll('.mode-panel');
    this.tabPanels = [this.translatedText, this.originalText];
  }

  bindEvents() {
    this.settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
    this.setupKeyBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
    this.refreshModelsBtn.addEventListener('click', () => this.loadModels(true));
    this.sourceLang.addEventListener('change', () => this.saveSettings());
    this.targetLang.addEventListener('change', () => this.saveSettings());
    this.modelSelect.addEventListener('change', () => this.saveSettings());
    this.styleSelect.addEventListener('change', () => this.saveSettings());
    this.preserveHtml.addEventListener('change', () => this.saveSettings());
    this.excludeCode.addEventListener('change', () => this.saveSettings());

    this.translatePageBtn.addEventListener('click', () => this.handlePageTranslate());
    this.translateFileBtn.addEventListener('click', () => this.handleFileTranslate());
    this.fileUploadBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (event) => this.handleFileSelection(event));

    this.modeButtons.forEach((button) => {
      button.addEventListener('click', () => this.switchMode(button.dataset.mode));
    });

    this.tabButtons.forEach((button) => {
      button.addEventListener('click', () => this.switchTab(button.dataset.tab));
    });

    this.closeResultsBtn.addEventListener('click', () => this.showMain());
    this.copyResultBtn.addEventListener('click', () => this.copyResult());
  }

  async syncUiWithApiState() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: this.messageValidator.MESSAGE_TYPES.GET_API_KEY_STATUS,
        payload: {}
      });

      if (response && response.ok && response.data && response.data.hasApiKey) {
        this.showMain();
        await this.loadModels(false);
      } else {
        this.showSetup();
      }
    } catch (error) {
      this.showError(Utils.formatErrorMessage(error));
    }
  }

  showSetup() {
    this.setupSection.classList.remove('hidden');
    this.mainSection.classList.add('hidden');
    this.progressSection.classList.add('hidden');
    this.resultsSection.classList.add('hidden');
  }

  showMain() {
    this.setupSection.classList.add('hidden');
    this.mainSection.classList.remove('hidden');
    this.progressSection.classList.add('hidden');
    this.resultsSection.classList.add('hidden');
    this.clearError();
  }

  showProgress(message) {
    this.progressText.textContent = message;
    this.setupSection.classList.add('hidden');
    this.mainSection.classList.add('hidden');
    this.progressSection.classList.remove('hidden');
    this.resultsSection.classList.add('hidden');
    this.clearError();
  }

  showResults() {
    const text = this.lastResult.translatedText || '';
    const original = this.lastResult.originalText || '';
    this.translatedText.textContent = text;
    this.originalText.textContent = original;

    this.setupSection.classList.add('hidden');
    this.mainSection.classList.add('hidden');
    this.progressSection.classList.add('hidden');
    this.resultsSection.classList.remove('hidden');
    this.switchTab('translated');
  }

  showStatus(message) {
    this.statusBar.textContent = message;
    this.statusBar.classList.remove('hidden');
  }

  clearStatus() {
    this.statusBar.textContent = '';
    this.statusBar.classList.add('hidden');
  }

  showError(message) {
    this.errorBox.textContent = message;
    this.errorBox.classList.remove('hidden');
  }

  clearError() {
    this.errorBox.textContent = '';
    this.errorBox.classList.add('hidden');
  }

  switchMode(mode) {
    this.currentMode = mode;
    this.modeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === mode);
    });

    this.modePanels.forEach((panel) => {
      panel.classList.toggle('hidden', panel.id !== `${mode}-mode`);
    });
  }

  switchTab(tab) {
    this.tabButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const translatedVisible = tab === 'translated';
    this.translatedText.classList.toggle('hidden', !translatedVisible);
    this.originalText.classList.toggle('hidden', translatedVisible);
  }

  async saveSettings() {
    try {
      await chrome.runtime.sendMessage({
        type: this.messageValidator.MESSAGE_TYPES.UPDATE_SETTINGS,
        payload: {
          sourceLanguage: this.sourceLang.value,
          targetLanguage: this.targetLang.value,
          selectedModel: this.modelSelect.value,
          translationStyle: this.styleSelect.value,
          preserveHtmlStructure: this.preserveHtml.checked,
          excludeCodeBlocks: this.excludeCode.checked
        }
      });
    } catch (error) {
      Utils.log('PopupController', 'warn', 'Failed to save settings', error);
    }
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: this.messageValidator.MESSAGE_TYPES.GET_SETTINGS,
        payload: {}
      });

      if (!response || !response.ok) {
        return;
      }

      const settings = response.data || {};
      this.sourceLang.value = settings.sourceLanguage || 'auto';
      this.targetLang.value = settings.targetLanguage || 'en';
      this.styleSelect.value = settings.translationStyle || 'natural';
      this.preserveHtml.checked = settings.preserveHtmlStructure !== false;
      this.excludeCode.checked = settings.excludeCodeBlocks !== false;
    } catch (error) {
      Utils.log('PopupController', 'warn', 'Failed to load settings', error);
    }
  }

  async loadModels(forceRefresh = false) {
    try {
      this.modelSelect.innerHTML = '<option value="">Loading models...</option>';

      const response = await chrome.runtime.sendMessage({
        type: forceRefresh ? this.messageValidator.MESSAGE_TYPES.REFRESH_MODELS : this.messageValidator.MESSAGE_TYPES.REQUEST_MODELS,
        payload: {}
      });

      if (!response || !response.ok) {
        throw new Error(response?.error || 'Failed to fetch models');
      }

      const models = response.data || [];
      if (!models.length) {
        this.modelSelect.innerHTML = '<option value="">No models available</option>';
        this.modelInfo.textContent = 'No compatible models were returned for this key.';
        return;
      }

      this.modelSelect.innerHTML = ' ';
      models.forEach((model) => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.displayName;
        option.title = model.description;
        this.modelSelect.appendChild(option);
      });

      const settings = await this.storageManager.getSettings();
      if (settings.selectedModel && models.some((m) => m.id === settings.selectedModel)) {
        this.modelSelect.value = settings.selectedModel;
      }

      const selected = models.find((m) => m.id === this.modelSelect.value) || models[0];
      if (selected) {
        this.modelInfo.textContent = selected.description || 'Gemini model';
      }
    } catch (error) {
      this.showError(Utils.formatErrorMessage(error));
    }
  }

  async handlePageTranslate() {
    if (!this.modelSelect.value) {
      this.showError('Please select a Gemini model first.');
      return;
    }

    try {
      this.showProgress('Preparing page translation...');
      const response = await chrome.runtime.sendMessage({
        type: this.messageValidator.MESSAGE_TYPES.TRANSLATE_PAGE,
        payload: {
          sourceLanguage: this.sourceLang.value,
          targetLanguage: this.targetLang.value,
          selectedModel: this.modelSelect.value,
          translationStyle: this.styleSelect.value
        }
      });

      if (!response || !response.ok) {
        throw new Error(response?.error || 'Translation request failed');
      }

      this.lastResult = response.data;
      this.showResults();
    } catch (error) {
      this.showError(Utils.formatErrorMessage(error));
    }
  }

  handleFileSelection(event) {
    const file = event.target.files && event.target.files[0];
    this.selectedFile = file || null;

    if (file) {
      this.fileName.textContent = `Selected: ${file.name}`;
      this.translateFileBtn.disabled = false;
    } else {
      this.fileName.textContent = 'No file selected';
      this.translateFileBtn.disabled = true;
    }
  }

  async handleFileTranslate() {
    if (!this.modelSelect.value) {
      this.showError('Please select a Gemini model first.');
      return;
    }

    if (!this.selectedFile) {
      this.showError('Please choose a file to translate.');
      return;
    }

    try {
      this.showProgress('Reading file and preparing translation...');
      const text = await this.readFileText(this.selectedFile);

      const response = await chrome.runtime.sendMessage({
        type: this.messageValidator.MESSAGE_TYPES.TRANSLATE_FILE,
        payload: {
          fileContent: text,
          fileName: this.selectedFile.name,
          sourceLanguage: this.sourceLang.value,
          targetLanguage: this.targetLang.value,
          selectedModel: this.modelSelect.value,
          translationStyle: this.styleSelect.value
        }
      });

      if (!response || !response.ok) {
        throw new Error(response?.error || 'File translation failed');
      }

      this.lastResult = response.data;
      this.showResults();
    } catch (error) {
      this.showError(Utils.formatErrorMessage(error));
    }
  }

  readFileText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read the selected file'));
      reader.readAsText(file);
    });
  }

  async copyResult() {
    try {
      await navigator.clipboard.writeText(this.lastResult?.translatedText || '');
      this.copyResultBtn.textContent = 'Copied!';
      setTimeout(() => {
        this.copyResultBtn.textContent = 'Copy result';
      }, 1600);
    } catch (error) {
      this.showError('Copy failed: ' + Utils.formatErrorMessage(error));
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const controller = new PopupController();
  controller.init();
});
