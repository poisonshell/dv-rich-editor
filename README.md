# DV Rich Editor

> A Dhivehi rich text editor featuring built-in Thaana keyboard support, dynamic theming, and clean markdown output. This is an effort to better handle markdown images and custom tags correctly in RTL inputs. It also gracefully manages image spacing and backspace behavior during Dhivehi typing, preventing unintended issues such as breaking URLs and other markdown tags.

Thaana keyboard IME (experimental): combines direct character mapping with a short-lived akuru–fili buffer for natural composition. Design may evolve; feedback welcome.

## Quick Start

### Installation

```bash
npm install dv-rich-editor
# or
yarn add dv-rich-editor
# or
pnpm add dv-rich-editor
```

### React

```tsx
import { useState } from 'react';
import { DVRichEditor } from 'dv-rich-editor/react';

export default function Basic() {
  const [md, setMd] = useState('');
  return <DVRichEditor onChange={setMd} placeholder="ލިޔުއްވާށެވެ..." theme={{ name: 'default' }} />;
}
```

### Vanilla (bundler)

```javascript
import { DhivehiRichEditor } from 'dv-rich-editor';

const editor = new DhivehiRichEditor({
  container: '#editor-container',
  placeholder: 'test',
  onChange: (markdown) => console.log(markdown)
});
```

### UMD (script tag)

```html
<!DOCTYPE html>
<html>
<head>
  <title>DV Rich Editor</title>
  <script src="dist/dv-rich-editor.umd.js"></script>
</head>
<body>
  <div id="editor-container"></div>
    
  <script>
    const { DhivehiRichEditor } = window.DVRichEditor;
        
    const editor = new DhivehiRichEditor({
      container: '#editor-container',
      placeholder: 'test',
      onChange: (markdown) => console.log(markdown)
    });
  </script>
</body>
</html>
```

### Minimal Formatting (React toolbar sketch)
```tsx
// ref.toggleBold(), ref.setHeading(1) etc.
```

## Features (summary)
* Built-in Thaana IME.
* RTL-aware selection helpers
* Markdown-first: incremental serializer with fallback, tables, code blocks, lists
* Granular formatting API (toggleBold, setHeading, insertBulletList, etc.)
* Theming via predefined themes + CSS variables (`--dv-*`)
* Image insertion hook (`onImageUrlRequest`) + plugin path
* Controlled or uncontrolled React usage (debounced controlled updates)
* Event bus: `content-change`, `selection-change`, `format-change`, IME buffer events, perf events
* Lightweight core, no heavy framework dependency outside React wrapper

## Theming
Pass `theme={{ name: 'dark' }}` or a custom object (colors, typography, spacing). Override with your own CSS targeting the exposed variables.

## React Controlled vs Uncontrolled
Uncontrolled: `defaultValue` (or `initialContent`) and `onChange`.
Controlled: supply `value` + `onChange` and optionally `performance.debounceControlledMs`.

## Events
`editor.on('content-change', cb)` etc. Also: `selection-change`, `format-change`, `ime-buffer-start|commit|flush`, `perf`, `focus`, `blur`.

## Migration
See `CHANGELOG.md`


## Images

### Basic Image Support

```tsx
<DVRichEditor
  image={{
    preview: true,           // Show actual images in editor
    defaultAltText: 'Image'  // Default alt text
  }}
/>
```

Custom upload (outline): implement `onImageUrlRequest` returning a URL string.

```tsx
const handleImageUpload = async (): Promise<string> => {
  // Open file picker
  const file = await new Promise<File>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => resolve((e.target as HTMLInputElement).files![0]);
    input.click();
  });

  // Upload to your service
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  
  const { url } = await response.json();
  return url;
};

<DVRichEditor
  onImageUrlRequest={handleImageUpload}
  image={{ preview: true }}
/>
```


## Thaana Key Mapping

```tsx
const customKeyMap = {
  'q': 'ް',  // sukun
  // ... your custom mappings
};

<DVRichEditor
  thaana={{
    enabled: true,
    keyMap: customKeyMap
  }}
/>
```

Toggle at runtime: call `ref.setThaanaEnabled(bool)`.

```tsx
const editorRef = useRef<DhivehiRichEditorRef>(null);

// Toggle Thaana input dynamically
const toggleThaana = () => {
  const isEnabled = editorRef.current?.getThaanaConfig()?.enabled;
  editorRef.current?.setThaanaEnabled(!isEnabled);
};
```

## Reference (selected)

### Component Props (React)

