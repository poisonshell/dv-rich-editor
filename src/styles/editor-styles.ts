export const EDITOR_STYLES = {
  // Base editor styles
  base: {
    minHeight: "100px",
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    outline: "none",
    fontFamily:
      '"Noto Sans Dhivehi", "MV Elaaf Normal", "Faruma", Arial, sans-serif',
    fontSize: "16px",
    direction: "rtl",
    textAlign: "right",
    wordWrap: "break-word",
    overflowWrap: "break-word",
    whiteSpace: "pre-wrap",
    overflowX: "hidden",
    overflowY: "auto",
    width: "100%",
    boxSizing: "border-box",
    lineHeight: "1.6",
    textRendering: "optimizeLegibility",
    fontFeatureSettings: '"liga" 1, "kern" 1, "calt" 1',
    userSelect: "text",
    unicodeBidi: "plaintext",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    fontVariantLigatures: "common-ligatures contextual",
    fontVariantNumeric: "lining-nums",
    letterSpacing: "0.01em",
    color: "#333333",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },

  // Complete CSS styles for injection
  css: `
    .dv-rich-editor {
      direction: rtl;
      text-align: right;
      unicode-bidi: plaintext;
      
      user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      
      cursor: text !important;
      -webkit-text-fill-color: initial;
      
      word-break: keep-all;
      overflow-wrap: break-word;
      white-space: pre-wrap;

      font-family: 'Noto Sans Dhivehi', 'MV Elaaf Normal', 'Faruma', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      font-feature-settings: "liga" 1, "kern" 1, "calt" 1;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-variant-ligatures: common-ligatures contextual;
      font-variant-numeric: lining-nums;
      letter-spacing: 0.01em;
      
      min-height: 100px;
      padding: 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      color: #333;
      
      outline: none;
      cursor: text;
      overflow-wrap: break-word;
      word-wrap: break-word;
      
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .dv-rich-editor * {
      direction: inherit;
      unicode-bidi: inherit;
    }

    .dv-rich-editor:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
      outline: none;
    }

    .dv-rich-editor[data-placeholder]:empty::before {
      content: attr(data-placeholder);
      color: #6c757d;
      pointer-events: none;
      font-style: italic;
      opacity: 0.7;
    }

    /* HEADING STYLES - These are crucial for visual formatting */
    .dv-rich-editor h1,
    .dv-rich-editor h2,
    .dv-rich-editor h3,
    .dv-rich-editor h4,
    .dv-rich-editor h5,
    .dv-rich-editor h6 {
      margin: 1em 0 0.5em 0;
      font-weight: bold;
      line-height: 1.2;
      display: block;
    }

    .dv-rich-editor h1 { 
      font-size: 2em !important; 
      font-weight: bold !important;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0.3em;
    }
    .dv-rich-editor h2 { 
      font-size: 1.75em !important; 
      font-weight: bold !important;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 0.2em;
    }
    .dv-rich-editor h3 { 
      font-size: 1.5em !important; 
      font-weight: bold !important;
    }
    .dv-rich-editor h4 { 
      font-size: 1.25em !important; 
      font-weight: bold !important;
    }
    .dv-rich-editor h5 { 
      font-size: 1.1em !important; 
      font-weight: bold !important;
    }
    .dv-rich-editor h6 { 
      font-size: 1em !important; 
      font-weight: bold !important;
    }

    .dv-rich-editor p {
      margin: 0.5em 0;
      display: block;
    }

    .dv-rich-editor ul,
    .dv-rich-editor ol {
      margin: 0.5em 0;
      padding-right: 2em;
      padding-left: 0;
      display: block;
    }

    .dv-rich-editor li {
      margin: 0.25em 0;
      display: list-item;
    }

    /* BLOCKQUOTE STYLES - Crucial for visual formatting */
    .dv-rich-editor blockquote {
      margin: 1em 0 !important;
      padding: 0.5em 1em !important;
      border-right: 4px solid #3b82f6 !important;
      border-left: none !important;
      background-color: #f8fafc !important;
      font-style: italic !important;
      color: #4b5563 !important;
      border-radius: 0 4px 4px 0 !important;
      display: block !important;
    }

    /* CODE STYLES - Crucial for visual formatting */
    .dv-rich-editor code {
      background-color: #f3f4f6 !important;
      color: #dc2626 !important;
      border-radius: 3px !important;
      padding: 0.2em 0.4em !important;
      font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', Consolas, 'Courier New', monospace !important;
      font-size: 0.9em !important;
      direction: ltr !important;
      text-align: left !important;
      display: inline !important;
      border: 1px solid #e5e7eb !important;
    }

    /* PRE/CODE BLOCK STYLES - Crucial for visual formatting */
    .dv-rich-editor pre {
      background-color: #1f2937 !important;
      color: #f9fafb !important;
      border: 1px solid #374151 !important;
      border-radius: 6px !important;
      padding: 1em !important;
      overflow-x: auto !important;
      direction: ltr !important;
      text-align: left !important;
      margin: 1em 0 !important;
      display: block !important;
    }

    .dv-rich-editor pre code {
      background-color: transparent !important;
      color: inherit !important;
      border-radius: 0 !important;
      padding: 0 !important;
      border: none !important;
      font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', Consolas, 'Courier New', monospace !important;
    }

    .dv-rich-editor a {
      color: #007bff;
      text-decoration: none;
    }

    .dv-rich-editor a:hover {
      text-decoration: underline;
    }

    .dv-rich-editor img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      user-select: none;
      -webkit-user-select: none;
    }

    /* TEXT FORMATTING STYLES */
    .dv-rich-editor strong,
    .dv-rich-editor b {
      font-weight: bold !important;
    }

    .dv-rich-editor em,
    .dv-rich-editor i {
      font-style: italic !important;
    }

    .dv-rich-editor u {
      text-decoration: underline !important;
    }

    .dv-rich-editor del,
    .dv-rich-editor s {
      text-decoration: line-through !important;
      color: #6b7280;
    }

    /* SELECTION STYLES */
    .dv-rich-editor::selection {
      background: rgba(0, 123, 255, 0.25);
      color: inherit;
    }

    .dv-rich-editor ::-moz-selection {
      background: rgba(0, 123, 255, 0.25);
      color: inherit;
    }

    /* THAANA INPUT STATUS */
    .dv-rich-editor.thaana-enabled {
      border-left: 3px solid #007bff;
    }
    
    .dv-rich-editor.thaana-disabled {
      border-left: 3px solid #ccc;
    }

    /* DARK MODE SUPPORT */
    @media (prefers-color-scheme: dark) {
      .dv-rich-editor {
        background-color: #1e1e1e;
        color: #e0e0e0;
        border-color: #444;
      }
      
      .dv-rich-editor:focus {
        border-color: #4a9eff;
        box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.25);
      }
      
      .dv-rich-editor[data-placeholder]:empty::before {
        color: #999;
      }
      
      .dv-rich-editor blockquote {
        background-color: #2a2a2a !important;
        border-right-color: #555 !important;
      }
      
      .dv-rich-editor code {
        background-color: #2a2a2a !important;
      }
      
      .dv-rich-editor pre {
        background-color: #2a2a2a !important;
        border-color: #444 !important;
      }
    }

  .dv-rich-editor ol {
    display: block !important;
    list-style-type: decimal !important;
    list-style-position: outside !important;
    margin: 1em 0 !important;
    padding-right: 2em !important;
    padding-left: 0 !important;
    background: rgba(59, 130, 246, 0.05) !important;
    border: 1px dashed rgba(59, 130, 246, 0.2) !important;
    border-radius: 8px !important;
  }

  .dv-rich-editor ol li {
    display: list-item !important;
    list-style-type: decimal !important;
    list-style-position: outside !important;
    margin: 0.5em 0 !important;
    padding: 0.2em 0 !important;
    background: rgba(16, 185, 129, 0.05) !important;
    border-left: 3px solid rgba(16, 185, 129, 0.3) !important;
    border-radius: 0 4px 4px 0 !important;
  }

  .dv-rich-editor ul li {
    display: list-item !important;
    list-style-type: disc !important;
    list-style-position: outside !important;
    margin: 0.5em 0 !important;
  }

  /* Remove interfering pseudo-elements */
  .dv-rich-editor li::before,
  .dv-rich-editor li::after {
    content: none !important;
  }

  /* Ensure markers are visible and styled */
  .dv-rich-editor ol li::marker {
    color: #1e40af !important;
    font-weight: bold !important;
    font-size: 1.1em !important;
  }

  .dv-rich-editor ul li::marker {
    color: #059669 !important;
    font-size: 1.2em !important;
  }


    /* MOBILE RESPONSIVE */
    @media (max-width: 768px) {
      .dv-rich-editor {
        font-size: 1em; 
        padding: 10px;
      }
    }
  `,
};

export const injectEditorStyles = (): void => {
  if (document.querySelector("#dv-rich-editor-styles")) {
    return;
  }

  const styleElement = document.createElement("style");
  styleElement.id = "dv-rich-editor-styles";
  styleElement.textContent = EDITOR_STYLES.css;

  document.head.appendChild(styleElement);
};
