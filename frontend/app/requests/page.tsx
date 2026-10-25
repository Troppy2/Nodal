import { Suspense } from "react";
import { RequestsView } from "@/components/inbox/RequestsView";

export default function RequestsPage() {
  return (
    <Suspense>
      <RequestsView />
    </Suspense>
  );
}

