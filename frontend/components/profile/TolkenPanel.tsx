"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/project/states";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { LedgerEntry, TolkenOut } from "@/lib/api-types";
import { formatTolken } from "@/lib/cover";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { invalidate, useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

const statusLabel: Record<LedgerEntry["status"], string> = {
  pending_funding: "Waiting for funding",
  funded: "Funded",
  released: "Paid",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

/** Own Tolken: balance and every bounty you fund or earn. Owners release or cancel from here. */
export function TolkenPanel() {
  const { me, refreshMe } = useSession();
  const tolken = useApi<TolkenOut>("/me/tolken");
  const [busy, setBusy] = useState<string | null>(null);

  async function act(entry: LedgerEntry, action: "release" | "cancel") {
    setBusy(entry.id);
    try {
      await api(`/tolken/${entry.id}/${action}`, { method: "POST" });
      toast.success(action === "release" ? `Paid ${formatTolken(entry.amount_tolken)} to ${entry.contributor?.handle}` : "Bounty cancelled");
      tolken.reload();
      invalidate("/projects/");
      refreshMe();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (tolken.error) return <ErrorState message={tolken.error.message} onRetry={tolken.reload} />;
  if (!tolken.data)
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );

  const earned = tolken.data.ledger
    .filter((e) => e.status === "released" && e.contributor?.id === me?.profile.id)
    .reduce((s, e) => s + e.amount_tolken, 0);

  return (
    <section>
      <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[15px]">
        <span>
          Balance <span className="font-semibold">{formatTolken(tolken.data.balance)}</span>
        </span>
        <span className="text-sm text-muted-ink">
          Earned <span className="font-semibold text-ink">{formatTolken(earned)}</span>
        </span>
      </p>
      {tolken.data.ledger.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line px-6 py-8 text-center text-sm text-muted-ink">
          No bounties yet. Add a Tolken bounty to a need when you post, or fill someone else&apos;s.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {tolken.data.ledger.map((e) => {
            const mine = e.owner.id === me?.profile.id;
            return (
              <li key={e.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/projects/${e.project_id}?tab=needs`} className="text-sm font-semibold hover:underline">
                    {e.project_title}
                  </Link>
                  <p className="text-[13px] text-muted-ink">
                    {e.skill}
                    {mine
                      ? e.contributor
                        ? `, filled by ${e.contributor.handle}`
                        : ", no one assigned yet"
                      : `, from ${e.owner.handle}`}
                  </p>
                </div>
                <span className={cn("text-xs", e.status === "released" ? "text-teal" : "text-muted-ink")}>{statusLabel[e.status]}</span>
                <span className="w-16 text-right text-sm font-semibold">{formatTolken(e.amount_tolken)}</span>
                {mine && (e.status === "funded" || e.status === "pending_funding") && (
                  <div className="flex gap-2">
                    {e.status === "funded" && e.contributor && (
                      <button className={cn(btn.match, "h-9")} disabled={busy === e.id} onClick={() => act(e, "release")}>
                        {busy === e.id && <Loader2 className="size-4 animate-spin" />}
                        Pay {e.contributor.handle}
                      </button>
                    )}
                    <button className={cn(btn.ghost, "h-9")} disabled={busy === e.id} onClick={() => act(e, "cancel")}>
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[13px] text-muted-ink">Tolken is Nodal&apos;s in-app currency. There is no money, checkout, or payout.</p>
    </section>
  );
}
