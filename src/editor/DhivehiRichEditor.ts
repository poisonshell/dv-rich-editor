import {
  EditorConfig,
  EditorInstance,
  FormatType,
  TextSelection,
  EditorTheme,
  ThemeName,
  EditorStyling,
  ThaanaKeyboardLayout,
  EditorEvents,
} from "../types";
import { ThaanaAdapter } from "../util/thaanaAdapter";
import { installRTLSupport } from "../util/rtlSelection";
import {
  isMarkdownSyntaxFragment,
  textBeforeCursor,
  protectBackspace,
} from "../util/markdownProtection";
import { createImagePlugin, getImagePluginAPI } from "../core/plugins/ImagePlugin";
import { MarkdownFormatter } from "../core/MarkdownFormatter";
import { MarkdownSerializer } from "../core/MarkdownSerializer";
import { IncrementalMarkdownSerializer } from "../core";
import { EventBus } from "../core/EventBus";
import { ChangeBuffer } from "../core/ChangeBuffer";
import { ThemeManager } from "./ThemeManager";
import { FormattingEngine } from "../core/FormattingEngine";
import { EDITOR_STYLES, injectEditorStyles } from "../styles/editor-styles";
import { ListPlugin } from "../core/plugins/ListPlugin";
import { SelectionManager } from "../core/SelectionManager";
import { ClipboardManager } from "../core/ClipboardManager";

export class DhivehiRichEditor implements EditorInstance {
  private container: HTMLElement;
  private editor!: HTMLDivElement;
  private thaana: ThaanaAdapter;
  private markdownFormatter: MarkdownFormatter;
  private markdownSerializer: MarkdownSerializer | IncrementalMarkdownSerializer;
  private incremental: IncrementalMarkdownSerializer | null = null;
  private config: EditorConfig;
  private currentTheme?: EditorTheme;
  private currentStyling?: EditorStyling;
  private suppressOnChange: boolean = false;
  private lastEmittedMarkdown: string | null = null;
  private thaanaEnabled: boolean = true;
  private perfEnabled = false;
  private mutationObserver?: MutationObserver;
  private changeBuffer: ChangeBuffer;
  private events = new EventBus();
  private plugins: import("../core/plugins/PluginTypes").EditorPlugin[] = [];
  private formattingEngine!: FormattingEngine;
  private selectionManager!: SelectionManager;
  private clipboardManager!: ClipboardManager;
  private lastChangeSource: string | null = null;

  constructor(config: EditorConfig) {
    this.config = config;
    this.container =
      typeof config.container === "string"
        ? (document.querySelector(config.container) as HTMLElement)
        : config.container;

    if (!this.container) {
      throw new Error("Container element not found");
    }

    this.markdownFormatter = new MarkdownFormatter(config.markdown);

    const listStyle = config.markdown?.listStyle as
      | ("dash" | "asterisk" | "plus")
      | undefined;
    const incrementalEnabled = config.markdown?.incremental !== false;
    if (incrementalEnabled) {
      this.incremental = new IncrementalMarkdownSerializer({ listStyle });
      this.markdownSerializer = this.incremental;
      this.perfEnabled = !!config.performance?.instrumentation;
      if (this.incremental && this.perfEnabled) {
        // Attach emission hook
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface PerfPayload { phase: string; duration: number; blocks: number; dirty: number; forcedFull: boolean; avgIncremental?: number; p95Incremental?: number; samples?: number }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.incremental as any).__emitPerf = (payload: PerfPayload) => {
          this.events.emit('perf', payload);
          try {
            const evt = new CustomEvent('dv-rich-perf', { detail: payload });
            window.dispatchEvent(evt);
          } catch { /* ignore */ }
        };
      }
    } else {
      this.incremental = null;
      this.markdownSerializer = new MarkdownSerializer({ listStyle });
    }
    this.thaana = new ThaanaAdapter({
      thaanaConfig: config.thaana,
      bus: this.events as unknown as EventBus,
    });
    this.thaanaEnabled = config.thaana?.enabled !== false;
    this.currentTheme = config.theme;
    this.currentStyling = config.styling;

