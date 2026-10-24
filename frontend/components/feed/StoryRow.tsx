import Link from "next/link";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { stories } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** People who complete a swap or ring with you come first, ringed in teal. */
export function StoryRow() {
  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-4 [scrollbar-width:none] lg:px-0" aria-label="People to build with">
      <Link href="/create" className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
        <span className="flex size-[60px] items-center justify-center rounded-full border-2 border-dashed border-muted-ink/40 text-muted-ink transition-colors hover:border-ink hover:text-ink">
          <Plus className="size-6" strokeWidth={1.75} />
        </span>
        <span className="text-xs font-medium">Post idea</span>
      </Link>
      {stories.map(({ person, tag }) => (
        <Link
          key={person.handle}
          href={tag ? `/inbox?thread=${tag === "swap" ? "swap-maya" : "ring-dev-rin"}` : `/u/${person.handle}`}
          className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"
        >
          <Avatar person={person} size={48} ring={tag !== null} />
          <span className="flex flex-col items-center leading-tight">
            <span className="text-xs font-medium">{person.handle}</span>
            <span className={cn("font-mono text-[10px] uppercase tracking-wider", tag ? "text-teal" : "text-transparent")}>
              {tag ?? "·"}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
