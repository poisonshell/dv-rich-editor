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
  return <DVRichEditor onChange={setMd} placeholder="test" theme={{ name: 'default' }} />;
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
* Programmatic content insertion helper `insertMarkdown` (parse or literal modes)
* Selection format introspection (none | partial | all | mixed for headings)
* Heading level resolver utility (`getActiveHeadingLevel`) for accurate toolbar display
* True inline toggle semantics (full selection unwraps instead of nesting)
* React hook `useFormatState` for real‑time selection formatting state


## React Selection Format State (Toolbar Example)

In React you can track the current selection formatting (bold / italic / underline / strikethrough / code + block formats) via the `useFormatState` hook. It listens to the editor's internal `format-change` event and returns a tri‑state object:

```ts
interface SelectionFormatState {
  inline: {
    bold: 'none' | 'partial' | 'all';
    italic: 'none' | 'partial' | 'all';
    underline: 'none' | 'partial' | 'all';
    strikethrough: 'none' | 'partial' | 'all';
    code: 'none' | 'partial' | 'all';
  };
  block: {
    heading: 'none' | 'partial' | 'all' | 'mixed';
    blockquote: 'none' | 'partial' | 'all';
    codeBlock: 'none' | 'partial' | 'all';
    bulletList: 'none' | 'partial' | 'all';
    numberedList: 'none' | 'partial' | 'all';
  };
  allActiveFormats: FormatType[];    // formats fully applied across selection
  partialFormats: FormatType[];      // formats partially applied (or heading mixed)
}
```

### Minimal Toolbar Using Hooks

```tsx
import { DVRichEditor, useFormatState, useDhivehiEditor } from 'dv-rich-editor/react';

function Toolbar() {
  const fmt = useFormatState();
  const { toggleBold, toggleItalic, toggleUnderline, toggleStrikethrough, toggleCode } = useDhivehiEditor();

  const btn = (label: string, active: boolean | undefined, onClick: () => void) => (
    <button
      key={label}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      style={{
        fontWeight: label === 'B' ? 'bold' : undefined,
        background: active ? '#444' : '#222',
        color: active ? '#fff' : '#ccc',
        border: '1px solid #555',
        padding: '4px 6px',
        cursor: 'pointer'
      }}
      aria-pressed={!!active}
    >{label}</button>
  );

  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
      {btn('B', fmt?.inline.bold === 'all', toggleBold)}
      {btn('I', fmt?.inline.italic === 'all', toggleItalic)}
      {btn('U', fmt?.inline.underline === 'all', toggleUnderline)}
      {btn('S', fmt?.inline.strikethrough === 'all', toggleStrikethrough)}
      {btn('`', fmt?.inline.code === 'all', toggleCode)}
    </div>
  );
}

export default function EditorWithToolbar() {
  return (
    <div style={{ maxWidth: 600 }}>
      <Toolbar />
      <DVRichEditor placeholder="Type here..." theme={{ name: 'default' }} />
    </div>
  );
}
```

Notes:
* Buttons use `onMouseDown` with `preventDefault()` so the editor selection is preserved.
* A format state of `'partial'` (or `'mixed'` for headings) can be displayed with an indeterminate style if desired.
* You can also read `allActiveFormats` / `partialFormats` for advanced toolbar grouping or mixed state icons.

### Distinguishing Heading Levels

If `fmt.block.heading === 'all'` you can query the active level via the ref method `getActiveHeadingLevel()` (available on the underlying editor instance via `ref.current?.getActiveHeadingLevel?.()`). Use that to highlight the active heading button.

### Testing / Internal Helpers

For unit tests where jsdom selection events can be flaky, the core exposes internal, non-public helpers (only when you hold the instance ref):

```ts
ref.current?.__forceFormatStateEmit?.();                // forces a format-change event
const raw = ref.current?.__getSelectionFormatStateRaw?.(); // direct computation (no event)
```

These are intentionally undocumented in the public API surface and may change—avoid using them in production code.

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
});```


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
  <tr><th>Lang</th><th>Word</th></tr>
  <tr><td>EN</td><td>Hello</td></tr>
  <tr><td>DV</td><td>ހަދިޔަ</td></tr>
</table>
```


```md
| Lang | Word |
| --- | --- |
| EN | Hello |
| DV | ލޯލް |
```

Note: alignment / colspan not yet supported.

### Editor Methods (abridged)

```typescript
interface DhivehiRichEditorRef {
  // Content Management
  getMarkdown(): string;
  setMarkdown(content: string, preserveFocus?: boolean): void;
  clear(): void;
  insertText(text: string): void;
  insertMarkdown(markdown: string, options?: {
    parse?: boolean;
    sanitize?: boolean;
    schedule?: 'immediate' | 'debounced';
    collapseSelection?: 'after' | 'start';
    literal?: boolean;
  }): void;
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
  // Tri-state selection formatting (inline + block)
  getSelectionFormatState?(): SelectionFormatState;
  // Uniform heading level across selection (1-6) or null if none / mixed
  getActiveHeadingLevel?(): number | null;