    this.changeBuffer = new ChangeBuffer({
      getMarkdown: () => this.getMarkdownInternal(),
      onContent: (md) => {
        this.events.emit("content-change", { markdown: md });

        if (md !== this.lastEmittedMarkdown) {
          this.lastEmittedMarkdown = md;
          this.config.onChange?.(md);
        }
      },
    });

    this.initializeEditor();

    this.formattingEngine = new FormattingEngine({
      editor: this.editor,
      scheduleChange: () => this.scheduleChange("format-external", true),
    });
    this.selectionManager = new SelectionManager(this.editor);
    this.clipboardManager = new ClipboardManager({
      editor: this.editor,
      getMarkdown: () => this.getMarkdownInternal(),
      setMarkdown: (md, preserve) => this.setMarkdown(md, preserve),
      scheduleChange: (src, immediate) => this.scheduleChange(src, immediate),
    });
    this.setupEventListeners();
    this.initializePlugins();

    if (config.initialContent) {
      this.setMarkdown(config.initialContent);
    }
  }

  private initializePlugins(): void {
    const maybeConfig = this.config as unknown as Record<string, unknown>;
    const pluginList = Array.isArray(maybeConfig.plugins)
      ? (maybeConfig.plugins as import("../core/plugins/PluginTypes").EditorPlugin[])
      : undefined;

    const internal: import("../core/plugins/PluginTypes").EditorPlugin[] = [
      ListPlugin,
      createImagePlugin({ config: this.config }),
    ];
    for (const p of internal) {
      try {
        p.init({
          editorRoot: this.editor,
          onChange: () => this.scheduleChange("plugin-change", true),
          getMarkdown: () => this.getMarkdownInternal(),
        });
        this.plugins.push(p);
      } catch (e) {
        console.warn("Internal plugin init failed", p.name, e);
      }
    }
    if (Array.isArray(pluginList)) {
      for (const p of pluginList) {
        try {
          p.init({
            editorRoot: this.editor,
            onChange: () => this.scheduleChange("plugin-change", true),
            getMarkdown: () => this.getMarkdownInternal(),
          });
          this.plugins.push(p);
        } catch (e) {
          console.warn("Plugin init failed", p.name, e);
        }
      }
    }
  }

  private initializeEditor(): void {
    this.editor = document.createElement("div");
    this.editor.contentEditable = "true";
    this.editor.className = `dv-rich-editor ${this.config.className || ""}`;
    this.editor.setAttribute("role", "textbox");
    this.editor.setAttribute("aria-multiline", "true");
    if (this.config.placeholder) {
      this.editor.setAttribute("aria-placeholder", this.config.placeholder);
    }

    if (this.config.placeholder) {
      this.editor.setAttribute("data-placeholder", this.config.placeholder);
    }

    this.editor.setAttribute("dir", "rtl");
    this.editor.style.textAlign = "right";
  // Default to isolate-override for better caret handling in RTL input (Thaana)
  this.editor.style.unicodeBidi = this.thaanaEnabled ? "isolate-override" : "plaintext";
    Object.assign(this.editor.style, EDITOR_STYLES.base);
    this.injectEditorStyles();
    ThemeManager.applyTheme(
      this.editor,
      this.container,
      this.currentTheme,
      this.currentTheme?.name as ThemeName | undefined,
      this.currentStyling
    );
    this.container.appendChild(this.editor);
  }

  private injectEditorStyles(): void {
    injectEditorStyles();
  }

  public updateTheme(
    theme?: EditorTheme,
    themeName?: ThemeName,
    styling?: EditorStyling
  ): void {
    const prevThemeRef = this.currentTheme;
    const prevStylingRef = this.currentStyling;
    if (theme) {
      this.currentTheme = theme;
    } else if (themeName) {
      this.currentTheme = { name: themeName };
    }
    if (styling) this.currentStyling = styling;
    if (prevThemeRef !== this.currentTheme || prevStylingRef !== this.currentStyling) {
      ThemeManager.applyTheme(
        this.editor,
        this.container,
        this.currentTheme,
        this.currentTheme?.name as ThemeName | undefined,
        this.currentStyling
      );
    }
  }

  public setThaanaEnabled(enabled: boolean): void {
    this.thaanaEnabled = enabled;
    this.thaana.setEnabled(enabled);
  }

  private setupEventListeners(): void {
    this.setupMutationObserver();

    this.editor.addEventListener("input", () => {
      this.scheduleChange("input", this.isReactEnvironment());
    });

    this.editor.addEventListener("focus", () => {
      this.events.emit("focus", {} as EditorEvents["focus"]);
      this.config.onFocus?.();
      if (this.thaanaEnabled) {
        this.updateThaanaVisualState();
      }
    });

    this.editor.addEventListener("blur", () => {
      this.events.emit("blur", {} as EditorEvents["blur"]);
      this.config.onBlur?.();
      this.scheduleChange("blur", true);
    });

    this.editor.addEventListener("keydown", (event) => {
      this.handleEnhancedKeydown(event);
    });

    this.editor.addEventListener("keyup", (event) => {
      if (["Enter", "Backspace", "Delete", "Space"].includes(event.key)) {
        this.scheduleChange(`keyup-${event.key}`, true);
      }
    });

    let formatRAF: number | null = null;
    document.addEventListener("selectionchange", () => {
      if (!this.editor.contains(document.activeElement)) return;
      if (formatRAF) cancelAnimationFrame(formatRAF);
      formatRAF = requestAnimationFrame(() => {
        this.ensureCaretOutsideInlineFormat();
        const formats = this.getActiveFormats();
        this.events.emit("format-change", { formats });
      });
    });

    this.editor.addEventListener("paste", () => {
      setTimeout(() => {
        this.scheduleChange("paste", true);
      }, 50);
    });

    installRTLSupport({ root: this.editor });
    this.thaana.initialize(this.editor);
    this.updateThaanaVisualState();
  }

  private handleEnhancedKeydown(event: KeyboardEvent): void {
    this.handleKeydownProtection(event);

    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case "a":
        case "A":
          event.preventDefault();
          this.selectAll();
          return;
        case "d":
        case "D":
          if (event.shiftKey) {
            event.preventDefault();
            this.selectCurrentWord();
            return;
          }
          break;
      }
    }
    if (event.key === "Enter" && this.thaanaEnabled) {
      this.handleSmartEnter(event);
    }
  }

  private handleSmartEnter(_event: KeyboardEvent): void {
    setTimeout(() => {
      if (!this.suppressOnChange) {
        const markdown = this.getMarkdown();
        this.config.onChange?.(markdown);
      }
    }, 10);
  }

  private updateThaanaVisualState(): void {
    this.editor.classList.toggle("thaana-enabled", this.thaanaEnabled);
    this.editor.classList.toggle("thaana-disabled", !this.thaanaEnabled);

    const status = this.thaanaEnabled ? "enabled" : "disabled";
    this.editor.setAttribute(
      "title",
      `Thaana input ${status}. Press Ctrl+Shift+T to toggle.`
    );
  }

  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      let changed = false;
      for (const m of mutations) {
        if (this.incremental) {
          if (m.target) this.incremental.markDirty(m.target);
          m.addedNodes && m.addedNodes.forEach((n) => this.incremental!.markDirty(n));
          m.removedNodes && m.removedNodes.forEach((n) => this.incremental!.markDirty(n));
        }
        if (m.type === "childList" || m.type === "characterData") changed = true;
      }
      if (changed && !this.suppressOnChange) {
        this.scheduleChange("mutation", this.isReactEnvironment());
      }
    });
    this.mutationObserver.observe(this.editor, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private scheduleChange(source: string, immediate = false): void {
    if (this.suppressOnChange) return;
    this.lastChangeSource = source;
    this.changeBuffer.schedule(source, immediate);
  }

  private handleKeydownProtection(event: KeyboardEvent): void {
    if (event.key === "Backspace") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const before = textBeforeCursor(range);
        if (isMarkdownSyntaxFragment(before)) {
          event.preventDefault();
          this.handleProtectedBackspace();
        }
      }
    }
  }

  private handleProtectedBackspace(): void {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      protectBackspace(range);
      if (!this.suppressOnChange) this.scheduleChange("protected-backspace", true);
    }
  }

  public getMarkdown(): string {
    const raw = this.markdownSerializer.getMarkdown(this.editor);
    const sanitized = this.config.sanitizeMarkdown
      ? this.config.sanitizeMarkdown(raw)
      : raw;
    return sanitized;
  }

  public setMarkdown(content: string, preserveFocus: boolean = false): void {
    const incoming = this.config.sanitizeMarkdown
      ? this.config.sanitizeMarkdown(content)
      : content;
    const htmlRaw = this.markdownFormatter.markdownToHtml(incoming);
    const html = this.config.sanitizeHtml ? this.config.sanitizeHtml(htmlRaw) : htmlRaw;
    const hadFocus = this.editor === document.activeElement;

    this.suppressOnChange = true;
    this.editor.innerHTML = html;
    this.suppressOnChange = false;
    this.lastEmittedMarkdown = incoming;

    if (preserveFocus && hadFocus) {
      this.editor.focus();
    }
  }

  public focus(): void {
    this.editor.focus();
  }

  public blur(): void {
    this.editor.blur();
  }

  public insertText(text: string): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
    }
  }

  private applyFormatSafely(_format: FormatType): void {
    this.formattingEngine.applyFormat(_format);
  }
  public applyFormat(format: FormatType): void {
    this.formattingEngine.applyFormat(format);
  }
  public toggleBold(): void {
    this.formattingEngine.toggleBold();
  }
  public toggleItalic(): void {
    this.formattingEngine.toggleItalic();
  }
  public toggleUnderline(): void {
    this.formattingEngine.toggleUnderline();
  }
  public toggleStrikethrough(): void {
    this.formattingEngine.toggleStrikethrough();
  }
  public toggleCode(): void {
    this.formattingEngine.toggleCode();
  }
  public toggleCodeBlock(): void {
    this.formattingEngine.toggleCodeBlock();
  }
  public toggleBlockquote(): void {
    this.formattingEngine.toggleBlockquote();
  }
  public setHeading(level: 1 | 2 | 3 | 4 | 5 | 6): void {
    this.formattingEngine.setHeading(level);
  }
  public insertBulletList(): void {
    this.formattingEngine.insertBulletList();
  }
  public insertNumberedList(): void {
    this.formattingEngine.insertNumberedList();
  }
  public insertImageFormat(): void {
    getImagePluginAPI(this.editor)?.openImageDialog();
  }
  public isFormatActive(format: FormatType): boolean {
    return this.formattingEngine.isFormatActive(format);
  }
  public getActiveFormats(): FormatType[] {
    return this.formattingEngine.getActiveFormats();
  }

  private ensureCaretOutsideInlineFormat(): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    if (!sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    let container: Node = range.startContainer;

    if (container.nodeType === Node.ELEMENT_NODE && range.startOffset > 0) {
      const child = (container as Element).childNodes[range.startOffset - 1];
      if (child) container = child;
    }

    const isInlineFormat = (el: Element): boolean => {
      const tag = el.tagName.toLowerCase();
      return (
        ["strong", "b", "em", "i", "u", "s", "strike", "del", "code"].includes(tag) &&
        !el.closest("pre")
      );
    };
    let inlineAncestor: Element | null = null;
    let walker: Node | null = container;
    while (walker && walker !== this.editor) {
      if (walker.nodeType === Node.ELEMENT_NODE && isInlineFormat(walker as Element)) {
        inlineAncestor = walker as Element;
        break;
      }
      walker = walker.parentNode;
    }
    if (!inlineAncestor) return;
    const endRange = document.createRange();
    endRange.selectNodeContents(inlineAncestor);
    endRange.collapse(false);
    if (range.compareBoundaryPoints(Range.END_TO_END, endRange) !== 0) return;
    const parent = inlineAncestor.parentNode;
    if (!parent) return;
    const after = inlineAncestor.nextSibling;
    const isRTL = (this.editor.getAttribute("dir") || "").toLowerCase() === "rtl";
    let targetText: Text | null = null;
    if (after && after.nodeType === Node.TEXT_NODE) {
      targetText = after as Text;
    } else {
      const placeholder = document.createTextNode(isRTL ? "\u200F" : "\u200B");
      parent.insertBefore(placeholder, after);
      targetText = placeholder;
    }
    const newRange = document.createRange();
    const len = targetText.textContent ? targetText.textContent.length : 0;
    newRange.setStart(targetText, len);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
  public getSelection(): TextSelection {
    return this.selectionManager.getSelection();
  }
  public selectAll(): void {
    this.selectionManager.selectAll();
  }
  public selectCurrentWord(): void {
    this.selectionManager.selectCurrentWord();
  }
  public async copyToClipboard(): Promise<boolean> {
    return this.clipboardManager.copy();
  }
  public async pasteFromClipboard(): Promise<boolean> {
    return this.clipboardManager.paste();
  }
  public appendContent(content: string): void {
    const current = this.getMarkdown();
    const next = current ? current + "\n" + content : content;
    this.setMarkdown(next, true);
  }

  public clear(): void {
    const hadFocus = this.editor === document.activeElement;

    this.suppressOnChange = true;
    this.editor.innerHTML = "";
    this.suppressOnChange = false;

    if (hadFocus) {
      this.editor.focus();
    }

    this.config.onChange?.("");
  }

  public destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = undefined;
    }

    for (const p of this.plugins) {
      try {
        p.destroy && p.destroy();
  } catch (e) { /* ignore plugin destroy errors */ }
    }
    this.plugins = [];

    this.thaana.destroy();
    this.editor.remove();
  }

  public updateThaanaKeyMap(keyMap: Record<string, string>): void {
    this.thaana.updateKeyMap(keyMap);
  }

  public getThaanaConfig(): ThaanaKeyboardLayout {
    return this.thaana.getConfig();
  }

  public convertContentToThaana(): void {
    const currentContent = this.editor.textContent || "";
    if (currentContent) {
      const convertedContent = this.thaana.convertContentToThaana(currentContent);
      this.editor.textContent = convertedContent;

      if (!this.suppressOnChange) {
        this.scheduleChange("convert-thaana", true);
      }
    }
  }

  public on<K extends keyof EditorEvents>(
    event: K,
    handler: (p: EditorEvents[K]) => void
  ): void {
    this.events.on(event, handler);
  }

  public off<K extends keyof EditorEvents>(
    event: K,
    handler: (p: EditorEvents[K]) => void
  ): void {
    this.events.off(event, handler);
  }

  private getMarkdownInternal(): string {
    let raw: string;
    if (this.incremental) {
      const isEnter = /Enter/i.test(this.lastChangeSource || '');
      // Smarter heuristic: only force full if multiple blocks dirty OR mixed root fallback occurred previously
      let forceFull = false;
      if (isEnter) {
        // If more than 2 blocks dirty or we have root fallback (topBlocks size 0 while blocks >1)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inc: any = this.incremental;
        const topBlocksSize = inc.topBlocks ? inc.topBlocks.size : 0;
        forceFull = this.incremental['dirty'].size > 2 || topBlocksSize === 0; // best-effort heuristic
      }
      raw = forceFull
        ? this.incremental.getMarkdownForceFull(this.editor as unknown as HTMLElement)
        : this.incremental.getMarkdownIncremental(this.editor as unknown as HTMLElement);
    } else {
      raw = this.markdownSerializer.getMarkdown(this.editor);
    }
    return this.config.sanitizeMarkdown ? this.config.sanitizeMarkdown(raw) : raw;
  }

  private isReactEnvironment(): boolean {
    return (
      typeof window !== "undefined" &&
      (!!window.React ||
        !!document.querySelector("[data-reactroot]") ||
        !!document.querySelector("[data-react-checksum]") ||
        Array.from(document.querySelectorAll("*")).some((el) =>
          Object.keys(el).some((key) => key.startsWith("__react"))
        ))
    );
  }
}
