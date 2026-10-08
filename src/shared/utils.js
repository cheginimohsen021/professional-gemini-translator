class Utils {
  static formatErrorMessage(error) {
    if (!error) {
      return 'Unknown error';
    }

    if (error.isAuthError) {
      return 'Invalid or expired Gemini API key.';
    }

    if (error.isRateLimitError || error.isQuotaError) {
      return 'Gemini API quota or rate limit exceeded.';
    }

    if (error.message && error.message.includes('timeout')) {
      return 'The request timed out. Please check your connection and try again.';
    }

    if (error.message && error.message.includes('No suitable translation models')) {
      return 'No compatible Gemini models were returned for this key.';
    }

    return error.message || 'Unexpected error';
  }

  static log(context, level = 'log', message, data = null) {
    const prefix = `[${context}]`;
    if (data) {
      console[level](prefix, message, data);
    } else {
      console[level](prefix, message);
    }
  }

  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static sanitizeText(value) {
    const node = document.createElement('div');
    node.textContent = value || '';
    return node.innerHTML;
  }
}

window.Utils = Utils;