  // Focus & Selection
  focus(): void;
  blur(): void;
  getSelection(): TextSelection;


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



## Programmatic Markdown Insertion (insertMarkdown)

When you need to inject content at the current caret position (slash commands, AI assist, paste enrichment, image markdown, etc.) use `insertMarkdown` instead of the low-level `insertText`.

Why:
- Deterministic change scheduling (no race with MutationObserver)
- Optional parsing of the markdown into HTML immediately (`parse: true`)
- Optional literal insertion (escaped as needed) with `parse: false` or `literal: true`
- Respects existing `sanitizeMarkdown` / `sanitizeHtml` hooks
- Marks inserted nodes dirty for the incremental serializer (efficient partial updates)

Signature:
```ts
editor.insertMarkdown(markdown: string, options?: {
  parse?: boolean;          // default true (markdown -> HTML -> serialize later)
  sanitize?: boolean;       // default true (passes through provided sanitizers)
  schedule?: 'immediate' | 'debounced'; // default 'immediate'
  collapseSelection?: 'after' | 'start'; // where caret lands post insert (default 'after')
  literal?: boolean;        // alias for parse:false
});
```

Examples:
```ts
// Insert markdown, converting **bold** to <strong> immediately
editor.insertMarkdown('**bold** and *italic*');

// Insert literal characters (will appear with escaping so they are NOT interpreted as formatting)
// NOTE: parse:false (or literal:true) causes control chars to be escaped: '**raw**' -> '\\*\\*raw\\*\\*'
editor.insertMarkdown('**raw markers**', { parse: false });

// Insert code block snippet at caret
editor.insertMarkdown('\n```js\nconsole.log(1)\n```\n');
```

React ref usage:
```tsx
const ref = useRef<DhivehiRichEditorRef>(null);
ref.current?.insertMarkdown('![alt](https://example.com/img.png)');
```

Use `insertText` only for simulating keystrokes / IME style character-level insertion. Prefer `insertMarkdown` for semantic content.

Image Plugin Note: The internal ImagePlugin now requires `insertMarkdown` (provided automatically by the core editor). If you ever embed the plugin context manually, ensure you pass an `insertMarkdown` helper; otherwise image insertion will throw.

## Inline Toggle Semantics

Inline format helpers (`toggleBold`, `toggleItalic`, `toggleUnderline`, `toggleStrikethrough`, `toggleCode`) perform a true toggle:

1. Selection not fully covered → format is applied (wrapping selected non-whitespace text nodes).
2. 100% of non-whitespace text nodes already inside the format → all matching wrappers wholly contained in the selection are unwrapped (children lifted out, avoiding nested `<strong>` chains).
3. Inline code ignores code inside `<pre><code>` (no accidental inline code toggling within code blocks).

Additional niceties:
* Caret normalization automatically exits an inline element when you reach its end so typing continues plain.
* Whitespace-only text nodes are ignored for coverage calculation.
* Multiple adjacent formatted spans are treated as a single logical coverage region.

Result: Toolbar buttons reflect predictable toggling (second press removes formatting instead of nesting new tags).

## Heading Level Introspection

Use `getActiveHeadingLevel()` to obtain a uniform heading level (1–6) for the current selection, or `null` if none or mixed:

```ts
const level = editorRef.current?.getActiveHeadingLevel();
// 1..6 when single consistent heading, otherwise null
```

Combine with `getSelectionFormatState()` where `block.heading` is `'none' | 'all' | 'mixed'` for tri-state UI. A mixed state occurs when multiple heading levels or partial coverage is selected.

## Formatting State

When a selection spans content that is partially formatted (e.g. half bold, half plain) you often need an "indeterminate" UI state (checkbox style) for toolbar buttons. The editor now emits an enhanced `format-change` event payload `{ formats: FormatType[]; state?: SelectionFormatState }` where `state` includes granular inline + block presence with values:

`'none' | 'partial' | 'all'` (and `'mixed'` specifically for heading when multiple heading levels are selected).

Shape:
```ts
interface SelectionFormatState {
  inline: { bold: FormatPresence; italic: FormatPresence; underline: FormatPresence; strikethrough: FormatPresence; code: FormatPresence };
  block: { heading: FormatPresence | 'mixed'; blockquote: FormatPresence; codeBlock: FormatPresence; bulletList: FormatPresence; numberedList: FormatPresence };
  allActiveFormats: FormatType[];   // formats fully applied across selection
  partialFormats: FormatType[];     // formats partially applied (or heading mixed)
}
```

In React you can consume this using the provided hook:
```ts
import { useFormatState } from 'dv-rich-editor/react';

function Toolbar() {
  const state = useFormatState();
  const boldPresence = state?.inline.bold; // 'none' | 'partial' | 'all'
  // Render a tri-state toggle accordingly
}
```

Toolbar example logic for a button:
```tsx
<button
  data-active={state?.inline.bold === 'all'}
  data-partial={state?.inline.bold === 'partial'}
  aria-pressed={state?.inline.bold === 'all'}
>
  B
</button>
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
  placeholder="test"
/>
```

---
End.