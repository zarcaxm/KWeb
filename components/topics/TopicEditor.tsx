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
      if (md === lastEmitted.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        lastEmitted.current = md;
        onChange(md);
      }, 400);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = getMarkdown(editor);
    if (content !== current && content !== lastEmitted.current) {
      editor.commands.setContent(content);
      lastEmitted.current = content;
    }
  }, [content, editor]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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
