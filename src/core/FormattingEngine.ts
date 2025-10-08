import { FormatType } from "../types";

export interface FormattingEngineDeps {
  editor: HTMLElement;
  scheduleChange: () => void;
}

export class FormattingEngine {
  constructor(private deps: FormattingEngineDeps) {}

  applyFormat(format: FormatType): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const selectedText = sel.toString();
    const allowEmpty = [
      "bullet-list",
      "numbered-list",
      "image",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "code-block",
    ];
    if (!selectedText && !allowEmpty.includes(format)) return;
    switch (format) {
      case "bold":
      case "italic":
      case "underline":
      case "strikethrough":
        if (!selectedText) return;
        this.inline(format, selectedText);
        break;
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        this.applyHeading(format);
        break;
      case "blockquote":
        this.blockquote();
        break;
      case "code":
        if (!selectedText) return;
        this.inlineCode(selectedText);
        break;
      case "code-block":
        this.codeBlock();
        break;
      case "bullet-list":
        this.insertListItem("bullet");
        break;
      case "numbered-list":
        this.insertListItem("numbered");
        break;
    }
  }

  toggleBold(): void {
    this.toggleInlineFormat("bold", ["strong", "b"]);
  }
  toggleItalic(): void {
    this.toggleInlineFormat("italic", ["em", "i"]);
  }
  toggleUnderline(): void {
    this.toggleInlineFormat("underline", ["u"]);
  }
  toggleStrikethrough(): void {
    this.toggleInlineFormat("strikethrough", ["s", "strike", "del"]);
  }
  toggleCode(): void {
    this.toggleInlineFormat("code", ["code"], { disallowInPre: true });
  }
  toggleCodeBlock(): void {
    this.applyFormat("code-block");
  }
  toggleBlockquote(): void {
    this.applyFormat("blockquote");
  }
  setHeading(level: 1 | 2 | 3 | 4 | 5 | 6): void {
    this.applyFormat(("h" + level) as FormatType);
  }
  insertBulletList(): void {
    this.insertListItem("bullet");
  }
  insertNumberedList(): void {
    this.insertListItem("numbered");
  }

  private toggleInlineFormat(
    fmt: Exclude<
      FormatType,
      | "h1"
      | "h2"
      | "h3"
      | "h4"
      | "h5"
      | "h6"
      | "blockquote"
      | "code-block"
      | "bullet-list"
      | "numbered-list"
      | "image"
    >,
    tags: string[],
    opts?: { disallowInPre?: boolean }
  ): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    let didPartialUnwrap = false;
    const affectedParents: Set<Node> = new Set();
    if (range.collapsed) {
      let node: Node | null = range.startContainer;
      const isTargetEl = (el: Element): boolean => {
        const tag = el.tagName.toLowerCase();
        if (!tags.includes(tag)) return false;
        if (opts?.disallowInPre && el.closest("pre")) return false;
        return true;
      };
      while (node && node !== this.deps.editor) {
        if (node.nodeType === Node.ELEMENT_NODE && isTargetEl(node as Element)) {
          const unwrapElement = (el: HTMLElement) => {
            const parent = el.parentNode;
            if (!parent) return;
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            el.remove();
            this.deps.editor.normalize();
          };
          unwrapElement(node as HTMLElement);
          this.deps.scheduleChange();
          return;
        }
        node = node.parentNode;
      }

      const tryBoundaryUnwrap = () => {
        const container = range.startContainer;
        const offset = range.startOffset;

        if (container.nodeType === Node.TEXT_NODE) {
          const text = container as Text;

          if (offset > 0) {
          } else {
            const parent = text.parentNode;
            if (parent) {
              let prev: Node | null = text.previousSibling;
              while (
                prev &&
                prev.nodeType === Node.TEXT_NODE &&
                /^[\s\u200B\u200F]*$/.test(prev.textContent || "")
              )
                prev = prev.previousSibling;
              if (
                prev &&
                prev.nodeType === Node.ELEMENT_NODE &&
                isTargetEl(prev as Element)
              ) {
                const el = prev as HTMLElement;

                while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
                el.remove();
                this.deps.editor.normalize();
                this.deps.scheduleChange();
                return true;
              }
            }
          }
        } else if (container.nodeType === Node.ELEMENT_NODE) {
          const elContainer = container as Element;
          if (offset > 0) {
            const prev = elContainer.childNodes[offset - 1];
            if (
              prev &&
              prev.nodeType === Node.ELEMENT_NODE &&
              isTargetEl(prev as Element)
            ) {
              const el = prev as HTMLElement;
              while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
              el.remove();
              this.deps.editor.normalize();
              this.deps.scheduleChange();
              return true;
            }
          }
        }
        return false;
      };
      if (tryBoundaryUnwrap()) return;

      const tagFor: Record<string, string> = {
        bold: "strong",
        italic: "em",
        underline: "u",
        strikethrough: "s",
        code: "code",
      };
      const tag = tagFor[fmt] || "span";
      if (fmt === "code" && opts?.disallowInPre) {
        const inPre = (
          range.startContainer instanceof Element
            ? range.startContainer
            : range.startContainer.parentElement
        )?.closest("pre");
        if (inPre) return;
      }
      const el = document.createElement(tag);
      const placeholder = document.createTextNode("\u200B");
      el.appendChild(placeholder);
      range.insertNode(el);

      const sel2 = window.getSelection();
      if (sel2) {
        const r = document.createRange();
        r.setStart(placeholder, 0);
        r.collapse(true);
        sel2.removeAllRanges();
        sel2.addRange(r);
      }
      this.deps.editor.normalize();
      this.deps.scheduleChange();
      return;
    }

    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(this.deps.editor, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        if (!range.intersectsNode(n)) return NodeFilter.FILTER_REJECT;
        const data = (n as Text).data;
        if (/^[\s\u200B\u200F]*$/.test(data)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
    if (textNodes.length === 0) return;

    const nodeHasFormat = (tn: Text): boolean => {
      let cur: Node | null = tn;
      while (cur && cur !== this.deps.editor) {
        if (cur.nodeType === Node.ELEMENT_NODE) {
          const tag = (cur as Element).tagName.toLowerCase();
          if (tags.includes(tag)) {
            if (opts?.disallowInPre && (cur as Element).closest("pre")) return false;
            return true;
          }
        }
        cur = cur.parentNode;
      }
      return false;
    };
    const allHave = textNodes.every(nodeHasFormat);
    if (!allHave) {
      const selText = sel.toString();
      let multiLine = selText.includes("\n");
      if (!multiLine) {
        const blockParents = new Set<Element>();
        const isBlockTag = (tag: string) =>
          [
            "p",
            "div",
            "blockquote",
            "pre",
            "li",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
          ].includes(tag);
        textNodes.forEach((tn) => {
          let cur: Node | null = tn.parentNode;
          while (cur && cur !== this.deps.editor) {
            if (cur.nodeType === Node.ELEMENT_NODE) {
              const tag = (cur as Element).tagName.toLowerCase();
              if (isBlockTag(tag)) {
                blockParents.add(cur as Element);
                break;
              }
            }
            cur = cur.parentNode;
          }
        });
        if (blockParents.size > 1) multiLine = true;
      }
      if (multiLine) {
        this.applyInlineMultiLine(fmt, tags, range, textNodes, opts);
        return;
      }

      this.applyFormat(fmt);
      return;
    }

    {
      const blockParents = new Set<Element>();
      const isBlockTag = (tag: string) =>
        [
          "p",
          "div",
          "blockquote",
          "pre",
          "li",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
        ].includes(tag);
      textNodes.forEach((tn) => {
        let cur: Node | null = tn.parentNode;
        while (cur && cur !== this.deps.editor) {
          if (cur.nodeType === Node.ELEMENT_NODE) {
            const tag = (cur as Element).tagName.toLowerCase();
            if (isBlockTag(tag)) {
              blockParents.add(cur as Element);
              break;
            }
          }
          cur = cur.parentNode;
        }
      });
      if (blockParents.size > 1) {
        const blocks = Array.from(blockParents).sort((a, b) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
        );
        const unwrapEl = (el: HTMLElement) => {
          while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
          el.remove();
        };
        blocks.forEach((block) => {
          tags.forEach((t) => {
            block.querySelectorAll(t).forEach((node) => unwrapEl(node as HTMLElement));
          });
        });
        this.deps.editor.normalize();

        const sel2 = window.getSelection();
        if (sel2) {
          const newRange = document.createRange();
          newRange.setStart(blocks[0], 0);
          newRange.setEnd(
            blocks[blocks.length - 1],
            blocks[blocks.length - 1].childNodes.length
          );
          sel2.removeAllRanges();
          sel2.addRange(newRange);
        }
        this.deps.scheduleChange();
        return;
      }

      const findBlockAncestor = (n: Node): Element | null => {
        let cur: Node | null = n;
        while (cur && cur !== this.deps.editor) {
          if (cur.nodeType === Node.ELEMENT_NODE) {
            const tag = (cur as Element).tagName.toLowerCase();
            if (isBlockTag(tag)) return cur as Element;
          }
          cur = cur.parentNode;
        }
        return null;
      };
      const startBlock = findBlockAncestor(range.startContainer);
      const endBlock = findBlockAncestor(range.endContainer);
      if (startBlock && endBlock && startBlock !== endBlock) {
        const blocks = [startBlock, endBlock];
        const unwrapEl = (el: HTMLElement) => {
          while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
          el.remove();
        };
        blocks.forEach((block) => {
          tags.forEach((t) => {
            block.querySelectorAll(t).forEach((node) => unwrapEl(node as HTMLElement));
          });
        });
        this.deps.editor.normalize();
        this.deps.scheduleChange();
        return;
      }
    }

    if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
      const parent = range.startContainer.parentElement;
      if (parent && tags.includes(parent.tagName.toLowerCase())) {
        const newStart = document.createRange();
        newStart.selectNode(parent);
        range.setStartBefore(parent);
      }
    }
    if (range.endContainer.nodeType === Node.TEXT_NODE) {
      const txt = range.endContainer as Text;
      if (range.endOffset === txt.data.length) {
        const parent = txt.parentElement;
        if (parent && tags.includes(parent.tagName.toLowerCase())) {
          range.setEndAfter(parent);
        }
      }
    }
    const unwrapElement = (el: HTMLElement) => {
      while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
      el.remove();
    };

    const formattedEls = Array.from(
      this.deps.editor.querySelectorAll(tags.join(","))
    ) as HTMLElement[];
    let anyFullUnwrap = false;
    formattedEls.forEach((el) => {
      if (opts?.disallowInPre && el.closest("pre")) return;
      const elRange = document.createRange();
      elRange.selectNodeContents(el);
      const startsAfterOrAt =
        range.compareBoundaryPoints(Range.START_TO_START, elRange) <= 0;
      const endsBeforeOrAt = range.compareBoundaryPoints(Range.END_TO_END, elRange) >= 0;
      if (startsAfterOrAt && endsBeforeOrAt) {
        unwrapElement(el);
        anyFullUnwrap = true;
      }
    });

    if (!anyFullUnwrap) {
      const frag = range.extractContents();
      const rebuild = document.createDocumentFragment();
      const strip = (node: Node): void => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = (node as Element).tagName.toLowerCase();
          if (tags.includes(tag)) {
            node.childNodes.forEach((ch) => strip(ch));
            return;
          }

          const clone = node.cloneNode(false);
          rebuildStack[rebuildStack.length - 1].appendChild(clone);
          rebuildStack.push(clone as Element);
          node.childNodes.forEach((ch) => strip(ch));
          rebuildStack.pop();
          return;
        }

        rebuildStack[rebuildStack.length - 1].appendChild(node);
      };

      const rootContainer = document.createElement("span");
      const rebuildStack: Element[] = [rootContainer];
      frag.childNodes.forEach((ch) => strip(ch));
      const insertedNodes: Node[] = [];
      while (rootContainer.firstChild) {
        const n = rootContainer.firstChild;
        insertedNodes.push(n);
        rebuild.appendChild(n);
      }
      range.insertNode(rebuild);

      const firstInserted = insertedNodes[0];
      if (firstInserted && firstInserted.parentNode) {
        let ancestor: Node | null = firstInserted.parentNode;
        const isFmt = (el: Element) => tags.includes(el.tagName.toLowerCase());
        while (
          ancestor &&
          ancestor !== this.deps.editor &&
          ancestor.nodeType === Node.ELEMENT_NODE &&
          !isFmt(ancestor as Element)
        ) {
          ancestor = ancestor.parentNode;
        }
        if (
          ancestor &&
          ancestor !== this.deps.editor &&
          ancestor.nodeType === Node.ELEMENT_NODE &&
          isFmt(ancestor as Element)
        ) {
          const formatEl = ancestor as HTMLElement;

          const lastInserted = insertedNodes[insertedNodes.length - 1];
          const allChildren = Array.from(formatEl.childNodes);
          const lastIdx = allChildren.indexOf(lastInserted as ChildNode);
          const suffixNodes = allChildren.slice(lastIdx + 1);
          const parent = formatEl.parentNode;
          if (parent) {
            let suffixWrapper: HTMLElement | null = null;
            if (suffixNodes.length > 0) {
              suffixWrapper = document.createElement(formatEl.tagName.toLowerCase());
              suffixNodes.forEach((sn) => suffixWrapper!.appendChild(sn));
            }

            const refAfter = formatEl.nextSibling;
            insertedNodes.forEach((n) => parent.insertBefore(n, refAfter));

            if (!formatEl.firstChild) {
              parent.removeChild(formatEl);
            }

            if (suffixWrapper) {
              parent.insertBefore(suffixWrapper, refAfter);
            }
            affectedParents.add(parent);
            if (suffixWrapper) affectedParents.add(suffixWrapper);
          }
        }
      }

      const sel2 = window.getSelection();
      if (sel2) {
        const caretNode = insertedNodes[insertedNodes.length - 1];
        if (caretNode) {
          sel2.removeAllRanges();
          const endRange = document.createRange();
          if (caretNode.nodeType === Node.TEXT_NODE) {
            endRange.setStart(caretNode, (caretNode as Text).data.length);
            endRange.collapse(true);
          } else {
            endRange.selectNodeContents(caretNode);
            endRange.collapse(false);
          }
          sel2.addRange(endRange);
        }
      }
      didPartialUnwrap = true;
    }

    this.flattenDuplicateInline();
    if (didPartialUnwrap && affectedParents.size) {
      affectedParents.forEach((p) => this.mergeAdjacentTextNodes(p));
    } else {
      this.deps.editor.normalize();
    }
    this.deps.scheduleChange();
  }

  private applyInlineMultiLine(
    fmt: string,
    tags: string[],
    range: Range,
    textNodes: Text[],
    opts?: { disallowInPre?: boolean }
  ) {
    if (!textNodes.length) return;
    const tagFor: Record<string, string> = {
      bold: "strong",
      italic: "em",
      underline: "u",
      strikethrough: "s",
      code: "code",
    };
    const targetTag = tagFor[fmt] || "span";

    const startNode = range.startContainer;
    const endNode = range.endContainer;
    if (startNode.nodeType === Node.TEXT_NODE) {
      const tn = startNode as Text;
      if (range.startOffset > 0 && range.startOffset < tn.data.length) {
        tn.splitText(range.startOffset);
      }
    }
    if (endNode.nodeType === Node.TEXT_NODE) {
      const tn = endNode as Text;
      if (range.endOffset > 0 && range.endOffset < tn.data.length) {
        tn.splitText(range.endOffset);
      }
    }

    const fresh: Text[] = [];
    const walker = document.createTreeWalker(this.deps.editor, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        range.intersectsNode(n) && !/^[\s\u200B\u200F]*$/.test((n as Text).data)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    });
    while (walker.nextNode()) fresh.push(walker.currentNode as Text);

    const wrapNode = (tn: Text) => {
      let cur: Node | null = tn.parentNode;
      while (cur && cur !== this.deps.editor) {
        if (cur.nodeType === Node.ELEMENT_NODE) {
          const tag = (cur as Element).tagName.toLowerCase();
          if (tags.includes(tag)) return;
          if (opts?.disallowInPre && (cur as Element).closest("pre")) return;
        }
        cur = cur.parentNode;
      }
      const el = document.createElement(targetTag);
      tn.parentNode?.insertBefore(el, tn);
      el.appendChild(tn);
    };
    fresh.forEach(wrapNode);
    this.deps.editor.normalize();
    this.deps.scheduleChange();
  }

  private mergeAdjacentTextNodes(parent: Node): void {
    let prev: Text | null = null;
    const children = Array.from(parent.childNodes);
    for (const ch of children) {
      if (ch.nodeType === Node.TEXT_NODE) {
        if (prev) {
          prev.data += (ch as Text).data;
          parent.removeChild(ch);
        } else {
          prev = ch as Text;
        }
      } else {
        prev = null;

        if (ch.nodeType === Node.ELEMENT_NODE) {
          const tag = (ch as Element).tagName.toLowerCase();
          if (
            [
              "strong",
              "b",
              "em",
              "i",
              "u",
              "s",
              "strike",
              "del",
              "code",
              "span",
            ].includes(tag)
          ) {
            this.mergeAdjacentTextNodes(ch);
          }
        }
      }
    }
  }

  private flattenDuplicateInline(): void {
    const groups: string[][] = [
      ["strong", "b"],
      ["em", "i"],
      ["u"],
      ["s", "strike", "del"],
      ["code"],
    ];
    const isSameGroup = (tagA: string, tagB: string): boolean => {
      tagA = tagA.toLowerCase();
      tagB = tagB.toLowerCase();
      return groups.some((g) => g.includes(tagA) && g.includes(tagB));
    };
    const editor = this.deps.editor;
    groups.forEach((group) => {
      const selector = group.join(",");
      editor.querySelectorAll(selector).forEach((el) => {
        if (group[0] !== "code" && el.closest("code") && !el.closest("pre")) {
          return;
        }

        let child = el.firstElementChild;
        while (child) {
          const next = child.nextElementSibling;
          if (isSameGroup(el.tagName, child.tagName)) {
            while (child.firstChild) el.insertBefore(child.firstChild, child);
            child.remove();
          }
          child = next;
        }
      });
    });

    groups.forEach((group) => {
      const selector = group.join(",");
      editor.querySelectorAll(selector).forEach((el) => {
        let sib = el.nextElementSibling;
        while (sib && isSameGroup(el.tagName, sib.tagName)) {
          const next = sib.nextElementSibling;
          while (sib.firstChild) el.appendChild(sib.firstChild);
          sib.remove();
          sib = next;
        }
      });
    });

    const allSelectors = groups.flat().join(",");
    editor.querySelectorAll(allSelectors).forEach((el) => {
      const text = (el.textContent || "").replace(/[\s\u200B\u200F]/g, "");
      if (!text) el.remove();
    });
  }

  isFormatActive(format: FormatType): boolean {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    const hasAncestor = (tags: string[]): boolean => {
      let cur: Node | null = node;
      while (cur && cur !== this.deps.editor) {
        if (cur.nodeType === Node.ELEMENT_NODE) {
          const tag = (cur as Element).tagName.toLowerCase();
          if (tags.includes(tag)) return true;
        }
        cur = cur.parentNode;
      }
      return false;
    };
    switch (format) {
      case "bold":
        return hasAncestor(["strong", "b"]);
      case "italic":
        return hasAncestor(["em", "i"]);
      case "underline":
        return hasAncestor(["u"]);
      case "strikethrough":
        return hasAncestor(["s", "strike", "del"]);
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return this.isHeadingActive(format);
      case "blockquote":
        return this.isBlockquoteActive();
      case "code":
        return this.isInlineCodeActive();
      case "code-block":
        return this.isCodeBlockActive();
      default:
        return false;
    }
  }

  getActiveFormats(): FormatType[] {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return [];
    const range = sel.getRangeAt(0);
    let node: Node | null = range.startContainer;
    const formats = new Set<FormatType>();
    while (node && node !== this.deps.editor) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as Element).tagName.toLowerCase();
        switch (tag) {
          case "strong":
          case "b":
            formats.add("bold");
            break;
          case "em":
          case "i":
            formats.add("italic");
            break;
          case "u":
            formats.add("underline");
            break;
          case "s":
          case "strike":
          case "del":
            formats.add("strikethrough");
            break;
          case "code":
            if (!(node as Element).closest("pre")) formats.add("code");
            break;
          case "pre":
            formats.add("code-block");
            break;
          case "blockquote":
            formats.add("blockquote");
            break;
          case "h1":
          case "h2":
          case "h3":
          case "h4":
          case "h5":
          case "h6":
            formats.add(tag as FormatType);
            break;
        }
      }
      node = node.parentNode;
    }
    return Array.from(formats);
  }

  private isHeadingActive(tag: string): boolean {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    let el: Node | null = sel.getRangeAt(0).startContainer;
    while (el && el !== this.deps.editor) {
      if (
        el.nodeType === Node.ELEMENT_NODE &&
        (el as Element).tagName.toLowerCase() === tag
      )
        return true;
      el = el.parentNode;
    }
    return false;
  }
  private isBlockquoteActive(): boolean {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    let el: Node | null = sel.getRangeAt(0).startContainer;
    while (el && el !== this.deps.editor) {
      if (
        el.nodeType === Node.ELEMENT_NODE &&
        (el as Element).tagName.toLowerCase() === "blockquote"
      )
        return true;
      el = el.parentNode;
    }
    return false;
  }
  private isInlineCodeActive(): boolean {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    let el: Node | null = sel.getRangeAt(0).startContainer;
    while (el && el !== this.deps.editor) {
      if (el.nodeType === Node.ELEMENT_NODE) {
        const tag = (el as Element).tagName.toLowerCase();
        if (tag === "code" && !(el as Element).closest("pre")) return true;
      }
      el = el.parentNode;
    }
    return false;
  }
  private isCodeBlockActive(): boolean {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    let el: Node | null = sel.getRangeAt(0).startContainer;
    while (el && el !== this.deps.editor) {
      if (
        el.nodeType === Node.ELEMENT_NODE &&
        (el as Element).tagName.toLowerCase() === "pre"
      )
        return true;
      el = el.parentNode;
    }
    return false;
  }

  private inline(format: string, text: string): void {
    const el = this.createElement(format);
    el.textContent = text;
    this.replaceSelectionWith(el);
  }
  private applyHeading(tag: string): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const text = sel.toString() || "Heading";
    const h = document.createElement(tag);
    h.textContent = text;
    range.deleteContents();
    range.insertNode(h);
    this.moveCaretAfter(h);
  }
  private blockquote(): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const text = sel.toString() || "Quote";
    const bq = document.createElement("blockquote");
    bq.textContent = text;
    range.deleteContents();
    range.insertNode(bq);
    this.moveCaretAfter(bq);
  }
  private inlineCode(text: string): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const code = document.createElement("code");
    code.textContent = text;
    range.deleteContents();
    range.insertNode(code);
    this.moveCaretAfter(code);
  }
  private codeBlock(): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = sel.toString() || "code";
    pre.appendChild(code);
    range.deleteContents();
    range.insertNode(pre);
    this.moveCaretAfter(pre);
  }
  private replaceSelectionWith(node: Node): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(node);
    this.moveCaretAfter(node);
  }
  private createElement(format: string): HTMLElement {
    switch (format) {
      case "bold":
        return document.createElement("strong");
      case "italic":
        return document.createElement("em");
      case "underline":
        return document.createElement("u");
      case "strikethrough":
        return document.createElement("s");
      default:
        return document.createElement("span");
    }
  }
  private moveCaretAfter(node: Node): void {
    const sel = window.getSelection();
    if (!sel) return;
    const isRTL = (this.deps.editor.getAttribute("dir") || "").toLowerCase() === "rtl";
    const placeholderChar = isRTL ? "\u200F" : "\u200B";
    let after: ChildNode | null = node.nextSibling as ChildNode | null;
    if (!after || after.nodeType !== Node.TEXT_NODE) {
      const placeholder = document.createTextNode(placeholderChar);
      node.parentNode?.insertBefore(placeholder, after);
      after = placeholder;
    }
    const txt = after as Text;
    const range = document.createRange();
    const len = txt.textContent ? txt.textContent.length : 0;
    range.setStart(txt, len);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    (this.deps.editor as HTMLElement).focus();
    this.deps.scheduleChange();
  }

  insertListItem(type: "bullet" | "numbered" = "bullet"): void {
    let sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      this.deps.editor.focus();
      sel = window.getSelection();
      if (!sel) return;
      const fallback = document.createRange();
      fallback.selectNodeContents(this.deps.editor);
      fallback.collapse(false);
      sel.removeAllRanges();
      sel.addRange(fallback);
    }
    const range = sel.getRangeAt(0);
    const selectedText = sel.toString();
    const marker = this.getListMarker(type, range);
    if (selectedText && selectedText.trim())
      this.addBulletsToSelection(selectedText, marker, range, type);
    else this.addBulletAtCursor(marker, range);
    this.deps.scheduleChange();
  }
  private addBulletsToSelection(
    selectedText: string,
    marker: string,
    range: Range,
    type: "bullet" | "numbered"
  ): void {
    const lines = selectedText.split("\n");
    let currentNumber = 1;
    if (type === "numbered") {
      const m = marker.match(/^(\d+)\. /);
      if (m) currentNumber = parseInt(m[1], 10);
    }
    const bulletedLines = lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed === "") return "";
      if (trimmed.startsWith("- ") || /^\d+\. /.test(trimmed)) return line;
      if (type === "numbered") return `${currentNumber + idx}. ${trimmed}`;
      return marker + trimmed;
    });
    const textJoined = bulletedLines.join("\n");
    try {
      const tn = document.createTextNode(textJoined);
      range.deleteContents();
      range.insertNode(tn);
      const sel = window.getSelection();
      if (sel) {
        range.setStartAfter(tn);
        range.setEndAfter(tn);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (e) {
      console.error("Error adding bullets", e);
    }
  }
  private addBulletAtCursor(marker: string, range: Range): void {
    const atLineStart = this.isAtLineStart(range);
    if (!atLineStart) {
      const lineStart = this.getLineStartOffset(range);
      const sel = window.getSelection();
      if (sel) {
        const adj = document.createRange();
        adj.setStart(range.startContainer, lineStart);
        adj.collapse(true);
        sel.removeAllRanges();
        sel.addRange(adj);
        range = adj;
      }
    }
    try {
      const tn = document.createTextNode(marker);
      range.insertNode(tn);
      range.setStartAfter(tn);
      range.setEndAfter(tn);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
        setTimeout(() => {
          const nr = document.createRange();
          nr.setStartAfter(tn);
          nr.collapse(true);
          sel.removeAllRanges();
          sel.addRange(nr);
          this.deps.editor.focus();
        }, 5);
      }
    } catch (e) {
      console.error("Error bullet cursor", e);
    }
  }
  private getLineStartOffset(range: Range): number {
    const c = range.startContainer;
    const o = range.startOffset;
    if (c.nodeType !== Node.TEXT_NODE) return 0;
    const text = c.textContent || "";
    for (let i = o - 1; i >= 0; i--) {
      if (text[i] == "\n") return i + 1;
    }
    return 0;
  }
  private getListMarker(type: "bullet" | "numbered", range: Range): string {
    if (type === "bullet") return "- ";
    const next = this.getNextListNumber(range);
    return `${next}. `;
  }
  private getNextListNumber(range: Range): number {
    const content = this.deps.editor.textContent || "";
    const cursor = this.getCursorPosition(range);
    const lines = content.split("\n");
    let idx = 0;
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      if (count + lines[i].length >= cursor) {
        idx = i;
        break;
      }
      count += lines[i].length + 1;
    }
    let last = 0;
    for (let i = idx; i >= 0; i--) {
      const line = lines[i].trim();
      const m = line.match(/^(\d+)\. /);
      if (m) {
        last = parseInt(m[1], 10);
        break;
      }
      if (line && !line.startsWith("-")) break;
    }
    return last + 1;
  }
  private getCursorPosition(range: Range): number {
    const rc = range.cloneRange();
    rc.selectNodeContents(this.deps.editor);
    rc.setEnd(range.startContainer, range.startOffset);
    return rc.toString().length;
  }
  private isAtLineStart(range: Range): boolean {
    const c = range.startContainer;
    const o = range.startOffset;
    if (c.nodeType === Node.TEXT_NODE) {
      const t = c.textContent || "";
      if (o === 0) return true;
      return t.charAt(o - 1) == "\n";
    }
    return o === 0;
  }

  public ensureCaretOutsideInlineFormat(): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    let container: Node = range.startContainer;
    if (container.nodeType === Node.ELEMENT_NODE && range.startOffset > 0) {
      const child = (container as Element).childNodes[range.startOffset - 1];
      if (child) container = child;
    }
    const isInlineFormat = (el: Element): boolean => {
      const tag = el.tagName.toLowerCase();
      return (
        ["strong", "b", "em", "i", "u", "s", "strike", "del", "code"].includes(tag) &&
        !el.closest("pre")
      );
    };
    let inlineAncestor: Element | null = null;
    let walker: Node | null = container;
    while (walker && walker !== this.deps.editor) {
      if (walker.nodeType === Node.ELEMENT_NODE && isInlineFormat(walker as Element)) {
        inlineAncestor = walker as Element;
        break;
      }
      walker = walker.parentNode;
    }
    if (!inlineAncestor) return;
    const endRange = document.createRange();
    endRange.selectNodeContents(inlineAncestor);
    endRange.collapse(false);
    if (range.compareBoundaryPoints(Range.END_TO_END, endRange) !== 0) return;
    const parent = inlineAncestor.parentNode;
    if (!parent) return;
    const after = inlineAncestor.nextSibling;
    const isRTL = (this.deps.editor.getAttribute("dir") || "").toLowerCase() === "rtl";
    let targetText: Text | null = null;
    if (after && after.nodeType === Node.TEXT_NODE) {
      targetText = after as Text;
    } else {
      const placeholder = document.createTextNode(isRTL ? "\u200F" : "\u200B");
      parent.insertBefore(placeholder, after);
      targetText = placeholder;
    }
    const newRange = document.createRange();
    const len = targetText.textContent ? targetText.textContent.length : 0;
    newRange.setStart(targetText, len);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
}
