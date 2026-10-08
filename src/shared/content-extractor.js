class ContentExtractor {
  extractPageContent() {
    const clone = document.documentElement.cloneNode(true);
    const removeSelectors = [
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

    removeSelectors.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    });

    const contentElement =
      clone.querySelector('article') ||
      clone.querySelector('main') ||
      clone.querySelector('[role="main"]') ||
      clone.querySelector('.content') ||
      clone.body ||
      clone.documentElement;

    const html = contentElement.innerHTML || '';
    const plainText = (contentElement.innerText || contentElement.textContent || '').trim();

    return {
      html: html.substring(0, 1000000),
      plainText: plainText.substring(0, 1000000),
      title: document.title || 'Untitled page',
      language: document.documentElement.lang || null
    };
  }
}

window.ContentExtractor = ContentExtractor;
