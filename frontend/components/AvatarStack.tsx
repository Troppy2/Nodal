import type { Person } from "@/lib/types";
import { Avatar } from "./Avatar";

export function AvatarStack({ people, max = 3, size = 24 }: { people: Person[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="flex items-center" aria-label={people.map((p) => p.name).join(", ")}>
      {shown.map((p, i) => (
        <span key={p.handle} className="rounded-full border-2 border-white" style={{ marginLeft: i ? -size / 3 : 0 }}>
          <Avatar person={p} size={size} />
        </span>
      ))}
      {extra > 0 && <span className="ml-1 font-mono text-[11px] text-muted-ink">+{extra}</span>}
    </span>
  );
}
