export const EDITOR_STYLES = {
  // Base editor styles
  base: {
    minHeight: '100px',
    padding: '12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    outline: 'none',
    fontFamily: '"Noto Sans Dhivehi", "MV Elaaf Normal", "Faruma", Arial, sans-serif',
    fontSize: '16px',
    direction: 'rtl',
    textAlign: 'right',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    overflowX: 'hidden',
    overflowY: 'auto',
    width: '100%',
    boxSizing: 'border-box',
    lineHeight: '1.6',
    textRendering: 'optimizeLegibility',
    fontFeatureSettings: '"liga" 1, "kern" 1, "calt" 1',
    userSelect: 'text',
    unicodeBidi: 'plaintext',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    fontVariantLigatures: 'common-ligatures contextual',
    fontVariantNumeric: 'lining-nums',
    letterSpacing: '0.01em',
    color: '#333333',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },

  // CSS styles for injection
  css: `
    .dv-rich-editor {
      /* Placeholder styling***REMOVED***
    }
    
    .dv-rich-editor:empty:before {
      content: attr(data-placeholder);
      color: #999;
      pointer-events: none;
      position: absolute;
      opacity: 0.6;
    }
    
    .dv-rich-editor:focus:empty:before {
      opacity: 0.4;
    }
    
    /* Thaana input status indicator***REMOVED***
    .dv-rich-editor.thaana-enabled {
      border-left: 3px solid #007bff;
    }
    
    .dv-rich-editor.thaana-disabled {
      border-left: 3px solid #ccc;
    }
    
    /* Ensure images in editor are responsive***REMOVED***
    .dv-rich-editor img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 8px 0;
    }
    
    /* Better styling for lists***REMOVED***
    .dv-rich-editor ul, .dv-rich-editor ol {
      margin: 8px 0;
      padding-right: 20px;
    }
    
    /* Better headings***REMOVED***
    .dv-rich-editor h1, .dv-rich-editor h2, .dv-rich-editor h3 {
      margin: 12px 0 8px 0;
      line-height: 1.3;
    }
    
    /* Better blockquotes***REMOVED***
    .dv-rich-editor blockquote {
      border-right: 3px solid #ddd;
      margin: 8px 0;
      padding: 8px 16px;
      background: #f9f9f9;
    }
    
    /* Ensure proper RTL text flow***REMOVED***
    .dv-rich-editor * {
      direction: inherit;
      text-align: inherit;
    }
    
    /* Protect URLs and markdown syntax with LTR direction***REMOVED***
    .dv-rich-editor img {
      direction: ltr;
      display: block;
      margin: 8px auto;
    }
    
    /* Force code elements to be LTR***REMOVED***
    .dv-rich-editor code {
      direction: ltr;
      unicode-bidi: embed;
      background: #f5f5f5;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Monaco', 'Consolas', monospace;
    }
    
    /* Force links to maintain proper direction***REMOVED***
    .dv-rich-editor a {
      direction: ltr;
      unicode-bidi: embed;
      color: #007bff;
      text-decoration: underline;
    }
    
    /* Protect pre-formatted text***REMOVED***
    .dv-rich-editor pre {
      direction: ltr;
      unicode-bidi: embed;
      background: #f8f9fa;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'Monaco', 'Consolas', monospace;
    }
    
    /* Add spacing around markdown elements***REMOVED***
    .dv-rich-editor strong,
    .dv-rich-editor em,
    .dv-rich-editor u {
      margin: 0 2px;
    }
    
    /* Protect inline code from RTL issues***REMOVED***
    .dv-rich-editor :not(pre) > code {
      white-space: nowrap;
    }
  `
};

export const injectEditorStyles = (): void => {
  // Check if styles are already injected
  if (document.querySelector('#dv-rich-editor-styles')) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = 'dv-rich-editor-styles';
  styleElement.textContent = EDITOR_STYLES.css;

  document.head.appendChild(styleElement);
}; 