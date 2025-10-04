export class ListManager {
  constructor(private editor: HTMLElement, private scheduleChange: () => void) {}

  insert(type: 'bullet'|'numbered'): void {
    const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) return; const range = sel.getRangeAt(0);
    const selectedText = sel.toString(); const marker = type === 'bullet' ? '- ' : this.nextNumber(range) + '. ';
    if (selectedText && selectedText.trim()) this.addBulletsToSelection(selectedText, marker, range, type); else this.addBulletAtCursor(marker, range);
    this.scheduleChange();
  }

  private addBulletsToSelection(selectedText: string, marker: string, range: Range, type: 'bullet'|'numbered') {
    const lines = selectedText.split('\n');
    let currentNumber = 1; if (type === 'numbered') { const m = marker.match(/^(\d+)\. /); if (m) currentNumber = parseInt(m[1]!,10); }
    const bulleted = lines.map((line,i) => { const t = line.trim(); if (!t) return ''; if (t.startsWith('- ') || /^\d+\. /.test(t)) return line; if (type==='numbered') return `${currentNumber + i}. ${t}`; return marker + t; }).join('\n');
    const textNode = document.createTextNode(bulleted); range.deleteContents(); range.insertNode(textNode); range.setStartAfter(textNode); range.collapse(true);
    const sel = window.getSelection(); if (sel) { sel.removeAllRanges(); sel.addRange(range);} }

  private addBulletAtCursor(marker: string, range: Range) {
    const bulletText = this.isAtLineStart(range) ? marker : `\n${marker}`; const tn = document.createTextNode(bulletText); range.insertNode(tn); range.setStartAfter(tn); range.collapse(true); const sel = window.getSelection(); if (sel){ sel.removeAllRanges(); sel.addRange(range);} }

  private nextNumber(range: Range): number {
    const content = this.editor.textContent || ''; const cursor = this.cursorPos(range); const lines = content.split('\n'); let idx=0; let count=0; for (let i=0;i<lines.length;i++){ if (count + lines[i].length >= cursor){ idx=i; break;} count += lines[i].length+1;} let last=0; for (let i=idx;i>=0;i--){ const line=lines[i].trim(); const m=line.match(/^(\d+)\. /); if (m){ last=parseInt(m[1]!,10); break;} if (line && !line.startsWith('-')) break;} return last+1; }

  private cursorPos(range: Range): number { const clone = range.cloneRange(); clone.selectNodeContents(this.editor); clone.setEnd(range.startContainer, range.startOffset); return clone.toString().length; }
  private isAtLineStart(range: Range): boolean { const c = range.startContainer; const o = range.startOffset; if (c.nodeType === Node.TEXT_NODE){ const t = c.textContent||''; if (o===0) return true; return t.charAt(o-1)==='\n'; } return o===0; }
}
