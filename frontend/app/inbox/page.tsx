import { Suspense } from "react";
import { InboxView } from "@/components/inbox/InboxView";
import { threads } from "@/lib/seed-inbox";

export default function InboxPage() {
  return (
    <Suspense>
      <InboxView threads={threads} />
    </Suspense>
  );
}
