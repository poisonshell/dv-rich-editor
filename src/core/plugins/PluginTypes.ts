export interface EditorPluginContext {
  editorRoot: HTMLElement;
  onChange: () => void;
  getMarkdown: () => string;
}

export interface EditorPlugin {
  name: string;
  init(ctx: EditorPluginContext): void;
  destroy?(): void;
}

export type PluginRegistry = Record<string, EditorPlugin>;
