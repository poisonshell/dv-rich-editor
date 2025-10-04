export interface RTLSupportHost {
  root: HTMLElement;
}

let currentRoot: HTMLElement | null = null;
let pointerDown = false;

export function installRTLSupport(host: RTLSupportHost): void {
  const el = host.root;
  currentRoot = el;
  el.addEventListener('mousedown', handleMouseDown);
  el.addEventListener('touchstart', handleMouseDown, { passive: true });
  el.addEventListener('selectstart', handleSelectStart, true);
  // Use document-level selectionchange so we catch selection changes reliably
  document.addEventListener('selectionchange', handleSelectionChange);
  el.addEventListener('dblclick', handleDoubleClick);
  document.addEventListener('mouseup', handlePointerUp);
  document.addEventListener('touchend', handlePointerUp);
}

export function uninstallRTLSupport(host: RTLSupportHost): void {
  const el = host.root;
  currentRoot = null;
  el.removeEventListener('mousedown', handleMouseDown);
  el.removeEventListener('touchstart', handleMouseDown as EventListener);
  el.removeEventListener('selectstart', handleSelectStart, true);
  document.removeEventListener('selectionchange', handleSelectionChange);
  el.removeEventListener('dblclick', handleDoubleClick);
  document.removeEventListener('mouseup', handlePointerUp);
  document.removeEventListener('touchend', handlePointerUp);
}

function handleMouseDown(e: MouseEvent | TouchEvent) {
  pointerDown = true;
  const target = (e.currentTarget || e.target) as HTMLElement;
  if ((e as any).target === target || ((e as any).target as Element)?.closest?.('.dv-rich-editor')) {
    try { target.style.cursor = 'text'; } catch {}
  }
}

function handleSelectStart(e: Event) { e.stopPropagation(); }

function handleSelectionChange() {
  // Don't interfere while the user is actively dragging/selecting.
  if (pointerDown) return;
  const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) return;
  setTimeout(()=>{ if (sel.rangeCount>0){ const r = sel.getRangeAt(0); 
      // Only normalize if the selection is within the current editor root
      if (currentRoot && (currentRoot.contains(r.startContainer as Node) || currentRoot.contains(r.endContainer as Node))) {
        normalizeSelection(r);
      }
    }
  },0);
}

function handleDoubleClick(e: MouseEvent) {
  e.preventDefault(); const sel = window.getSelection(); if (!sel) return;
  const range = document.createRange(); const tn = getTextNodeAtPoint(e.clientX, e.clientY);
  if (tn && tn.textContent) { const clickOffset = getOffsetInTextNode(tn, e.clientX, e.clientY); const wb = findRTLWordBounds(tn.textContent, clickOffset); range.setStart(tn, wb.start); range.setEnd(tn, wb.end); sel.removeAllRanges(); sel.addRange(range);} }

function handlePointerUp() {
  // Pointer up ends dragging — allow a tick then normalize if needed
  if (!pointerDown) return;
  pointerDown = false;
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (currentRoot && (currentRoot.contains(r.startContainer as Node) || currentRoot.contains(r.endContainer as Node))) {
      normalizeSelection(r);
    }
  }, 0);
}

function normalizeSelection(range: Range){ if (range.collapsed) return; const sel = window.getSelection(); if (!sel) return; sel.removeAllRanges(); sel.addRange(range); }

function getTextNodeAtPoint(x:number,y:number): Text | null {
  // legacy shims
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docAny = document as any;
  const caretRangeFromPoint: ((x:number,y:number)=>Range) | undefined = docAny.caretRangeFromPoint || docAny.caretPositionFromPoint;
  const range = caretRangeFromPoint ? caretRangeFromPoint(x,y) : null;
  if (range && range.startContainer?.nodeType === Node.TEXT_NODE) return range.startContainer as Text;
  return null;
}

function getOffsetInTextNode(tn: Text, x:number, y:number): number { const r = document.caretRangeFromPoint(x,y); if (r && r.startContainer === tn) return r.startOffset; return 0; }

export function findRTLWordBounds(text:string, offset:number): {start:number; end:number} {
  const sep = /[\s\u0020\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\u061C\u200E\u200F]/;
  let start = offset, end = offset; while (start>0 && !sep.test(text[start-1])) start--; while (end < text.length && !sep.test(text[end])) end++; return { start, end };
}
