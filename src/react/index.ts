
import type { 
  DhivehiRichEditorProps, 
  DhivehiRichEditorRef, 
} from './DhivehiRichEditorReact';

import type {
  EditorConfig,
  EditorInstance,
  ImageConfig,
  ImageData,
  ThaanaKeyboardLayout,
  MarkdownOptions,
  FormatType,
  TextSelection,
  EditorTheme,
  EditorStyling,
  ThemeName
} from '../types';

export { DVRichEditor } from './DhivehiRichEditorReact';
export { useDhivehiEditor } from './hooks/useDhivehiEditor';
export { ThemeManager } from '../editor/ThemeManager';


export { DVRichEditor as default } from './DhivehiRichEditorReact';

export type { 
  DhivehiRichEditorProps, 
  DhivehiRichEditorRef,
  EditorConfig,
  EditorInstance,
  ImageConfig,
  ImageData,
  ThaanaKeyboardLayout,
  MarkdownOptions,
  FormatType,
  TextSelection,
  EditorTheme,
  EditorStyling,
  ThemeName
};


export type EditorRef = DhivehiRichEditorRef;
export type EditorProps = DhivehiRichEditorProps;

