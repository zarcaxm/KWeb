"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef, useState } from "react";
import { Bold, Heading2, List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface TopicEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  onFocusChange?: (focused: boolean) => void;
}

function getMarkdown(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return "";
  const storage = editor.storage as { markdown?: { getMarkdown: () => string } };
  return storage.markdown?.getMarkdown() ?? editor.getText();
}

export function TopicEditor({ content, onChange, onFocusChange }: TopicEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitted = useRef(content);
  const pendingMd = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  const onFocusChangeRef = useRef(onFocusChange);
  onChangeRef.current = onChange;
  onFocusChangeRef.current = onFocusChange;
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPending = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const md = pendingMd.current;
    if (md == null || md === lastEmitted.current) {
      pendingMd.current = null;
      return;
    }
    pendingMd.current = null;
    lastEmitted.current = md;
    onChangeRef.current(md);
  };

  const setWritingFocus = (next: boolean) => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    if (next) {
      setFocused(true);
      onFocusChangeRef.current?.(true);
      return;
    }
    // Delay blur so toolbar clicks don't flash focus mode off
    blurTimer.current = setTimeout(() => {
      blurTimer.current = null;
      setFocused(false);
      onFocusChangeRef.current?.(false);
    }, 160);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Start writing…",
        emptyEditorClass: "is-editor-empty",
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "kweb-editor prose max-w-none focus:outline-none",
        "aria-label": "Topic content",
      },
      // Keep the caret in a comfortable vertical band while typing.
      scrollThreshold: { top: 96, bottom: 140, left: 24, right: 24 },
      scrollMargin: { top: 140, bottom: 180, left: 0, right: 0 },
    },
    onFocus: () => setWritingFocus(true),
    onBlur: () => setWritingFocus(false),
    onUpdate: ({ editor: ed }) => {
      const md = getMarkdown(ed);
      if (md === lastEmitted.current) {
        pendingMd.current = null;
        return;
      }
      pendingMd.current = md;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const next = pendingMd.current;
        if (next == null || next === lastEmitted.current) return;
        pendingMd.current = null;
        lastEmitted.current = next;
        onChangeRef.current(next);
      }, 400);
    },
  });

  useEffect(() => {
    return () => {
      flushPending();
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!editor) {
    return <div className="text-sm text-neutral-500">Loading editor…</div>;
  }

  return (
    <div className="kweb-editor-shell" data-focused={focused ? "true" : "false"}>
      <div
        className="kweb-editor-toolbar"
        role="toolbar"
        aria-label="Formatting"
        onMouseDown={() => setWritingFocus(true)}
      >
        <Button
          type="button"
          variant="ghost"
          className="min-h-[36px] min-w-[36px] p-2"
          aria-label="Heading"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-[36px] min-w-[36px] p-2"
          aria-label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-[36px] min-w-[36px] p-2"
          aria-label="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-[36px] min-w-[36px] p-2"
          aria-label="Ordered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
