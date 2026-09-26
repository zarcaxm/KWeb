import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

const focusFlowKey = new PluginKey<DecorationSet>("focusFlow");

const SENTENCE_END = /[.!?…][\u201D\u2019"')\]]*\s+$/;

function isTextblock(node: ProseMirrorNode) {
  return node.isTextblock;
}

/** Inclusive [from, to] of the sentence containing `pos` inside a textblock. */
function sentenceRangeInBlock(
  doc: ProseMirrorNode,
  blockFrom: number,
  blockTo: number,
  pos: number,
): { from: number; to: number } {
  const text = doc.textBetween(blockFrom, blockTo, "\n", "\n");
  const offset = Math.max(0, Math.min(text.length, pos - blockFrom));

  let start = 0;
  for (let i = 0; i < offset; i++) {
    const slice = text.slice(0, i + 1);
    if (SENTENCE_END.test(slice)) start = i + 1;
  }

  let end = text.length;
  for (let i = offset; i < text.length; i++) {
    const ch = text[i];
    if (ch === "." || ch === "!" || ch === "?" || ch === "…") {
      let j = i + 1;
      while (j < text.length && /[\u201D\u2019"')\]]/.test(text[j]!)) j++;
      end = j;
      break;
    }
  }

  // Prefer the gap after a just-typed terminator as its own “next” sentence.
  if (offset > 0 && SENTENCE_END.test(text.slice(0, offset)) && offset === start) {
    start = offset;
  }

  return { from: blockFrom + start, to: blockFrom + end };
}

function buildDecorations(doc: ProseMirrorNode, head: number): DecorationSet {
  const $head = doc.resolve(head);
  let depth = $head.depth;
  while (depth > 0 && !isTextblock($head.node(depth))) depth--;
  if (depth === 0) return DecorationSet.empty;

  const blockFrom = $head.start(depth);
  const blockTo = $head.end(depth);
  const sentence = sentenceRangeInBlock(doc, blockFrom, blockTo, head);

  const decos: Decoration[] = [
    Decoration.node($head.before(depth), $head.after(depth), {
      class: "kweb-focus-block",
    }),
  ];

  if (sentence.to > sentence.from) {
    decos.push(
      Decoration.inline(sentence.from, sentence.to, {
        class: "kweb-focus-sentence",
      }),
    );
  }

  return DecorationSet.create(doc, decos);
}

function keepCaretInBand(view: EditorView) {
  const { head } = view.state.selection;
  try {
    const coords = view.coordsAtPos(head);
    const scroller =
      (view.dom.closest(".kweb-writing-scroll") as HTMLElement | null) ??
      (view.dom.closest("[data-writing-scroll]") as HTMLElement | null) ??
      null;

    const bandTop = window.innerHeight * 0.32;
    const bandBottom = window.innerHeight * 0.62;

    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      const target =
        scroller.scrollTop + (coords.top - rect.top) - rect.height * 0.42;
      if (
        coords.top < rect.top + rect.height * 0.28 ||
        coords.bottom > rect.top + rect.height * 0.68
      ) {
        scroller.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
      }
      return;
    }

    if (coords.top < bandTop || coords.bottom > bandBottom) {
      const absoluteY = window.scrollY + coords.top;
      window.scrollTo({
        top: Math.max(0, absoluteY - window.innerHeight * 0.42),
        behavior: "smooth",
      });
    }
  } catch {
    // coordsAtPos can throw on edge positions; ignore
  }
}

/**
 * Flow-state writing: current sentence stays sharp, the rest softens,
 * and the caret stays in a comfortable vertical band while typing.
 * Characters appear immediately — no per-glyph animation.
 */
export const FocusFlow = Extension.create({
  name: "focusFlow",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: focusFlowKey,
        state: {
          init: (_, state) => buildDecorations(state.doc, state.selection.head),
          apply: (tr, old, _oldState, newState) => {
            if (!tr.docChanged && !tr.selectionSet) return old;
            return buildDecorations(newState.doc, newState.selection.head);
          },
        },
        props: {
          decorations(state) {
            return focusFlowKey.getState(state) ?? DecorationSet.empty;
          },
        },
        view: () => ({
          update(view, prev) {
            if (!view.hasFocus()) return;
            const typed = !view.state.doc.eq(prev.doc);
            if (!typed) return;
            // Defer one frame so layout settles after the insert.
            requestAnimationFrame(() => keepCaretInBand(view));
          },
        }),
      }),
    ];
  },
});
