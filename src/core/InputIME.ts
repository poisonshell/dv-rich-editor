import { ThaanaInput } from '../thaana/ThaanaInput';
import { ThaanaKeyboardLayout } from '../types';

export class InputIME {
  private thaana: ThaanaInput;
  private enabled: boolean;

  constructor(cfg?: ThaanaKeyboardLayout){
    this.thaana = new ThaanaInput(cfg);
    this.enabled = cfg?.enabled !== false;
  }

  init(editor: HTMLElement){
    this.thaana.initialize(editor);
  }

  setEnabled(enabled: boolean){
    this.enabled = enabled; this.thaana.setEnabled(enabled);
  }

  isEnabled(): boolean { return this.enabled; }
  getConfig(): ThaanaKeyboardLayout { return this.thaana.getConfig(); }
  updateKeyMap(map: Record<string,string>): void { this.thaana.updateKeyMap(map); }
  destroy(): void { this.thaana.destroy(); }
  convertContentToThaana(editor: HTMLElement): void {
    const current = editor.textContent || ''; if (!current) return; const converted = this.thaana.convertToThaana(current); editor.textContent = converted;
  }
}
