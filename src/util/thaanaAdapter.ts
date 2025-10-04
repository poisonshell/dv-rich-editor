import { ThaanaInput } from '../thaana/ThaanaInput';
import { ThaanaKeyboardLayout } from '../types';
import { EditorEvents } from '../types';
import { EventBus } from '../core/EventBus';

export interface ThaanaAdapterOptions {
  thaanaConfig?: ThaanaKeyboardLayout;
  bus: EventBus;
}

export class ThaanaAdapter {
  private input: ThaanaInput;
  private enabled = true;
  constructor(opts: ThaanaAdapterOptions) {
    const emitter = { emit: <K extends keyof EditorEvents>(e: K, p: EditorEvents[K]) => opts.bus.emit(e, p) };
    this.input = new ThaanaInput(opts.thaanaConfig, emitter as unknown as { emit: (e:string,p:unknown)=>void });
    this.enabled = opts.thaanaConfig?.enabled !== false;
  }
  initialize(el: HTMLElement){ this.input.initialize(el); }
  destroy(){ this.input.destroy(); }
  setEnabled(v:boolean){ this.enabled = v; this.input.setEnabled(v); }
  updateKeyMap(map: Record<string,string>){ this.input.updateKeyMap(map); }
  getConfig(): ThaanaKeyboardLayout { return this.input.getConfig(); }
  convertContentToThaana(text: string): string { return this.input.convertToThaana(text); }
  isEnabled(): boolean { return this.enabled; }
}
