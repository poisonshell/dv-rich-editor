export class SelectionManager {
  constructor(private root: HTMLElement) {}

  getSelection(): { start: number; end: number; text: string } {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { start: 0, end: 0, text: '' };
    const range = sel.getRangeAt(0);
    return { start: range.startOffset, end: range.endOffset, text: sel.toString() };
  }

  selectAll(): void {
    const range = document.createRange();
    range.selectNodeContents(this.root);
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  }

  selectCurrentWord(): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const text = node.textContent;
      let start = range.startOffset;
      let end = start;
      while (start > 0 && !/\s/.test(text[start - 1]!)) start--;
      while (end < text.length && !/\s/.test(text[end]!)) end++;
      const newRange = document.createRange();
      newRange.setStart(node, start); newRange.setEnd(node, end);
      sel.removeAllRanges(); sel.addRange(newRange);
    }
  }
}
