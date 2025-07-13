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

//core editor class

export class DhivehiRichEditor implements EditorInstance {
  private container: HTMLElement;
  private editor!: HTMLDivElement;
  private thaanaInput: ThaanaInput;
  private markdownFormatter: MarkdownFormatter;
  private config: EditorConfig;
  private suppressOnChange: boolean = false;
  private thaanaEnabled: boolean = true;
  private mutationObserver?: MutationObserver;
  private changeTimeout?: number;
  private lastContent: string = "";

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
    this.editor = document.createElement("div");
    this.editor.contentEditable = "true";
    this.editor.className = `dv-rich-editor ${this.config.className || ""}`;

    if (this.config.placeholder) {
      this.editor.setAttribute("data-placeholder", this.config.placeholder);
    }

    // RTL improvements
    this.editor.setAttribute("dir", "rtl");
    this.editor.style.textAlign = "right";
    this.editor.style.unicodeBidi = "plaintext";

    Object.assign(this.editor.style, EDITOR_STYLES.base);
    this.injectEditorStyles();
    this.applyThemeAndStyling();
    this.container.appendChild(this.editor);
  }

  private injectEditorStyles(): void {
    injectEditorStyles();
  }

  private applyThemeAndStyling(): void {
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
    if (theme) {
      this.config.theme = theme;
    } else if (themeName) {
      this.config.theme = { name: themeName };
    }

    if (styling) {
      this.config.styling = styling;
    }

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
    this.setupMutationObserver();

    this.editor.addEventListener("input", () => {
      this.handleContentChange("input");
    });

    this.editor.addEventListener("focus", () => {
      this.config.onFocus?.();
      if (this.thaanaEnabled) {
        this.updateThaanaVisualState();
      }
    });

    this.editor.addEventListener("blur", () => {
      this.config.onBlur?.();
      this.handleContentChange("blur", true);
    });

    this.editor.addEventListener("keydown", (event) => {
      this.handleEnhancedKeydown(event);
    });

    this.editor.addEventListener("keyup", (event) => {
      if (["Enter", "Backspace", "Delete", "Space"].includes(event.key)) {
        this.handleContentChange(`keyup-${event.key}`, true);
      }
    });

    this.editor.addEventListener("paste", () => {
      setTimeout(() => {
        this.handleContentChange("paste", true);
      }, 50);
    });

    // RTL selection improvements
    this.setupRTLSelectionHelpers();

    this.thaanaInput.initialize(this.editor);
    this.updateThaanaVisualState();
  }

  private setupRTLSelectionHelpers(): void {
    // Improve text selection for RTL
    this.editor.addEventListener("mousedown", (event) => {
      this.handleRTLMouseDown(event);
    });

    this.editor.addEventListener("selectstart", (event) => {
      this.handleRTLSelectStart(event);
    });

    this.editor.addEventListener("selectionchange", () => {
      this.handleRTLSelectionChange();
    });

    // Double-click for word selection in RTL
    this.editor.addEventListener("dblclick", (event) => {
      this.handleRTLDoubleClick(event);
    });
  }

  private handleRTLMouseDown(event: MouseEvent): void {
    // Force text cursor for better RTL selection
    if (
      event.target === this.editor ||
      (event.target as Element)?.closest(".dv-rich-editor")
    ) {
      this.editor.style.cursor = "text";
    }
  }

  private handleRTLSelectStart(event: Event): void {
    // Prevent default selection behavior that might interfere with RTL
    event.stopPropagation();
  }

  private handleRTLSelectionChange(): void {
    // Normalize selection direction for RTL text
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Ensure consistent selection behavior
    setTimeout(() => {
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        this.normalizeRTLSelection(range);
      }
    }, 0);
  }

  private handleRTLDoubleClick(event: MouseEvent): void {
    event.preventDefault();

    // Custom word selection for RTL text
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    const textNode = this.getTextNodeAtPoint(event.clientX, event.clientY);

    if (textNode && textNode.textContent) {
      const clickOffset = this.getOffsetInTextNode(
        textNode,
        event.clientX,
        event.clientY
      );
      const wordBounds = this.findRTLWordBounds(
        textNode.textContent,
        clickOffset
      );

      range.setStart(textNode, wordBounds.start);
      range.setEnd(textNode, wordBounds.end);

      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  private normalizeRTLSelection(range: Range): void {
    // Ensure selection works correctly with RTL text
    if (range.collapsed) return;

    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // If selection spans multiple elements, normalize it
    if (startContainer !== endContainer) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  private getTextNodeAtPoint(x: number, y: number): Text | null {
    const range = document.caretRangeFromPoint(x, y);
    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
      return range.startContainer as Text;
    }
    return null;
  }

  private getOffsetInTextNode(textNode: Text, x: number, y: number): number {
    const range = document.caretRangeFromPoint(x, y);
    if (range && range.startContainer === textNode) {
      return range.startOffset;
    }
    return 0;
  }

  private findRTLWordBounds(
    text: string,
    offset: number
  ): { start: number; end: number } {
    // RTL word boundary detection for Thaana
    const thaanaWordSeparators =
      /[\s\u0020\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\u061C\u200E\u200F]/;

    let start = offset;
    let end = offset;

    // Find start of word (going backwards)
    while (start > 0 && !thaanaWordSeparators.test(text[start - 1])) {
      start--;
    }

    // Find end of word (going forwards)
    while (end < text.length && !thaanaWordSeparators.test(text[end])) {
      end++;
    }

    return { start, end };
  }

  private handleEnhancedKeydown(event: KeyboardEvent): void {
    this.handleKeydownProtection(event);

    // RTL selection keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case "a":
        case "A":
          // Select all with better RTL handling
          event.preventDefault();
          this.selectAll();
          return;
        case "d":
        case "D":
          // Select current word
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

  private handleSmartEnter(event: KeyboardEvent): void {
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
      const hasContentChanges = mutations.some((mutation) => {
        if (mutation.type === "attributes") {
          const attrName = mutation.attributeName;
          if (attrName === "style") {
            const target = mutation.target as Element;
            const style = target.getAttribute("style") || "";
            if (style.includes("caret-color") || style.includes("selection")) {
              return false;
            }
          }
          return ["class", "style"].includes(attrName || "");
        }

        return (
          mutation.type === "childList" || mutation.type === "characterData"
        );
      });

      if (hasContentChanges && !this.suppressOnChange) {
        this.handleContentChange("mutation");
      }
    });

    this.mutationObserver.observe(this.editor, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style", "class", "data-*"],
      characterDataOldValue: false,
      attributeOldValue: false,
    });
  }

  private handleContentChange(
    source: string,
    immediate: boolean = false
  ): void {
    if (this.suppressOnChange) {
      return;
    }

    if (this.changeTimeout) {
      clearTimeout(this.changeTimeout);
    }

    let delay = 5;
    if (immediate) {
      delay = 0;
    } else if (source.startsWith("keyup-")) {
      delay = 10;
    } else if (source === "paste") {
      delay = 20;
    }

    this.changeTimeout = window.setTimeout(() => {
      try {
        const newContent = this.getMarkdown();

        if (newContent !== this.lastContent) {
          this.lastContent = newContent;
          this.config.onChange?.(newContent);
        }
      } catch (error) {
        console.error("Error in handleContentChange:", error);
      }
    }, delay);
  }

  private handleKeydownProtection(event: KeyboardEvent): void {
    if (event.key === "Backspace") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textBefore = this.getTextBeforeCursor(range);

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
    const patterns = [
      /\*\*$/,
      /\*$/,
      /~~$/,
      /#+ $/,
      /!\[.*\]\(.*\)$/,
      /\[.*\]\(.*\)$/,
    ];
    return patterns.some((pattern) => pattern.test(text));
  }

  private isNearMarkdownSyntax(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    const textBefore = this.getTextBeforeCursor(range);
    const textAfter = this.getTextAfterCursor(range);

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
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (range.startOffset > 0) {
        range.setStart(range.startContainer, range.startOffset - 1);
        range.collapse(true);
      }

      if (!this.suppressOnChange) {
        const markdown = this.getMarkdown();
        this.config.onChange?.(markdown);
      }
    }
  }

  public getMarkdown(): string {
    const htmlContent = this.editor.innerHTML;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;

    let markdown = this.processElementToMarkdown(tempDiv);

    markdown = markdown
      .replace(/\u200B/g, "")
      .replace(/\uFEFF/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\*\*[ \t]+/g, "**")
      .replace(/[ \t]+\*\*/g, "**")
      .replace(/\*[ \t]+/g, "*")
      .replace(/[ \t]+\*/g, "*")
      .replace(/~~[ \t]+/g, "~~")
      .replace(/[ \t]+~~/g, "~~")
      .replace(/^\s+|\s+$/g, "");

    return markdown;
  }
  // Replace your processElementToMarkdown method with this fixed version:

  private processElementToMarkdown(element: Element): string {
    let result = "";

    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || "";
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();

        switch (tagName) {
          case "br":
            result += "\n";
            break;
          case "div":
            const divContent = this.processElementToMarkdown(el);
            if (result && !result.endsWith("\n")) {
              result += "\n";
            }
            result += divContent;
            if (!result.endsWith("\n")) {
              result += "\n";
            }
            break;
          case "p":
            const pContent = this.processElementToMarkdown(el);
            if (result && !result.endsWith("\n")) {
              result += "\n";
            }
            result += pContent;
            if (!result.endsWith("\n")) {
              result += "\n";
            }
            break;
          case "strong":
          case "b":
            result += "**" + this.processElementToMarkdown(el) + "**";
            break;
          case "em":
          case "i":
            result += "*" + this.processElementToMarkdown(el) + "*";
            break;
          case "u":
            result += "<u>" + this.processElementToMarkdown(el) + "</u>";
            break;
          case "strike":
          case "s":
          case "del":
            result += "~~" + this.processElementToMarkdown(el) + "~~";
            break;
          case "code":
            result += "`" + this.processElementToMarkdown(el) + "`";
            break;
          case "pre":
            result += "```\n" + this.processElementToMarkdown(el) + "\n```";
            break;
          case "h1":
            result += "# " + this.processElementToMarkdown(el) + "\n";
            break;
          case "h2":
            result += "## " + this.processElementToMarkdown(el) + "\n";
            break;
          case "h3":
            result += "### " + this.processElementToMarkdown(el) + "\n";
            break;
          case "h4":
            result += "#### " + this.processElementToMarkdown(el) + "\n";
            break;
          case "h5":
            result += "##### " + this.processElementToMarkdown(el) + "\n";
            break;
          case "h6":
            result += "###### " + this.processElementToMarkdown(el) + "\n";
            break;
          case "blockquote":
            result += "> " + this.processElementToMarkdown(el) + "\n";
            break;
          case "ul":
            result += this.processUnorderedList(el);
            break;
          case "ol":
            result += this.processOrderedList(el);
            break;
          case "li":
            result += this.processElementToMarkdown(el);
            break;

          case "span":
            result += this.processElementToMarkdown(el);
            break;
          default:
            result += this.processElementToMarkdown(el);
            break;
        }
      }
    }

    return result;
  }

  private processUnorderedList(element: Element): string {
    let result = "";
    const listItems = Array.from(element.children).filter(
      (child) => child.tagName.toLowerCase() === "li"
    );

    listItems.forEach((li) => {
      const content = this.processElementToMarkdown(li).trim();
      if (content) {
        result += "- " + content + "\n";
      }
    });

    if (result && !result.endsWith("\n")) {
      result += "\n";
    }

    return result;
  }

  private processOrderedList(element: Element): string {
    let result = "";
    const listItems = Array.from(element.children).filter(
      (child) => child.tagName.toLowerCase() === "li"
    );

    listItems.forEach((li, index) => {
      const content = this.processElementToMarkdown(li).trim();
      if (content) {
        result += `${index + 1}. ${content}\n`;
      }
    });

    if (result && !result.endsWith("\n")) {
      result += "\n";
    }

    return result;
  }

  public setMarkdown(content: string, preserveFocus: boolean = false): void {
    const html = this.markdownFormatter.markdownToHtml(content);
    const hadFocus = this.editor === document.activeElement;
    const selection = hadFocus ? this.getSelection() : null;

    this.suppressOnChange = true;
    this.editor.innerHTML = html;
    this.suppressOnChange = false;

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

  public insertListItem(type: "bullet" | "numbered" = "bullet"): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    const marker = this.getListMarker(type, range);

    if (selectedText && selectedText.trim()) {
      this.addBulletsToSelection(selectedText, marker, range, type);
    } else {
      this.addBulletAtCursor(marker, range);
    }

    if (!this.suppressOnChange) {
      const markdown = this.getMarkdown();
      this.config.onChange?.(markdown);
    }
  }

  private addBulletsToSelection(
    selectedText: string,
    marker: string,
    range: Range,
    type: "bullet" | "numbered"
  ): void {
    const lines = selectedText.split("\n");
    let currentNumber = 1;

    if (type === "numbered") {
      const numberMatch = marker.match(/^(\d+)\. /);
      if (numberMatch) {
        currentNumber = parseInt(numberMatch[1], 10);
      }
    }

    const bulletedLines = lines.map((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine === "") {
        return "";
      }

      if (trimmedLine.startsWith("- ") || /^\d+\. /.test(trimmedLine)) {
        return line;
      }

      if (type === "numbered") {
        const numberMarker = `${currentNumber + index}. `;
        return numberMarker + trimmedLine;
      } else {
        return marker + trimmedLine;
      }
    });

    const bulletedText = bulletedLines.join("\n");

    try {
      const textNode = document.createTextNode(bulletedText);
      range.deleteContents();
      range.insertNode(textNode);

      const selection = window.getSelection();
      if (selection) {
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      console.error("Error adding bullets to selection:", error);
    }
  }

  private addBulletAtCursor(marker: string, range: Range): void {
    const atLineStart = this.isAtLineStart(range);
    const bulletText = atLineStart ? marker : `\n${marker}`;

    try {
      const textNode = document.createTextNode(bulletText);
      range.insertNode(textNode);

      range.setStartAfter(textNode);
      range.setEndAfter(textNode);

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);

        setTimeout(() => {
          const newRange = document.createRange();
          newRange.setStartAfter(textNode);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);

          if (this.editor) {
            this.editor.focus();
          }
        }, 5);
      }
    } catch (error) {
      console.error("Error adding bullet at cursor:", error);
    }
  }

  private getListMarker(type: "bullet" | "numbered", range: Range): string {
    if (type === "bullet") {
      return "- ";
    }

    const nextNumber = this.getNextListNumber(range);
    return `${nextNumber}. `;
  }

  private getNextListNumber(range: Range): number {
    const editorContent = this.editor.textContent || "";
    const cursorPosition = this.getCursorPosition(range);
    const lines = editorContent.split("\n");
    let currentLineIndex = 0;
    let characterCount = 0;

    for (let i = 0; i < lines.length; i++) {
      if (characterCount + lines[i].length >= cursorPosition) {
        currentLineIndex = i;
        break;
      }
      characterCount += lines[i].length + 1;
    }

    let lastNumber = 0;

    for (let i = currentLineIndex; i >= 0; i--) {
      const line = lines[i].trim();
      const numberMatch = line.match(/^(\d+)\. /);

      if (numberMatch) {
        lastNumber = parseInt(numberMatch[1], 10);
        break;
      }

      if (line && !line.startsWith("-") && !numberMatch) {
        break;
      }
    }

    return lastNumber + 1;
  }

  private getCursorPosition(range: Range): number {
    const rangeCopy = range.cloneRange();
    rangeCopy.selectNodeContents(this.editor);
    rangeCopy.setEnd(range.startContainer, range.startOffset);
    return rangeCopy.toString().length;
  }

  private isAtLineStart(range: Range): boolean {
    const container = range.startContainer;
    const offset = range.startOffset;

    if (container.nodeType === Node.TEXT_NODE) {
      const textContent = container.textContent || "";

      if (offset === 0) {
        return true;
      }

      const charBefore = textContent.charAt(offset - 1);
      return charBefore === "\n";
    }

    return offset === 0;
  }

  private applyTextFormatting(format: string, selectedText: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const formattedElement = this.createFormattedElement(format, selectedText);

    range.extractContents();
    range.insertNode(formattedElement);

    range.setStartAfter(formattedElement);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    if (!this.suppressOnChange) {
      setTimeout(() => {
        const markdown = this.getMarkdown();
        this.config.onChange?.(markdown);
      }, 10);
    }
  }

  private createFormattedElement(format: string, text: string): HTMLElement {
    let element: HTMLElement;

    switch (format) {
      case "bold":
        element = document.createElement("strong");
        break;
      case "italic":
        element = document.createElement("em");
        break;
      case "underline":
        element = document.createElement("u");
        break;
      case "strikethrough":
        element = document.createElement("s");
        break;
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        element = document.createElement(format);
        break;
      case "blockquote":
        element = document.createElement("blockquote");
        break;
      case "code":
        element = document.createElement("code");
        break;
      default:
        element = document.createElement("span");
    }

    element.textContent = text;
    return element;
  }

  private getFormattedLength(format: string): number {
    switch (format) {
      case "bold":
        return 4;
      case "italic":
        return 2;
      case "underline":
        return 7;
      case "strikethrough":
        return 4;
      default:
        return 0;
    }
  }

  private getTextPosition(container: Node, offset: number): number {
    const range = document.createRange();
    range.selectNodeContents(this.editor);
    range.setEnd(container, offset);
    return range.toString().length;
  }

  private setCursorPosition(textOffset: number): void {
    const walker = document.createTreeWalker(
      this.editor,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentOffset = 0;
    let targetNode: Node | null = null;
    let targetOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nodeLength = node.textContent?.length || 0;

      if (currentOffset + nodeLength >= textOffset) {
        targetNode = node;
        targetOffset = textOffset - currentOffset;
        break;
      }

      currentOffset += nodeLength;
    }

    if (targetNode) {
      const range = document.createRange();
      range.setStart(targetNode, targetOffset);
      range.collapse(true);

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  public applyFormat(format: FormatType): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString();

    if (this.isInMarkdownSyntax() || this.isNearMarkdownSyntax()) {
      this.applyFormatSafely(format);
      return;
    }

    const allowWithoutSelection = [
      "bullet-list",
      "numbered-list",
      "image",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "code-block",
    ];

    if (
      (!selectedText || selectedText.trim() === "") &&
      !allowWithoutSelection.includes(format)
    ) {
      return;
    }

    switch (format) {
      case "bold":
      case "italic":
      case "underline":
      case "strikethrough":
        if (!selectedText) return;
        this.applyTextFormatting(format, selectedText);
        break;

      // Headings
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        this.applyHeading(format);
        break;

      // Blockquote
      case "blockquote":
        this.applyBlockquote();
        break;

      // Code formatting
      case "code":
        if (!selectedText) return;
        this.applyInlineCode(selectedText);
        break;

      case "code-block":
        this.applyCodeBlock();
        break;

      // Existing cases
      case "image":
        this.openImageDialog();
        break;
      case "bullet-list":
        this.insertListItem("bullet");
        break;
      case "numbered-list":
        this.insertListItem("numbered");
        break;
    }
  }

  private applyHeading(headingType: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString() || "Heading";

    const headingElement = document.createElement(headingType); // h1, h2, h3, etc.
    headingElement.textContent = selectedText;

    try {
      range.deleteContents();
      range.insertNode(headingElement);
      range.setStartAfter(headingElement);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      if (!this.suppressOnChange) {
        setTimeout(() => {
          const markdown = this.getMarkdown();
          this.config.onChange?.(markdown);
        }, 10);
      }
    } catch (error) {
      console.error("Error applying heading:", error);
    }
  }

  private applyBlockquote(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString() || "Quote";

    // Create actual HTML blockquote element
    const blockquoteElement = document.createElement("blockquote");
    blockquoteElement.textContent = selectedText;

    try {
      range.deleteContents();
      range.insertNode(blockquoteElement);

      // Position cursor after the blockquote
      range.setStartAfter(blockquoteElement);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      if (!this.suppressOnChange) {
        setTimeout(() => {
          const markdown = this.getMarkdown();
          this.config.onChange?.(markdown);
        }, 10);
      }
    } catch (error) {
      console.error("Error applying blockquote:", error);
    }
  }

  private applyInlineCode(selectedText: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Create actual HTML code element
    const codeElement = document.createElement("code");
    codeElement.textContent = selectedText;

    try {
      range.deleteContents();
      range.insertNode(codeElement);

      // Position cursor after the code
      range.setStartAfter(codeElement);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      if (!this.suppressOnChange) {
        setTimeout(() => {
          const markdown = this.getMarkdown();
          this.config.onChange?.(markdown);
        }, 10);
      }
    } catch (error) {
      console.error("Error applying inline code:", error);
    }
  }

  private applyCodeBlock(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString() || "code";

    // Create actual HTML pre + code elements
    const preElement = document.createElement("pre");
    const codeElement = document.createElement("code");
    codeElement.textContent = selectedText;
    preElement.appendChild(codeElement);

    try {
      range.deleteContents();
      range.insertNode(preElement);

      // Position cursor after the code block
      range.setStartAfter(preElement);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      if (!this.suppressOnChange) {
        setTimeout(() => {
          const markdown = this.getMarkdown();
          this.config.onChange?.(markdown);
        }, 10);
      }
    } catch (error) {
      console.error("Error applying code block:", error);
    }
  }

  // Replace your existing applyFormatSafely method with this:
  private applyFormatSafely(format: FormatType): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString();

    // Some formats don't require selected text
    const allowWithoutSelection = [
      "bullet-list",
      "numbered-list",
      "image",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "code-block",
    ];

    if (!selectedText && !allowWithoutSelection.includes(format)) {
      return;
    }

    switch (format) {
      case "bold":
      case "italic":
      case "underline":
      case "strikethrough":
        if (!selectedText) return;
        this.applyTextFormatting(format, selectedText);
        break;

      // Headings
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        this.applyHeading(format);
        break;

      // Blockquote
      case "blockquote":
        this.applyBlockquote();
        break;

      // Code formatting
      case "code":
        if (!selectedText) return;
        this.applyInlineCode(selectedText);
        break;

      case "code-block":
        this.applyCodeBlock();
        break;

      // Existing cases
      case "image":
        this.openImageDialog();
        break;
      case "bullet-list":
        this.insertListItem("bullet");
        break;
      case "numbered-list":
        this.insertListItem("numbered");
        break;
    }
  }
  public removeFormat(format: FormatType): void {
    this.applyFormat(format);
  }
  private isHeadingActive(headingType: string): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    let element: Node | null = range.startContainer;

    // Traverse up the DOM to find if we're inside a heading
    while (element && element !== this.editor) {
      if (element.nodeType === Node.ELEMENT_NODE) {
        const tagName = (element as Element).tagName.toLowerCase();
        if (tagName === headingType) {
          return true;
        }
      }
      element = element.parentNode;
    }

    return false;
  }

  private isBlockquoteActive(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    let element: Node | null = range.startContainer;

    // Traverse up the DOM to find if we're inside a blockquote
    while (element && element !== this.editor) {
      if (element.nodeType === Node.ELEMENT_NODE) {
        const tagName = (element as Element).tagName.toLowerCase();
        if (tagName === "blockquote") {
          return true;
        }
      }
      element = element.parentNode;
    }

    return false;
  }

  private isInlineCodeActive(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    let element: Node | null = range.startContainer;

    // Traverse up the DOM to find if we're inside inline code
    while (element && element !== this.editor) {
      if (element.nodeType === Node.ELEMENT_NODE) {
        const tagName = (element as Element).tagName.toLowerCase();
        if (tagName === "code") {
          // Make sure it's not inside a pre element (code block)
          const parentPre = (element as Element).closest("pre");
          if (!parentPre) {
            return true;
          }
        }
      }
      element = element.parentNode;
    }

    return false;
  }

  private isCodeBlockActive(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    let element: Node | null = range.startContainer;

    // Traverse up the DOM to find if we're inside a pre (code block)
    while (element && element !== this.editor) {
      if (element.nodeType === Node.ELEMENT_NODE) {
        const tagName = (element as Element).tagName.toLowerCase();
        if (tagName === "pre") {
          return true;
        }
      }
      element = element.parentNode;
    }

    return false;
  }

  public isFormatActive(format: FormatType): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    switch (format) {
      case "bold":
        return document.queryCommandState("bold");
      case "italic":
        return document.queryCommandState("italic");
      case "underline":
        return document.queryCommandState("underline");
      case "strikethrough":
        return document.queryCommandState("strikeThrough");

      // Check for headings
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return this.isHeadingActive(format);

      // Check for blockquote
      case "blockquote":
        return this.isBlockquoteActive();

      // Check for code
      case "code":
        return this.isInlineCodeActive();

      case "code-block":
        return this.isCodeBlockActive();

      default:
        return false;
    }
  }

  public insertImage(imageData: ImageData): void {
    let markdownImage = `![${
      imageData.alt || this.config.image?.defaultAltText || ""
    }](${imageData.src}`;

    if (imageData.title) {
      markdownImage += ` "${imageData.title}"`;
    }

    markdownImage += ")";
    const protectedMarkdown = `\n${markdownImage}\n`;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(protectedMarkdown));
      range.collapse(false);
    }

    const markdown = this.getMarkdown();
    this.config.onChange?.(markdown);
  }

  public async openImageDialog(): Promise<void> {
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

    const url = prompt("Photo URL:", "https://");
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

  public selectText(start: number, end: number): void {
    // Helper method for programmatic text selection in RTL context
    const textContent = this.editor.textContent || "";
    if (start < 0 || end > textContent.length || start > end) {
      return;
    }

    const walker = document.createTreeWalker(
      this.editor,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentOffset = 0;
    let startNode: Node | null = null;
    let endNode: Node | null = null;
    let startNodeOffset = 0;
    let endNodeOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nodeLength = node.textContent?.length || 0;

      if (!startNode && currentOffset + nodeLength >= start) {
        startNode = node;
        startNodeOffset = start - currentOffset;
      }

      if (!endNode && currentOffset + nodeLength >= end) {
        endNode = node;
        endNodeOffset = end - currentOffset;
        break;
      }

      currentOffset += nodeLength;
    }

    if (startNode && endNode) {
      const range = document.createRange();
      range.setStart(startNode, startNodeOffset);
      range.setEnd(endNode, endNodeOffset);

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  public selectAll(): void {
    // Select all text with proper RTL handling
    const range = document.createRange();
    range.selectNodeContents(this.editor);

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  public selectCurrentWord(): void {
    // Select the word at current cursor position
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
      const offset = range.startOffset;
      const wordBounds = this.findRTLWordBounds(textNode.textContent, offset);

      const newRange = document.createRange();
      newRange.setStart(textNode, wordBounds.start);
      newRange.setEnd(textNode, wordBounds.end);

      selection.removeAllRanges();
      selection.addRange(newRange);
    }
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

  public appendContent(content: string): void {
    const currentMarkdown = this.getMarkdown();
    const newContent = currentMarkdown
      ? currentMarkdown + "\n" + content
      : content;
    this.setMarkdown(newContent);
  }

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

    if (this.changeTimeout) {
      clearTimeout(this.changeTimeout);
      this.changeTimeout = undefined;
    }

    this.thaanaInput.destroy();
    this.editor.remove();
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

      if (!this.suppressOnChange) {
        const markdown = this.getMarkdown();
        this.config.onChange?.(markdown);
      }
    }
  }
}
