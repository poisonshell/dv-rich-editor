import { EditorPlugin } from './PluginTypes';
import { ImageData, EditorConfig } from '../../types';

export const IMAGE_PLUGIN_SYMBOL: unique symbol = Symbol('ImagePluginAPI');

export interface ImagePluginAPI {
  insertImage(data: ImageData): void;
  openImageDialog(): Promise<void>;
}

export interface ImagePluginOptions { config: EditorConfig; }

interface WithImageAPI extends HTMLElement { [IMAGE_PLUGIN_SYMBOL]?: ImagePluginAPI }

export function createImagePlugin(opts: ImagePluginOptions): EditorPlugin {
  let api: ImagePluginAPI | null = null;
  return {
    name: 'image-basic',
    init(ctx) {
      const { config } = opts;
      api = {
        insertImage(imageData: ImageData) {
          let markdownImage = `![${imageData.alt || config.image?.defaultAltText || ''}](${imageData.src}`;
          if (imageData.title) markdownImage += ` "${imageData.title}"`;
          markdownImage += ')';
          const protectedMarkdown = `\n${markdownImage}\n`;
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(protectedMarkdown));
            range.collapse(false);
          } else {
            ctx.editorRoot.appendChild(document.createTextNode(protectedMarkdown));
          }
          ctx.onChange();
        },
        async openImageDialog() {
          if (config.onImageUrlRequest) {
            try {
              const url = await config.onImageUrlRequest();
              if (url) api!.insertImage({ src: url, alt: config.image?.defaultAltText || 'ފޮޓޯ' });
              return;
            } catch (e) { console.error('Image URL request failed', e); }
          }
          const url = prompt('Photo URL:', 'https://');
          if (url && url.trim()) {
            const alt = prompt('Alt text:', 'alt');
            api!.insertImage({ src: url.trim(), alt: alt || 'photo' });
          }
        }
      };
  (ctx.editorRoot as WithImageAPI)[IMAGE_PLUGIN_SYMBOL] = api;
    },
    destroy() {
      if (api) {
        // cleanup
        api = null;
      }
    }
  };
}

export function getImagePluginAPI(root: HTMLElement): ImagePluginAPI | null {
  return (root as WithImageAPI)[IMAGE_PLUGIN_SYMBOL] || null;
}
