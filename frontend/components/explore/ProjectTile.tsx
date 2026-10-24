import Link from "next/link";
import { Star } from "lucide-react";
import { CoverArt } from "@/components/feed/CoverArt";
import { ProjectMeta } from "@/components/Meta";
import { me, type Project, viewerFits } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** Grid tile used by Explore and profiles: cover, title, spec line, what it needs, owner and stars. */
export function ProjectTile({ project, showOwner = true }: { project: Project; showOwner?: boolean }) {
  const href = project.stage === "idea" && project.owner.handle === me.handle ? `/projects/${project.id}/results` : `/projects/${project.id}`;
  return (
    <Link href={href} className="group flex flex-col">
      <CoverArt cover={project.cover} seed={project.id} className="aspect-[4/3] rounded-lg" />
      <h3 className="mt-2.5 text-[15px] font-bold leading-tight group-hover:underline">{project.title}</h3>
      <ProjectMeta project={project} className="mt-1 gap-x-2 text-[10px]" />
      {project.needs.length > 0 ? (
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-muted-ink">
          Needs{" "}
          {project.needs.map((n, i) => (
            <span key={n.skill}>
              {i > 0 && ", "}
              <span className={cn(viewerFits(project, n) ? "font-semibold text-teal" : "text-ink")}>{n.skill}</span>
            </span>
          ))}
        </p>
      ) : (
        <p className="mt-1.5 text-[13px] text-muted-ink">Not looking for help</p>
      )}
      <p className="mt-1.5 flex items-center gap-2 font-mono text-[11px] text-muted-ink">
        {showOwner && <span>@{project.owner.handle}</span>}
        <span className="flex items-center gap-0.5">
          <Star className="size-3" strokeWidth={2} /> {project.stars}
        </span>
      </p>
    </Link>
  );
}

export function ProjectGrid({ projects, showOwner }: { projects: Project[]; showOwner?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:gap-x-5 lg:gap-y-8">
      {projects.map((p) => (
        <li key={p.id} className="min-w-0">
          <ProjectTile project={p} showOwner={showOwner} />
        </li>
      ))}
    </ul>
  );
}
