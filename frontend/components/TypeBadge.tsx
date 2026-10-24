import { tints, typeLabel } from "@/lib/cover";
import type { ProjectType } from "@/lib/types";

export function TypeBadge({ type }: { type: ProjectType }) {
  const { fg, bg } = tints[type];
  return (
    <span className="inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold" style={{ color: fg, background: bg }}>
      {typeLabel[type]}
    </span>
  );
}
