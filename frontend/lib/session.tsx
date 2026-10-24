"use client";

// Sign-in is a name only: POST /auth/name finds the person by name (or creates them) and returns a real
// Supabase session, which we store so the API gets a token and per-user rules work. No email, no password.
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
  /** Signs in as the person with this name, creating them if new. Returns their profile. */
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

  const signIn = useCallback(async (name: string) => {
    const session = await api<{ access_token: string; refresh_token: string }>("/auth/name", {
      method: "POST",
      body: { name: name.trim() },
    });
    const { error } = await supabase().auth.setSession(session);
    if (error) throw error;
    setSignedIn(true);
    invalidate("/");
    const next = await api<MeOut>("/me");
    setMe(next);
    return next;
  }, []);

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
