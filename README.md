# DV Rich Editor

A lightweight Dhivehi rich text editor featuring built-in Thaana keyboard support, dynamic theming, and clean markdown output. This is an effort to better handle markdown images and custom tags correctly in RTL inputs. It also gracefully manages image spacing and backspace behavior during Dhivehi typing, preventing unintended issues such as breaking URLs and other markdown tags.

# Thaana keyboard IME approach

This implementation differs significantly from most existing solutions. It combines immediate character mapping with  akuru–fili composition inspired by IMEs like Wanakana. It uses a short-lived buffer to detect and merge akuru–fili pairs while inserting characters directly into the DOM for immediate feedback. It also supports automatic conversion of pasted text and configurable key mappings. While the approach is somewhat more complex than simpler solutions, practical testing has shown performance to be solid. This implementation is designed to offer more predictable behavior in rich text editors and content-editable environments, but thorough testing is recommended before deploying it in production.

## Security Notice

- This library is intended to be as lightweight as possible and therefore does not include input validation or output sanitization.
- Sanitize HTML output with DOMPurify or similar
- Validate all user URLs and inputs  
- Implement Content Security Policy




## Installation

```bash
npm install dv-rich-editor
```

## Quick Start

### Vanilla JavaScript

#### Using a Bundler (Webpack, Vite, Parcel, etc.)

```javascript
import { DhivehiRichEditor } from 'dv-rich-editor';

const editor = new DhivehiRichEditor({
    container: '#editor-container',
    placeholder: 'ލިޔުއްވާށެވެ...',
    onChange: (markdown) => console.log(markdown)
});
```

#### Using UMD Bundle (Plain HTML)

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
            placeholder: 'ލިޔުއްވާށެވެ...',
            onChange: (markdown) => console.log(markdown)
        });
    </script>
</body>
</html>
```

### React

```tsx
import { DVRichEditor } from 'dv-rich-editor/react';

function MyEditor() {
    const [content, setContent] = useState('');
    
    return (
        <DVRichEditor
            placeholder="ލިޔުއްވާށެވެ..."
            onChange={setContent}
            theme={{ name: 'blue' }}
        />
    );
}
```

### Next.js (not tested might not work)

```tsx
import dynamic from 'next/dynamic';

const DVRichEditor = dynamic(
    () => import('dv-rich-editor/react').then(mod => mod.DVRichEditor),
    { ssr: false }
);
```

## Theming

### Pre-built Themes


```tsx
<DVRichEditor theme={{ name: 'default' }} />      // Clean
<DVRichEditor theme={{ name: 'dark' }} />         // Dark mode
<DVRichEditor theme={{ name: 'light' }} />        // Bright, minimal  
<DVRichEditor theme={{ name: 'blue' }} />         // Blue 
<DVRichEditor theme={{ name: 'minimal' }} />      // Borderless
<DVRichEditor theme={{ name: 'classic' }} />      // Traditional
```

### Custom Themes


```tsx
<DVRichEditor
    theme={{
        name: 'My Theme',
        colors: {
            background: '#ffffff',
            text: '#333333',
            border: '#007bff',
            borderFocus: '#0056b3',
            placeholder: '#999999'
        },
        typography: {
            fontFamily: '"Noto Sans Dhivehi", sans-serif',
            fontSize: '18px',
            lineHeight: '1.7'
        },
        spacing: {
            padding: '20px',
            borderRadius: '8px',
            borderWidth: '2px'
        }
    }}
/>
```

### Advanced Styling

Inject custom CSS :

```tsx
<DVRichEditor
    styling={{
        container: {
            css: { boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }
        },
        customCSS: `
            .dv-rich-editor h1 { color: #e74c3c; }
            .dv-rich-editor strong { background: #f39c1220; }
        `
    }}
/>
```

### Theme Options

**Colors:** background, text, border, borderFocus, placeholder, selection, link, codeBackground, blockquoteBackground, blockquoteBorder

**Typography:** fontFamily, fontSize, lineHeight, fontWeight  

**Spacing:** padding, margin, borderRadius, borderWidth

**Integration:** Works  with Tailwind and Bootstrap 

## Image Upload & Media Handling

Image URL input  or custom image uploader call back option 


### Basic Image Configuration

```typescript
{
    // Image handling configuration
    image?: {
        defaultAltText?: string;    
        preview?: boolean;         
    },
    
    // Upload callback - integrate with your service
    onImageUrlRequest?: () => Promise<string>;
}
```


```typescript
// Use with editor

