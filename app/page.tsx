import { Suspense } from "react";
import { HomeView } from "@/components/home/HomeView";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
      <HomeView />
    </Suspense>
  );
}
