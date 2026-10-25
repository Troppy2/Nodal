"use client";

import { useEffect, useState } from "react";

/** True when the person asked the OS to reduce motion. */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Reveals text one character at a time. `instant` skips the animation for history that was already
 * on screen when the page loaded; only the newest line types. Reduced motion renders instantly.
 */
export function Typewriter({
  text,
  instant = false,
  speed = 9,
  className,
}: {
  text: string;
  instant?: boolean;
  speed?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const still = instant || reduced;
  const [shown, setShown] = useState(still ? text.length : 0);

  useEffect(() => {
    if (still) {
      setShown(text.length);
      return;
    }
    setShown((n) => Math.min(n, text.length));
    const timer = setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          clearInterval(timer);
          return n;
        }
        return n + 1;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [text, still, speed]);

  return (
    <span className={className}>
      {text.slice(0, shown)}
      {shown < text.length && (
        <span aria-hidden className="ml-0.5 inline-block h-[0.95em] w-[2px] translate-y-[2px] animate-pulse bg-current align-baseline" />
      )}
    </span>
  );
}
