import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { OutputRenderer } from './OutputRenderer';

export class MarkdownRenderer implements OutputRenderer {
  format = 'markdown';

  render(content: string): React.ReactNode {
    return React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, content);
  }

  getFileExtension(): string {
    return '.md';
  }

  getMimeType(): string {
    return 'text/markdown';
  }
}

export const markdownRenderer = new MarkdownRenderer();
