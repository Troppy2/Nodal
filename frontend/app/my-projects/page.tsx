import { Suspense } from "react";
import { MyProjectsView } from "@/components/project/MyProjectsView";

export default function MyProjectsPage() {
  return (
    <Suspense>
      <MyProjectsView />
    </Suspense>
  );
}

