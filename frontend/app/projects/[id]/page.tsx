import { notFound } from "next/navigation";
import { ProjectView } from "@/components/project/ProjectView";
import { getProject } from "@/lib/catalog";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const project = getProject((await params).id);
  if (!project) notFound();
  const { tab } = await searchParams;
  // Key on the tab so ?tab= links between tabs of the same project re-seed the view.
  return <ProjectView key={tab ?? ""} project={project} initialTab={tab} />;
}
