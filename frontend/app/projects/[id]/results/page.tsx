import { ResultsView } from "@/components/checks/ResultsView";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  return <ResultsView id={(await params).id} />;
}
