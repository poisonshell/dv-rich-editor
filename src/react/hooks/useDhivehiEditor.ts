import { useRef, useCallback, useEffect } from 'react';
import type { DhivehiRichEditorRef } from '../DhivehiRichEditorReact';
import type { ImageData, FormatType } from '../../types';

export function useDhivehiEditor() {
  const editorRef = useRef<DhivehiRichEditorRef>(null);

  const getMarkdown = useCallback(() => {
    return editorRef.current?.getMarkdown() || '';
  }, []);

  const setMarkdown = useCallback((content: string) => {
    editorRef.current?.setMarkdown(content);
  }, []);

  const insertText = useCallback((text: string) => {
    editorRef.current?.insertText(text);
  }, []);

  const insertImage = useCallback((imageData: ImageData) => {
    editorRef.current?.insertImage(imageData);
  }, []);

  const openImageDialog = useCallback(async () => {
    await editorRef.current?.openImageDialog();
  }, []);

  const applyFormat = useCallback((format: FormatType) => {
    editorRef.current?.applyFormat(format);
  }, []);

  const removeFormat = useCallback((format: FormatType) => {
    editorRef.current?.removeFormat(format);
  }, []);

  const isFormatActive = useCallback((format: FormatType) => {
    return editorRef.current?.isFormatActive(format) || false;
  }, []);

  const copyToClipboard = useCallback(async () => {
    return await editorRef.current?.copyToClipboard() || false;
  }, []);

  const pasteFromClipboard = useCallback(async () => {
    return await editorRef.current?.pasteFromClipboard() || false;
  }, []);

  const appendContent = useCallback((content: string) => {
    editorRef.current?.appendContent(content);
  }, []);

  const focus = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  const blur = useCallback(() => {
    editorRef.current?.blur();
  }, []);

  const clear = useCallback(() => {
    editorRef.current?.clear();
  }, []);

  const setThaanaEnabled = useCallback((enabled: boolean) => {
    editorRef.current?.setThaanaEnabled(enabled);
  }, []);

  return {
    editorRef,
    // Content methods
    getMarkdown,
    setMarkdown,
    insertText,
    appendContent,
    clear,
    // Image methods
    insertImage,
    openImageDialog,
    // Formatting methods
    applyFormat,
    removeFormat,
    isFormatActive,
    // Clipboard methods
    copyToClipboard,
    pasteFromClipboard,
    // Focus methods
    focus,
    blur,
    // Thaana methods
    setThaanaEnabled,
  };
}

export default useDhivehiEditor; 