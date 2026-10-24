import { Suspense } from "react";
import { ExploreGrid } from "@/components/explore/ExploreGrid";

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-[980px] px-4 py-4 lg:px-8 lg:py-8">
      <h1 className="mb-4 text-2xl font-extrabold tracking-[-0.02em] max-lg:sr-only">Explore</h1>
      <Suspense>
        <ExploreGrid />
      </Suspense>
    </div>
  );
}
