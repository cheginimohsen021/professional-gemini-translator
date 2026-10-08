class MessageValidator {
  constructor() {
    this.MESSAGE_TYPES = {
      REQUEST_MODELS: 'REQUEST_MODELS',
      REFRESH_MODELS: 'REFRESH_MODELS',
      TRANSLATE_PAGE: 'TRANSLATE_PAGE',
      TRANSLATE_FILE: 'TRANSLATE_FILE',
      GET_SETTINGS: 'GET_SETTINGS',
      UPDATE_SETTINGS: 'UPDATE_SETTINGS',
      SET_API_KEY: 'SET_API_KEY',
      GET_API_KEY_STATUS: 'GET_API_KEY_STATUS'
    };

    this.SCHEMAS = {
      [this.MESSAGE_TYPES.REQUEST_MODELS]: { type: 'object', required: [], properties: {} },
      [this.MESSAGE_TYPES.REFRESH_MODELS]: { type: 'object', required: [], properties: {} },
      [this.MESSAGE_TYPES.GET_SETTINGS]: { type: 'object', required: [], properties: {} },
      [this.MESSAGE_TYPES.GET_API_KEY_STATUS]: { type: 'object', required: [], properties: {} },
      [this.MESSAGE_TYPES.UPDATE_SETTINGS]: {
        type: 'object',
        required: [],
        properties: {
          sourceLanguage: { type: 'string' },
          targetLanguage: { type: 'string' },
          selectedModel: { type: 'string' },
          translationStyle: { type: 'string' },
          preserveHtmlStructure: { type: 'boolean' },
          excludeCodeBlocks: { type: 'boolean' }
        }
      },
      [this.MESSAGE_TYPES.SET_API_KEY]: {
        type: 'object',
        required: ['apiKey'],
        properties: {
          apiKey: { type: 'string', minLength: 1 }
        }
      },
      [this.MESSAGE_TYPES.TRANSLATE_PAGE]: {
        type: 'object',
        required: ['sourceLanguage', 'targetLanguage', 'selectedModel'],
        properties: {
          sourceLanguage: { type: 'string' },
          targetLanguage: { type: 'string' },
          selectedModel: { type: 'string' },
          translationStyle: { type: 'string' }
        }
      },
      [this.MESSAGE_TYPES.TRANSLATE_FILE]: {
        type: 'object',
        required: ['fileContent', 'fileName', 'sourceLanguage', 'targetLanguage', 'selectedModel'],
        properties: {
          fileContent: { type: 'string' },
          fileName: { type: 'string' },
          sourceLanguage: { type: 'string' },
          targetLanguage: { type: 'string' },
          selectedModel: { type: 'string' },
          translationStyle: { type: 'string' }
        }
      }
    };
  }

  validate(type, message) {
    if (!this.SCHEMAS[type]) {
      throw new Error(`Unknown message type: ${type}`);
    }

    const schema = this.SCHEMAS[type];
    if (!message || typeof message !== 'object') {
      throw new Error('Message payload must be an object');
    }

    for (const field of schema.required || []) {
      if (!(field in message)) {
        throw new Error(`Missing required message field: ${field}`);
      }
    }

    for (const [key, rule] of Object.entries(schema.properties || {})) {
      if (key in message) {
        const value = message[key];
        if (rule.type && typeof value !== rule.type) {
          throw new Error(`Field ${key} must be of type ${rule.type}`);
        }
        if (rule.minLength && value.length < rule.minLength) {
          throw new Error(`Field ${key} is too short`);
        }
      }
    }

    return true;
  }

  validateSafe(type, message) {
    try {
      this.validate(type, message);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

window.MessageValidator = MessageValidator;
