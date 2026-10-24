"use client";

// Sign-in is a name only. Under the hood it's a Supabase anonymous session (no email, no password),
// which gives the API a real user id and token so per-user rules work. The session lives in this browser.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, supabase } from "./api";
import type { MeOut } from "./api-types";
import { invalidate } from "./use-api";

interface Session {
  /** False until the stored session has been checked. */
  ready: boolean;
  signedIn: boolean;
  me: MeOut | null;
  refreshMe: () => Promise<MeOut | null>;
  /** Creates the anonymous session if needed and saves the name. Returns the fresh profile. */
  signIn: (name: string) => Promise<MeOut>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [me, setMe] = useState<MeOut | null>(null);

  const refreshMe = useCallback(async () => {
    try {
      const next = await api<MeOut>("/me");
      setMe(next);
      return next;
    } catch {
      setMe(null);
      return null;
    }
  }, []);

  useEffect(() => {
    supabase()
      .auth.getSession()
      .then(async ({ data }) => {
        const has = Boolean(data.session);
        setSignedIn(has);
        if (has) await refreshMe();
        setReady(true);
      });
  }, [refreshMe]);

  const signIn = useCallback(
    async (name: string) => {
      const { data } = await supabase().auth.getSession();
      if (!data.session) {
        const { error } = await supabase().auth.signInAnonymously();
        if (error) throw error;
      }
      setSignedIn(true);
      const next = await api<MeOut>("/me", { method: "PATCH", body: { display_name: name.trim() } });
      setMe(next);
      invalidate("/");
      return next;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase().auth.signOut();
    setSignedIn(false);
    setMe(null);
    invalidate("/");
  }, []);

  return <Ctx.Provider value={{ ready, signedIn, me, refreshMe, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession must be used inside SessionProvider");
  return s;
}
