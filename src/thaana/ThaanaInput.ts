import { ThaanaKeyboardLayout } from '../types';

export class ThaanaInput {
  private config: ThaanaKeyboardLayout;
  private className: string = '.dv-rich-editor';
  

  private AkuruBuffer: string = '';
  private lastAkuru: string = '';
  private expectingFili: boolean = false;
  private bufferTimeout: number | null = null;
  private isBufferInserted: boolean = false;
  

  private lastSelection: { node: Node; offset: number } | null = null;
  private selectionChanged = true;

  //categorization for buffering
  private static readonly AKURU = new Set([
    'd', 'k', 's', 't', 'f', 'g', 'h', 'j', 'l', 'z', 'v', 'b', 'n', 'm', 'r', 'y', 'p', 'c',
    'D', 'K', 'S', 'T', 'F', 'G', 'H', 'J', 'L', 'Z', 'V', 'B', 'N', 'M', 'R', 'Y', 'P', 'C'
  ]);
  
  private static readonly FILI = new Set([
    'a', 'i', 'u', 'e', 'o', 'q', 
    'A', 'I', 'U', 'E', 'O'      
  ]);
  

  private static readonly IMMEDIATE_CHARS = new Set([
    '.', ',', '!', '?', '\n', '\t', ';', ':', '(', ')', '[', ']', '{', '}', '<', '>', '/', '\\'
  ])


  private static readonly CHAR_MAP = new Map([
    ['q', 'ް'], ['w', 'އ'], ['e', 'ެ'], ['r', 'ރ'], ['t', 'ތ'],
    ['y', 'ޔ'], ['u', 'ު'], ['i', 'ި'], ['o', 'ޮ'], ['p', 'ޕ'],
    ['a', 'ަ'], ['s', 'ސ'], ['d', 'ދ'], ['f', 'ފ'], ['g', 'ގ'],
    ['h', 'ހ'], ['j', 'ޖ'], ['k', 'ކ'], ['l', 'ލ'], ['z', 'ޒ'],
    ['x', '×'], ['c', 'ޗ'], ['v', 'ވ'], ['b', 'ބ'], ['n', 'ނ'], ['m', 'މ'],
    
    ['Q', 'ޤ'], ['W', 'ޢ'], ['E', 'ޭ'], ['R', 'ޜ'], ['T', 'ޓ'],
    ['Y', 'ޠ'], ['U', 'ޫ'], ['I', 'ީ'], ['O', 'ޯ'], ['P', '÷'],
    ['A', 'ާ'], ['S', 'ށ'], ['D', 'ޑ'], ['F', 'ﷲ'], ['G', 'ޣ'],
    ['H', 'ޙ'], ['J', 'ޛ'], ['K', 'ޚ'], ['L', 'ޅ'], ['Z', 'ޡ'],
    ['X', 'ޘ'], ['C', 'ޝ'], ['V', 'ޥ'], ['B', 'ޞ'], ['N', 'ޏ'], ['M', 'ޟ'],

    [',', '،'], [';', '؛'], ['?', '؟'], ['<', '>'], ['>', '<'],
    ['[', ']'], [']', '['], ['(', ')'], [')', '('], ['{', '}'], ['}', '{']
  ]);

  constructor(config?: ThaanaKeyboardLayout) {
    this.config = config || { enabled: true };
  }


