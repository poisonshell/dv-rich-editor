import { ThemeManager } from '../editor/ThemeManager';
import { EditorTheme, ThemeName, EditorStyling } from '../types';

export class ThemeApplier {
  constructor(private editor: HTMLElement, private container: HTMLElement) {}

  apply(theme?: EditorTheme, name?: ThemeName, styling?: EditorStyling): void {
    ThemeManager.applyTheme(this.editor, this.container, theme, name, styling);
  }
}
