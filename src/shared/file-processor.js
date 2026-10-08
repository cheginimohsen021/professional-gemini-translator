class FileProcessor {
  constructor() {
    this.maxSizeBytes = 10 * 1024 * 1024;
  }

  static supportedTypes() {
    return ['txt', 'md', 'html'];
  }

  validate(file) {
    if (!(file instanceof File)) {
      throw new Error('Invalid file object');
    }

    if (file.size > this.maxSizeBytes) {
      throw new Error('File is too large. Maximum supported size is 10MB.');
    }

    if (!file.type && !/\.(txt|md|html)$/i.test(file.name)) {
      throw new Error('File type could not be determined. Please use a .txt, .md, or .html file.');
    }
  }

  async readAsText(file) {
    this.validate(file);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read the selected file.'));
      reader.readAsText(file);
    });
  }

  async process(file) {
    const content = await this.readAsText(file);
    if (!content || content.trim().length === 0) {
      throw new Error('The selected file is empty or contains no text.');
    }

    return {
      content,
      fileName: file.name,
      type: file.type || 'text/plain'
    };
  }
}

window.FileProcessor = FileProcessor;
