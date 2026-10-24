// Neutral ramp: color is reserved for discipline, so languages get shades of ink.
const shades = ["#101c26", "#5b6b78", "#a9b4bd", "#d3d9de"];

export function LanguageBar({ languages }: { languages: { name: string; pct: number }[] }) {
  return (
    <div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={languages.map((l) => `${l.name} ${l.pct}%`).join(", ")}>
        {languages.map((l, i) => (
          <span key={l.name} style={{ width: `${l.pct}%`, background: shades[i % shades.length] }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-ink">
        {languages.map((l, i) => (
          <li key={l.name} className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px]" style={{ background: shades[i % shades.length] }} />
            {l.name} <span className="text-ink">{l.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
