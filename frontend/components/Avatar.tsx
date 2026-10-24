import { tints } from "@/lib/cover";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Initials on the person's discipline tint. `dashed` marks an invited, not-yet-joined member. */
export function Avatar({
  person,
  size = 36,
  dashed,
  ring,
  className,
}: {
  person: Pick<Person, "initials" | "tint">;
  size?: number;
  dashed?: boolean;
  /** Teal ring for swap or ring partners. */
  ring?: boolean;
  className?: string;
}) {
  const { fg, bg } = tints[person.tint];
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
        !ring && className,
      )}
    >
      {person.initials}
    </span>
  );
  if (ring === undefined) return inner;
  return (
    <span className={cn("rounded-full border-[3px] p-[3px]", ring ? "border-teal" : "border-line", className)}>{inner}</span>
  );
}