  public initialize(editor: HTMLElement): void {
    if (!this.config.enabled) return;

    editor.classList.add('dv-rich-editor');
    
    // Event listeners
    editor.addEventListener('beforeinput', this.beforeInputEvent);
    editor.addEventListener('input', this.inputEvent);
    document.addEventListener('selectionchange', this.throttledSelectionChange);
    editor.addEventListener('keydown', this.keydownEvent);
    editor.addEventListener('click', this.clickEvent);
    editor.addEventListener('blur', this.blurEvent);
  }
  
  
  private beforeInputEvent = (event: Event): void => {
    const e = event as InputEvent;
    
    if (!this.config.enabled) return;
  
  
    if (['deleteContentBackward', 'deleteContentForward', 'deleteByCut', 'deleteByDrag'].includes(e.inputType || '')) {
      this.flushBuffer();
      
      // Schedule DOM cleanup after browser handles the deletion
      setTimeout(() => {
        this.cleanupDOMAfterDeletion();
      }, 0);
      
      return; // Let browser handle deletion
    }
  
    // Handle text insertion with buffering
    if (['insertCompositionText', 'insertText'].includes(e.inputType || '')) {
      const inputChar = (e.data || '').charAt((e.data || '').length - 1);
  
      // Handle space character - let browser handle but ensure clean DOM state
      if (inputChar === ' ') {
        this.flushBuffer();
        

        this.ensureCleanDOMState();
        
        return;
      }
  
      e.preventDefault();
      e.stopPropagation();
  
      this.processCharacterInput(inputChar);
    }
    
    // Handle paste events
    else if (['insertFromPaste', 'insertFromDrop', 'insertReplacementText', 'insertFromYank'].includes(e.inputType || '')) {
      this.flushBuffer();
      setTimeout(() => this.handlePastedContent(), 0);
    }
  };
  
 
  private cleanupDOMAfterDeletion(): void {
    const editorElement = document.querySelector(this.className) as HTMLElement;
    if (!editorElement) return;
  
    const selection = window.getSelection();
    if (!selection) return;
  
    // Store current selection
    const currentRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    
    try {
      // Normalize the DOM to remove empty text nodes and artifacts
      editorElement.normalize();
      
      // If editor is empty or contains only whitespace, clean it completely
      const content = editorElement.textContent || '';
      if (content.trim() === '') {
        // Clear everything and ensure single text node
        editorElement.innerHTML = '';
        const textNode = document.createTextNode('');
        editorElement.appendChild(textNode);
        
        // Position cursor at the start
        const newRange = document.createRange();
        newRange.setStart(textNode, 0);
        newRange.setEnd(textNode, 0);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        this.lastSelection = { node: textNode, offset: 0 };
      } else {
        // Restore selection if content exists
        if (currentRange) {
          try {
            selection.removeAllRanges();
            selection.addRange(currentRange);
          } catch (error) {
            // If selection restoration fails, place cursor at end
            this.placeCursorAtEnd(editorElement);
          }
        }
      }
      
    } catch (error) {
      console.warn('ThaanaInput: Error during DOM cleanup:', error);
      // Fallback: ensure cursor is positioned properly
      this.placeCursorAtEnd(editorElement);
    }
  }
  

  private ensureCleanDOMState(): void {
    const editorElement = document.querySelector(this.className) as HTMLElement;
    if (!editorElement) return;
    
    try {
      // Quick normalize to clean up any loose text nodes
      editorElement.normalize();
      
      // Ensure we have a proper text node for cursor positioning
      if (editorElement.childNodes.length === 0) {
        const textNode = document.createTextNode('');
        editorElement.appendChild(textNode);
      }
    } catch (error) {
      console.warn('ThaanaInput: Error ensuring clean DOM state:', error);
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
        null,
      );
      
      let lastTextNode = null;
      let node;
      while (node = walker.nextNode()) {
        lastTextNode = node;
      }
      
      if (lastTextNode) {
        range.setStart(lastTextNode, lastTextNode.textContent?.length || 0);
        range.setEnd(lastTextNode, lastTextNode.textContent?.length || 0);
      } else {
        // No text nodes, create one
        const textNode = document.createTextNode('');
        editorElement.appendChild(textNode);
        range.setStart(textNode, 0);
        range.setEnd(textNode, 0);
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) {
      console.warn('ThaanaInput: Error placing cursor:', error);
    }
  }


  private processCharacterInput(char: string): void {

    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }

    if (ThaanaInput.IMMEDIATE_CHARS.has(char)) {
      this.flushBuffer();
      this.insertCharacterDirect(this.getChar(char));
      return;
    }
    if (ThaanaInput.AKURU.has(char)) {
      this.handleAkuruInput(char);
      return;
    }
    if (ThaanaInput.FILI.has(char)) {
      this.handleFiliInput(char);
      return;
    }

    this.flushBuffer();
    this.insertCharacterDirect(this.getChar(char));
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

