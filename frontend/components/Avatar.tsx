import { tints } from "@/lib/cover";
import type { ProfileLite } from "@/lib/api-types";
import { cn } from "@/lib/utils";

const TINTS = ["software", "hardware", "creative", "teal"] as const;

/** Up to two initials from the display name, falling back to the handle. */
export function initials(person: Pick<ProfileLite, "display_name" | "handle">) {
  const name = (person.display_name || person.handle || "?").trim();
  const words = name.split(/[\s_-]+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

/** Stable tint per person: a hash of the id picks one of the four palette tints. */
function tintFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return TINTS[Math.abs(h) % TINTS.length];
}

/** Initials on a tint. `dashed` marks an invited, not-yet-joined member; `ring` marks swap or ring partners. */
export function Avatar({
  person,
  size = 36,
  dashed,
  ring,
  className,
}: {
  person: Pick<ProfileLite, "id" | "handle" | "display_name">;
  size?: number;
  dashed?: boolean;
  ring?: boolean;
  className?: string;
}) {
  const { fg, bg } = tints[tintFor(person.id)];
  const style = dashed
    ? { width: size, height: size, fontSize: size * 0.36, color: "#5b6b78" }
    : { width: size, height: size, fontSize: size * 0.36, color: fg, background: bg };
  const inner = (
    <span
      aria-hidden
      style={style}
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-bold",
        dashed && "border-2 border-dashed border-muted-ink/60",
        ring === undefined && className,
      )}
    >
      {initials(person)}
    </span>
  );
  if (ring === undefined) return inner;
  return <span className={cn("rounded-full border-[3px] p-[3px]", ring ? "border-teal" : "border-line", className)}>{inner}</span>;
}
