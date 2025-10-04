
export function isMarkdownSyntaxFragment(text: string): boolean {
  const patterns = [ /\*\*$/, /\*$/, /~~$/, /#+ $/, /!\[.*\]\(.*\)$/, /\[.*\]\(.*\)$/ ];
  return patterns.some(p => p.test(text));
}

export function textBeforeCursor(range: Range): string {
  const node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').substring(0, range.startOffset);
  return '';
}

export function protectBackspace(range: Range): void {
  if (range.startOffset > 0) {
    range.setStart(range.startContainer, range.startOffset - 1);
    range.collapse(true);
  }
}
