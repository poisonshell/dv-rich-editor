import { useRef, useCallback } from 'react';
import type { DhivehiRichEditorRef } from '../DhivehiRichEditorReact';
import type { FormatType } from '../../types';

// Deprecated: Old standalone hook kept temporarily for backward compatibility.
// Prefer using the context-based hook from DhivehiRichEditorReact (single source of truth)
export function useInternalDhivehiEditorDeprecated() {
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

  const openImageDialog = useCallback(async () => {
    editorRef.current?.insertImageFormat();
  }, []);


  // removeFormat removed from API

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
  // Image dialog
  openImageDialog,
  // Formatting methods
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

export default useInternalDhivehiEditorDeprecated; 