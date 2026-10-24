import { tints, typeLabel } from "@/lib/cover";
import type { ProjectCard, ProjectType } from "@/lib/api-types";
import { cn } from "@/lib/utils";

const stageLabel = { idea: "Idea", building: "Building", shipped: "Shipped" } as const;

/** Small square in a discipline color. Color always means discipline. */
export function DisciplineMark({ type, className }: { type: ProjectType; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-[2px]", className)} style={{ background: tints[type].fg }} />;
}

/** One quiet line: discipline (with its color mark), stage, and source. Replaces stacks of pills. */
export function ProjectMeta({
  project,
  className,
}: {
  project: Pick<ProjectCard, "type" | "stage" | "source_access">;
  className?: string;
}) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-ink", className)}>
      <span className="flex items-center gap-1.5">
        <DisciplineMark type={project.type} />
        {typeLabel[project.type]}
      </span>
      <span className={project.stage === "idea" ? "text-cool" : undefined}>{stageLabel[project.stage]}</span>
      {project.source_access === "open" && <span>Open source</span>}
    </p>
  );
}

/** Small muted label for section headings and facts. */
export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[13px] font-semibold text-muted-ink", className)}>{children}</p>;
}
