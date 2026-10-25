"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function InboxRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const thread = searchParams.get("thread");
    if (thread) {
      if (thread.startsWith("m:")) {
        router.replace(`/messages?thread=${encodeURIComponent(thread)}`);
      } else {
        router.replace(`/requests?id=${encodeURIComponent(thread)}`);
      }
    } else {
      router.replace("/requests");
    }
  }, [router, searchParams]);

  return null;
}

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxRedirect />
    </Suspense>
  );
}
