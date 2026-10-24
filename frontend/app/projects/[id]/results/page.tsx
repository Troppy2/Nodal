import { notFound } from "next/navigation";
import { ResultsView } from "@/components/checks/ResultsView";
import { getProject } from "@/lib/catalog";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const project = getProject((await params).id);
  if (!project) notFound();
  return <ResultsView project={project} />;
}
