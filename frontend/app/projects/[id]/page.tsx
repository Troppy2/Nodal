import { ProjectView } from "@/components/project/ProjectView";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  // Key on id and tab so ?tab= links re-seed the view.
  return <ProjectView key={`${id}:${tab ?? ""}`} id={id} initialTab={tab} />;
}
