import { ProfileView } from "@/components/profile/ProfileView";

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <ProfileView key={handle} handle={decodeURIComponent(handle)} />;
}
