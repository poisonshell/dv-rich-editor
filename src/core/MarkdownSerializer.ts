export interface MarkdownSerializerOptions { listStyle?: 'dash' | 'asterisk' | 'plus'; }
export class MarkdownSerializer {
  private opts: MarkdownSerializerOptions;
  constructor(opts?: MarkdownSerializerOptions) { this.opts = opts || {}; }
  getMarkdown(editor: HTMLElement): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editor.innerHTML;
    let markdown = this.processElementToMarkdown(tempDiv, false)
      .replace(/\u200B/g, '')
      .replace(/\uFEFF/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n');
    
    // Only trim trailing spaces from completely empty lines, preserve intentional spacing
    markdown = markdown.replace(/^[ \t]+$/gm, '');
    
    // Only trim the very start and end if they are truly empty lines
    markdown = markdown.replace(/^\n+/, '').replace(/\n+$/, '');
    
    markdown = markdown.replace(/^(?=-|\d+\.)$/gm, '$& ');
    return markdown;
  }
  private processElementToMarkdown(element: Element, inCode: boolean): string {
    let result = '';
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        result += inCode ? text : this.escapeMarkdownText(text);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element; const tagName = el.tagName.toLowerCase();
        switch (tagName) {
          case 'br': result += '\n'; break;
          case 'div': {
            const divContent = this.processElementToMarkdown(el, false);
            if (result && !result.endsWith('\n')) result += '\n';
            result += divContent; if (!result.endsWith('\n')) result += '\n'; break; }
          case 'p': {
            const pContent = this.processElementToMarkdown(el, false);
            if (result && !result.endsWith('\n')) result += '\n';
            result += pContent; if (!result.endsWith('\n')) result += '\n'; break; }
          case 'strong': case 'b': result += '**' + this.processElementToMarkdown(el, inCode) + '**'; break;
          case 'em': case 'i': result += '*' + this.processElementToMarkdown(el, inCode) + '*'; break;
          case 'u': result += '<u>' + this.processElementToMarkdown(el, inCode) + '</u>'; break;
          case 'strike': case 's': case 'del': result += '~~' + this.processElementToMarkdown(el, inCode) + '~~'; break;
          case 'code': result += '`' + this.processElementToMarkdown(el, true) + '`'; break;
          case 'pre': {
            const codeEl = el.querySelector('code'); let lang='';
            if (codeEl?.className) { const m=codeEl.className.match(/language-([a-z0-9_-]+)/i); if (m) lang=m[1]; }
            const content = codeEl? this.processElementToMarkdown(codeEl, true): this.processElementToMarkdown(el, true);
            result += '```'+lang+'\n'+content.replace(/\n+$/,'')+'\n```'; break; }
          case 'h1': result += '# ' + this.processElementToMarkdown(el, inCode) + '\n'; break;
          case 'h2': result += '## ' + this.processElementToMarkdown(el, inCode) + '\n'; break;
          case 'h3': result += '### ' + this.processElementToMarkdown(el, inCode) + '\n'; break;
          case 'h4': result += '#### ' + this.processElementToMarkdown(el, inCode) + '\n'; break;
          case 'h5': result += '##### ' + this.processElementToMarkdown(el, inCode) + '\n'; break;
          case 'h6': result += '###### ' + this.processElementToMarkdown(el, inCode) + '\n'; break;
          case 'blockquote': result += '> ' + this.processElementToMarkdown(el, inCode) + '\n'; break;
          case 'ul': result += this.processUnorderedList(el); break;
          case 'ol': result += this.processOrderedList(el); break;
          case 'li': result += this.processElementToMarkdown(el, inCode); break;
          case 'span': result += this.processElementToMarkdown(el, inCode); break;
          case 'a': {
            const href = el.getAttribute('href') || '';
            const text = this.processElementToMarkdown(el, inCode);
            result += `[${text}](${this.escapeLinkDestination(href)})`; break; }
          case 'img': {
            const src = el.getAttribute('src') || '';
            const alt = el.getAttribute('alt') || '';
            result += `![${this.escapeAltText(alt)}](${this.escapeLinkDestination(src)})`; break; }
          case 'table': result += this.processTable(el); break;
          default: result += this.processElementToMarkdown(el, inCode); break;
        }
      }
    }
    return result;
  }
  private processUnorderedList(element: Element): string {
    let result=''; const listItems=Array.from(element.children).filter(c=>c.tagName.toLowerCase()==='li');
    listItems.forEach(li=>{ const content=this.processElementToMarkdown(li,false).replace(/\u200B/g,''); const trimmed=content.trim(); result+= this.getBulletMarker()+ ' ' + trimmed + '\n'; });
    if (result && !result.endsWith('\n')) result+='\n'; return result; }
  private processOrderedList(element: Element): string {
    let result=''; const listItems=Array.from(element.children).filter(c=>c.tagName.toLowerCase()==='li');
    listItems.forEach((li,index)=>{ const content=this.processElementToMarkdown(li,false).replace(/\u200B/g,''); const trimmed=content.trim(); result+= `${index+1}. ${trimmed}\n`; });
    if (result && !result.endsWith('\n')) result+='\n'; return result; }
  private getBulletMarker(): string { switch (this.opts.listStyle){ case 'asterisk': return '*'; case 'plus': return '+'; case 'dash': default: return '-'; } }
  private escapeMarkdownText(text: string): string {
  const pattern = /(?<!\\)([`*_~(){}>])/g; // intentionally exclude [] to keep existing markdown images/links intact
    let out = text.replace(pattern, '\\$1');
    out = out.replace(/^(?=[>#])/gm, '\\'); // Escape leading blockquote or heading markers.
    return out;
  }
  private escapeLinkDestination(dest: string): string { return dest.replace(/\s/g,'%20').replace(/\)/g,'%29'); }
  private escapeAltText(alt: string): string { return alt.replace(/]/g,'%5D'); }
  private processTable(tableEl: Element): string { const rows=Array.from(tableEl.querySelectorAll('tr')); if(!rows.length) return ''; const headerCells=Array.from(rows[0].querySelectorAll('th,td')); const headers=headerCells.map(c=>this.escapeMarkdownText(c.textContent||'').trim()||' '); const separator=headers.map(()=> '---'); const bodyRows=rows.slice(1).map(r=>Array.from(r.querySelectorAll('td,th')).map(c=>this.escapeMarkdownText(c.textContent||'').trim())).map(cols=>`| ${cols.join(' | ')} |`).join('\n'); const headerLine=`| ${headers.join(' | ')} |`; const sepLine=`| ${separator.join(' | ')} |`; return headerLine+'\n'+sepLine+(bodyRows? '\n'+bodyRows:'')+'\n\n'; }
}
