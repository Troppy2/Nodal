import { Suspense } from "react";
import { ProfileView } from "@/components/profile/ProfileView";

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return (
    <Suspense fallback={null}>
      <ProfileView key={handle} handle={decodeURIComponent(handle)} />
    </Suspense>
  );
}
