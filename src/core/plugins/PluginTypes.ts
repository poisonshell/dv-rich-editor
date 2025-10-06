export interface EditorPluginContext {
  editorRoot: HTMLElement;
  onChange: () => void;
  getMarkdown: () => string;
  insertMarkdown?: (markdown: string, options?: {
    parse?: boolean;
    sanitize?: boolean;
    schedule?: 'immediate' | 'debounced';
    collapseSelection?: 'after' | 'start';
    literal?: boolean;
  }) => void;
}

export interface EditorPlugin {
  name: string;
  init(ctx: EditorPluginContext): void;
  destroy?(): void;
}

export type PluginRegistry = Record<string, EditorPlugin>;
