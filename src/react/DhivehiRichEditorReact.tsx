import React, { 
  useEffect, 
  useRef, 
  useImperativeHandle, 
  forwardRef, 
  createContext, 
  useContext, 
  useState, 
  useCallback 
} from 'react';
import { DhivehiRichEditor } from '../editor/DhivehiRichEditor';
import type { EditorConfig, FormatType, EditorTheme, EditorStyling, ThemeName } from '../types';

interface FormattingAPI {
  toggleBold?: ()=>void; toggleItalic?: ()=>void; toggleUnderline?: ()=>void; toggleStrikethrough?: ()=>void;
  toggleCode?: ()=>void; toggleCodeBlock?: ()=>void; toggleBlockquote?: ()=>void;
  setHeading?: (l:1|2|3|4|5|6)=>void; insertBulletList?: ()=>void; insertNumberedList?: ()=>void; insertImageFormat?: ()=>void;
}

export interface DhivehiRichEditorProps extends Omit<EditorConfig, 'container'> {
  className?: string;
  style?: React.CSSProperties;
  onChange?: (markdown: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onImageUrlRequest?: () => Promise<string>;
  /** Controlled markdown value. When provided the component operates in controlled mode */
  value?: string;
  /** Uncontrolled initial markdown value (alias for initialContent convenience) */
  defaultValue?: string;
}


export interface DhivehiRichEditorRef {
  // Core editor methods
  setThaanaEnabled: (enabled: boolean) => void;
  getMarkdown: () => string;
  setMarkdown: (content: string, preserveFocus?: boolean) => void;
  focus: () => void;
  blur: () => void;
  insertText: (text: string) => void;
  // Image insertion now via insertImageFormat or plugin API.
  copyToClipboard: () => Promise<boolean>;
  pasteFromClipboard: () => Promise<boolean>;
  appendContent: (content: string) => void;
  // Using broad types since theme shape is user-defined; keep minimal to avoid over-coupling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateTheme: (theme?: EditorTheme | undefined, themeName?: ThemeName | undefined, styling?: EditorStyling | undefined) => void;
  clear: () => void;
  destroy: () => void;
  getSelection: () => { start: number; end: number; text: string };
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  toggleStrikethrough: () => void;
  toggleCode: () => void;
  toggleCodeBlock: () => void;
  toggleBlockquote: () => void;
  setHeading: (level: 1|2|3|4|5|6) => void;
  insertBulletList: () => void;
  insertNumberedList: () => void;
  insertImageFormat: () => void;
  isFormatActive: (format: FormatType) => boolean;
  insertThaanaText?: (text: string) => void;
  convertContentToThaana?: () => void;
  updateThaanaKeyMap?: (keyMap: Record<string, string>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getThaanaConfig?: () => Record<string, unknown> | undefined;
}

// Context for editor instance
const EditorContext = createContext<DhivehiRichEditor | null>(null);

export const DVRichEditor = forwardRef<DhivehiRichEditorRef, DhivehiRichEditorProps>(
  function DVRichEditor(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<DhivehiRichEditor | null>(null);
    const [editorInstance, setEditorInstance] = useState<DhivehiRichEditor | null>(null);
    const [isEditorReady, setIsEditorReady] = useState(false);
    
    const {
      className = '',
      style = {},
      onChange,
      onFocus,
      onBlur,
      onImageUrlRequest,
      value,
      defaultValue,
      ...editorConfig
    } = props;

      const debounceMs = editorConfig.performance?.debounceControlledMs || 0;
      const debounceTimer = useRef<number | null>(null);

  
    const latestCallbacks = useRef({
      onChange,
      onFocus,
      onBlur,
      onImageUrlRequest
    });

    // Refs for controlled mode coordination
    const isControlled = value !== undefined;
    const lastAppliedExternal = useRef<string | null>(null); // last value set via props
    const lastEmitted = useRef<string | null>(null); // last value sent to parent

    // Update callbacks without causing re-renders
    useEffect(() => {
      latestCallbacks.current = {
        onChange,
        onFocus,
        onBlur,
        onImageUrlRequest
      };
    }, [onChange, onFocus, onBlur, onImageUrlRequest]);


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeEditorCall = useCallback(<T extends any[], R>(
      methodName: string,
      method: ((...args: T) => R) | undefined,
      ...args: T
    ): R | undefined => {
      if (!isEditorReady || !editorRef.current) {
        console.warn(`⚠️ Editor not ready for ${methodName}`);
        return undefined;
      }
      
      if (!method || typeof method !== 'function') {
        console.warn(`⚠️ Method ${methodName} not available`);
        return undefined;
      }
      
      try {
        return method.apply(editorRef.current, args);
      } catch (error) {
        console.error(`❌ Error calling ${methodName}:`, error);
        return undefined;
      }
    }, [isEditorReady]);

    // Initialize editor
    useEffect(() => {
      if (containerRef.current && !editorRef.current) {
        try {
          const config: EditorConfig = {
            ...editorConfig,
            // Allow defaultValue or initialContent fallback when uncontrolled
            initialContent: isControlled ? undefined : (editorConfig.initialContent ?? defaultValue),
            container: containerRef.current,
            onChange: (markdown: string) => {
              // Suppress echo from externally applied setMarkdown
              if (lastAppliedExternal.current !== null && markdown === lastAppliedExternal.current) {
                lastAppliedExternal.current = null;
                return;
              }
              const emit = () => {
                lastEmitted.current = markdown;
                latestCallbacks.current.onChange?.(markdown);
              };
              if (isControlled && debounceMs > 0) {
                if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
                debounceTimer.current = window.setTimeout(emit, debounceMs);
              } else {
                emit();
              }
            },
            onFocus: () => latestCallbacks.current.onFocus?.(),
            onBlur: () => latestCallbacks.current.onBlur?.(),
            onImageUrlRequest: () => latestCallbacks.current.onImageUrlRequest?.() || Promise.resolve(''),
          };

      
          editorRef.current = new DhivehiRichEditor(config);
          setEditorInstance(editorRef.current);

          // Avoid React act() warnings in tests: make ready state synchronous when under Vitest
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isTestEnv = typeof (globalThis as any).vi !== 'undefined';
          if (isTestEnv) {
            setIsEditorReady(true);
          } else {
            // Slight defer in production to ensure DOM fully mounted
            setTimeout(() => setIsEditorReady(true), 100);
          }
          
        } catch (error) {
          console.error('❌ Failed to initialize editor:', error);
        }
      }

      return () => {
        if (editorRef.current) {
          if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
          editorRef.current.destroy();
          editorRef.current = null;
          setEditorInstance(null);
          setIsEditorReady(false);
        }
      };
  // Intentionally run only once; editorConfig changes managed separately via theme effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array is correct here

    // Update theme when theme config changes
    useEffect(() => {
      if (editorRef.current && isEditorReady && editorRef.current.updateTheme) {
        try {
          editorRef.current.updateTheme(
            editorConfig.theme, 
            editorConfig.theme?.name as ThemeName | undefined, 
            editorConfig.styling
          );
        } catch (error) {
          console.error('❌ Error updating theme:', error);
        }
      }
  // Restrict dependencies to primitive fields to avoid unnecessary re-init
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorConfig.theme?.name, editorConfig.styling, isEditorReady]);

    // Controlled value effect
    useEffect(() => {
      if (!isControlled) return; // uncontrolled mode skip
      if (!isEditorReady || !editorRef.current) return;
      const current = editorRef.current.getMarkdown();
      // Update only if incoming value differs from editor content & last emitted
      if (value !== undefined && value !== current && value !== lastEmitted.current) {
        // Prevent feedback loop: mark as externally applied
        lastAppliedExternal.current = value;
        // Use immediate=true to bypass ChangeBuffer timing for controlled updates
        editorRef.current.setMarkdown(value, true);
      }
    }, [value, isControlled, isEditorReady]);

    // ✅ FIXED: Stable imperative handle with proper typing
    useImperativeHandle(
      ref,
      (): DhivehiRichEditorRef => ({
        // Core methods
        setThaanaEnabled: (enabled: boolean): void => {
          safeEditorCall('setThaanaEnabled', editorRef.current?.setThaanaEnabled, enabled);
        },
        
        getMarkdown: (): string => {
          return safeEditorCall('getMarkdown', editorRef.current?.getMarkdown) || '';
        },
        
        setMarkdown: (content: string, preserveFocus?: boolean): void => {
          safeEditorCall('setMarkdown', editorRef.current?.setMarkdown, content, preserveFocus);
        },
        
        focus: (): void => {
          safeEditorCall('focus', editorRef.current?.focus);
        },
        
        blur: (): void => {
          safeEditorCall('blur', editorRef.current?.blur);
        },
        
        insertText: (text: string): void => {
          safeEditorCall('insertText', editorRef.current?.insertText, text);
        },
        
  // (Image proxy methods removed from core)
        
  // Granular formatting methods
  toggleBold: () => { const inst = editorRef.current as unknown as FormattingAPI | null; safeEditorCall('toggleBold', inst?.toggleBold); },
  toggleItalic: () => { const inst = editorRef.current as unknown as FormattingAPI | null; safeEditorCall('toggleItalic', inst?.toggleItalic); },
  toggleUnderline: () => { const inst = editorRef.current as unknown as FormattingAPI | null; safeEditorCall('toggleUnderline', inst?.toggleUnderline); },
  toggleStrikethrough: () => { const inst = editorRef.current as unknown as FormattingAPI | null; safeEditorCall('toggleStrikethrough', inst?.toggleStrikethrough); },
  toggleCode: () => { const inst = editorRef.current as unknown as FormattingAPI | null; safeEditorCall('toggleCode', inst?.toggleCode); },
  toggleCodeBlock: () => { const inst = editorRef.current as unknown as FormattingAPI | null; safeEditorCall('toggleCodeBlock', inst?.toggleCodeBlock); },
  toggleBlockquote: () => { const inst = editorRef.current as unknown as FormattingAPI | null; safeEditorCall('toggleBlockquote', inst?.toggleBlockquote); },
  setHeading: (level: 1|2|3|4|5|6) => { const inst = editorRef.current as unknown as FormattingAPI | null; safeEditorCall('setHeading', inst?.setHeading, level); },
  insertBulletList: () => { const inst = editorRef.current as unknown as FormattingAPI | null; safeEditorCall('insertBulletList', inst?.insertBulletList); },
  insertNumberedList: () => { const inst = editorRef.current as unknown as FormattingAPI | null; safeEditorCall('insertNumberedList', inst?.insertNumberedList); },
  insertImageFormat: () => { const inst = editorRef.current as unknown as FormattingAPI | null; safeEditorCall('insertImageFormat', inst?.insertImageFormat); },
        
        isFormatActive: (format: FormatType): boolean => {
          return safeEditorCall('isFormatActive', editorRef.current?.isFormatActive, format) || false;
        },
        
        
        // Other methods
        copyToClipboard: (): Promise<boolean> => {
          return safeEditorCall('copyToClipboard', editorRef.current?.copyToClipboard) || Promise.resolve(false);
        },
        
        pasteFromClipboard: (): Promise<boolean> => {
          return safeEditorCall('pasteFromClipboard', editorRef.current?.pasteFromClipboard) || Promise.resolve(false);
        },
        
        appendContent: (content: string): void => {
          safeEditorCall('appendContent', editorRef.current?.appendContent, content);
        },
        
  updateTheme: (theme?: EditorTheme, themeName?: ThemeName, styling?: EditorStyling): void => {
          safeEditorCall('updateTheme', editorRef.current?.updateTheme, theme, themeName, styling);
        },
        
        clear: (): void => {
          safeEditorCall('clear', editorRef.current?.clear);
        },
        
        destroy: (): void => {
          safeEditorCall('destroy', editorRef.current?.destroy);
        },
        
        getSelection: () => {
          return safeEditorCall('getSelection', editorRef.current?.getSelection) || { start: 0, end: 0, text: '' };
        },
        
        // Optional Thaana-specific methods with proper type checking
        insertThaanaText: (text: string): void => {
          if (editorRef.current && 'insertThaanaText' in editorRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            safeEditorCall('insertThaanaText', (editorRef.current as any).insertThaanaText, text);
          }
        },
        
        convertContentToThaana: (): void => {
          if (editorRef.current && 'convertContentToThaana' in editorRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            safeEditorCall('convertContentToThaana', (editorRef.current as any).convertContentToThaana);
          }
        },
        
        updateThaanaKeyMap: (keyMap: Record<string, string>): void => {
          if (editorRef.current && 'updateThaanaKeyMap' in editorRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            safeEditorCall('updateThaanaKeyMap', (editorRef.current as any).updateThaanaKeyMap, keyMap);
          }
        },
        
  getThaanaConfig: (): Record<string, unknown> => {
          if (editorRef.current && 'getThaanaConfig' in editorRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return safeEditorCall('getThaanaConfig', (editorRef.current as any).getThaanaConfig) || {};
          }
          return {};
        },
      }),
      [safeEditorCall] // Only depend on the stable safeEditorCall function
    );

    return (
      <EditorContext.Provider value={editorInstance}> 
        <div 
          ref={containerRef} 
          className={className}
          style={{
            width: '100%',
            display: 'block',
            position: 'relative',
            overflow: 'hidden',
            ...style
          }}
        />
      </EditorContext.Provider>
    );
  }
);

// Set display name for better debugging
DVRichEditor.displayName = 'DVRichEditor';


export function useDhivehiEditor() {
  const editor = useContext(EditorContext);
  
  return {
  toggleBold: () => { (editor as unknown as FormattingAPI | null)?.toggleBold?.(); },
  toggleItalic: () => { (editor as unknown as FormattingAPI | null)?.toggleItalic?.(); },
  toggleUnderline: () => { (editor as unknown as FormattingAPI | null)?.toggleUnderline?.(); },
  toggleStrikethrough: () => { (editor as unknown as FormattingAPI | null)?.toggleStrikethrough?.(); },
  toggleCode: () => { (editor as unknown as FormattingAPI | null)?.toggleCode?.(); },
  toggleCodeBlock: () => { (editor as unknown as FormattingAPI | null)?.toggleCodeBlock?.(); },
  toggleBlockquote: () => { (editor as unknown as FormattingAPI | null)?.toggleBlockquote?.(); },
  setHeading: (level: 1|2|3|4|5|6) => { (editor as unknown as FormattingAPI | null)?.setHeading?.(level); },
  insertBulletList: () => { (editor as unknown as FormattingAPI | null)?.insertBulletList?.(); },
  insertNumberedList: () => { (editor as unknown as FormattingAPI | null)?.insertNumberedList?.(); },
  insertImageFormat: () => { (editor as unknown as FormattingAPI | null)?.insertImageFormat?.(); },
    
    isFormatActive: (format: FormatType): boolean => {
      if (editor?.isFormatActive && typeof editor.isFormatActive === 'function') {
        try {
          return editor.isFormatActive(format);
        } catch (error) {
          console.error('❌ useDhivehiEditor isFormatActive error:', error);
          return false;
        }
      }
      return false;
    },
    
    
    editor: editor,
    isReady: !!editor
  };
}

export default DVRichEditor;