import React from 'react';
import ReactMarkdown from 'react-markdown';
import { OutputRenderer } from './OutputRenderer';

export class MarkdownRenderer implements OutputRenderer {
  format = 'markdown';

  render(content: string): React.ReactNode {
    return React.createElement(ReactMarkdown, null, content);
  }

  getFileExtension(): string {
    return '.md';
  }

  getMimeType(): string {
    return 'text/markdown';
  }
}

export const markdownRenderer = new MarkdownRenderer();
