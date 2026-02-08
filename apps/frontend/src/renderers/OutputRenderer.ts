import React from 'react';

export interface OutputRenderer {
  format: string;
  render(content: string): React.ReactNode;
  getFileExtension(): string;
  getMimeType(): string;
}
