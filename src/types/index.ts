export interface EditorConfig {
  container: HTMLElement | string;
  initialContent?: string;
  placeholder?: string;
  features?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    heading?: boolean;
    list?: boolean;
    link?: boolean;
    image?: boolean;
    blockquote?: boolean;
    code?: boolean;
  };

  thaana?: ThaanaKeyboardLayout;
  markdown?: MarkdownOptions;
  image?: ImageConfig;
  className?: string;
  theme?: EditorTheme;
  styling?: EditorStyling;

  onChange?: (markdown: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onImageUrlRequest?: () => Promise<string>;
}

export interface ImageConfig {
  defaultAltText?: string;
  urlHandler?: () => Promise<string>;
  preview?: boolean;
}

export interface ImageData {
  src: string;
  alt?: string;
  title?: string;
}

export interface EditorInstance {
  getMarkdown(): string;
  setMarkdown(content: string): void;
  focus(): void;
  blur(): void;
  insertText(text: string): void;
  applyFormat(format: FormatType): void;
  removeFormat(format: FormatType): void;
  isFormatActive(format: FormatType): boolean;
  insertImage(imageData: ImageData): void;
  openImageDialog(): void;
  copyToClipboard(): Promise<boolean>;
  pasteFromClipboard(): Promise<boolean>;
  appendContent(content: string): void;
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
}

export interface MarkdownOptions {
  strict?: boolean;
  allowHtml?: boolean;
  lineBreak?: "soft" | "hard";
  headingStyle?: "atx" | "setext";
  listStyle?: "dash" | "asterisk" | "plus";
}

export type FormatType =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "code"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bullet-list"
  | "numbered-list"
  | "blockquote"
  | "link"
  | "image";

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
  "content-change": { markdown: string };
  "selection-change": { selection: TextSelection };
  "format-change": { formats: FormatType[] };
  focus: {};
  blur: {};
}
