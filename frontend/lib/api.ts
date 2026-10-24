"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

let client: SupabaseClient | null = null;

/** Browser Supabase client. Only used for the anonymous session; data goes through the API. */
export function supabase() {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "nodal-auth" },
  });
  return client;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Calls the FastAPI backend with the viewer's token when signed in. Errors carry the API's `detail`. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) detail = body.detail[0].msg;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
