import { tints } from "@/lib/cover";
import type { Cover, CoverPattern } from "@/lib/api-types";
import { cn } from "@/lib/utils";

// Deterministic per-project variation: the pattern and tint come from the API,
// the exact shapes come from a hash of the project id so no two covers repeat.
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

// Covers are drawn in a 400x240 box (5:3) and cropped to fill.
function Shapes({ pattern, color, seed }: { pattern: CoverPattern; color: string; seed: string }) {
  const r = rng(seed);
  switch (pattern) {
    case "rings": {
      const cx = 140 + r() * 120;
      const cy = 90 + r() * 60;
      const n = 4 + Math.floor(r() * 3);
      const gap = 26 + r() * 14;
      return (
        <g fill="none" stroke={color} strokeWidth="2">
          {Array.from({ length: n }, (_, i) => (
            <circle key={i} cx={cx} cy={cy} r={18 + (i + 1) * gap} opacity={1 - i / (n + 1)} />
          ))}
          <circle cx={cx} cy={cy} r="10" fill={color} stroke="none" />
        </g>
      );
    }
    case "bars": {
      // Rounded pills on a baseline: reads as sound, not a bar chart.
      const n = 7 + Math.floor(r() * 4);
      const gap = 12;
      const w = (280 - gap * (n - 1)) / n;
      let h = 50 + r() * 40;
      return (
        <g fill={color}>
          {Array.from({ length: n }, (_, i) => {
            h = Math.max(30, Math.min(140, h + (r() - 0.42) * 46));
            return (
              <rect
                key={i}
                x={60 + i * (w + gap)}
                y={190 - h}
                width={w}
                height={h}
                rx={w / 2}
                opacity={0.4 + (i / Math.max(1, n - 1)) * 0.6}
              />
            );
          })}
        </g>
      );
    }
    case "blocks": {
      const cols = 6;
      const size = 34;
      return (
        <g fill={color}>
          {Array.from({ length: cols * 4 }, (_, i) => {
            const v = r();
            if (v < 0.45) return null;
            const x = 92 + (i % cols) * (size + 4);
            const y = 44 + Math.floor(i / cols) * (size + 4);
            return <rect key={i} x={x} y={y} width={size} height={size} opacity={v > 0.85 ? 1 : v > 0.65 ? 0.6 : 0.3} />;
          })}
        </g>
      );
    }
    case "stripes": {
      const n = 7 + Math.floor(r() * 5);
      const tilt = (r() - 0.5) * 40;
      return (
        <g stroke={color} strokeWidth="2.5">
          {Array.from({ length: n }, (_, i) => {
            const y = 30 + (i * 180) / n + r() * 8;
            return <line key={i} x1="-20" x2="420" y1={y} y2={y + tilt} opacity={1 - (i / n) * 0.7} />;
          })}
        </g>
      );
    }
    case "dots": {
      const n = 7 + Math.floor(r() * 6);
      return (
        <g fill={color}>
          {Array.from({ length: n }, (_, i) => (
            <circle key={i} cx={40 + r() * 320} cy={30 + r() * 180} r={8 + r() * 22} opacity={0.3 + r() * 0.7} />
          ))}
        </g>
      );
    }
  }
}

export function CoverArt({
  cover,
  seed,
  coverUrl,
  className,
  children,
}: {
  cover: Cover;
  /** Usually the project id. */
  seed?: string;
  coverUrl?: string | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const { fg, bg } = tints[cover.tint];
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: bg }}>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
          <Shapes pattern={cover.pattern} color={fg} seed={seed ?? cover.pattern} />
        </svg>
      )}
      {children}
    </div>
  );
}
