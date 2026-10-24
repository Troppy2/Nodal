import { TeamView } from "@/components/team/TeamView";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  return <TeamView id={(await params).id} />;
}
