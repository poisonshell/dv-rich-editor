export interface MarkdownSerializerOptions { listStyle?: 'dash' | 'asterisk' | 'plus'; }
export class MarkdownSerializer {
  private opts: MarkdownSerializerOptions;
  constructor(opts?: MarkdownSerializerOptions) { this.opts = opts || {}; }
  getMarkdown(editor: HTMLElement): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editor.innerHTML;
    // Normalize nested duplicate inline formatting (e.g., <strong><strong>t</strong></strong>)
    this.flattenInlineDuplicates(tempDiv);
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
    // Drop lines that are only bidi / zero-width markers (phantom paragraphs created by caret placeholders)
    markdown = markdown.replace(/^(?:[\u200F\u200E\u200B]+)$/gm, '');
    // Collapse any accidental triple newlines after removal
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    // Repair cases where a closing ** ended up isolated on its own line (possibly followed by RLM/ZWS)
    markdown = this.repairIsolatedInlineClosers(markdown);
    return markdown;
  }
  private repairIsolatedInlineClosers(md: string): string {
    const lines = md.split('\n');
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const stripped = raw.replace(/[\u200B\u200F]+/g, '');
      if (/^\*\*$/.test(stripped)) {
        // Append the ** to the previous non-empty line if it does not already end with **
        for (let j = out.length - 1; j >= 0; j--) {
          if (out[j].length === 0) continue; // skip blank lines
          if (/\*\*$/.test(out[j].replace(/[\u200B\u200F]+/g, ''))) {
            // Already closed; keep this line (rare nested) but continue
            out.push(raw); // retain as-is
          } else {
            out[j] = out[j] + '**';
          }
          break;
        }
        // Do not add this line separately if merged
        if (out[out.length - 1] !== raw) continue;
      } else {
        out.push(raw);
      }
    }
    return out.join('\n');
  }
  private flattenInlineDuplicates(root: HTMLElement): void {
    const groups: string[][] = [
      ['strong','b'],
      ['em','i'],
      ['u'],
      ['s','strike','del'],
      ['code']
    ];
    const sameGroup = (a: string, b: string) => {
      a = a.toLowerCase(); b = b.toLowerCase();
      return groups.some(g => g.includes(a) && g.includes(b));
    };
    groups.forEach(group => {
      root.querySelectorAll(group.join(',')).forEach(el => {
        // Skip inline code inside code block
        if (group[0] === 'code' && el.closest('pre')) return;
        let child = el.firstElementChild;
        while (child) {
          const next = child.nextElementSibling;
          if (sameGroup(el.tagName, child.tagName)) {
            while (child.firstChild) el.insertBefore(child.firstChild, child);
            child.remove();
          }
          child = next;
        }
      });
    });
    // Remove empty wrappers
    const allSelectors = groups.flat().join(',');
    root.querySelectorAll(allSelectors).forEach(el => {
      const txt = (el.textContent || '').replace(/[\s\u200B\u200F]/g,'');
      if (!txt) el.remove();
    });
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
          case 'strong': case 'b': {
            let inner = this.processElementToMarkdown(el, inCode);
            // Move boundary newlines (optionally preceded/followed only by zero-width or bidi marks) outside markers.
            let leading = '';
            let trailing = '';
            const boundaryPatternLeading = /^(?:[\u200B\u200F\u200E]*\n)+/;
            const boundaryPatternTrailing = /(?:\n[\u200B\u200F\u200E]*)+$/;
            const mL = inner.match(boundaryPatternLeading);
            if (mL) { leading = mL[0]; inner = inner.slice(leading.length); }
            const mT = inner.match(boundaryPatternTrailing);
            if (mT) { trailing = mT[0]; inner = inner.slice(0, -trailing.length); }
            // If leading newline(s) occur at the very start of the current accumulation (result empty or ends with a newline),
            // treat them as incidental (artifact of selection) and suppress them to avoid producing an empty markdown line.
            const prefix = (leading && (result === '' || /\n$/.test(result))) ? '' : leading;
            result += prefix + '**' + inner + '**' + trailing; break; }
          case 'em': case 'i': {
            let inner = this.processElementToMarkdown(el, inCode);
            let leading = '';
            let trailing = '';
            const boundaryPatternLeading = /^(?:[\u200B\u200F\u200E]*\n)+/;
            const boundaryPatternTrailing = /(?:\n[\u200B\u200F\u200E]*)+$/;
            const mL = inner.match(boundaryPatternLeading);
            if (mL) { leading = mL[0]; inner = inner.slice(leading.length); }
            const mT = inner.match(boundaryPatternTrailing);
            if (mT) { trailing = mT[0]; inner = inner.slice(0, -trailing.length); }
            const prefix = (leading && (result === '' || /\n$/.test(result))) ? '' : leading;
            result += prefix + '*' + inner + '*' + trailing; break; }
          case 'u': {
            let inner = this.processElementToMarkdown(el, inCode);
            let leading = '';
            let trailing = '';
            const boundaryPatternLeading = /^(?:[\u200B\u200F\u200E]*\n)+/;
            const boundaryPatternTrailing = /(?:\n[\u200B\u200F\u200E]*)+$/;
            const mL = inner.match(boundaryPatternLeading);
            if (mL) { leading = mL[0]; inner = inner.slice(leading.length); }
            const mT = inner.match(boundaryPatternTrailing);
            if (mT) { trailing = mT[0]; inner = inner.slice(0, -trailing.length); }
            const prefix = (leading && (result === '' || /\n$/.test(result))) ? '' : leading;
            result += prefix + '<u>' + inner + '</u>' + trailing; break; }
          case 'strike': case 's': case 'del': {
            let inner = this.processElementToMarkdown(el, inCode);
            let leading = '';
            let trailing = '';
            const boundaryPatternLeading = /^(?:[\u200B\u200F\u200E]*\n)+/;
            const boundaryPatternTrailing = /(?:\n[\u200B\u200F\u200E]*)+$/;
            const mL = inner.match(boundaryPatternLeading);
            if (mL) { leading = mL[0]; inner = inner.slice(leading.length); }
            const mT = inner.match(boundaryPatternTrailing);
            if (mT) { trailing = mT[0]; inner = inner.slice(0, -trailing.length); }
            const prefix = (leading && (result === '' || /\n$/.test(result))) ? '' : leading;
            result += prefix + '~~' + inner + '~~' + trailing; break; }
          case 'code': {
            let inner = this.processElementToMarkdown(el, true);
            const boundaryPatternLeading = /^(?:[\u200B\u200F\u200E]*\n)+/;
            const boundaryPatternTrailing = /(?:\n[\u200B\u200F\u200E]*)+$/;
            let leading = '';
            let trailing = '';
            const mL = inner.match(boundaryPatternLeading);
            if (mL) { leading = mL[0]; inner = inner.slice(leading.length); }
            const mT = inner.match(boundaryPatternTrailing);
            if (mT) { trailing = mT[0]; inner = inner.slice(0, -trailing.length); }
            const prefix = (leading && (result === '' || /\n$/.test(result))) ? '' : leading;
            result += prefix + '`' + inner + '`' + trailing; break; }
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
    // NOTE: We intentionally removed parentheses () from the escapable set because
    // escaping them was corrupting already-valid image/link markdown tokens like
    // ![alt](url) by turning them into ![alt]\(url\). If later we need selective
    // escaping, we can implement a token-protection pass instead of globally escaping.
    const pattern = /(?<!\\)([`*_~{}>])/g; // exclude (), [] so image/link syntax stays intact
    let out = text.replace(pattern, '\\$1');
    out = out.replace(/^(?=[>#])/gm, '\\'); // Escape leading blockquote or heading markers.
    return out;
  }
  private escapeLinkDestination(dest: string): string { return dest.replace(/\s/g,'%20').replace(/\)/g,'%29'); }
  private escapeAltText(alt: string): string { return alt.replace(/]/g,'%5D'); }
  private processTable(tableEl: Element): string { const rows=Array.from(tableEl.querySelectorAll('tr')); if(!rows.length) return ''; const headerCells=Array.from(rows[0].querySelectorAll('th,td')); const headers=headerCells.map(c=>this.escapeMarkdownText(c.textContent||'').trim()||' '); const separator=headers.map(()=> '---'); const bodyRows=rows.slice(1).map(r=>Array.from(r.querySelectorAll('td,th')).map(c=>this.escapeMarkdownText(c.textContent||'').trim())).map(cols=>`| ${cols.join(' | ')} |`).join('\n'); const headerLine=`| ${headers.join(' | ')} |`; const sepLine=`| ${separator.join(' | ')} |`; return headerLine+'\n'+sepLine+(bodyRows? '\n'+bodyRows:'')+'\n\n'; }
}
