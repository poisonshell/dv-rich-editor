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
      // Helper sanitizers to ensure generated markdown is always valid
      const sanitizeAlt = (raw: string | undefined | null): string => {
        if (!raw) return '';
        return raw
          .replace(/\\/g, '\\\\')  // escape backslashes first
          .replace(/]/g, '\\]')        // escape closing bracket inside alt text
          .replace(/\n|\r/g, ' ')      // collapse newlines
          .trim();
      };
      const sanitizeTitle = (raw: string | undefined | null): string | undefined => {
        if (!raw) return undefined;
        const cleaned = raw
          .replace(/\\/g, '\\\\')  // escape backslashes
          .replace(/"/g, '\\"')      // escape quotes
          .replace(/\n|\r/g, ' ')      // remove line breaks
          .trim();
        return cleaned || undefined;
      };
      const deriveAltFromUrl = (url: string): string | undefined => {
        try {
          const clean = url.split(/[?#]/)[0];
          const file = clean.substring(clean.lastIndexOf('/') + 1);
          if (!file) return undefined;
          const base = file.replace(/\.[a-z0-9]+$/i, '') // strip extension
                           .replace(/[-_]+/g, ' ')       // dashes/underscores -> space
                           .trim();
          return base || undefined;
        } catch { return undefined; }
      };
      api = {
        insertImage(imageData: ImageData) {
          const altRaw = imageData.alt
            || config.image?.defaultAltText
            || deriveAltFromUrl(imageData.src)
            || '';
          const alt = sanitizeAlt(altRaw);
          const title = sanitizeTitle(imageData.title || (config.image as any)?.defaultTitle); // eslint-disable-line @typescript-eslint/no-explicit-any
          let markdownImage = `![${alt}](${imageData.src}`; // standard markdown image syntax
          if (title) markdownImage += ` "${title}"`;
          markdownImage += ')';
          if (!ctx.insertMarkdown) {
            throw new Error('insertMarkdown API required but not provided in plugin context');
          }
          // Use parsed insertion so the editor immediately renders an <img> element
          // (tests that stub insertMarkdown simply append text; they ignore the parse flag so remain valid)
          ctx.insertMarkdown(markdownImage, { parse: true });
        },
        async openImageDialog() {
          if (config.onImageUrlRequest) {
            try {
              const url = await config.onImageUrlRequest();
              if (url) api!.insertImage({ src: url, alt: config.image?.defaultAltText || deriveAltFromUrl(url) || '' });
              return;
            } catch (e) { console.error('Image URL request failed', e); }
          }
          const url = prompt('Photo URL:', 'https://');
          if (url && url.trim()) {
            const alt = prompt('Alt text:', 'alt');
            api!.insertImage({ src: url.trim(), alt: alt || deriveAltFromUrl(url) || '' });
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
