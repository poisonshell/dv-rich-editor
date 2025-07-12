import React, { useEffect, useRef, useImperativeHandle, forwardRef, createContext, useContext, useState } from 'react';
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

export interface DhivehiRichEditorRef extends EditorInstance {
  // Ensure these methods are properly typed
  applyFormat: (format: FormatType) => void;
  isFormatActive: (format: FormatType) => boolean;
  removeFormat: (format: FormatType) => void;
}

// Context for editor instance (for hook support)
const EditorContext = createContext<DhivehiRichEditor | null>(null);

// React wrapper
export const DVRichEditor = forwardRef<DhivehiRichEditorRef, DhivehiRichEditorProps>(
  (props, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<DhivehiRichEditor | null>(null);
    const [editorInstance, setEditorInstance] = useState<DhivehiRichEditor | null>(null);
    
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

          console.log('🚀 Initializing editor with config:', config);
          editorRef.current = new DhivehiRichEditor(config);
          console.log('✅ Editor initialized successfully:', editorRef.current);
  
          setEditorInstance(editorRef.current);
          
        } catch (error) {
          console.error('❌ Failed to initialize editor:', error);
        }
      }

      return () => {
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
          setEditorInstance(null);
        }
      };
    }, []); 

    useEffect(() => {
      latestCallbacks.current = {
        onChange,
        onFocus,
        onBlur,
        onImageUrlRequest
      };
    }, [onChange, onFocus, onBlur, onImageUrlRequest]);

    // Update theme
    useEffect(() => {
      if (editorRef.current && editorRef.current.updateTheme) {
        editorRef.current.updateTheme(editorConfig.theme, editorConfig.theme?.name as any, editorConfig.styling);
      }
    }, [editorConfig.theme?.name, editorConfig.styling, JSON.stringify(editorConfig.theme)]);


    useImperativeHandle(ref, () => ({
      // Core methods
      setThaanaEnabled: (enabled: boolean) => {
        console.log('🎯 setThaanaEnabled called:', enabled);
        editorRef.current?.setThaanaEnabled(enabled);
      },
      
      getMarkdown: () => {
        const result = editorRef.current?.getMarkdown() || '';
        console.log('📄 getMarkdown called, result length:', result.length);
        return result;
      },
      
      setMarkdown: (content: string, preserveFocus?: boolean) => {
        console.log('📝 setMarkdown called with content length:', content.length);
        editorRef.current?.setMarkdown(content, preserveFocus);
      },
      
      focus: () => {
        console.log('🎯 focus called');
        editorRef.current?.focus();
      },
      
      blur: () => {
        console.log('🎯 blur called');
        editorRef.current?.blur();
      },
      
      insertText: (text: string) => {
        console.log('✏️ insertText called:', text);
        editorRef.current?.insertText(text);
      },
      
      insertImage: (imageData: ImageData) => {
        console.log('🖼️ insertImage called');
        editorRef.current?.insertImage(imageData);
      },
      
      openImageDialog: () => {
        console.log('🖼️ openImageDialog called');
        return editorRef.current?.openImageDialog() || Promise.resolve();
      },
      
      // FORMATTING METHODS - many issues here we need this for awhile debugging
      applyFormat: (format: FormatType) => {
        console.log('🎯 applyFormat called with:', format);
        console.log('📝 Editor instance:', editorRef.current);
        console.log('🔧 Editor methods available:', editorRef.current ? Object.getOwnPropertyNames(editorRef.current) : 'none');
        
        if (!editorRef.current) {
          console.error('❌ Editor ref is null');
          return;
        }
        
        if (!editorRef.current.applyFormat) {
          console.error('❌ applyFormat method missing');
          console.log('🔍 Available methods:', Object.keys(editorRef.current));
          return;
        }
        
        if (typeof editorRef.current.applyFormat !== 'function') {
          console.error('❌ applyFormat is not a function, it is:', typeof editorRef.current.applyFormat);
          return;
        }
        
        try {
          editorRef.current.applyFormat(format);

        } catch (error) {
          console.error('❌ applyFormat failed with error:', error);
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
        }
      },
      
      isFormatActive: (format: FormatType) => {
        console.log('🔍 isFormatActive called with:', format);
        
        if (!editorRef.current) {
          console.error('❌ Editor ref is null for isFormatActive');
          return false;
        }
        
        if (!editorRef.current.isFormatActive) {
          console.error('❌ isFormatActive method missing');
          return false;
        }
        
        try {
          const result = editorRef.current.isFormatActive(format);
          console.log('✅ isFormatActive result:', result);
          return result;
        } catch (error) {
          console.error('❌ isFormatActive failed:', error);
          return false;
        }
      },
      
      removeFormat: (format: FormatType) => {
        console.log('🗑️ removeFormat called with:', format);
        if (editorRef.current && editorRef.current.removeFormat) {
          editorRef.current.removeFormat(format);
        }
      },
      
      // Other methods
      copyToClipboard: () => editorRef.current?.copyToClipboard() || Promise.resolve(false),
      pasteFromClipboard: () => editorRef.current?.pasteFromClipboard() || Promise.resolve(false),
      appendContent: (content: string) => editorRef.current?.appendContent(content),
      updateTheme: (theme?: any, themeName?: any, styling?: any) => {
        editorRef.current?.updateTheme?.(theme, themeName, styling);
      },
      clear: () => editorRef.current?.clear(),
      destroy: () => editorRef.current?.destroy(),
      getSelection: () => editorRef.current?.getSelection() || { start: 0, end: 0, text: '' },
      
      // Thaana-specific methods
      insertThaanaText: (text: string) => {
        if (editorRef.current && 'insertThaanaText' in editorRef.current) {
          (editorRef.current as any).insertThaanaText(text);
        }
      },
      convertContentToThaana: () => {
        if (editorRef.current && 'convertContentToThaana' in editorRef.current) {
          (editorRef.current as any).convertContentToThaana();
        }
      },
      updateThaanaKeyMap: (keyMap: Record<string, string>) => {
        if (editorRef.current && 'updateThaanaKeyMap' in editorRef.current) {
          (editorRef.current as any).updateThaanaKeyMap(keyMap);
        }
      },
      getThaanaConfig: () => {
        if (editorRef.current && 'getThaanaConfig' in editorRef.current) {
          return (editorRef.current as any).getThaanaConfig();
        }
        return {};
      },
    }), [editorInstance]); 

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

DVRichEditor.displayName = 'DVRichEditor';


export function useDhivehiEditor() {
  const editor = useContext(EditorContext);
  
  return {
    applyFormat: (format: FormatType) => {
 
      if (editor && editor.applyFormat) {
        try {
          editor.applyFormat(format);

        } catch (error) {

        }
      } else {
        console.warn('⚠️ useDhivehiEditor: Editor not available or applyFormat missing');
      }
    },
    
    isFormatActive: (format: FormatType) => {
      if (editor && editor.isFormatActive) {
        return editor.isFormatActive(format);
      }
      console.warn('⚠️ useDhivehiEditor: isFormatActive not available');
      return false;
    },
    
    removeFormat: (format: FormatType) => {
      if (editor && editor.removeFormat) {
        editor.removeFormat(format);
      } else {
        console.warn('⚠️ useDhivehiEditor: removeFormat not available');
      }
    },
    
    editor: editor
  };
}

export default DVRichEditor;