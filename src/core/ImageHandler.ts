import { ImageData, EditorConfig } from '../types';

export class ImageHandler {
  constructor(private editor: HTMLElement, private config: EditorConfig, private scheduleChange: () => void) {}

  async openDialog(): Promise<void> {
    if (this.config.onImageUrlRequest) {
      try { const url = await this.config.onImageUrlRequest(); if (url) this.insert({ src: url, alt: this.config.image?.defaultAltText || 'ފޮޓޯ' }); } catch (e){ console.error('Image dialog error', e);} return; }
    const url = prompt('Photo URL:', 'https://'); if (url && url.trim()){ const alt = prompt('Alt text:', 'alt'); this.insert({ src: url.trim(), alt: alt || 'photo' }); }
  }

  insert(data: ImageData): void {
    let md = `![${data.alt || this.config.image?.defaultAltText || ''}](${data.src}`; if (data.title) md += ` "${data.title}"`; md += ')'; const protectedMd = `\n${md}\n`;
    const sel = window.getSelection(); if (sel && sel.rangeCount>0){ const range = sel.getRangeAt(0); range.deleteContents(); range.insertNode(document.createTextNode(protectedMd)); range.collapse(false);} this.scheduleChange();
  }
}
