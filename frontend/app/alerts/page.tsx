import { Suspense } from "react";
import { AlertsView } from "@/components/inbox/AlertsView";

export default function AlertsPage() {
  return (
    <Suspense>
      <AlertsView />
    </Suspense>
  );
}

