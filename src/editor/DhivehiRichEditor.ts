import {
  EditorConfig,
  EditorInstance,
  FormatType,
  TextSelection,
  ImageData,
  EditorTheme,
  ThemeName,
  EditorStyling,
} from "../types";
import { ThaanaInput } from "../thaana/ThaanaInput";
import { MarkdownFormatter } from "../markdown/MarkdownFormatter";
import { ThemeManager } from "./ThemeManager";
import { EDITOR_STYLES, injectEditorStyles } from "../styles/editor-styles";

***REMOVED***

export class DhivehiRichEditor implements EditorInstance {
  private container: HTMLElement;
  private editor!: HTMLDivElement;
  private thaanaInput: ThaanaInput;
  private markdownFormatter: MarkdownFormatter;
  private config: EditorConfig;
  private suppressOnChange: boolean = false;
  private thaanaEnabled: boolean = true;

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
    this.thaanaInput = new ThaanaInput(config.thaana);
    this.thaanaEnabled = config.thaana?.enabled !== false;

    this.initializeEditor();
    this.setupEventListeners();

    if (config.initialContent) {
      this.setMarkdown(config.initialContent);
    }
  }

  private initializeEditor(): void {
    // Create the main editor element
    this.editor = document.createElement("div");
    this.editor.contentEditable = "true";
    this.editor.className = `dv-rich-editor ${this.config.className || ""}`;

    // Set placeholder
    if (this.config.placeholder) {
      this.editor.setAttribute("data-placeholder", this.config.placeholder);
    }

    // Apply base styles from external styles file
    Object.assign(this.editor.style, EDITOR_STYLES.base);

    // Add essential CSS styles for the editor
    this.injectEditorStyles();

    // Apply theme and custom styling
    this.applyThemeAndStyling();

    this.container.appendChild(this.editor);
  }

  private injectEditorStyles(): void {
    // Use external styles injection function
    injectEditorStyles();
  }

  private applyThemeAndStyling(): void {
    // Apply theme and styling using ThemeManager
    ThemeManager.applyTheme(
      this.editor,
      this.container,
      this.config.theme,
      this.config.theme?.name as any,
      this.config.styling
    );
  }

  public updateTheme(
    theme?: EditorTheme,
    themeName?: ThemeName,
    styling?: EditorStyling
  ): void {
    // Update config
    if (theme) {
      this.config.theme = theme;
    } else if (themeName) {
      this.config.theme = { name: themeName };
    }

    if (styling) {
      this.config.styling = styling;
    }

    // Re-apply theme and styling
    ThemeManager.applyTheme(
      this.editor,
      this.container,
      this.config.theme,
      this.config.theme?.name as any,
      this.config.styling
    );
  }

  public setThaanaEnabled(enabled: boolean): void {
    this.thaanaEnabled = enabled;
    this.thaanaInput.setEnabled(enabled);
  }

  private setupEventListeners(): void {
    // Content change events
    this.editor.addEventListener("input", () => {
      if (!this.suppressOnChange) {
        const markdown = this.getMarkdown();
        this.config.onChange?.(markdown);
      }
    });

    // Focus/blur events with ThaanaInput coordination
    this.editor.addEventListener("focus", () => {
      this.config.onFocus?.();
      // Notify ThaanaInput about focus if needed
      if (this.thaanaEnabled) {
        this.updateThaanaVisualState();
      }
    });

    this.editor.addEventListener("blur", () => {
      this.config.onBlur?.();
      // ThaanaInput will handle its own buffer flushing on blur
    });

    // Initialize Thaana keyboard
    this.thaanaInput.initialize(this.editor);
    this.updateThaanaVisualState();

    // keyboard event handling
    this.editor.addEventListener("keydown", (event) => {
      this.handleEnhancedKeydown(event);
    });


  }

  private handleEnhancedKeydown(event: KeyboardEvent): void {
    // Handle markdown protection
    this.handleKeydownProtection(event);

    // Handle Enter for Thaana content
    if (event.key === "Enter" && this.thaanaEnabled) {
      this.handleSmartEnter(event);
    }
  }

  private handleSmartEnter(event: KeyboardEvent): void {
    // Let ThaanaInput flush its buffer before processing Enter
    // The ThaanaInput will handle this automatically via its event listeners

    // Add a small delay to ensure buffer is flushed
    setTimeout(() => {
      // Additional logic for line breaks in RTL context if needed
      if (!this.suppressOnChange) {
        const markdown = this.getMarkdown();
        this.config.onChange?.(markdown);
      }
    }, 10);
  }



  private updateThaanaVisualState(): void {
    this.editor.classList.toggle("thaana-enabled", this.thaanaEnabled);
    this.editor.classList.toggle("thaana-disabled", !this.thaanaEnabled);

    // Update title attribute for accessibility
    const status = this.thaanaEnabled ? "enabled" : "disabled";
    this.editor.setAttribute(
      "title",
      `Thaana input ${status}. Press Ctrl+Shift+T to toggle.`
    );
  }

  public updateThaanaKeyMap(keyMap: Record<string, string>): void {
    this.thaanaInput.updateKeyMap(keyMap);
  }

  public getThaanaConfig(): any {
    return this.thaanaInput.getConfig();
  }

  public convertContentToThaana(): void {
    const currentContent = this.editor.textContent || "";
    if (currentContent) {
      const convertedContent = this.thaanaInput.convertToThaana(currentContent);
      this.editor.textContent = convertedContent;

      // Trigger change event
      if (!this.suppressOnChange) {
        const markdown = this.getMarkdown();
        this.config.onChange?.(markdown);
      }
    }
  }


  // Protect markdown syntax from accidental deletion , image and links may get corrupeted easily if not protected
  private handleKeydownProtection(event: KeyboardEvent): void {
    if (event.key === "Backspace") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textBefore = this.getTextBeforeCursor(range);

        // Check if we're about to delete markdown syntax
        if (this.isMarkdownSyntax(textBefore)) {
          event.preventDefault();
          this.handleProtectedBackspace();
        }
      }
    }
  }

  private getTextBeforeCursor(range: Range): string {
    const textNode = range.startContainer;
    if (textNode.nodeType === Node.TEXT_NODE) {
      return (textNode.textContent || "").substring(0, range.startOffset);
    }
    return "";
  }

  private isMarkdownSyntax(text: string): boolean {
    // Basic markdown syntax patterns to protect
    const patterns = [
      /\*\*$/, // Bold
      /\*$/, // Italic
      /~~$/, // Strikethrough
      /#+ $/, // Headers
      /!\[.*\]\(.*\)$/, // Images
      /\[.*\]\(.*\)$/, // Links
    ];

    return patterns.some((pattern) => pattern.test(text));
  }

  private isNearMarkdownSyntax(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    const textBefore = this.getTextBeforeCursor(range);
    const textAfter = this.getTextAfterCursor(range);

    // Check if we're within markdown syntax boundaries
    return (
      this.isMarkdownSyntax(textBefore) || this.isMarkdownSyntax(textAfter)
    );
  }

  private getTextAfterCursor(range: Range): string {
    const textNode = range.startContainer;
    if (textNode.nodeType === Node.TEXT_NODE) {
      return (textNode.textContent || "").substring(range.startOffset);
    }
    return "";
  }

  private isInMarkdownSyntax(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    const container = range.startContainer;

    // Check if we're inside a markdown element
    if (container.nodeType === Node.TEXT_NODE && container.parentElement) {
      const parentTag = container.parentElement.tagName.toLowerCase();
      return [
        "strong",
        "em",
        "u",
        "strike",
        "code",
        "pre",
        "blockquote",
      ].includes(parentTag);
    }

    return false;
  }

  private handleProtectedBackspace(): void {
    // Safely handle backspace when near markdown syntax
    // For now, just move cursor back one position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (range.startOffset > 0) {
        range.setStart(range.startContainer, range.startOffset - 1);
        range.collapse(true);
      }

      // Trigger change event
      if (!this.suppressOnChange) {
        const markdown = this.getMarkdown();
        this.config.onChange?.(markdown);
      }
    }
  }

  public getMarkdown(): string {
    return this.markdownFormatter.htmlToMarkdown(this.editor.innerHTML);
  }

  public setMarkdown(content: string, preserveFocus: boolean = false): void {
    // Let ThaanaInput handle conversion naturally through its event system
    const html = this.markdownFormatter.markdownToHtml(content);

    // Store current focus state
    const hadFocus = this.editor === document.activeElement;
    const selection = hadFocus ? this.getSelection() : null;

    // Update content
    this.suppressOnChange = true;
    this.editor.innerHTML = html;
    this.suppressOnChange = false;

    // Restore focus if requested and editor had focus
    if (preserveFocus && hadFocus) {
      this.editor.focus();
      // more work needed here , kind of a hack
    }
  }

  public focus(): void {
    this.editor.focus();
  }

  public blur(): void {
    this.editor.blur();
  }

  public insertText(text: string): void {
    // Let ThaanaInput handle conversion naturally through its event system
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
    }
  }


  public insertListItem(type: "bullet" | "numbered" = "bullet"): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    // Determine list marker
    const marker = type === "bullet" ? "- " : "1. ";

    // Check if we are at the start of a line
    const atLineStart =
      range.startOffset === 0 ||
      (textNode.nodeType === Node.TEXT_NODE &&
        (textNode.textContent || "")
          .substring(0, range.startOffset)
          .endsWith("\n"));

    const listText = atLineStart ? marker : `\n${marker}`;

    // Insert list marker (no Thaana conversion for markdown syntax)
    const selection2 = window.getSelection();
    if (selection2 && selection2.rangeCount > 0) {
      const range2 = selection2.getRangeAt(0);
      range2.deleteContents();
      range2.insertNode(document.createTextNode(listText));
      range2.collapse(false);
    }

    // Trigger change event
    if (!this.suppressOnChange) {
      const markdown = this.getMarkdown();
      this.config.onChange?.(markdown);
    }
  }

  public applyFormat(format: FormatType): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Check if we're in or near markdown syntax - if so, be more careful
    if (this.isInMarkdownSyntax() || this.isNearMarkdownSyntax()) {
      this.applyFormatSafely(format);
      return;
    }

    // Use yaa its deprecated but document.execCommand still does the job
    switch (format) {
      case "bold":
        document.execCommand("bold");
        break;
      case "italic":
        document.execCommand("italic");
        break;
      case "underline":
        document.execCommand("underline");
        break;
      case "strikethrough":
        document.execCommand("strikeThrough");
        break;
      case "image":
        this.openImageDialog();
        break;
      case "bullet-list":
        this.insertListItem("bullet");
        break;
      case "numbered-list":
        this.insertListItem("numbered");
        break;
      // Add more format implementations as needed
    }
  }

  //when near markdown syntax , we need to be more careful
  private applyFormatSafely(format: FormatType): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString();
    if (!selectedText) return;

    let formattedText = "";

    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`;
        break;
      case "italic":
        formattedText = `*${selectedText}*`;
        break;
      case "underline":
        formattedText = `<u>${selectedText}</u>`;
        break;
      case "strikethrough":
        formattedText = `~~${selectedText}~~`;
        break;
      case "image":
        this.openImageDialog();
        return;
      case "bullet-list":
        this.insertListItem("bullet");
        return;
      case "numbered-list":
        this.insertListItem("numbered");
        return;
      default:
        return;
    }

    // Replace selected text with formatted version
    const range = selection.getRangeAt(0);
    range.deleteContents();

    // Add line breaks around formatting to protect from RTL issues
    const protectedText = ` ${formattedText} `;
    range.insertNode(document.createTextNode(protectedText));

    // Clear selection
    selection.removeAllRanges();

    // Trigger change event
    if (!this.suppressOnChange) {
      const markdown = this.getMarkdown();
      this.config.onChange?.(markdown);
    }
  }

  public removeFormat(format: FormatType): void {
    // Remove specific formatting
    this.applyFormat(format); // Toggle off
  }

  public isFormatActive(format: FormatType): boolean {
    // Check if format is currently active at cursor position
    switch (format) {
      case "bold":
        return document.queryCommandState("bold");
      case "italic":
        return document.queryCommandState("italic");
      case "underline":
        return document.queryCommandState("underline");
      case "strikethrough":
        return document.queryCommandState("strikeThrough");
      default:
        return false;
    }
  }

  public insertImage(imageData: ImageData): void {
    // Create markdown image syntax with protective line breaks
    let markdownImage = `![${
      imageData.alt || this.config.image?.defaultAltText || ""
    }](${imageData.src}`;

    // Add title if provided
    if (imageData.title) {
      markdownImage += ` "${imageData.title}"`;
    }

    markdownImage += ")";

    // Add line breaks before and after to protect from RTL corruption
    const protectedMarkdown = `\n${markdownImage}\n`;

    // Insert the protected markdown at cursor position (no Thaana conversion for URLs)
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(protectedMarkdown));
      range.collapse(false);
    }

    // Trigger content change
    const markdown = this.getMarkdown();
    this.config.onChange?.(markdown);
  }

  public async openImageDialog(): Promise<void> {
    // Check if there's a global image URL handler
    if (this.config.onImageUrlRequest) {
      try {
        const imageUrl = await this.config.onImageUrlRequest();
        if (imageUrl) {
          this.insertImage({
            src: imageUrl,
            alt: this.config.image?.defaultAltText || "ފޮޓޯ",
          });
        }
      } catch (error) {
        console.error("Error getting image URL:", error);
      }
      return;
    }

    // Fallback to simple prompt dialog

    // BAD idea  , need to fix this
    const url = prompt("photo URL:", "https://");
    if (url && url.trim()) {
      const alt = prompt("Alt text:", "alt");
      this.insertImage({
        src: url.trim(),
        alt: alt || "photo",
      });
    }
  }

  public getSelection(): TextSelection {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { start: 0, end: 0, text: "" };
    }

    const range = selection.getRangeAt(0);
    return {
      start: range.startOffset,
      end: range.endOffset,
      text: range.toString(),
    };
  }

  public async copyToClipboard(): Promise<boolean> {
    const content = this.getMarkdown();
    if (!content) {
      return false;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
        return true;
      } else {
        // Fallback for older browsers
        return this.fallbackCopy(content);
      }
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      return this.fallbackCopy(content);
    }
  }


  public async pasteFromClipboard(): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const content = await navigator.clipboard.readText();
        if (content.trim()) {
          this.appendContent(content);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error pasting from clipboard:", error);
      return false;
    }
  }

 
  public appendContent(
    content: string
  ): void {
    // Let ThaanaInput handle conversion naturally through its event system
    const currentMarkdown = this.getMarkdown();
    const newContent = currentMarkdown
      ? currentMarkdown + "\n" + content
      : content;
    this.setMarkdown(newContent);
  }


  //fallback copy method for older browsers
  private fallbackCopy(content: string): boolean {
    const textarea = document.createElement("textarea");
    textarea.value = content;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch (error) {
      document.body.removeChild(textarea);
      console.error("Fallback copy failed:", error);
      return false;
    }
  }


  public clear(): void {
    // Store focus state
    const hadFocus = this.editor === document.activeElement;

    // Clear content without triggering input event
    this.suppressOnChange = true;
    this.editor.innerHTML = "";
    this.suppressOnChange = false;

    // Restore focus
    if (hadFocus) {
      this.editor.focus();
    }

    // Manually trigger onChange with empty content
    this.config.onChange?.("");
  }

  public destroy(): void {
    // Clean up Thaana input listeners
    this.thaanaInput.destroy();

    // Clean up event listeners and remove editor from DOM
    this.editor.remove();
  }
}
