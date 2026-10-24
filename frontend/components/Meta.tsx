import { tints, typeLabel } from "@/lib/cover";
import type { Project } from "@/lib/catalog";
import type { ProjectType } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Small square in a discipline color. Color always means discipline. */
export function DisciplineMark({ type, className }: { type: ProjectType; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-[2px]", className)} style={{ background: tints[type].fg }} />;
}

/** Mono spec line: disciplines, stage, and source. Replaces stacks of pills. */
export function ProjectMeta({ project, className }: { project: Pick<Project, "disciplines" | "stage" | "source">; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-muted-ink", className)}>
      <span className="flex items-center gap-1.5">
        {project.disciplines.map((d, i) => (
          <span key={d} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-line">×</span>}
            <DisciplineMark type={d} />
            {typeLabel[d]}
          </span>
        ))}
      </span>
      <span className={project.stage === "idea" ? "text-cool" : undefined}>{project.stage}</span>
      {project.source === "open" && <span>Open source</span>}
    </p>
  );
}

/** Uppercase mono label for section headings and small facts. */
export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[11px] uppercase tracking-wider text-muted-ink", className)}>{children}</p>;
}
