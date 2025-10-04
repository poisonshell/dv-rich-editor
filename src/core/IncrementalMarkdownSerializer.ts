import { MarkdownSerializer, MarkdownSerializerOptions } from "./MarkdownSerializer";

export class IncrementalMarkdownSerializer extends MarkdownSerializer {
  private cache: Map<string, string> = new Map();
  private dirty: Set<string> = new Set();
  private idCounter = 0;
  private readonly ATTR = "data-md-block-id";
  private fullFallbackThreshold = 0.4;
  private topBlocks: Set<HTMLElement> = new Set();
  private lastRoot?: HTMLElement;
  private pruneEvery = 25;
  private flushes = 0;
  private statWindow: number[] = [];
  private readonly statSize = 50;

  constructor(opts?: MarkdownSerializerOptions) {
    super(opts);
  }

  markDirty(node: Node): void {
    const el = this.findBlockElement(node);
    if (!el) return;
    const id = this.ensureId(el);
    this.dirty.add(id);
    if (this.lastRoot && el.parentElement === this.lastRoot) this.topBlocks.add(el);
  }

  getMarkdownIncremental(editor: HTMLElement): string {
    if (!this.lastRoot) this.lastRoot = editor;
    const t0 = performance.now();
    const blocks = this.collectBlocks(editor);
    if (this.dirty.size / Math.max(blocks.length, 1) > this.fullFallbackThreshold) {
      const md = super.getMarkdown(editor);
      this.cache.clear();
      this.dirty.clear();
      for (const b of blocks) {
        const id = this.ensureId(b);
        this.cache.set(id, this.serializeSingleBlock(b));
      }
      this.trackStats(performance.now() - t0, true, blocks.length, 0);
      this.maybeEmitPerf('full-fallback', t0, blocks.length, true);
      return md;
    }

    for (const id of this.dirty) {
      const el = blocks.find((b) => b.getAttribute(this.ATTR) === id);
      if (el) this.cache.set(id, this.serializeSingleBlock(el));
    }
    this.dirty.clear();

    const stitched = blocks.map((b) => this.cache.get(this.ensureId(b)) || this.serializeAndStore(b)).join("\n");
    const out = this.postProcess(stitched);
    this.flushes++;
    if (this.flushes % this.pruneEvery === 0) this.pruneCache(blocks);
    this.trackStats(performance.now() - t0, false, blocks.length, this.dirty.size);
    this.maybeEmitPerf('incremental', t0, blocks.length, false, this.dirty.size);
    return out;
  }

  getMarkdownForceFull(editor: HTMLElement): string {
    const blocks = this.collectBlocks(editor);
    const md = super.getMarkdown(editor);
    this.cache.clear();
    this.dirty.clear();
    for (const b of blocks) {
      const id = this.ensureId(b);
      this.cache.set(id, this.serializeSingleBlock(b));
    }
    return md;
  }

  private serializeAndStore(b: HTMLElement): string {
    const id = this.ensureId(b);
    const md = this.serializeSingleBlock(b);
    this.cache.set(id, md);
    return md;
  }
  private serializeSingleBlock(b: HTMLElement): string {
    const temp = document.createElement("div");
    temp.appendChild(b.cloneNode(true));
    return super.getMarkdown(temp);
  }

  private collectBlocks(root: HTMLElement): HTMLElement[] {
    // If there are direct non-whitespace text nodes, treat the entire root as one block.
    const hasDirectText = Array.from(root.childNodes).some(n => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim() !== '');
    if (hasDirectText) {
      // Mixed inline/text scenario - disable incremental top-level optimization.
      this.topBlocks.clear();
      return [root];
    }
    // Fast path if we have a maintained set of top-level blocks and no stray text nodes.
    if (this.lastRoot === root && this.topBlocks.size) {
      const filtered: HTMLElement[] = [];
      for (const b of this.topBlocks) if (b.parentElement === root) filtered.push(b);
      if (filtered.length) return filtered;
    }
    const fresh: HTMLElement[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const el = walker.currentNode as HTMLElement;
      if (this.isBlock(el) && el.parentElement === root) fresh.push(el);
    }
    if (fresh.length === 0) return [root];
    // Detect mixed inline/text siblings outside block elements
    let hasMixed = false;
    for (const child of Array.from(root.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        if ((child.textContent || '').trim() !== '') { hasMixed = true; break; }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!this.isBlock(el)) { hasMixed = true; break; }
      }
    }
    if (hasMixed) { this.topBlocks.clear(); return [root]; }
    this.topBlocks = new Set(fresh);
    return fresh;
  }
  private isBlock(el: HTMLElement): boolean {
    return /(div|p|h1|h2|h3|h4|h5|h6|blockquote|pre|ul|ol)/i.test(el.tagName);
  }
  private ensureId(el: HTMLElement): string {
    let id = el.getAttribute(this.ATTR);
    if (!id) {
      id = "b" + ++this.idCounter;
      el.setAttribute(this.ATTR, id);
    }
    return id;
  }
  private findBlockElement(node: Node): HTMLElement | null {
    let cur: Node | null = node;
    while (cur) {
      if (cur instanceof HTMLElement && this.isBlock(cur)) return cur;
      cur = cur.parentNode;
    }
    return null;
  }
  private postProcess(md: string): string {
    return md
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\n+/, "")
      .replace(/\n+$/, "");
  }

  private pruneCache(blocks: HTMLElement[]): void {
    const live = new Set(blocks.map(b => this.ensureId(b)));
    for (const id of Array.from(this.cache.keys())) if (!live.has(id)) this.cache.delete(id);
  }

  // Hook for editor to override and emit perf metrics via event bus (monkey patched)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // (editor sets serializer['__emitPerf'] = (payload) => events.emit('perf', payload))
  private maybeEmitPerf(phase: string, t0: number, blocks: number, forcedFull: boolean, dirty = 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emitter = (this as any).__emitPerf as ((p: unknown)=>void) | undefined;
    if (!emitter) return;
    const duration = performance.now() - t0;
    const { avg, p95, samples } = this.computeStats();
    emitter({ phase, duration, blocks, dirty, forcedFull, avgIncremental: avg, p95Incremental: p95, samples });
  }

  private trackStats(duration: number, full: boolean, _blocks: number, _dirty: number) {
    if (full) return; // only track incremental durations for stats
    this.statWindow.push(duration);
    if (this.statWindow.length > this.statSize) this.statWindow.shift();
  }
  private computeStats() {
    if (!this.statWindow.length) return { avg: undefined as number | undefined, p95: undefined as number | undefined, samples: 0 };
    const arr = [...this.statWindow].sort((a,b)=>a-b);
    const sum = arr.reduce((a,b)=>a+b,0);
    const avg = sum / arr.length;
    const idx = Math.floor(0.95 * (arr.length - 1));
    const p95 = arr[idx];
    return { avg, p95, samples: arr.length };
  }
}
