import { ThaanaKeyboardLayout } from "../types";
import { AKURU, FILI, IMMEDIATE_CHARS, STANDARD_CHAR_MAP, LAYOUTS, LayoutName } from "./constants";

interface EmitterLike {
  emit: (event: string, payload: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export class ThaanaInput {
  private config: ThaanaKeyboardLayout;
  private className = ".dv-rich-editor";
  private hostEditorEl: HTMLElement | null = null; // reference for synthetic input events
  private AkuruBuffer = "";
  private lastAkuru = "";
  private expectingFili = false;
  private bufferTimeout: ReturnType<typeof setTimeout> | null = null;
  private isBufferInserted = false;
  private lastSelection: { node: Node; offset: number } | null = null;
  private selectionChanged = true;
  private activeLayout: Record<string, string> = STANDARD_CHAR_MAP;
  private layoutName: string = "standard";
  private emitter?: EmitterLike;
  private emitBufferEvents = true; // can be toggled to disable ime-buffer events
  private recentKeyTimestamps: number[] = []; // sliding window for burst detection
  private burstSuppressed = false;

  constructor(config?: ThaanaKeyboardLayout, emitter?: EmitterLike) {
    this.config = config || { enabled: true };
    this.emitter = emitter;
 
    if (config && typeof config.emitBufferEvents === 'boolean') {
      this.emitBufferEvents = !!config.emitBufferEvents;
    }
  }

  public initialize(editor: HTMLElement): void {
    this.hostEditorEl = editor;
    if (!this.config.enabled) return;

    editor.classList.add("dv-rich-editor");

    editor.addEventListener("beforeinput", this.beforeInputEvent);
    editor.addEventListener("input", this.inputEvent);
    document.addEventListener("selectionchange", this.throttledSelectionChange);
    editor.addEventListener("keydown", this.keydownEvent);
    editor.addEventListener("click", this.clickEvent);
    editor.addEventListener("blur", this.blurEvent);
  }

  private beforeInputEvent = (event: Event): void => {
    const e = event as InputEvent;

    if (!this.config.enabled) return;

    if ([
      "deleteContentBackward",
      "deleteContentForward",
      "deleteByCut",
      "deleteByDrag",
    ].includes(e.inputType || "")) {
      this.flushBuffer();
      setTimeout(() => this.cleanupDOMAfterDeletion(), 0);
      return;
    }

    if (["insertCompositionText", "insertText"].includes(e.inputType || "")) {
      const inputChar = (e.data || "").slice(-1);
      if (inputChar === " ") {
        this.flushBuffer();
        this.ensureCleanDOMState();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      this.processCharacterInput(inputChar);
      return;
    }

    if ([
      "insertFromPaste",
      "insertFromDrop",
      "insertReplacementText",
      "insertFromYank",
    ].includes(e.inputType || "")) {
      this.flushBuffer();
      setTimeout(() => this.handlePastedContentSmart(), 0);
    }
  };

  private cleanupDOMAfterDeletion(): void {
    const editorElement = document.querySelector(this.className) as HTMLElement;
    if (!editorElement) return;

    const selection = window.getSelection();
    if (!selection) return;

    const currentRange =
      selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    try {
      editorElement.normalize();

      const content = editorElement.textContent || "";
      if (content.trim() === "") {
      
        editorElement.innerHTML = "";
        const textNode = document.createTextNode("");
        editorElement.appendChild(textNode);

      
        const newRange = document.createRange();
        newRange.setStart(textNode, 0);
        newRange.setEnd(textNode, 0);
        selection.removeAllRanges();
        selection.addRange(newRange);

        this.lastSelection = { node: textNode, offset: 0 };
      } else {

        if (currentRange) {
          try {
            selection.removeAllRanges();
            selection.addRange(currentRange);
          } catch (error) {
           
            this.placeCursorAtEnd(editorElement);
          }
        }
      }
    } catch (error) {
      console.warn("ThaanaInput: Error during DOM cleanup:", error);

      this.placeCursorAtEnd(editorElement);
    }
  }

  private ensureCleanDOMState(): void {
    const editorElement = document.querySelector(this.className) as HTMLElement;
    if (!editorElement) return;

    try {
  
      editorElement.normalize();

  
      if (editorElement.childNodes.length === 0) {
        const textNode = document.createTextNode("");
        editorElement.appendChild(textNode);
      }
    } catch (error) {
      console.warn("ThaanaInput: Error ensuring clean DOM state:", error);
    }
  }

  private placeCursorAtEnd(editorElement: HTMLElement): void {
    const selection = window.getSelection();
    if (!selection) return;

    try {
      const range = document.createRange();

      // Find the last text node
      const walker = document.createTreeWalker(
        editorElement,
        NodeFilter.SHOW_TEXT,
        null
      );

      let lastTextNode = null;
      let node;
      while ((node = walker.nextNode())) {
        lastTextNode = node;
      }

      if (lastTextNode) {
        range.setStart(lastTextNode, lastTextNode.textContent?.length || 0);
        range.setEnd(lastTextNode, lastTextNode.textContent?.length || 0);
      } else {
        // No text nodes, create one
        const textNode = document.createTextNode("");
        editorElement.appendChild(textNode);
        range.setStart(textNode, 0);
        range.setEnd(textNode, 0);
      }

      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) {
      console.warn("ThaanaInput: Error placing cursor:", error);
    }
  }

  private processCharacterInput(char: string): void {
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
  
  const now = performance.now ? performance.now() : Date.now();
  this.recentKeyTimestamps.push(now);
  if (this.recentKeyTimestamps.length > 32) this.recentKeyTimestamps.shift();
  this.detectAndApplyBurstState();

    if (IMMEDIATE_CHARS.has(char)) {
      this.flushBuffer();
      this.insertCharacterDirect(this.getChar(char));
      this.dispatchSyntheticInput();
      return;
    }
    if (AKURU.has(char)) {
      this.handleAkuruInput(char);
      return;
    }
    if (FILI.has(char)) {
      this.handleFiliInput(char);
      return;
    }
    this.flushBuffer();
    this.insertCharacterDirect(this.getChar(char));
    this.dispatchSyntheticInput();
  }

  private handleAkuruInput(char: string): void {
    // clear the buffer if it already has a akuru
    if (this.AkuruBuffer) {
      this.flushBuffer();
    }

    // put in new akuru
  this.AkuruBuffer = char;
  this.lastAkuru = this.getChar(char);
    this.expectingFili = true;
    this.isBufferInserted = false;

    // insert the akuru
    this.insertCharacterDirect(this.lastAkuru);
    this.isBufferInserted = true;

  // emit start event
  if (this.shouldEmit()) this.emitter?.emit("ime-buffer-start", { akuru: this.lastAkuru });

    // wait till 500ms to see if a fili comes and flush
    this.bufferTimeout = setTimeout(() => {
      this.clearBuffer();
      this.dispatchSyntheticInput();
    }, 500);
    this.dispatchSyntheticInput();
  }

  private handleFiliInput(char: string): void {
    if (this.expectingFili && this.AkuruBuffer && this.isBufferInserted) {
      const filiChar = this.getChar(char);
      const syllable = this.lastAkuru + filiChar;
      this.replaceLastCharacter(syllable);
  if (this.shouldEmit()) this.emitter?.emit("ime-buffer-commit", { syllable });
      this.clearBuffer();
      this.dispatchSyntheticInput();
    } else {
      this.flushBuffer();
      this.insertCharacterDirect(this.getChar(char));
      this.dispatchSyntheticInput();
    }
  }

  private insertCharacterDirect(char: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.startContainer;

    if (container.nodeType !== Node.TEXT_NODE) {
      const tn = document.createTextNode(char);
      range.insertNode(tn);
      const newRange = document.createRange();
      newRange.setStartAfter(tn);
      newRange.setEndAfter(tn);
      selection.removeAllRanges();
      selection.addRange(newRange);
      this.lastSelection = { node: tn, offset: tn.textContent?.length || 0 };
      return;
    }

    const textNode = container as Text;
    const textContent = textNode.textContent || "";
    const offset = range.startOffset;
    const before = textContent.slice(0, offset);
    const after = textContent.slice(offset);
    const newText = before + char + after;
    const newCursor = before.length + char.length;
    try {
      textNode.textContent = newText;
      const nr = document.createRange();
      nr.setStart(textNode, newCursor);
      nr.setEnd(textNode, newCursor);
      selection.removeAllRanges();
      selection.addRange(nr);
      this.lastSelection = { node: textNode, offset: newCursor };
      this.selectionChanged = false;
      this.dispatchSyntheticInput();
    } catch (e) {
      console.warn("ThaanaInput: Error inserting character", e);
    }
  }

  private replaceLastCharacter(newChar: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType !== Node.TEXT_NODE) return;

    const textContent = textNode.textContent || "";
    const offset = range.startOffset;

    if (offset > 0) {
      const beforeChar = textContent.substring(0, offset - 1);
      const afterChar = textContent.substring(offset);
      const newText = beforeChar + newChar + afterChar;
      const newCursorPosition = beforeChar.length + newChar.length;

      // Direct DOM update
      try {
        textNode.textContent = newText;

        const newRange = document.createRange();
        const safePosition = Math.min(newCursorPosition, newText.length);
        newRange.setStart(textNode, safePosition);
        newRange.setEnd(textNode, safePosition);
        selection.removeAllRanges();
        selection.addRange(newRange);

        this.lastSelection = { node: textNode, offset: newCursorPosition };
        this.selectionChanged = false;
      } catch (error) {
        console.warn("ThaanaInput: Error replacing character:", error);
      }
    }
  }

  private flushBuffer(): void {
    if (this.AkuruBuffer) {
      this.clearBuffer();
    }
  }

  private clearBuffer(): void {
    this.AkuruBuffer = "";
    this.lastAkuru = "";
    this.expectingFili = false;
    this.isBufferInserted = false;
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
  if (this.shouldEmit()) this.emitter?.emit("ime-buffer-flush", {});
  this.dispatchSyntheticInput();
  }

  // More event handlers..
  private throttledSelectionChange = this.throttle(() => {
    this.selectionChanged = true;
    this.flushBuffer();
  }, 16);

  private keydownEvent = (event: KeyboardEvent): void => {
    if (!this.config.enabled) return;

    if (event.ctrlKey || event.metaKey) {
      this.flushBuffer();
    }
  };

  private clickEvent = (_e: MouseEvent): void => {
    if (!this.config.enabled) return;
    this.flushBuffer();
  };

  private blurEvent = (_e: FocusEvent): void => {
    if (!this.config.enabled) return;
    this.flushBuffer();
  };

  private inputEvent = (_e: Event): void => {
    // Intentionally empty; logic handled in beforeinput
  };

  // utils
  private getChar(char: string): string {
    // Inline hot path (avoid function indirection & extra lookups)
    const km = this.config.keyMap;
    if (km) {
      const mapped = km[char];
      return mapped !== undefined ? mapped : char;
    }
    const al = this.activeLayout;
    const mapped = al[char];
    return mapped !== undefined ? mapped : char;
  }

  private throttle<T extends unknown[]>(func: (...args: T) => void, wait: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: T) => {
      if (timeout !== null) return;
      timeout = setTimeout(() => {
        func.apply(this, args);
        timeout = null;
      }, wait);
    };
  }

  private handlePastedContentSmart(): void {
    // Just ensure clean DOM state
    this.ensureCleanDOMState();
  }



  private shouldConvertText(text: string): boolean {
    // Don't convert if text contains markdown syntax
  if (/[#*`>\-\[\](){}]/.test(text)) { // eslint-disable-line no-useless-escape
      return false;
    }

    // Don't convert if text contains URLs
    if (/https?:\/\/|www\./i.test(text)) {
      return false;
    }

    // Don't convert if text is mostly English words (3+ letter sequences)
    const englishWords = text.match(/\b[a-zA-Z]{3,}\b/g);
    if (englishWords && englishWords.length > 2) {
      return false;
    }

    // Don't convert code blocks or inline code
    if (/```|`/.test(text)) {
      return false;
    }

    // Don't convert numbers and common punctuation
    if (/^\d+[\d\s.,;:()-]*$/.test(text.trim())) {
      return false;
    }

    return true;
  }

  // Selective conversion that preserves markdown
  public convertToThaanaSelective(text: string): string {
    if (!this.shouldConvertText(text)) {
      return text; // Return unchanged if it shouldn't be converted
    }

    return this.convertToThaana(text);
  }

  public convertToThaana(text: string): string {
    let result = "";
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      // Handle akuru + fili combinations
      if (AKURU.has(char) && i + 1 < text.length) {
        const nextChar = text[i + 1];
        if (FILI.has(nextChar)) {
          result += this.getChar(char) + this.getChar(nextChar);
          i += 2;
          continue;
        }
      }

      result += this.getChar(char);
      i++;
    }

    return result;
  }

  // Manual conversion method for user-triggered conversion
  public convertSelectedTextToThaana(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    if (!selectedText.trim()) return false;

    // Always convert when manually triggered
    const convertedText = this.convertToThaana(selectedText);

    if (selectedText !== convertedText) {
      try {
        // Replace selected text with converted text
        range.deleteContents();
        const textNode = document.createTextNode(convertedText);
        range.insertNode(textNode);

        // Position cursor after inserted text
        const newRange = document.createRange();
        newRange.setStartAfter(textNode);
        newRange.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(newRange);

        return true;
      } catch (error) {
        console.error("ThaanaInput: Error converting selected text:", error);
        return false;
      }
    }

    return false;
  }

  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;

    if (!enabled) {
      this.flushBuffer();
    }
  }

