"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FolderPageView } from "@/components/folders/FolderPageView";

function FolderPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Folder</h1>
        <p className="mt-2 text-sm text-neutral-600">No folder selected.</p>
      </div>
    );
  }

  return <FolderPageView folderId={id} />;
}

export default function FolderPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
      <FolderPageContent />
    </Suspense>
  );
}
