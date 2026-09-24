"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TopicPageView } from "@/components/topics/TopicPageView";

function TopicPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Topic</h1>
        <p className="mt-2 text-sm text-neutral-600">No topic selected.</p>
      </div>
    );
  }

  return <TopicPageView topicId={id} />;
}

export default function TopicPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
      <TopicPageContent />
    </Suspense>
  );
}