  public updateKeyMap(newKeyMap: Record<string, string>): void {
    this.config.keyMap = newKeyMap;
    this.activeLayout = newKeyMap;
    this.layoutName = "custom";
  }

  // Toggle emission of ime-buffer-* events (runtime)
  public setEmitBufferEvents(enabled: boolean): void {
    this.emitBufferEvents = enabled;
  }

  private detectAndApplyBurstState(): void {
    if (this.recentKeyTimestamps.length < 8) return; // need enough samples
    const span = this.recentKeyTimestamps[this.recentKeyTimestamps.length - 1] - this.recentKeyTimestamps[0];
    // If >= 8 key events within 40ms * (#events/8) roughly -> very high frequency
    if (!this.burstSuppressed && span < 25 * (this.recentKeyTimestamps.length / 8)) {
      // Auto disable emissions (hot path reduction)
      this.burstSuppressed = true;
    } else if (this.burstSuppressed) {
      // Re-enable once span widens (user slows)
      if (span > 120) this.burstSuppressed = false;
    }
  }

  private shouldEmit(): boolean {
    return this.emitBufferEvents && !this.burstSuppressed;
  }

  public setLayout(layout: LayoutName | Record<string, string>): void {
    if (typeof layout === "string") {
      const map = LAYOUTS[layout];
      if (!map) return;
      this.activeLayout = map;
      this.layoutName = layout;
      return;
    }
    this.activeLayout = layout;
    this.layoutName = "custom";
  }

  public getLayout(): { name: string; map: Record<string, string> } {
    return { name: this.layoutName, map: this.activeLayout };
  }

  public getConfig(): ThaanaKeyboardLayout {
    return this.config;
  }

  public destroy(): void {
    this.flushBuffer();

    document.removeEventListener(
      "selectionchange",
      this.throttledSelectionChange
    );

    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
    }

    this.lastSelection = null;
    this.clearBuffer();
  }

  private dispatchSyntheticInput(): void {
    if (!this.hostEditorEl) return;
    const evt = new Event('input', { bubbles: true });
    this.hostEditorEl.dispatchEvent(evt);
  }
}
