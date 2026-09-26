"use client";

import { useEffect, useState } from "react";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import { resolveVaultMediaSrc } from "@/lib/vault/fs";

function VaultImageView({ node, selected }: NodeViewProps) {
  const src = String(node.attrs.src ?? "");
  const alt = String(node.attrs.alt ?? "");
  const [href, setHref] = useState(src);

  useEffect(() => {
    let cancelled = false;
    void resolveVaultMediaSrc(src).then((resolved) => {
      if (!cancelled) setHref(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <NodeViewWrapper
      as="figure"
      className={`kweb-editor-figure${selected ? " is-selected" : ""}`}
      data-drag-handle
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={href} alt={alt} className="kweb-editor-image" draggable={false} />
    </NodeViewWrapper>
  );
}

export const VaultImage = Image.extend({
  name: "image",
  addNodeView() {
    return ReactNodeViewRenderer(VaultImageView);
  },
}).configure({
  inline: false,
  allowBase64: true,
});
