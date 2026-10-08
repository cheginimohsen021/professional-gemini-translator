class TranslationEngine {
  constructor() {
    this.chunkChars = 4000;
    this.overlapChars = 200;
  }

  buildTranslationPrompt(content, sourceLang, targetLang, style = 'natural', options = {}) {
    const preserveHtml = options.preserveHtml !== undefined ? options.preserveHtml : true;
    const excludeCode = options.excludeCode !== undefined ? options.excludeCode : true;

    const sourceText = sourceLang === 'auto' ? 'Detect the source language automatically.' : `Source language: ${sourceLang}`;
    const styleMap = {
      faithful: 'Preserve the original meaning, tone, and structure as closely as possible. Avoid unnecessary paraphrasing.',
      natural: 'Translate naturally and idiomatically for the target language.',
      formal: 'Use a formal, professional writing style appropriate for business or official contexts.',
      technical: 'Preserve technical meaning and specialized terminology accurately.'
    };

    const formatInstruction = preserveHtml
      ? 'Preserve the HTML structure and tags as much as possible. Only translate the human-readable text content.'
      : 'Translate plain text only, without preserving any HTML structure.';

    const codeInstruction = excludeCode
      ? 'Do not translate code, URLs, HTML attributes, CSS, JavaScript, or other technical text that should remain unchanged.'
      : 'Translate all text, including technical strings if present.';

    return `You are a professional translation assistant.

${sourceText}
Target language: ${targetLang}
Translation style: ${styleMap[style] || styleMap.natural}

Instructions:
- ${formatInstruction}
- ${codeInstruction}
- Keep meaning, terminology, tone, and formatting consistent.
- Preserve headings, lists, tables, and document structure when possible.
- Output only the translated content.

Content to translate:
${content}`;
  }

  chunkContent(content) {
    if (typeof content !== 'string' || content.length <= this.chunkChars) {
      return [content || ''];
    }

    const chunks = [];
    let index = 0;

    while (index < content.length) {
      let end = index + this.chunkChars;
      if (end < content.length) {
        const lastBreak = Math.max(
          content.lastIndexOf('\n\n', end),
          content.lastIndexOf('\n', end),
          content.lastIndexOf('. ', end),
          content.lastIndexOf(' ', end)
        );

        if (lastBreak > index + this.chunkChars * 0.5) {
          end = lastBreak + 1;
        }
      }

      const chunk = content.slice(index, end).trim();
      if (chunk) {
        chunks.push(chunk);
      }

      const step = Math.max(1, end - index - this.overlapChars);
      index += step;
    }

    return chunks;
  }

  reconstructChunks(chunks, translatedChunks) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return '';
    }

    if (chunks.length === 1) {
      return translatedChunks[0] || '';
    }

    let reconstructed = translatedChunks[0] || '';
    for (let i = 1; i < translatedChunks.length; i++) {
      const current = translatedChunks[i] || '';
      const overlap = reconstructed.slice(-this.overlapChars);
      if (overlap && current.startsWith(overlap)) {
        reconstructed += current.slice(overlap.length);
      } else {
        reconstructed += current;
      }
    }

    return reconstructed;
  }
}

window.TranslationEngine = TranslationEngine;
