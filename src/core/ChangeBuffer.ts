export interface ChangeBufferOptions {
  getMarkdown: () => string;
  onContent: (markdown: string) => void;
}

export class ChangeBuffer {
  private opts: ChangeBufferOptions;
  private rafId: number | null = null;
  private microtaskScheduled = false;
  private lastContent = '';
  private immediate = false;

  constructor(opts: ChangeBufferOptions) { this.opts = opts; }

  schedule(_source: string, immediate = false): void {
    if (immediate) {
      this.immediate = true;
      this.flush();
      return;
    }
    if (!this.microtaskScheduled) {
      this.microtaskScheduled = true;
      queueMicrotask(() => {
        this.microtaskScheduled = false;
        // Use immediate scheduling for React environments to reduce jerkiness
        // Check if we're in a React environment by looking for common React patterns
        const isReactEnv = typeof window !== 'undefined' && 
          (!!window.React || !!document.querySelector('[data-reactroot]') || 
           !!document.querySelector('[data-react-checksum]') || 
           Array.from(document.querySelectorAll('*')).some(el => 
             Object.keys(el).some(key => key.startsWith('__react'))));
        
        if (isReactEnv) {
          // Use immediate execution for React to prevent timing conflicts
          this.flush();
        } else {
          // Use RAF for vanilla environments where batching is more important
          if (this.rafId == null) {
            this.rafId = requestAnimationFrame(() => {
              this.rafId = null;
              this.flush();
            });
          }
        }
      });
    }
  }

  flush(force = false): void {
    this.immediate = false;
    try {
      const md = this.opts.getMarkdown();
      if (force || md !== this.lastContent) {
        this.lastContent = md;
        this.opts.onContent(md);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('ChangeBuffer flush error', e);
    }
  }

  destroy(): void { if (this.rafId != null) cancelAnimationFrame(this.rafId); }
}