    // wait till 500ms to see if a fili comes and flush
    this.bufferTimeout = setTimeout(() => {
      this.clearBuffer(); 
    }, 500);
  }

  
  private handleFiliInput(char: string): void {
    if (this.expectingFili && this.AkuruBuffer && this.isBufferInserted) {
      // akuru + fili by replacing the last character
      const filiChar = this.getChar(char);
      this.replaceLastCharacter(this.lastAkuru + filiChar);
      this.clearBuffer();
    } else {
      // standalone fili ? anycase in dhivehi
      this.flushBuffer();
      this.insertCharacterDirect(this.getChar(char));
    }
  }


  private insertCharacterDirect(char: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType !== Node.TEXT_NODE) {
      const newTextNode = document.createTextNode(char);
      range.insertNode(newTextNode);
      
      const newRange = document.createRange();
      newRange.setStartAfter(newTextNode);
      newRange.setEndAfter(newTextNode);
      selection.removeAllRanges();
      selection.addRange(newRange);
      return;
    }

    const textContent = textNode.textContent || '';
    const offset = range.startOffset;
    
    const beforeChar = textContent.substring(0, offset);
    const afterChar = textContent.substring(offset);
    const newText = beforeChar + char + afterChar;
    const newCursorPosition = beforeChar.length + char.length;

    //  DOM update with cursor positioning
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
      console.warn('ThaanaInput: Error inserting character:', error);
    }
  }


  private replaceLastCharacter(newChar: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType !== Node.TEXT_NODE) return;

    const textContent = textNode.textContent || '';
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
        console.warn('ThaanaInput: Error replacing character:', error);
      }
    }
  }


  private flushBuffer(): void {
    if (this.AkuruBuffer) {
      this.clearBuffer();
    }
  }


  private clearBuffer(): void {
    this.AkuruBuffer = '';
    this.lastAkuru = '';
    this.expectingFili = false;
    this.isBufferInserted = false;
    
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
  }

  // Moree event handlers..
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

  private clickEvent = (event: MouseEvent): void => {
    if (!this.config.enabled) return;
    this.flushBuffer();
  };

  private blurEvent = (event: FocusEvent): void => {
    if (!this.config.enabled) return;
    this.flushBuffer();
  };

  private inputEvent = (event: Event): void => {
    // This should be empty --> we handle everything in beforeinput
  };

  // utils
  private getChar(char: string): string {
    if (this.config.keyMap) {
      return this.config.keyMap[char] || char;
    }
    return ThaanaInput.CHAR_MAP.get(char) || char;
  }

  private throttle(func: Function, wait: number) {
    let timeout: number | null = null;
    return (...args: any[]) => {
      if (timeout === null) {
        timeout = setTimeout(() => {
          func.apply(this, args);
          timeout = null;
        }, wait);
      }
    };
  }

  private handlePastedContent(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    
    let editorElement: HTMLElement | null = null;
    if (container.nodeType === Node.TEXT_NODE) {
      editorElement = container.parentElement;
    } else if (container.nodeType === Node.ELEMENT_NODE) {
      editorElement = container as HTMLElement;
    }

    while (editorElement && !editorElement.classList.contains('dv-rich-editor')) {
      editorElement = editorElement.parentElement;
    }

    if (editorElement) {
      // BAD idea security wise , need to fix this
      const textContent = editorElement.textContent || '';
      const convertedText = this.convertToThaana(textContent);
      
      if (textContent !== convertedText) {
        editorElement.textContent = convertedText;
        
        const newRange = document.createRange();
        const textNode = editorElement.firstChild || editorElement;
        if (textNode.nodeType === Node.TEXT_NODE) {
          newRange.setStart(textNode, convertedText.length);
          newRange.setEnd(textNode, convertedText.length);
        } else {
          newRange.setStartAfter(textNode);
          newRange.setEndAfter(textNode);
        }
        
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
  }

  // Public methods
  public convertToThaana(text: string): string {
    let result = '';
    let i = 0;
    
    while (i < text.length) {
      const char = text[i];
      

      if (ThaanaInput.AKURU.has(char) && i + 1 < text.length) {
        const nextChar = text[i + 1];
        if (ThaanaInput.FILI.has(nextChar)) {
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

  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (!enabled) {
      this.flushBuffer();
    }
  }

  public updateKeyMap(newKeyMap: Record<string, string>): void {
    this.config.keyMap = newKeyMap;
  }

  public getConfig(): ThaanaKeyboardLayout {
    return this.config;
  }

  public destroy(): void {
    this.flushBuffer();
    
    document.removeEventListener('selectionchange', this.throttledSelectionChange);
    
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
    }
    
    this.lastSelection = null;
    this.clearBuffer();
  }
}