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
import type { EditorConfig, EditorInstance, ImageData, FormatType } from '../types';

export interface DhivehiRichEditorProps extends Omit<EditorConfig, 'container'> {
  className?: string;
  style?: React.CSSProperties;
  onChange?: (markdown: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onImageUrlRequest?: () => Promise<string>;
}


export interface DhivehiRichEditorRef {
  // Core editor methods
  setThaanaEnabled: (enabled: boolean) => void;
  getMarkdown: () => string;
  setMarkdown: (content: string, preserveFocus?: boolean) => void;
  focus: () => void;
  blur: () => void;
  insertText: (text: string) => void;
  insertImage: (imageData: ImageData) => void;
  openImageDialog: () => Promise<void>;
  copyToClipboard: () => Promise<boolean>;
  pasteFromClipboard: () => Promise<boolean>;
  appendContent: (content: string) => void;
  updateTheme: (theme?: any, themeName?: any, styling?: any) => void;
  clear: () => void;
  destroy: () => void;
  getSelection: () => { start: number; end: number; text: string };
  applyFormat: (format: FormatType) => void;
  isFormatActive: (format: FormatType) => boolean;
  removeFormat: (format: FormatType) => void;
  insertThaanaText?: (text: string) => void;
  convertContentToThaana?: () => void;
  updateThaanaKeyMap?: (keyMap: Record<string, string>) => void;
  getThaanaConfig?: () => any;
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
      ...editorConfig
    } = props;

  
    const latestCallbacks = useRef({
      onChange,
      onFocus,
      onBlur,
      onImageUrlRequest
    });

    // Update callbacks without causing re-renders
    useEffect(() => {
      latestCallbacks.current = {
        onChange,
        onFocus,
        onBlur,
        onImageUrlRequest
      };
    }, [onChange, onFocus, onBlur, onImageUrlRequest]);


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
            container: containerRef.current,
            onChange: (markdown: string) => latestCallbacks.current.onChange?.(markdown),
            onFocus: () => latestCallbacks.current.onFocus?.(),
            onBlur: () => latestCallbacks.current.onBlur?.(),
            onImageUrlRequest: () => latestCallbacks.current.onImageUrlRequest?.() || Promise.resolve(''),
          };

      
          editorRef.current = new DhivehiRichEditor(config);
          setEditorInstance(editorRef.current);
          
          // Set ready state after editor is fully initialized
          setTimeout(() => {
            setIsEditorReady(true);
          }, 100);
          
        } catch (error) {
          console.error('❌ Failed to initialize editor:', error);
        }
      }

      return () => {
        if (editorRef.current) {
     
          editorRef.current.destroy();
          editorRef.current = null;
          setEditorInstance(null);
          setIsEditorReady(false);
        }
      };
    }, []); // Empty dependency array is correct here

    // Update theme when theme config changes
    useEffect(() => {
      if (editorRef.current && isEditorReady && editorRef.current.updateTheme) {
        try {
          editorRef.current.updateTheme(
            editorConfig.theme, 
            editorConfig.theme?.name as any, 
            editorConfig.styling
          );
        } catch (error) {
          console.error('❌ Error updating theme:', error);
        }
      }
    }, [editorConfig.theme?.name, editorConfig.styling, isEditorReady]);

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
        
        insertImage: (imageData: ImageData): void => {
          safeEditorCall('insertImage', editorRef.current?.insertImage, imageData);
        },
        
        openImageDialog: (): Promise<void> => {
          return safeEditorCall('openImageDialog', editorRef.current?.openImageDialog) || Promise.resolve();
        },
        
        // Formatting methods - the core functionality we need
        applyFormat: (format: FormatType): void => {
          console.log('🎨 applyFormat called with:', format);
          safeEditorCall('applyFormat', editorRef.current?.applyFormat, format);
        },
        
        isFormatActive: (format: FormatType): boolean => {
          return safeEditorCall('isFormatActive', editorRef.current?.isFormatActive, format) || false;
        },
        
        removeFormat: (format: FormatType): void => {
          safeEditorCall('removeFormat', editorRef.current?.removeFormat, format);
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
        
        updateTheme: (theme?: any, themeName?: any, styling?: any): void => {
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
            safeEditorCall('insertThaanaText', (editorRef.current as any).insertThaanaText, text);
          }
        },
        
        convertContentToThaana: (): void => {
          if (editorRef.current && 'convertContentToThaana' in editorRef.current) {
            safeEditorCall('convertContentToThaana', (editorRef.current as any).convertContentToThaana);
          }
        },
        
        updateThaanaKeyMap: (keyMap: Record<string, string>): void => {
          if (editorRef.current && 'updateThaanaKeyMap' in editorRef.current) {
            safeEditorCall('updateThaanaKeyMap', (editorRef.current as any).updateThaanaKeyMap, keyMap);
          }
        },
        
        getThaanaConfig: (): any => {
          if (editorRef.current && 'getThaanaConfig' in editorRef.current) {
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
    applyFormat: (format: FormatType): void => {
      console.log('🎨 useDhivehiEditor applyFormat called with:', format);
      if (editor?.applyFormat && typeof editor.applyFormat === 'function') {
        try {
          editor.applyFormat(format);
         
        } catch (error) {
          console.error('❌ useDhivehiEditor applyFormat error:', error);
        }
      } else {
        console.warn('⚠️ useDhivehiEditor: Editor not available or applyFormat missing');
      }
    },
    
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
    
    removeFormat: (format: FormatType): void => {
      if (editor?.removeFormat && typeof editor.removeFormat === 'function') {
        try {
          editor.removeFormat(format);
        } catch (error) {
          console.error('❌ useDhivehiEditor removeFormat error:', error);
        }
      } else {
        console.warn('⚠️ useDhivehiEditor: removeFormat not available');
      }
    },
    
    editor: editor,
    isReady: !!editor
  };
}

export default DVRichEditor;