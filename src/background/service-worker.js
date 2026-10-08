const serviceWorkerImports = [
  '../shared/utils.js',
  '../shared/storage-manager.js',
  '../shared/message-validator.js',
  '../shared/api-client.js',
  '../shared/model-discovery.js',
  '../shared/translation-engine.js',
  '../shared/file-processor.js',
  '../shared/content-extractor.js',
  '../shared/translation-service.js'
];

importScripts(...serviceWorkerImports);

let storageManager;
let apiClient;
let modelDiscovery;
let translationService;
let messageValidator;

async function initializeModules() {
  storageManager = new StorageManager();
  messageValidator = new MessageValidator();
  const apiKey = await storageManager.getApiKey();
  if (apiKey) {
    apiClient = new GeminiApiClient(apiKey);
    modelDiscovery = new ModelDiscovery(apiClient, storageManager);
  }

  translationService = new TranslationService();
  if (apiClient) {
    translationService.setApiClient(apiClient);
  }
}

async function handleGetModels() {
  if (!apiClient || !modelDiscovery) {
    throw new Error('Gemini API key is not configured.');
  }

  const models = await modelDiscovery.getAvailableModels(false);
  return models.map((model) => modelDiscovery.formatModelForUI(model));
}

async function handleRefreshModels() {
  if (!apiClient || !modelDiscovery) {
    throw new Error('Gemini API key is not configured.');
  }

  const models = await modelDiscovery.getAvailableModels(true);
  return models.map((model) => modelDiscovery.formatModelForUI(model));
}

async function handleSetApiKey(payload) {
  const apiKey = payload.apiKey;
  if (!GeminiApiClient.isValidApiKeyFormat(apiKey)) {
    throw new Error('API key format appears invalid.');
  }

  await storageManager.setApiKey(apiKey);
  apiClient = new GeminiApiClient(apiKey);
  modelDiscovery = new ModelDiscovery(apiClient, storageManager);
  translationService.setApiClient(apiClient);
  await storageManager.clearCachedModels();

  const valid = await apiClient.testApiKey();
  if (!valid) {
    throw new Error('The API key is invalid or does not have access to Gemini models.');
  }

  return { success: true };
}

async function handleGetApiKeyStatus() {
  const key = await storageManager.getApiKey();
  return {
    hasApiKey: !!key,
    keyPreview: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : null
  };
}

async function handleGetSettings() {
  return storageManager.getSettings();
}

async function handleUpdateSettings(payload) {
  return storageManager.updateSettings(payload);
}

async function handleTranslatePage(payload) {
  const { sourceLanguage, targetLanguage, selectedModel, translationStyle = 'natural' } = payload;

  if (!selectedModel) {
    throw new Error('No Gemini model selected.');
  }

  if (!apiClient) {
    throw new Error('Gemini API key is not configured.');
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (!activeTab || !activeTab.id) {
    throw new Error('No active tab found.');
  }

  const result = await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: extractPageContentInTab
  });

  if (!result || !result.length || !result[0] || !result[0].result) {
    throw new Error('Failed to extract content from the current page.');
  }

  const extracted = result[0].result;
  const plainText = (extracted.plainText || '').trim();
  if (!plainText) {
    throw new Error('The page contains no readable text.');
  }

  const settings = await storageManager.getSettings();
  const translated = await translationService.translateText(
    plainText,
    sourceLanguage,
    targetLanguage,
    selectedModel,
    translationStyle,
    settings
  );

  await storageManager.addHistory({
    type: 'page',
    source: extracted.title || 'Current page',
    target: targetLanguage,
    model: selectedModel
  });

  return {
    originalText: plainText,
    translatedText: translated,
    title: extracted.title || 'Current page',
    model: selectedModel
  };
}

async function handleTranslateFile(payload) {
  const { fileContent, fileName, sourceLanguage, targetLanguage, selectedModel, translationStyle = 'natural' } = payload;

  if (!selectedModel) {
    throw new Error('No Gemini model selected.');
  }

  if (!apiClient) {
    throw new Error('Gemini API key is not configured.');
  }

  if (!fileContent || fileContent.trim().length === 0) {
    throw new Error('The uploaded file is empty.');
  }

  const settings = await storageManager.getSettings();
  const translated = await translationService.translateText(
    fileContent,
    sourceLanguage,
    targetLanguage,
    selectedModel,
    translationStyle,
    settings
  );

  await storageManager.addHistory({
    type: 'file',
    source: fileName || 'Uploaded file',
    target: targetLanguage,
    model: selectedModel
  });

  return {
    originalText: fileContent,
    translatedText: translated,
    fileName: fileName || 'Uploaded file',
    model: selectedModel
  };
}

function extractPageContentInTab() {
  const clone = document.documentElement.cloneNode(true);

  const selectors = [
    'script',
    'style',
    'noscript',
    'meta',
    'link',
    '[role="navigation"]',
    '[role="complementary"]',
    '.ad',
    '.advertisement',
    '.sidebar',
    'header nav',
    'footer nav'
  ];

  selectors.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((node) => node.remove());
  });

  const content =
    clone.querySelector('article') ||
    clone.querySelector('main') ||
    clone.querySelector('[role="main"]') ||
    clone.querySelector('.content') ||
    clone.body ||
    clone.documentElement;

  const plainText = (content.innerText || content.textContent || '').trim();

  return {
    html: (content.innerHTML || '').substring(0, 1000000),
    plainText: plainText.substring(0, 1000000),
    title: document.title || 'Untitled page'
  };
}

chrome.runtime.onInstalled.addListener(() => {
  initializeModules();
});

chrome.runtime.onStartup.addListener(() => {
  initializeModules();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    sendResponse({ ok: false, error: 'Invalid message format' });
    return false;
  }

  if (sender.id && sender.id !== chrome.runtime.id) {
    sendResponse({ ok: false, error: 'Unauthorized sender' });
    return false;
  }

  const validation = messageValidator.validateSafe(message.type, message.payload || {});
  if (!validation.valid) {
    sendResponse({ ok: false, error: validation.error });
    return false;
  }

  (async () => {
    try {
      let result;

      switch (message.type) {
        case messageValidator.MESSAGE_TYPES.REQUEST_MODELS:
          result = await handleGetModels();
          break;
        case messageValidator.MESSAGE_TYPES.REFRESH_MODELS:
          result = await handleRefreshModels();
          break;
        case messageValidator.MESSAGE_TYPES.GET_SETTINGS:
          result = await handleGetSettings();
          break;
        case messageValidator.MESSAGE_TYPES.UPDATE_SETTINGS:
          result = await handleUpdateSettings(message.payload);
          break;
        case messageValidator.MESSAGE_TYPES.SET_API_KEY:
          result = await handleSetApiKey(message.payload);
          break;
        case messageValidator.MESSAGE_TYPES.GET_API_KEY_STATUS:
          result = await handleGetApiKeyStatus();
          break;
        case messageValidator.MESSAGE_TYPES.TRANSLATE_PAGE:
          result = await handleTranslatePage(message.payload);
          break;
        case messageValidator.MESSAGE_TYPES.TRANSLATE_FILE:
          result = await handleTranslateFile(message.payload);
          break;
        default:
          throw new Error(`Unsupported message type: ${message.type}`);
      }

      sendResponse({ ok: true, data: result });
    } catch (error) {
      const friendly = Utils.formatErrorMessage(error);
      sendResponse({ ok: false, error: friendly });
    }
  })();

  return true;
});

initializeModules();
