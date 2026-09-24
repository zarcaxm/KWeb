"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Folder as FolderIcon, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useSearchPalette } from "@/components/layout/SearchContext";
import { globalSearch } from "@/lib/search/search";
import type { Folder, Topic } from "@/types/models";

type ResultItem =
  | { type: "folder"; folder: Folder }
  | { type: "topic"; topic: Topic };

export function CommandPalette() {
  const { open, closeSearch, openSearch } = useSearchPalette();
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setActiveIndex(0);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      globalSearch(q)
        .then(({ folders, topics }) => {
          const items: ResultItem[] = [
            ...folders.map((f) => ({ type: "folder" as const, folder: f })),
            ...topics.map((t) => ({ type: "topic" as const, topic: t })),
          ];
          setResults(items);
          setActiveIndex(0);
        })
        .finally(() => setLoading(false));
    }, 150);
    return () => clearTimeout(timer);
  }, [query, open]);

  const openResult = (item: ResultItem) => {
    if (item.type === "folder") {
      router.push(`/folder?id=${item.folder.id}`);
    } else {
      router.push(`/topic?id=${item.topic.id}`);
    }
    closeSearch();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSearch();
        return;
      }
      if (results.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + results.length) % results.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        openResult(results[activeIndex]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, activeIndex, closeSearch, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[10vh]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeSearch();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="w-full max-w-xl rounded-lg border border-neutral-200 bg-white shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-neutral-200 px-3">
          <Search className="h-4 w-4 text-neutral-400" aria-hidden />
          <Input
            ref={inputRef}
            className="border-0 shadow-none focus-visible:outline-none"
            placeholder="Search folders and topics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-controls={listId}
            aria-activedescendant={
              results.length > 0 ? `${listId}-item-${activeIndex}` : undefined
            }
            autoComplete="off"
          />
          <kbd className="hidden rounded border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-500 sm:inline">
            Esc
          </kbd>
        </div>
        <ul
          id={listId}
          role="listbox"
          className="max-h-80 overflow-y-auto p-2"
          aria-label="Search results"
        >
          {query.trim() === "" ? (
            <li className="px-3 py-6 text-center text-sm text-neutral-500">
              Type to search titles and descriptions.
            </li>
          ) : loading ? (
            <li className="px-3 py-6 text-center text-sm text-neutral-500">Searching…</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-neutral-500">No results.</li>
          ) : (
            results.map((item, index) => {
              const id = `${listId}-item-${index}`;
              const isActive = index === activeIndex;
              if (item.type === "folder") {
                return (
                  <li key={`f-${item.folder.id}`} id={id} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                        isActive ? "bg-neutral-100" : "hover:bg-neutral-50"
                      }`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => openResult(item)}
                    >
                      <FolderIcon className="h-4 w-4 text-neutral-400" aria-hidden />
                      <span className="font-medium text-neutral-900">{item.folder.name}</span>
                      <span className="ml-auto text-xs text-neutral-500">Folder</span>
                    </button>
                  </li>
                );
              }
              return (
                <li key={`t-${item.topic.id}`} id={id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                      isActive ? "bg-neutral-100" : "hover:bg-neutral-50"
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => openResult(item)}
                  >
                    <FileText className="h-4 w-4 text-neutral-400" aria-hidden />
                    <div className="min-w-0">
                      <div className="font-medium text-neutral-900">{item.topic.title}</div>
                      {item.topic.description ? (
                        <div className="truncate text-xs text-neutral-500">
                          {item.topic.description}
                        </div>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
