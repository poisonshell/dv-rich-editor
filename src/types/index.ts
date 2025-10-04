export interface EditorConfig {
  readonly container: HTMLElement | string;
  readonly initialContent?: string;
  readonly placeholder?: string;

  readonly thaana?: ThaanaKeyboardLayout;
  readonly markdown?: MarkdownOptions;
  readonly image?: ImageConfig;
  readonly className?: string;
  readonly theme?: EditorTheme;
  readonly styling?: EditorStyling;

  readonly sanitizeHtml?: (html: string) => string;
  readonly sanitizeMarkdown?: (markdown: string) => string;
  readonly performance?: {
    instrumentation?: boolean; // emit 'perf' events
    debounceControlledMs?: number; // future use for controlled update debouncing
  };

  // Legacy callbacks (will emit equivalent events)
  readonly onChange?: (markdown: string) => void;
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
  readonly onImageUrlRequest?: () => Promise<string>;
}

export interface ImageConfig {
  defaultAltText?: string;
  preview?: boolean;
}

export interface ImageData {
  src: string;
  alt?: string;
  title?: string;
}

export interface EditorInstance {
  getMarkdown(): string;
  setMarkdown(content: string, preserveFocus?: boolean): void;
  focus(): void;
  blur(): void;
  insertText(text: string): void;
  isFormatActive(format: FormatType): boolean;
  getActiveFormats?(): FormatType[]; // optional (new API) returns currently active formats at selection
  // Image insertion now via ImagePlugin API (getImagePluginAPI) or insertImageFormat convenience
  copyToClipboard(): Promise<boolean>;
  pasteFromClipboard(): Promise<boolean>;
  appendContent(content: string): void;
  getSelection(): TextSelection;
  on<K extends keyof EditorEvents>(event: K, handler: (p: EditorEvents[K]) => void): void;
  off<K extends keyof EditorEvents>(event: K, handler: (p: EditorEvents[K]) => void): void;
  updateTheme(
    theme?: EditorTheme,
    themeName?: ThemeName,
    styling?: EditorStyling
  ): void;
  setThaanaEnabled(enabled: boolean): void;
  clear(): void;
  destroy(): void;
}

export interface ThaanaKeyboardLayout {
  enabled: boolean;
  keyMap?: Record<string, string>;
  autoCorrect?: boolean;
  phonetic?: boolean;
  emitBufferEvents?: boolean; // enable/disable ime-buffer-* event emissions
}

export interface MarkdownOptions {
  listStyle?: "dash" | "asterisk" | "plus";
  /** Enable incremental markdown serialization for large documents (default: true). */
  incremental?: boolean;
}

export type InlineFormat = "bold" | "italic" | "underline" | "strikethrough" | "code";
export type BlockFormat = "h1"|"h2"|"h3"|"h4"|"h5"|"h6"|"blockquote"|"code-block";
export type InsertFormat = "bullet-list"|"numbered-list"|"image";
export type FormatType = InlineFormat | BlockFormat | InsertFormat;

export interface TextSelection {
  start: number;
  end: number;
  text: string;
}

export interface EditorTheme {
  name?: string;
  colors?: {
    background?: string;
    text?: string;
    border?: string;
    borderFocus?: string;
    placeholder?: string;
    selection?: string;
    link?: string;
    codeBackground?: string;
    blockquoteBackground?: string;
    blockquoteBorder?: string;
  };

  typography?: {
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
    fontWeight?: string;
  };

  spacing?: {
    padding?: string;
    margin?: string;
    borderRadius?: string;
    borderWidth?: string;
  };
}

export interface EditorStyling {
  container?: {
    css?: Partial<CSSStyleDeclaration>;
    className?: string;
  };

  editor?: {
    css?: Partial<CSSStyleDeclaration>;
    className?: string;
  };

  placeholder?: {
    css?: Partial<CSSStyleDeclaration>;
    className?: string;
  };

  customCSS?: string;
  disableDefaultStyles?: boolean;
}

export type ThemeName =
  | "default"
  | "dark"
  | "light"
  | "blue"
  | "minimal"
  | "classic";


export interface EditorEvents {
  "content-change": { markdown: string }; // after ChangeBuffer flush
  "selection-change": { selection: TextSelection }; // on selection updates
  "format-change": { formats: FormatType[] }; // active format set changed
  "ime-buffer-start": { akuru: string }; // when an akuru starts buffering
  "ime-buffer-commit": { syllable: string }; // akuru+fili committed
  "ime-buffer-flush": Record<string, never>; // buffer cleared without commit
  focus: Record<string, never>;
  blur: Record<string, never>;
  "perf": PerfEvent;
}

export interface PerfEvent {
  phase: 'incremental' | 'full-fallback';
  duration: number;       // ms for this flush
  blocks: number;         // number of top-level blocks considered
  dirty: number;          // number of dirty blocks (post-flush for incremental, or threshold for fallback)
  forcedFull: boolean;    // whether a full serialization occurred
  avgIncremental?: number; // rolling average (last N incremental events)
  p95Incremental?: number; // rolling p95 (last N incremental events)
  samples?: number;        // number of samples contributing to stats
}

// EventBusLike removed (internal bus implementation only)
