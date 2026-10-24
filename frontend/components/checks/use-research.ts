"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { ResearchOut } from "@/lib/api-types";

export type CheckId = "market" | "cool";

const POLL_MS = 2000;
const POLL_CAP_MS = 4 * 60 * 1000;
const finished = (s: ResearchOut["status"]) => s === "done" || s === "partial" || s === "failed";

/**
 * Latest checks for an idea (GET /projects/{id}/research/latest), plus starting a run and polling it.
 * A run covers the checks asked for, so a new run re-asks for the checks the latest run already has:
 * running the cool factor after a market check keeps the market report on screen.
 */
export function useResearch(projectId: string, enabled: boolean) {
  const [run, setRun] = useState<ResearchOut | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [starting, setStarting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);

  const poll = useCallback((id: string) => {
    if (timer.current) clearTimeout(timer.current);
    const tick = async () => {
      try {
        const next = await api<ResearchOut>(`/research/${id}`);
        setRun(next);
        if (!finished(next.status) && Date.now() - startedAt.current < POLL_CAP_MS) timer.current = setTimeout(tick, POLL_MS);
      } catch (e) {
        setError(e as Error);
      }
    };
    timer.current = setTimeout(tick, POLL_MS);
  }, []);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const latest = await api<ResearchOut>(`/projects/${projectId}/research/latest`);
      setRun(latest);
      if (!finished(latest.status)) {
        startedAt.current = Date.now();
        poll(latest.id);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setRun(null);
      else setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [enabled, projectId, poll]);

  useEffect(() => {
    load();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  const start = useCallback(
    async (check: CheckId) => {
      const have = run && run.status !== "failed" ? run.checks : [];
      const checks = [...new Set([...have, check])];
      setStarting(true);
      try {
        const res = await api<{ id: string; status: string; cached: boolean }>(`/projects/${projectId}/research`, {
          method: "POST",
          body: { checks },
        });
        if (res.cached) toast("Reused from earlier today");
        const next = await api<ResearchOut>(`/research/${res.id}`);
        setRun(next);
        if (!finished(next.status)) {
          startedAt.current = Date.now();
          poll(res.id);
        }
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setStarting(false);
      }
    },
    [projectId, run, poll],
  );

  const setPublic = useCallback(
    async (isPublic: boolean) => {
      if (!run) return;
      const prev = run;
      setRun({ ...run, is_public: isPublic });
      try {
        setRun(await api<ResearchOut>(`/research/${run.id}`, { method: "PATCH", body: { is_public: isPublic } }));
      } catch (e) {
        setRun(prev);
        toast.error((e as Error).message);
      }
    },
    [run],
  );

  return { run, loading, error, starting, start, reload: load, setPublic };
}