<DVRichEditor
    onImageUrlRequest={handleImageUpload}
    image={{
      defaultAltText: 'photo'  // default alt if image have none
      preview: true  // Shows actual images in editor
    }}
/>
```


## Configuration

### Basic Options

```typescript
{
    container: HTMLElement | string;
    initialContent?: string;
    placeholder?: string;
    theme?: EditorTheme;
    styling?: EditorStyling;
    onChange?: (markdown: string) => void;
    onImageUrlRequest?: () => Promise<string>;
    
    // Image configuration
    image?: {
        defaultAltText?: string;
        preview?: boolean;
    };
}
```

### Features

```typescript
features: {
    bold: true,
    italic: true,
    underline: true,
    heading: true,
    list: true,
    image: true,
    blockquote: true
}
```

### Thaana Keyboard

```typescript
thaana: {
    enabled: true,
    autoCorrect: true,
    phonetic: false
}
```

## Reference

### Core Methods

| Method | Description |
|--------|-------------|
| `getMarkdown()` | Get content as markdown |
| `setMarkdown(content)` | Set content from markdown |
| `insertImage(imageData)` | Insert image |
| `copyToClipboard()` | Copy to clipboard |
| `applyFormat(format)` | Apply formatting (see detailed docs below) |
| `removeFormat(format)` | Remove specific formatting |
| `isFormatActive(format)` | Check if format is active at cursor |
| `updateTheme(theme)` | Change theme dynamically |
| `setThaanaEnabled(enabled)` | Enable/disable Thaana input at runtime |
| `clear()` | Clear all content |

### Formatting Methods

#### `applyFormat(format: FormatType)`

Applies formatting to the currently selected text.

**Available Format Types:**

```typescript
type FormatType = 
  | 'bold'           // **text** or <strong>
  | 'italic'         // *text* or <em>  
  | 'underline'      // <u>text</u>
  | 'strikethrough'  // ~~text~~
  | 'code'           // `text`
  | 'heading1'       // # text
  | 'heading2'       // ## text  
  | 'heading3'       // ### text
  | 'bullet-list'    // - item
  | 'numbered-list'  // 1. item
  | 'blockquote'     // > text
  | 'link'           // [text](url)
  | 'image'          // ![alt](url)
```

**Formatting Behavior:**

- **Near markdown syntax**: Uses markdown formatting (`**bold**`, `*italic*`)
- **Normal text**: Uses HTML formatting (`<strong>`, `<em>`) via `document.execCommand`
- **RTL protection**: Adds spaces around formatting for proper Dhivehi text handling

**Usage Examples:**

```javascript
// Vanilla JavaScript
const editor = new DhivehiRichEditor({ container: '#editor' });

// Apply formatting to selected text
editor.applyFormat('bold');
editor.applyFormat('italic');
editor.applyFormat('bullet-list');
```

```tsx
// React Hook
const { applyFormat, isFormatActive, removeFormat } = useDhivehiEditor();

// Apply formatting
const handleBold = () => applyFormat('bold');
const handleItalic = () => applyFormat('italic');

// Check if format is active (for toolbar state)
const isBold = isFormatActive('bold');
const isItalic = isFormatActive('italic');

// Remove formatting
const removeBold = () => removeFormat('bold');
```

```tsx
// React Component Ref
const editorRef = useRef<DhivehiRichEditorRef>(null);

const applyBold = () => {
  editorRef.current?.applyFormat('bold');
};

const checkFormatting = () => {
  const isBold = editorRef.current?.isFormatActive('bold');
  console.log('Bold active:', isBold);
};
```

**Toolbar Integration Example:**

```tsx
function EditorToolbar() {
  const { applyFormat, isFormatActive } = useDhivehiEditor();
  
  const formatButtons = [
    { format: 'bold', label: 'B', title: 'Bold' },
    { format: 'italic', label: 'I', title: 'Italic' },
    { format: 'underline', label: 'U', title: 'Underline' },
    { format: 'strikethrough', label: 'S', title: 'Strikethrough' },
  ];
  
  return (
    <div className="toolbar">
      {formatButtons.map(({ format, label, title }) => (
        <button
          key={format}
          onClick={() => applyFormat(format)}
          className={isFormatActive(format) ? 'active' : ''}
          title={title}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

### React Hook

```tsx
const {
    editorRef,
    getMarkdown,
    applyFormat,
    copyToClipboard,
    clear
} = useDhivehiEditor();
```

