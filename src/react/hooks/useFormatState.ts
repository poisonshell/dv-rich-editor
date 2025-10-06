import { useEffect, useState, useContext } from 'react';
import type { SelectionFormatState, EditorEvents, EditorInstance } from '../../types';
import { EditorReactContext } from '../internal/EditorContext';

type FormatChangePayload = EditorEvents['format-change'];

export function useFormatState(): SelectionFormatState | null {
  const editor = useContext(EditorReactContext as React.Context<EditorInstance | null>);
  const [state, setState] = useState<SelectionFormatState | null>(null);

  useEffect(() => {
    if (!editor) return;
    const handler = (p: FormatChangePayload) => {
      if (p.state) {
        setState(p.state);
        return;
      }
      setState({
        inline: { bold: 'none', italic: 'none', underline: 'none', strikethrough: 'none', code: 'none' },
        block: { heading: 'none', blockquote: 'none', codeBlock: 'none', bulletList: 'none', numberedList: 'none' },
        allActiveFormats: p.formats,
        partialFormats: []
      });
    };
    editor.on('format-change', handler);
    return () => editor.off('format-change', handler);
  }, [editor]);

  return state;
}

export default useFormatState;
