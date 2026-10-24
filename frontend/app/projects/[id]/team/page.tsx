import { notFound } from "next/navigation";
import { TeamView } from "@/components/team/TeamView";
import { getProject } from "@/lib/catalog";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const project = getProject((await params).id);
  if (!project) notFound();
  return <TeamView project={project} />;
}
