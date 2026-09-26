import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const typingKey = new PluginKey<DecorationSet>("typingAnimation");

/** Soft fade-in on newly typed characters for a more fluid writing feel. */
export const TypingAnimation = Extension.create({
  name: "typingAnimation",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: typingKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set, _oldState, newState) {
            if (tr.getMeta(typingKey) === "clear") {
              return DecorationSet.empty;
            }

            set = set.map(tr.mapping, tr.doc);
            if (!tr.docChanged) return set;

            const ranges: { from: number; to: number }[] = [];
            tr.steps.forEach((step) => {
              step.getMap().forEach((_oldFrom, _oldTo, newFrom, newTo) => {
                if (newTo > newFrom) {
                  ranges.push({ from: newFrom, to: newTo });
                }
              });
            });

            const decorations = ranges.flatMap(({ from, to }) => {
              // Skip large inserts (paste) — only feel typing.
              if (to - from > 48) return [];
              return [
                Decoration.inline(from, to, { class: "kweb-typed" }, { inclusiveEnd: false }),
              ];
            });

            if (decorations.length === 0) return set;
            return set.add(newState.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return typingKey.getState(state) ?? DecorationSet.empty;
          },
        },
        view() {
          let clearTimer: ReturnType<typeof setTimeout> | null = null;
          return {
            update(editorView) {
              const decorations = typingKey.getState(editorView.state);
              if (!decorations || decorations.find().length === 0) return;
              if (clearTimer) clearTimeout(clearTimer);
              clearTimer = setTimeout(() => {
                clearTimer = null;
                if (editorView.isDestroyed) return;
                const current = typingKey.getState(editorView.state);
                if (!current || current.find().length === 0) return;
                editorView.dispatch(
                  editorView.state.tr.setMeta(typingKey, "clear").setMeta("addToHistory", false)
                );
              }, 220);
            },
            destroy() {
              if (clearTimer) clearTimeout(clearTimer);
            },
          };
        },
      }),
    ];
  },
});
