// Shared button looks. Teal is reserved for match actions (offer, join, invite, accept).
// Hover darkens or tints; press nudges the button down so a tap always feels answered.
const base =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

export const btn = {
  primary: `${base} bg-ink text-white hover:bg-ink/80`,
  match: `${base} bg-teal text-white hover:bg-[#0b5f58]`,
  secondary: `${base} border border-line bg-white text-ink hover:border-ink/30 hover:bg-sunken`,
  ghost: `${base} text-ink hover:bg-sunken`,
  /** Settled state after an action, e.g. "Requested". */
  done: `${base} border border-teal/30 bg-teal-tint text-teal hover:border-teal/60`,
};

/** Hover for clickable cards and tiles: border darkens, nothing moves. */
export const cardHover = "transition-colors duration-150 hover:border-ink/25";
