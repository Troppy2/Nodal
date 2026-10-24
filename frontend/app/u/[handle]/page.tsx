import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile/ProfileView";
import { type Handle, me, people } from "@/lib/catalog";

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const resolved = handle === "me" ? me.handle : handle;
  if (!(resolved in people)) notFound();
  return <ProfileView handle={resolved as Handle} />;
}
