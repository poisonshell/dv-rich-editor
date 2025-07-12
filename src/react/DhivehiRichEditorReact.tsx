import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { DhivehiRichEditor } from '../editor/DhivehiRichEditor';
import type { EditorConfig, EditorInstance, ImageData } from '../types';

export interface DhivehiRichEditorProps extends Omit<EditorConfig, 'container'> {
  className?: string;
  style?: React.CSSProperties;
  onChange?: (markdown: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onImageUrlRequest?: () => Promise<string>;
}

export interface DhivehiRichEditorRef extends EditorInstance {}

//react wrapper
export const DVRichEditor = forwardRef<DhivehiRichEditorRef, DhivehiRichEditorProps>(
  (props, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<DhivehiRichEditor | null>(null);
    
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


    useEffect(() => {
      if (containerRef.current && !editorRef.current) {
        const config: EditorConfig = {
          ...editorConfig,
          container: containerRef.current,
          onChange: (markdown: string) => latestCallbacks.current.onChange?.(markdown),
          onFocus: () => latestCallbacks.current.onFocus?.(),
          onBlur: () => latestCallbacks.current.onBlur?.(),
          onImageUrlRequest: () => latestCallbacks.current.onImageUrlRequest?.() || Promise.resolve(''),
        };

        editorRef.current = new DhivehiRichEditor(config);
      }

      return () => {
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
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


    useEffect(() => {
      if (editorRef.current) {
        editorRef.current.updateTheme(editorConfig.theme, editorConfig.theme?.name as any, editorConfig.styling);
      }
    }, [editorConfig.theme?.name, editorConfig.styling, JSON.stringify(editorConfig.theme)]);


    useImperativeHandle(ref, () => ({
      getMarkdown: () => editorRef.current?.getMarkdown() || '',
      setMarkdown: (content: string) => editorRef.current?.setMarkdown(content),
      focus: () => editorRef.current?.focus(),
      blur: () => editorRef.current?.blur(),
      insertText: (text: string) => editorRef.current?.insertText(text),
      insertImage: (imageData: ImageData) => editorRef.current?.insertImage(imageData),
      openImageDialog: () => editorRef.current?.openImageDialog() || Promise.resolve(),
      applyFormat: (format: any) => editorRef.current?.applyFormat(format),
      removeFormat: (format: any) => editorRef.current?.removeFormat(format),
      isFormatActive: (format: any) => editorRef.current?.isFormatActive(format) || false,
      copyToClipboard: () => editorRef.current?.copyToClipboard() || Promise.resolve(false),
      pasteFromClipboard: () => editorRef.current?.pasteFromClipboard() || Promise.resolve(false),
      appendContent: (content: string) => editorRef.current?.appendContent(content),
      updateTheme: (theme?: any, themeName?: any, styling?: any) => editorRef.current?.updateTheme(theme, themeName, styling),
      setThaanaEnabled: (enabled: boolean) => editorRef.current?.setThaanaEnabled(enabled),
      clear: () => editorRef.current?.clear(),
      destroy: () => editorRef.current?.destroy(),
      getSelection: () => editorRef.current?.getSelection() || { start: 0, end: 0, text: '' },
    }), []);

    return (
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
    );
  }
);

DVRichEditor.displayName = 'DVRichEditor';

export default DVRichEditor; 