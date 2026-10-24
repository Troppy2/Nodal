import { Label } from "@/components/Meta";
import type { MarketReport, Source } from "@/lib/seed-results";

const verdictLabel: Record<MarketReport["verdict"], string> = {
  promising: "Promising",
  mixed: "Mixed",
  weak: "Weak",
  not_enough_evidence: "Not enough evidence",
};

function domainPath(url: string) {
  const u = new URL(url);
  return (u.hostname + u.pathname).replace(/\/$/, "");
}

/** Market check report. All text renders as plain text; every cited item links its numbered sources. */
export function ResearchReport({
  report,
  sources,
  facts,
  isSample,
}: {
  report: MarketReport;
  sources: Source[];
  /** fact id -> source id */
  facts: Record<string, string>;
  isSample?: boolean;
}) {
  const sourceIndex = (factIds: string[]) =>
    [...new Set(factIds.map((f) => sources.findIndex((s) => s.id === facts[f])).filter((i) => i >= 0))].sort();

  function Cites({ factIds }: { factIds: string[] }) {
    return (
      <>
        {sourceIndex(factIds).map((i) => (
          <a
            key={i}
            href={`#src-${sources[i].id}`}
            className="ml-1 align-super font-mono text-[10px] text-muted-ink hover:text-ink"
            aria-label={`Source ${i + 1}`}
          >
            [{i + 1}]
          </a>
        ))}
      </>
    );
  }

  function Section({ title, items }: { title: string; items: { text: string; fact_ids: string[] }[] }) {
    if (items.length === 0) return null;
    return (
      <section className="mt-5">
        <Label>{title}</Label>
        <ul className="mt-1.5 flex flex-col gap-1.5 text-sm leading-relaxed">
          {items.map((d) => (
            <li key={d.text}>
              {d.text}
              <Cites factIds={d.fact_ids} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label>Verdict · {report.confidence} confidence</Label>
          <p className="mt-0.5 text-2xl font-extrabold tracking-tight">{verdictLabel[report.verdict]}</p>
        </div>
        {isSample && <Label className="rounded-md border border-line px-2 py-1">Sample report (demo data)</Label>}
      </div>
      <p className="mt-3 text-[15px] leading-relaxed">{report.summary}</p>

      {report.competitors.length > 0 && (
        <section className="mt-5">
          <Label>Competitors</Label>
          <ul className="mt-1.5 divide-y divide-line border-y border-line text-sm leading-relaxed">
            {report.competitors.map((c) => (
              <li key={c.name} className="py-2">
                <span className="font-semibold">{c.name}.</span> {c.what}
                <Cites factIds={c.fact_ids} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <Section title="Demand" items={report.demand_signals} />
      <Section title="Market size" items={report.market_size} />
      <Section title="Business models" items={report.business_models} />
      <Section title="Risks" items={report.risks} />
      {report.next_steps.length > 0 && (
        <section className="mt-5">
          <Label>Next steps</Label>
          <ol className="mt-1.5 flex list-decimal flex-col gap-1 pl-5 text-sm leading-relaxed">
            {report.next_steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-5">
        <Label>Sources</Label>
        <ol className="mt-1.5 flex flex-col gap-1 text-[13px]">
          {sources.map((s, i) => (
            <li key={s.id} id={`src-${s.id}`} className="flex gap-2">
              <span className="font-mono text-muted-ink">{i + 1}</span>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate hover:underline">
                {s.title} <span className="text-muted-ink">· {domainPath(s.url)}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>
      <p className="mt-5 border-t border-line pt-3 text-xs leading-relaxed text-muted-ink">
        AI-generated from web sources. A starting point, not business, legal, or financial advice. Verify before acting.
      </p>
    </div>
  );
}
