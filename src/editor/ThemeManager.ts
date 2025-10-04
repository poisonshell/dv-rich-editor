import { EditorTheme, ThemeName, EditorStyling } from "../types";

export class ThemeManager {
  private static injectedStyleId = "dv-rich-editor-theme-styles";

  //pre built themes
  static readonly THEMES: Record<ThemeName, EditorTheme> = {
    default: {
      name: "Default",
      colors: {
        background: "#ffffff",
        text: "#333333",
        border: "#dddddd",
        borderFocus: "#007bff",
        placeholder: "#999999",
        selection: "#b3d9ff",
        link: "#007bff",
        codeBackground: "#f5f5f5",
        blockquoteBackground: "#f9f9f9",
        blockquoteBorder: "#dddddd",
      },
      typography: {
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fontSize: "16px",
        lineHeight: "1.5",
        fontWeight: "400",
      },
      spacing: {
        padding: "12px",
        margin: "8px",
        borderRadius: "4px",
        borderWidth: "1px",
      },
    },

    dark: {
      name: "Dark",
      colors: {
        background: "#1a1a1a",
        text: "#e0e0e0",
        border: "#404040",
        borderFocus: "#4a9eff",
        placeholder: "#888888",
        selection: "#4a5568",
        link: "#4a9eff",
        codeBackground: "#2d2d2d",
        blockquoteBackground: "#262626",
        blockquoteBorder: "#404040",
      },
      typography: {
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fontSize: "16px",
        lineHeight: "1.5",
        fontWeight: "400",
      },
      spacing: {
        padding: "12px",
        margin: "8px",
        borderRadius: "6px",
        borderWidth: "1px",
      },
    },

    light: {
      name: "Light",
      colors: {
        background: "#fafafa",
        text: "#2d2d2d",
        border: "#e0e0e0",
        borderFocus: "#2196f3",
        placeholder: "#bdbdbd",
        selection: "#e3f2fd",
        link: "#1976d2",
        codeBackground: "#f5f5f5",
        blockquoteBackground: "#f8f9fa",
        blockquoteBorder: "#e9ecef",
      },
      typography: {
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fontSize: "16px",
        lineHeight: "1.6",
        fontWeight: "400",
      },
      spacing: {
        padding: "16px",
        margin: "8px",
        borderRadius: "8px",
        borderWidth: "1px",
      },
    },

    blue: {
      name: "Blue",
      colors: {
        background: "#f8fafe",
        text: "#2c3e50",
        border: "#3498db",
        borderFocus: "#2980b9",
        placeholder: "#7fb3d3",
        selection: "#d6e9f7",
        link: "#2980b9",
        codeBackground: "#ecf0f1",
        blockquoteBackground: "#e8f4f8",
        blockquoteBorder: "#3498db",
      },
      typography: {
        fontFamily: '"Noto Sans Dhivehi", system-ui, -apple-system, sans-serif',
        fontSize: "18px",
        lineHeight: "1.7",
        fontWeight: "400",
      },
      spacing: {
        padding: "16px",
        margin: "12px",
        borderRadius: "8px",
        borderWidth: "2px",
      },
    },

    minimal: {
      name: "Minimal",
      colors: {
        background: "#ffffff",
        text: "#333333",
        border: "transparent",
        borderFocus: "#e0e0e0",
        placeholder: "#cccccc",
        selection: "#f0f0f0",
        link: "#666666",
        codeBackground: "#f8f8f8",
        blockquoteBackground: "#fafafa",
        blockquoteBorder: "#e0e0e0",
      },
      typography: {
        fontFamily: '"SF Pro Text", system-ui, -apple-system, sans-serif',
        fontSize: "16px",
        lineHeight: "1.5",
        fontWeight: "400",
      },
      spacing: {
        padding: "20px",
        margin: "16px",
        borderRadius: "0px",
        borderWidth: "0px",
      },
    },

    classic: {
      name: "Classic",
      colors: {
        background: "#ffffff",
        text: "#333333",
        border: "#cccccc",
        borderFocus: "#0066cc",
        placeholder: "#999999",
        selection: "#cce6ff",
        link: "#0066cc",
        codeBackground: "#f0f0f0",
        blockquoteBackground: "#f5f5f5",
        blockquoteBorder: "#cccccc",
      },
      typography: {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: "16px",
        lineHeight: "1.6",
        fontWeight: "400",
      },
      spacing: {
        padding: "15px",
        margin: "10px",
        borderRadius: "3px",
        borderWidth: "1px",
      },
    },
  };

