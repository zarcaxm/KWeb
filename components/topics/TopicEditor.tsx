"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef } from "react";
import { Bold, Heading2, List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface TopicEditorProps {
  content: string;
  onChange: (markdown: string) => void;
}

function getMarkdown(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return "";
  const storage = editor.storage as { markdown?: { getMarkdown: () => string } };
  return storage.markdown?.getMarkdown() ?? editor.getText();
}

export function TopicEditor({ content, onChange }: TopicEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitted = useRef(content);
  const pendingMd = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
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
        class:
          "prose prose-neutral max-w-none min-h-[320px] px-4 py-3 focus:outline-none text-neutral-800",
        "aria-label": "Topic content",
      },
    },
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

  // content is initial-only; parent remounts this editor per topic via key={topicId}
  // so vault refreshes cannot clobber in-progress edits.

  useEffect(() => {
    return () => {
      flushPending();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!editor) {
    return <div className="text-sm text-neutral-500">Loading editor…</div>;
  }

  return (
    <div className="flex flex-col rounded-lg border border-neutral-200 bg-white">
      <div
        className="flex flex-wrap gap-1 border-b border-neutral-200 px-2 py-2"
        role="toolbar"
        aria-label="Formatting"
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
