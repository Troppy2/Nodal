// Shared button looks. Teal is reserved for match actions (offer, join, invite, accept).
const base =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const btn = {
  primary: `${base} bg-ink text-white hover:bg-ink/85`,
  match: `${base} bg-teal text-white hover:bg-teal/90`,
  secondary: `${base} border border-line bg-white text-ink hover:bg-sunken`,
  ghost: `${base} text-ink hover:bg-sunken`,
  /** Settled state after an action, e.g. "Requested". */
  done: `${base} border border-teal/30 bg-teal-tint text-teal`,
};
