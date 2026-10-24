import { Suspense } from "react";
import { InboxView } from "@/components/inbox/InboxView";

export default function InboxPage() {
  return (
    <Suspense>
      <InboxView />
    </Suspense>
  );
}