  //Apply theme

  static applyTheme(
    editor: HTMLElement,
    container: HTMLElement,
    theme?: EditorTheme,
    themeName?: ThemeName,
    customStyling?: EditorStyling
  ): void {
    // Determine the theme to use - fixed logic
    let activeTheme: EditorTheme;

    if (theme && (theme.colors || theme.typography || theme.spacing)) {
      // Theme object has actual properties, use it
      activeTheme = theme;
    } else if (theme?.name && this.THEMES[theme.name as ThemeName]) {
      // Theme object only has name, lookup the built-in theme
      activeTheme = this.THEMES[theme.name as ThemeName];
    } else if (themeName && this.THEMES[themeName]) {
      // Use themeName parameter
      activeTheme = this.THEMES[themeName];
    } else {
      // Fallback to default
      activeTheme = this.THEMES.default;
    }

  // Apply CSS variables first
  this.applyCSSVariables(editor, activeTheme);
  if (container !== editor) this.applyCSSVariables(container, activeTheme);

  // Apply theme to editor element
    this.applyThemeToElement(editor, activeTheme, "editor");

    // Apply theme to container if different
    if (container !== editor) {
      this.applyThemeToElement(container, activeTheme, "container");
    }

    // Inject theme CSS
    this.injectThemeCSS(activeTheme, customStyling);

    // Apply custom styling
    if (customStyling) {
      this.applyCustomStyling(editor, container, customStyling);
    }
  }

  private static applyCSSVariables(target: HTMLElement, theme: EditorTheme): void {
    const { colors, typography, spacing } = theme;
    const set = (k: string, v: string | undefined) => { if (v) target.style.setProperty(k, v); };
    if (colors) {
      set('--dv-bg', colors.background);
      set('--dv-text', colors.text);
      set('--dv-border', colors.border);
      set('--dv-border-focus', colors.borderFocus);
      set('--dv-placeholder', colors.placeholder);
      set('--dv-selection', colors.selection);
      set('--dv-link', colors.link);
      set('--dv-code-bg', colors.codeBackground);
      set('--dv-blockquote-bg', colors.blockquoteBackground);
      set('--dv-blockquote-border', colors.blockquoteBorder);
    }
    if (typography) {
      set('--dv-font-family', typography.fontFamily);
      set('--dv-font-size', typography.fontSize);
      set('--dv-line-height', typography.lineHeight);
      set('--dv-font-weight', typography.fontWeight);
    }
    if (spacing) {
      set('--dv-padding', spacing.padding);
      set('--dv-margin', spacing.margin);
      set('--dv-radius', spacing.borderRadius);
      set('--dv-border-width', spacing.borderWidth);
    }
  }

  //Apply theme to element
  private static applyThemeToElement(
    element: HTMLElement,
    theme: EditorTheme,
    type: "editor" | "container"
  ): void {
    const { colors, typography, spacing } = theme;

    if (colors) {
      if (colors.background) {
        element.style.backgroundColor = colors.background;
      }
      if (colors.text) {
        element.style.color = colors.text;
      }
      if (colors.border) {
        element.style.borderColor = colors.border;
      }
    }

    if (typography) {
      if (typography.fontFamily)
        element.style.fontFamily = typography.fontFamily;
      if (typography.fontSize) element.style.fontSize = typography.fontSize;
      if (typography.lineHeight)
        element.style.lineHeight = typography.lineHeight;
      if (typography.fontWeight)
        element.style.fontWeight = typography.fontWeight;
    }

    if (spacing) {
      if (spacing.padding && type === "editor")
        element.style.padding = spacing.padding;
      if (spacing.borderRadius)
        element.style.borderRadius = spacing.borderRadius;
      if (spacing.borderWidth) element.style.borderWidth = spacing.borderWidth;
    }
  }

