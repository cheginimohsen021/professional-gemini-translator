if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === 'extractContent') {
      try {
        const clone = document.documentElement.cloneNode(true);
        const blocked = ['script', 'style', 'noscript', 'meta', 'link', '[role="navigation"]', '[role="complementary"]', '.ad', '.advertisement', '.sidebar'];
        blocked.forEach((selector) => clone.querySelectorAll(selector).forEach((node) => node.remove()));

        const contentElement = clone.querySelector('article') || clone.querySelector('main') || clone.body || clone.documentElement;
        const plainText = (contentElement.innerText || contentElement.textContent || '').trim();

        sendResponse({
          success: true,
          content: {
            html: (contentElement.innerHTML || '').substring(0, 1000000),
            plainText: plainText.substring(0, 1000000),
            title: document.title || 'Untitled page',
            language: document.documentElement.lang || null
          }
        });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }
  });
}