```typescript
interface DhivehiRichEditorProps {
  // Content
  placeholder?: string;
  initialContent?: string;
  onChange?: (markdown: string) => void;
  
  // Styling
  className?: string;
  style?: React.CSSProperties;
  theme?: EditorTheme;
  styling?: EditorStyling;
  
  // Features
  image?: ImageConfig;
  thaana?: ThaanaKeyboardLayout;
  
  // Events
  onFocus?: () => void;
  onBlur?: () => void;
  onImageUrlRequest?: () => Promise<string>;
}

### Markdown Options

You can control certain markdown output aspects via the `markdown` option:

```ts
new DhivehiRichEditor({
  container: '#editor',
  markdown: {
    listStyle: 'asterisk', // 'dash' (default) | 'asterisk' | 'plus'
  }
});
```

### Markdown Output Features (summary)

Current HTML → Markdown serialization supports:

| Feature | Supported | Notes |
|---------|-----------|-------|
| Headings h1–h6 | ✅ | ATX style (`#`, `##`, …) |
| Bold / Italic / Strikethrough / Code | ✅ | Inline formatting tokens preserved |
| Blockquotes | ✅ | `>` prefix |
| Bullet & Numbered Lists | ✅ | Bullet marker configurable (`listStyle`) |
| Images | ✅ | `![alt](src)` (title optional via insertion API) |
| Links | ✅ | `[text](href)` |
| Code Blocks | ✅ | Preserves fence language from `<pre><code class="language-js">` → ```js |
| Tables | ✅ | Serializes `<table>` into GitHub‑style pipe tables |
| Escaping | ✅ | Escapes markdown control chars in text nodes (leaves existing raw `[]` for previously inserted image/link markdown) |

Example table serialization:

```html
<table>
  <tr><th>Lang</th><th>Hello</th></tr>
  <tr><td>EN</td><td>Hello</td></tr>
  <tr><td>DV</td><td>ހަދިޔަ</td></tr>
</table>
```

→

```md
| Word | Hello |
| --- | --- |
| 1 | Hello |
| 2 | Hi    |
```

Note: alignment / colspan not yet supported.
```

### Editor Methods (abridged)

```typescript
interface DhivehiRichEditorRef {
  // Content Management
  getMarkdown(): string;
  setMarkdown(content: string, preserveFocus?: boolean): void;
  clear(): void;
  insertText(text: string): void;
  appendContent(content: string): void;

  // Formatting (granular API)
  toggleBold(): void;
  toggleItalic(): void;
  toggleUnderline(): void;
  toggleStrikethrough(): void;
  toggleCode(): void;
  toggleCodeBlock(): void;
  toggleBlockquote(): void;
  setHeading(level: 1|2|3|4|5|6): void;
  insertBulletList(): void;
  insertNumberedList(): void;
  insertImageFormat(): void; // opens image dialog / inserts via ImagePlugin
  isFormatActive(format: FormatType): boolean;

  // Focus & Selection
  focus(): void;
  blur(): void;
  getSelection(): TextSelection;

  // Images (direct insert & dialog now via plugin API; core image wrappers removed)

  // Clipboard
  copyToClipboard(): Promise<boolean>;
  pasteFromClipboard(): Promise<boolean>;

  // Thaana
  setThaanaEnabled(enabled: boolean): void;
  getThaanaConfig(): ThaanaKeyboardLayout;
  updateThaanaKeyMap(keyMap: Record<string, string>): void;

  // Theming
  updateTheme(theme: EditorTheme): void;

  // Lifecycle
  destroy(): void;
}
```

### Format Types

```typescript
type FormatType = 
  // Text Formatting
  | 'bold'           // **text** or <strong>
  | 'italic'         // *text* or <em>
  | 'underline'      // <u>text</u>
  | 'strikethrough'  // ~~text~~
  
  // Headings
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  
  // Lists
  | 'bullet-list'    // - item
  | 'numbered-list'  // 1. item
  
  // Other
  | 'blockquote'     // > text
  | 'code'           // `code`
  | 'code-block'     // ```code```
  | 'link'           // [text](url)
  | 'image';         // ![alt](url)
```




## Security
No built-in sanitization. Supply `sanitizeHtml` / `sanitizeMarkdown` if needed before storing or rendering untrusted content.


## Troubleshooting

### Common Issues

**TypeScript errors with imports:**
```typescript
// ✅ Correct way
import { DVRichEditor } from 'dv-rich-editor/react';
import type { DhivehiRichEditorRef } from 'dv-rich-editor/react';

// ❌ Incorrect way  
import { DVRichEditor, DhivehiRichEditorRef } from 'dv-rich-editor/react';
```

Thaana input not working:
```typescript
// Ensure Thaana is enabled
<DVRichEditor
  thaana={{ enabled: true }}
  placeholder="ލިޔުއްވާށެވެ..."
/>
```

---
End.