  //inject theme css
  private static injectThemeCSS(
    theme: EditorTheme,
    customStyling?: EditorStyling
  ): void {
    // Remove existing theme styles
    const existing = document.getElementById(this.injectedStyleId);
    if (existing) {
      existing.remove();
    }

    // Skip if default styles are disabled
    if (customStyling?.disableDefaultStyles) {
      return;
    }

    const { colors, spacing } = theme;

    const css = `
      .dv-rich-editor {
        ${colors?.background ? `background-color: ${colors.background};` : ""}
        ${colors?.text ? `color: ${colors.text};` : ""}
        ${colors?.border ? `border-color: ${colors.border};` : ""}
      }
      
      .dv-rich-editor:focus {
        ${colors?.borderFocus ? `border-color: ${colors.borderFocus};` : ""}
        ${
          colors?.borderFocus
            ? `box-shadow: 0 0 0 3px ${colors.borderFocus}20;`
            : ""
        }
      }
      
      .dv-rich-editor:empty:before {
        ${colors?.placeholder ? `color: ${colors.placeholder};` : ""}
      }
      
      .dv-rich-editor::selection {
        ${colors?.selection ? `background-color: ${colors.selection};` : ""}
      }
      
      .dv-rich-editor a {
        ${colors?.link ? `color: ${colors.link};` : ""}
      }
      
      .dv-rich-editor code {
        ${
          colors?.codeBackground
            ? `background-color: ${colors.codeBackground};`
            : ""
        }
      }
      
      .dv-rich-editor blockquote {
        ${
          colors?.blockquoteBackground
            ? `background-color: ${colors.blockquoteBackground};`
            : ""
        }
        ${
          colors?.blockquoteBorder
            ? `border-right-color: ${colors.blockquoteBorder};`
            : ""
        }
      }
      
      .dv-rich-editor img {
        ${spacing?.margin ? `margin: ${spacing.margin} auto;` : ""}
        ${
          spacing?.borderRadius ? `border-radius: ${spacing.borderRadius};` : ""
        }
      }
      
      .dv-rich-editor h1, .dv-rich-editor h2, .dv-rich-editor h3 {
        ${spacing?.margin ? `margin: ${spacing.margin} 0;` : ""}
      }
      
      ${customStyling?.customCSS || ""}
    `;

    const styleElement = document.createElement("style");
    styleElement.id = this.injectedStyleId;
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  }

  //apply custom styling
  private static applyCustomStyling(
    editor: HTMLElement,
    container: HTMLElement,
    styling: EditorStyling
  ): void {
    // Apply container styling
    if (styling.container) {
      if (styling.container.css) {
        Object.assign(container.style, styling.container.css);
      }
      if (styling.container.className) {
        container.classList.add(styling.container.className);
      }
    }

    // Apply editor styling
    if (styling.editor) {
      if (styling.editor.css) {
        Object.assign(editor.style, styling.editor.css);
      }
      if (styling.editor.className) {
        editor.classList.add(styling.editor.className);
      }
    }
  }

  static getThemeNames(): ThemeName[] {
    return Object.keys(this.THEMES) as ThemeName[];
  }

  static getTheme(name: ThemeName): EditorTheme {
    return this.THEMES[name];
  }

  static createCustomTheme(
    baseName: ThemeName,
    overrides: Partial<EditorTheme>
  ): EditorTheme {
    const baseTheme = this.THEMES[baseName];
    return {
      ...baseTheme,
      ...overrides,
      colors: { ...baseTheme.colors, ...overrides.colors },
      typography: { ...baseTheme.typography, ...overrides.typography },
      spacing: { ...baseTheme.spacing, ...overrides.spacing },
    };
  }
}
