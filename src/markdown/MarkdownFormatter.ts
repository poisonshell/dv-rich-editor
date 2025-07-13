import { MarkdownOptions } from '../types';

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
    console.log('🔧 MarkdownFormatter: Converting markdown to HTML');
    console.log('Input markdown:', markdown);


    const normalizedMarkdown = markdown.normalize('NFC');
    const lines = normalizedMarkdown.split('\n');
    
    let html = '';
    let inCodeBlock = false;
    let inList = false;
    let listType = '';
    let codeBlockContent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      console.log(`Processing line ${i}: "${line}" (trimmed: "${trimmedLine}")`);


      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          // Close code block
          html += this.escapeHtml(codeBlockContent) + '</code></pre>';
          inCodeBlock = false;
          codeBlockContent = '';
        } else {
          // Open code block
          const language = trimmedLine.slice(3).trim();
          html += `<pre><code${language ? ` class="language-${language}"` : ''}>`;
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent += line + '\n';
        continue;
      }

      // Close any open list if we encounter non-list content
      if (inList && !this.isListItem(trimmedLine) && trimmedLine !== '') {
        html += `</${listType}>`;
        inList = false;
        listType = '';
        console.log('Closed list due to non-list content');
      }


      const listMatch = this.detectListItem(trimmedLine);
      if (listMatch) {
        const { isOrdered, content } = listMatch;
        const currentListType = isOrdered ? 'ol' : 'ul';
        
        console.log(`Found list item: ordered=${isOrdered}, content="${content}"`);
        
        if (!inList) {
          html += `<${currentListType}>`;
          inList = true;
          listType = currentListType;
          console.log(`Started new ${currentListType} list`);
        } else if (listType !== currentListType) {
          // Switch list type
          html += `</${listType}><${currentListType}>`;
          listType = currentListType;
          console.log(`Switched to ${currentListType} list`);
        }
        
        html += `<li>${this.processInlineFormatting(content)}</li>`;
        continue;
      }

      // Headings
      if (trimmedLine.startsWith('#')) {
        const level = this.getHeadingLevel(trimmedLine);
        const text = trimmedLine.slice(level).trim();
        html += `<h${level}>${this.processInlineFormatting(text)}</h${level}>`;
        continue;
      }

      // Blockquotes
      if (trimmedLine.startsWith('>')) {
        const content = trimmedLine.slice(1).trim();
        html += `<blockquote>${this.processInlineFormatting(content)}</blockquote>`;
        continue;
      }

      // Horizontal rules
      if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
        html += '<hr>';
        continue;
      }

      // Regular paragraphs
      if (trimmedLine) {
        html += `<p>${this.processInlineFormatting(trimmedLine)}</p>`;
      } else {
        html += '<br>';
      }
    }
    if (inList) {
      html += `</${listType}>`;
      console.log(`Closed ${listType} list at end of content`);
    }

    console.log('Final HTML output:', html);
    return html;
  }


  private detectListItem(line: string): { isOrdered: boolean; content: string } | null {
    // More robust regex patterns
    const numberedPattern = /^(\s*)(\d+)\.\s+(.+)$/;
    const bulletPattern = /^(\s*)([-*+])\s+(.+)$/;

    // Check for numbered lists first
    const numberedMatch = line.match(numberedPattern);
    if (numberedMatch) {
      console.log('Matched numbered list:', numberedMatch);
      return {
        isOrdered: true,
        content: numberedMatch[3].trim()
      };
    }

    // Check for bullet lists
    const bulletMatch = line.match(bulletPattern);
    if (bulletMatch) {
      console.log('Matched bullet list:', bulletMatch);
      return {
        isOrdered: false,
        content: bulletMatch[3].trim()
      };
    }

    return null;
  }

  
  private isListItem(line: string): boolean {
    return this.detectListItem(line) !== null;
  }


  private getHeadingLevel(line: string): number {
    const match = line.match(/^#+/);
    return Math.min(match ? match[0].length : 1, 6);
  }

  private processInlineFormatting(text: string): string {
    let result = text;


    // Bold: **text** or __text__ (but not when inside other formatting)
    result = result.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__([^_]+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_ (but not when inside bold)
    result = result.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    result = result.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');

    // Strikethrough: ~~text~~
    result = result.replace(/~~([^~]+?)~~/g, '<del>$1</del>');

    // Inline code: `code` (process before links to avoid conflicts)
    result = result.replace(/`([^`]+?)`/g, '<code>$1</code>');

    // Images: ![alt](url) (process before links)
    result = result.replace(/!\[([^\]]*?)\]\(([^)]+?)\)/g, '<img src="$2" alt="$1">');

    // Links: [text](url)
    result = result.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2">$1</a>');

    return result;
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
      case 's':
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

      case 'li':
        // Handle individual list items
        result = this.processChildNodes(element);
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

      case 'hr':
        result = '\n---\n';
        break;

      case 'pre':
        const codeElement = element.querySelector('code');
        if (codeElement) {
          const language = codeElement.className.match(/language-(\w+)/)?.[1] || '';
          result = `\n\`\`\`${language}\n${this.getTextContent(codeElement)}\n\`\`\`\n`;
        } else {
          result = `\n\`\`\`\n${this.getTextContent(element)}\n\`\`\`\n`;
        }
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
      const content = this.processChildNodes(item);
      result += `${marker} ${content}\n`;
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