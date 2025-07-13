# 🖋️ DV Rich Editor

[![npm version](https://badge.fury.io/js/dv-rich-editor.svg)](https://badge.fury.io/js/dv-rich-editor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)

> A lightweight Dhivehi rich text editor featuring built-in Thaana keyboard support, dynamic theming, and clean markdown output. This is an effort to better handle markdown images and custom tags correctly in RTL inputs. It also gracefully manages image spacing and backspace behavior during Dhivehi typing, preventing unintended issues such as breaking URLs and other markdown tags.

Thaana keyboard IME (EXPERIMENTAL)

The Thaana keyboard used here is experimental. It combines immediate character mapping with akuru–fili composition inspired by IMEs like Wanakana. Text is inserted directly into the DOM for real-time feedback, with a short buffer for fili merging . While more complex than traditional thaana implimentaions, it performs well in testing . This implementation is highly experimental and subject to change , a simpler version may replace it in the future, or additional smart prediction or similar features may be introduced.

## 🚀 Quick Start

### Installation

```bash
npm install dv-rich-editor
# or
yarn add dv-rich-editor
# or
pnpm add dv-rich-editor
```

### React (Recommended)

```tsx
import { DVRichEditor } from 'dv-rich-editor/react';
import type { DhivehiRichEditorRef } from 'dv-rich-editor/react';

function MyEditor() {
  const [content, setContent] = useState('# ވެލްކަމް 👋\n\n**ތާނަ** އަދި *English* މިކްސް ކޮންޓެންޓް!');
  
  return (
    <DVRichEditor
      placeholder="ލިޔުއްވާށެވެ... Start typing..."
      onChange={setContent}
      theme={{ name: 'blue' }}
      className="min-h-[300px]"
    />
  );
}
```

### Vanilla JavaScript

```javascript
import { DhivehiRichEditor } from 'dv-rich-editor';

const editor = new DhivehiRichEditor({
  container: '#editor',
  placeholder: 'ލިޔުއްވާށެވެ...',
  onChange: (markdown) => console.log(markdown),
  theme: { name: 'dark' }
});
```


### Basic Editor with Toolbar

```tsx
import { useRef } from 'react';
import { DVRichEditor } from 'dv-rich-editor/react';
import type { DhivehiRichEditorRef, FormatType } from 'dv-rich-editor/react';

function EditorWithToolbar() {
  const editorRef = useRef<DhivehiRichEditorRef>(null);
  const [content, setContent] = useState('');

  const applyFormat = (format: FormatType) => {
    editorRef.current?.applyFormat(format);
  };

  const checkFormat = (format: FormatType) => {
    return editorRef.current?.isFormatActive(format) || false;
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
        <button
          onClick={() => applyFormat('bold')}
          className={`px-3 py-1 rounded ${checkFormat('bold') ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => applyFormat('italic')}
          className={`px-3 py-1 rounded ${checkFormat('italic') ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
        >
          <em>I</em>
        </button>
        <button
          onClick={() => applyFormat('h1')}
          className="px-3 py-1 rounded hover:bg-gray-200"
        >
          H1
        </button>
        <button
          onClick={() => applyFormat('blockquote')}
          className="px-3 py-1 rounded hover:bg-gray-200"
        >
          Quote
        </button>
      </div>

      {/* Editor */}
      <DVRichEditor
        ref={editorRef}
        placeholder="ލިޔުއްވާށެވެ... Start typing..."
        onChange={setContent}
        theme={{ name: 'minimal' }}
        className="min-h-[300px] p-4"
      />
    </div>
  );
}
```

### Advanced Example with Image Upload

```tsx
function AdvancedEditor() {
  const [content, setContent] = useState('');
  
  const handleImageUpload = async (): Promise<string> => {
    // Your image upload logic
    const file = await selectFile();
    const url = await uploadToServer(file);
    return url;
  };

  return (
    <DVRichEditor
      placeholder="ލިޔުއްވާށެވެ... Start typing..."
      onChange={setContent}
      onImageUrlRequest={handleImageUpload}
      theme={{
        name: 'custom',
        colors: {
          background: '#ffffff',
          text: '#1a202c',
          border: '#3182ce',
          borderFocus: '#2c5aa0'
        },
        typography: {
          fontFamily: '"Noto Sans Dhivehi", system-ui, sans-serif',
          fontSize: '16px',
          lineHeight: '1.6'
        }
      }}
      styling={{
        customCSS: `
          .dv-rich-editor h1 { color: #2d3748; border-bottom: 2px solid #3182ce; }
          .dv-rich-editor blockquote { background: #ebf8ff; border-left: 4px solid #3182ce; }
        `
      }}
      image={{
        preview: true,
        defaultAltText: 'Uploaded image'
      }}
    />
  );
}
```

## Theming

### Built-in Themes

```tsx
{/* Light & Clean */}
<DVRichEditor theme={{ name: 'default' }} />

{/* Dark Mode */}
<DVRichEditor theme={{ name: 'dark' }} />

{/* Minimal & Borderless */}
<DVRichEditor theme={{ name: 'minimal' }} />

{/* Professional Blue */}
<DVRichEditor theme={{ name: 'blue' }} />

{/* Classic Look */}
<DVRichEditor theme={{ name: 'classic' }} />

{/* Bright & Airy */}
<DVRichEditor theme={{ name: 'light' }} />
```

### Custom Themes

Create your own theme with full control:

```tsx
<DVRichEditor
  theme={{
    name: 'MyBrand',
    colors: {
      background: '#fafafa',
      text: '#2d3748',
      border: '#e2e8f0',
      borderFocus: '#3182ce',
      placeholder: '#a0aec0',
      selection: '#bee3f8',
      link: '#3182ce',
      codeBackground: '#f7fafc',
      blockquoteBackground: '#ebf8ff',
      blockquoteBorder: '#3182ce'
    },
    typography: {
      fontFamily: '"Inter", "Noto Sans Dhivehi", system-ui, sans-serif',
      fontSize: '16px',
      lineHeight: '1.7',
      fontWeight: '400'
    },
    spacing: {
      padding: '20px',
      margin: '0',
      borderRadius: '12px',
      borderWidth: '2px'
    }
  }}
/>
```

### Advanced CSS Customization

```tsx
<DVRichEditor
  styling={{
    container: {
      css: { 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease'
      }
    },
    customCSS: `
      .dv-rich-editor {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .dv-rich-editor h1 {
        background: linear-gradient(45deg, #f093fb 0%, #f5576c 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .dv-rich-editor strong {
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 6px;
        border-radius: 4px;
      }
    `
  }}
/>
```

##  Image & Media Handling

### Basic Image Support

```tsx
<DVRichEditor
  image={{
    preview: true,           // Show actual images in editor
    defaultAltText: 'Image'  // Default alt text
  }}
/>
```

### Custom Image Upload

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


### Custom Key Mapping

```tsx
const customKeyMap = {
  'q': 'ް',  // sukun
  'w': 'އ',  // alifu
  'e': 'ެ',  // ebefili
  // ... your custom mappings
};

<DVRichEditor
  thaana={{
    enabled: true,
    keyMap: customKeyMap
  }}
/>
```

### Runtime Control

```tsx
const editorRef = useRef<DhivehiRichEditorRef>(null);

// Toggle Thaana input dynamically
const toggleThaana = () => {
  const isEnabled = editorRef.current?.getThaanaConfig()?.enabled;
  editorRef.current?.setThaanaEnabled(!isEnabled);
};
```

## Reference

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
```

### Editor Methods

```typescript
interface DhivehiRichEditorRef {
  // Content Management
  getMarkdown(): string;
  setMarkdown(content: string, preserveFocus?: boolean): void;
  clear(): void;
  insertText(text: string): void;
  appendContent(content: string): void;
  
  // Formatting
  applyFormat(format: FormatType): void;
  removeFormat(format: FormatType): void;
  isFormatActive(format: FormatType): boolean;
  
  // Focus & Selection
  focus(): void;
  blur(): void;
  getSelection(): TextSelection;
  
  // Images
  insertImage(imageData: ImageData): void;
  openImageDialog(): Promise<void>;
  
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




##  Security

> ⚠️ **Important**: This library focuses on lightweight editing and does not include built-in sanitization.


##  Troubleshooting

### Common Issues

**TypeScript errors with imports:**
```typescript
// ✅ Correct way
import { DVRichEditor } from 'dv-rich-editor/react';
import type { DhivehiRichEditorRef } from 'dv-rich-editor/react';

// ❌ Incorrect way  
import { DVRichEditor, DhivehiRichEditorRef } from 'dv-rich-editor/react';
```

**Thaana input not working:**
```typescript
// Ensure Thaana is enabled
<DVRichEditor
  thaana={{ enabled: true }}
  placeholder="ލިޔުއްވާށެވެ..."
/>
```







# ......thats all