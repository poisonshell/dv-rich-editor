import { EditorPlugin, EditorPluginContext } from "./PluginTypes";

export const ListPlugin = ((): EditorPlugin => {
  let ctx: EditorPluginContext | null = null;
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  function handleEnter(e: KeyboardEvent): boolean {
    if (!ctx) return false;
    if (e.key !== "Enter") return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return false;

    let li: HTMLElement | null = null;
    if (
      range.startContainer instanceof HTMLElement &&
      range.startContainer.tagName.toLowerCase() === "li"
    ) {
      li = range.startContainer as HTMLElement;
    } else if (range.startContainer.nodeType === Node.TEXT_NODE) {
      li =
        range.startContainer.parentElement &&
        range.startContainer.parentElement.tagName.toLowerCase() === "li"
          ? (range.startContainer.parentElement as HTMLElement)
          : range.startContainer.parentElement;
    } else if ((range.startContainer as Node).parentElement) {
      li = (range.startContainer as Node).parentElement as HTMLElement;
    }
    while (li && li.tagName.toLowerCase() !== "li" && li !== ctx.editorRoot) {
      li = li.parentElement as HTMLElement | null;
    }
    if (!li || li.tagName.toLowerCase() !== "li") {
      const editor = ctx.editorRoot;
      const caret = range.cloneRange();
      const pre = caret.cloneRange();
      pre.selectNodeContents(editor);
      pre.setEnd(range.startContainer, range.startOffset);
      const beforeText = pre.toString();
      const after = caret.cloneRange();
      after.setStart(range.startContainer, range.startOffset);
      after.setEnd(editor, editor.childNodes.length);
      const afterText = after.toString();
      const lastNl = beforeText.lastIndexOf("\n");
      const nextNl = afterText.indexOf("\n");
      const lineStart = lastNl === -1 ? 0 : lastNl + 1;
      const lineEnd =
        nextNl === -1 ? beforeText.length + afterText.length : beforeText.length + nextNl;
      const full = beforeText + afterText;
      const line = full.slice(lineStart, lineEnd);
      const bulletMatch = /^-\s+/.test(line);
      const numMatch = /^(\d+)\.\s+/.exec(line);
      if (!bulletMatch && !numMatch) return false;
      e.preventDefault();
      const marker = bulletMatch
        ? "- "
        : `${numMatch ? parseInt(numMatch[1], 10) + 1 : 1}. `;

      const textNode = document.createTextNode(`\n${marker}`);
      range.insertNode(textNode);

      const r2 = document.createRange();
      r2.setStart(textNode, textNode.textContent!.length);
      r2.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r2);
      ctx.onChange();
      return true;
    }
    const listEl = li.parentElement;
    if (!listEl || !/^(ul|ol)$/i.test(listEl.tagName)) return false;
    const text = (li.textContent || "").replace(/\u200B/g, "").trim();
    const siblings = Array.from(listEl.children).filter(
      (c) => c.tagName.toLowerCase() === "li"
    );
    const idx = siblings.indexOf(li);
    const prev = idx > 0 ? (siblings[idx - 1] as HTMLElement) : null;
    const prevEmpty = !!(
      prev && (prev.textContent || "").replace(/\u200B/g, "").trim() === ""
    );
    if (text === "") {
      e.preventDefault();

      if (prevEmpty) {
        const prevLi = li.previousElementSibling as HTMLElement | null;
        li.remove();
        if (prevLi && (prevLi.textContent || "").replace(/\u200B/g, "").trim() === "")
          prevLi.remove();
        if (
          Array.from(listEl.children).filter((c) => c.tagName.toLowerCase() === "li")
            .length === 0
        ) {
          const nl = document.createTextNode("\n");
          listEl.replaceWith(nl);
          const r = document.createRange();
          r.setStart(nl, 1);
          r.collapse(true);
          sel.removeAllRanges();
          sel.addRange(r);
        } else {
          const nl = document.createTextNode("\n");
          if (listEl.nextSibling) listEl.parentNode?.insertBefore(nl, listEl.nextSibling);
          else listEl.parentNode?.appendChild(nl);
          const r = document.createRange();
          r.setStart(nl, 1);
          r.collapse(true);
          sel.removeAllRanges();
          sel.addRange(r);
        }
        ctx.onChange();
        return true;
      }

      const newLi = document.createElement("li");
      newLi.textContent = "\u200B";
      newLi.setAttribute("data-empty-li", "true");
      listEl.insertBefore(newLi, li.nextSibling);
      const r = document.createRange();
      r.selectNodeContents(newLi);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      ctx.onChange();
      return true;
    }

    e.preventDefault();
    const newLi = document.createElement("li");
    newLi.textContent = "\u200B";
    newLi.setAttribute("data-empty-li", "true");
    listEl.insertBefore(newLi, li.nextSibling);
    const r2 = document.createRange();
    r2.selectNodeContents(newLi);
    r2.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r2);
    ctx.onChange();
    return true;
  }

  function handleBackspace(e: KeyboardEvent): boolean {
    if (e.key !== "Backspace") return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return false;
    let li: HTMLElement | null =
      (range.startContainer as Node) instanceof HTMLElement &&
      (range.startContainer as HTMLElement).tagName.toLowerCase() === "li"
        ? (range.startContainer as HTMLElement)
        : (range.startContainer as Node).parentElement;
    while (li && li.tagName.toLowerCase() !== "li") li = li.parentElement;
    if (!li) return false;
    const listEl = li.parentElement;
    if (!listEl || !/^(ul|ol)$/i.test(listEl.tagName)) return false;
    const text = (li.textContent || "").replace(/\u200B/g, "");
    const isBullet = listEl.tagName.toLowerCase() === "ul";
    const onlyMarker = isBullet
      ? /^-\s?$/.test(text.trim())
      : /^(\d+)\.\s?$/.test(text.trim());
    const caretAtStart = (() => {
      const pre = document.createRange();
      pre.selectNodeContents(li);
      pre.setEnd(range.startContainer, range.startOffset);
      return pre.toString().length === 0;
    })();
    if (onlyMarker || text.trim() === "") {
      e.preventDefault();
      const siblings = Array.from(listEl.children).filter(
        (c) => c.tagName.toLowerCase() === "li"
      );
      const idx = siblings.indexOf(li);
      li.remove();
      if (siblings.length - 1 > 0) {
        const target =
          idx > 0 ? (siblings[idx - 1] as HTMLElement) : (siblings[1] as HTMLElement);
        if (target) {
          const r = document.createRange();
          r.selectNodeContents(target);
          r.collapse(false);
          sel.removeAllRanges();
          sel.addRange(r);
        }
      } else {
        const blank = document.createTextNode("\n");
        listEl.replaceWith(blank);
        const r = document.createRange();
        r.setStart(blank, 1);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      }
      ctx?.onChange();
      return true;
    }
    if (caretAtStart) {
      const siblings = Array.from(listEl.children).filter(
        (c) => c.tagName.toLowerCase() === "li"
      );
      const idx = siblings.indexOf(li);
      if (idx > 0) {
        e.preventDefault();
        const prev = siblings[idx - 1] as HTMLElement;
        const curContent = li.innerHTML;
        li.remove();
        prev.innerHTML = (
          prev.innerHTML +
          (prev.innerHTML.endsWith(" ") ? "" : " ") +
          curContent
        ).replace(/\u200B+/g, "\u200B");
        const r = document.createRange();
        r.selectNodeContents(prev);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
        ctx?.onChange();
        return true;
      }
    }
    return false;
  }

  return {
    name: "list-basic",
    init(context: EditorPluginContext) {
      ctx = context;
      keydownHandler = (e: KeyboardEvent) => {
        if (handleEnter(e)) {
          return;
        }
        if (handleBackspace(e)) {
          return;
        }
      };
      context.editorRoot.addEventListener("keydown", keydownHandler);
    },
    destroy() {
      if (ctx && keydownHandler)
        ctx.editorRoot.removeEventListener("keydown", keydownHandler);
      ctx = null;
      keydownHandler = null;
    },
  };
})();
