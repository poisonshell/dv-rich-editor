
export interface ClipboardManagerConfig {
  editor: HTMLElement;
  getMarkdown: () => string;
  setMarkdown: (markdown: string, preserveFocus?: boolean) => void;
  scheduleChange: (source: string, immediate?: boolean) => void;
}

export class ClipboardManager {
  private editor: HTMLElement;
  private readonly getMarkdown: () => string;
  private readonly setMarkdown: (markdown: string, preserveFocus?: boolean) => void;
  private readonly scheduleChange: (source: string, immediate?: boolean) => void;

  constructor(cfg: ClipboardManagerConfig) {
    this.editor = cfg.editor;
    this.getMarkdown = cfg.getMarkdown;
    this.setMarkdown = cfg.setMarkdown;
    this.scheduleChange = cfg.scheduleChange;
  }

  public async copy(): Promise<boolean> {
    const content = this.getMarkdown();
    if (!content) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
        return true;
      }
      return this.fallbackCopy(content);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error copying to clipboard:', e);
      return this.fallbackCopy(content);
    }
  }

  public async paste(): Promise<boolean> {
    try {
      if (navigator.clipboard?.readText) {
        const content = await navigator.clipboard.readText();
        if (content.trim()) {
          this.append(content);
          return true;
        }
      }
      return false;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error pasting from clipboard:', e);
      return false;
    }
  }

  private append(content: string): void {
    const current = this.getMarkdown();
    const next = current ? current + '\n' + content : content;
    const preserve = this.editor === document.activeElement; // preserve focus if active
    this.setMarkdown(next, preserve);
    this.scheduleChange('clipboard-paste-append', true);
  }

  private fallbackCopy(content: string): boolean {
    const ta = document.createElement('textarea');
    ta.value = content;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      document.body.removeChild(ta);
      // eslint-disable-next-line no-console
      console.error('Fallback copy failed:', e);
      return false;
    }
  }
}
