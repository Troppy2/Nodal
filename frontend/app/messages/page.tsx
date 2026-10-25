import { Suspense } from "react";
import { MessagesView } from "@/components/inbox/MessagesView";

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesView />
    </Suspense>
  );
}

