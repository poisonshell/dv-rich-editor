import { MarkdownOptions } from '../types';

//Markdown Formatter
export class MarkdownFormatter {
  private config: MarkdownOptions;

  constructor(config?: MarkdownOptions) {
    this.config = {
      strict: false,
      allowHtml: false,
      lineBreak: 'soft',
      headingStyle: 'atx',
      listStyle: 'dash',
      ...config
    };
  }


  public htmlToMarkdown(html: string): string {
    // Create a temporary element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    return this.processNode(tempDiv);
  }


  public markdownToHtml(markdown: string): string {
    const lines = markdown.split('\n');
    let html = '';
    let inCodeBlock = false;
    let inList = false;
    let listType = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          html += '</code></pre>';
          inCodeBlock = false;
        } else {
          const language = trimmedLine.slice(3).trim();
          html += `<pre><code${language ? ` class="language-${language}"` : ''}>`;
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        html += this.escapeHtml(line) + '\n';
        continue;
      }

      // Headings
      if (trimmedLine.startsWith('#')) {
        const level = trimmedLine.match(/^#+/)?.[0].length || 1;
        const text = trimmedLine.slice(level).trim();
        html += `<h${level}>${this.processInlineFormatting(text)}</h${level}>`;
        continue;
      }

      // Lists
      const listMatch = trimmedLine.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        const [, indent, marker, content] = listMatch;
        const isOrdered = /^\d+\./.test(marker);
        const currentListType = isOrdered ? 'ol' : 'ul';
        
        if (!inList) {
          html += `<${currentListType}>`;
          inList = true;
          listType = currentListType;
        } else if (listType !== currentListType) {
          html += `</${listType}><${currentListType}>`;
          listType = currentListType;
        }
        
        html += `<li>${this.processInlineFormatting(content)}</li>`;
        continue;
      } else if (inList) {
        html += `</${listType}>`;
        inList = false;
        listType = '';
      }

      // Blockquotes
      if (trimmedLine.startsWith('>')) {
        const content = trimmedLine.slice(1).trim();
        html += `<blockquote>${this.processInlineFormatting(content)}</blockquote>`;
        continue;
      }

      // Regular paragraphs
      if (trimmedLine) {
        html += `<p>${this.processInlineFormatting(trimmedLine)}</p>`;
      } else {
        html += '<br>';
      }
    }

    // Close any open lists
    if (inList) {
      html += `</${listType}>`;
    }

    return html;
  }


  private processInlineFormatting(text: string): string {
    // Bold: **text** or __text__
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    text = text.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    text = text.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');

    // Inline code: `code`
    text = text.replace(/`([^`]+?)`/g, '<code>$1</code>');

    // Strikethrough: ~~text~~
    text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // Links: [text](url)
    text = text.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2">$1</a>');

    // Images: ![alt](url)
    text = text.replace(/!\[([^\]]*?)\]\(([^)]+?)\)/g, '<img src="$2" alt="$1">');

    return text;
  }


  private processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    let result = '';

    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        const level = parseInt(tagName.slice(1));
        const hashes = '#'.repeat(level);
        result = `${hashes} ${this.getTextContent(element)}\n\n`;
        break;

      case 'p':
        result = `${this.processChildNodes(element)}\n\n`;
        break;

      case 'strong':
      case 'b':
        result = `**${this.processChildNodes(element)}**`;
        break;

      case 'em':
      case 'i':
        result = `*${this.processChildNodes(element)}*`;
        break;

      case 'code':
        result = `\`${this.getTextContent(element)}\``;
        break;

      case 'del':
        result = `~~${this.processChildNodes(element)}~~`;
        break;

      case 'blockquote':
        result = `> ${this.processChildNodes(element)}\n\n`;
        break;

      case 'ul':
        result = this.processListItems(element, false);
        break;

      case 'ol':
        result = this.processListItems(element, true);
        break;

      case 'a':
        const href = element.getAttribute('href') || '';
        result = `[${this.getTextContent(element)}](${href})`;
        break;

      case 'img':
        const src = element.getAttribute('src') || '';
        const alt = element.getAttribute('alt') || '';
        result = `![${alt}](${src})`;
        break;

      case 'br':
        result = '\n';
        break;

      default:
        result = this.processChildNodes(element);
        break;
    }

    return result;
  }


  private processChildNodes(element: Element): string {
    let result = '';
    for (const child of Array.from(element.childNodes)) {
      result += this.processNode(child);
    }
    return result;
  }


  private processListItems(listElement: Element, ordered: boolean): string {
    let result = '';
    const items = Array.from(listElement.querySelectorAll(':scope > li'));
    
    items.forEach((item, index) => {
      const marker = ordered ? `${index + 1}.` : this.getListMarker();
      result += `${marker} ${this.getTextContent(item)}\n`;
    });
    
    return result + '\n';
  }


  private getListMarker(): string {
    switch (this.config.listStyle) {
      case 'asterisk': return '*';
      case 'plus': return '+';
      case 'dash':
      default: return '-';
    }
  }


  private getTextContent(element: Element): string {
    return element.textContent || '';
  }


  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }


  public updateConfig(newConfig: Partial<MarkdownOptions>): void {
    this.config = { ...this.config, ...newConfig };
  }


  public getConfig(): MarkdownOptions {
    return this.config;
  }
} 