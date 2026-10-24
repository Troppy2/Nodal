import Link from "next/link";
import { ArrowRight, Check, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { CoverArt } from "@/components/feed/CoverArt";
import { SignInButton, SignInForm } from "@/components/landing/SignInButton";
import { Label } from "@/components/Meta";
import { Logo } from "@/components/shell/Logo";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";

const steps = [
  {
    n: "1",
    title: "Post what you're missing",
    body: "An idea or a project, the skills it needs, and the discipline each one comes from.",
  },
  {
    n: "2",
    title: "See who fits",
    body: "Every need shows the people who can fill it, and what their projects need back.",
  },
  {
    n: "3",
    title: "Invite, message, build",
    body: "Invites are DMs, so the confirmation you see is the message they get. Follow up in the same thread.",
  },
];

const samplePeople = [
  { id: "demo-maya", handle: "maya", display_name: "Maya Okafor", avatar_url: null, skill: "ESP32 firmware", tag: "Swap" },
  { id: "demo-dev", handle: "dev", display_name: "Dev Rahman", avatar_url: null, skill: "Sound design", tag: "Ring" },
  { id: "demo-rin", handle: "rin", display_name: "Rin Castillo", avatar_url: null, skill: "Generative art", tag: "Ring" },
];

function MatchPreview() {
  return (
    <div className="mx-auto w-full max-w-[460px] lg:mx-0">
      <div className="rounded-xl border border-line bg-white p-4">
        <div className="flex items-center gap-3">
          <CoverArt cover={{ pattern: "rings", tint: "creative" }} seed="soil-choir" className="size-14 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <Label>Example project</Label>
            <p className="truncate text-lg font-extrabold leading-tight tracking-tight">Soil Choir</p>
            <p className="text-xs text-muted-ink">Creative · Idea</p>
          </div>
          <span className="shrink-0 rounded-md bg-teal-tint px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-teal">
            3 needs
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-line">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <Label>People who fit</Label>
            <span className="text-xs text-muted-ink">3</span>
          </div>
          <ul className="divide-y divide-line">
            {samplePeople.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <Avatar person={p} size={32} />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-semibold">{p.display_name}</p>
                  <p className="truncate text-xs text-muted-ink">{p.skill}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold",
                    p.tag === "Swap" ? "border-teal/40 text-teal" : "border-line text-muted-ink",
                  )}
                >
                  {p.tag}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg bg-sunken px-3 py-2.5">
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-teal" />
          <p className="text-xs leading-snug">
            <span className="font-semibold">Invite sent to Maya.</span>{" "}
            <span className="text-muted-ink">It&apos;s already in Messages — the confirmation and the DM are the same thing.</span>
          </p>
        </div>
      </div>
      <p className="mt-2.5 text-center text-xs text-muted-ink lg:text-left">Preview with sample data. Your matches come from your skills.</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-3 px-5">
          <Logo />
          <nav aria-label="Landing" className="flex items-center gap-1">
            <a href="#how" className="flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-muted-ink hover:bg-sunken hover:text-ink max-sm:hidden">
              How it works
            </a>
            <a href="#swaps" className="flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-muted-ink hover:bg-sunken hover:text-ink max-sm:hidden">
              Swaps and rings
            </a>
            <SignInButton variant="ghost" />
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1120px] gap-12 px-5 pb-16 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-center lg:gap-16 lg:pb-20 lg:pt-16">
          <div>
            <p className="flex items-center gap-2 text-[13px] font-semibold text-muted-ink">
              <span className="size-2 rounded-full bg-teal" aria-hidden />
              Social Hack 2026 · Social Coding Club
            </p>
            <h1 className="mt-4 max-w-[14ch] text-[42px] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[56px] lg:text-[64px]">
              Find the people your project is missing.
            </h1>
            <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink/80">
              Post what you&apos;re building and what it needs. Nodal matches skills both ways, finds the swaps and rings where help
              runs in circles, and lets you invite the right person from a single message.
            </p>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium">
              {["Match by skill", "Swap and ring detection", "Invites are DMs"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="size-4 text-teal" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>

            <div id="sign-in" className="mt-8 max-w-[420px] scroll-mt-24 rounded-xl border border-line p-5">
              <h2 className="text-lg font-extrabold tracking-tight">Sign in with your name</h2>
              <p className="mb-4 mt-1 text-sm leading-relaxed text-muted-ink">
                Your name is your account. No email, no password, no money.
              </p>
              <SignInForm />
            </div>
          </div>

          <MatchPreview />
        </section>

        <section id="how" className="scroll-mt-20 border-y border-line bg-sunken/40">
          <div className="mx-auto max-w-[1120px] px-5 py-14">
            <Label>How it works</Label>
            <h2 className="mt-1 text-[28px] font-extrabold tracking-[-0.02em] sm:text-[32px]">Three moves, one team.</h2>
            <ol className="mt-8 grid gap-8 sm:grid-cols-3">
              {steps.map((s) => (
                <li key={s.n} className="min-w-0">
                  <p className="flex size-7 items-center justify-center rounded-full bg-ink font-mono text-xs font-bold text-white">{s.n}</p>
                  <h3 className="mt-3 text-lg font-extrabold tracking-tight">{s.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted-ink">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="swaps" className="mx-auto grid max-w-[1120px] scroll-mt-20 gap-10 px-5 py-16 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <Label>Swaps and rings</Label>
            <h2 className="mt-1 max-w-[18ch] text-[28px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[32px]">
              You don&apos;t always need to hire. Sometimes you need to trade.
            </h2>
            <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-ink/80">
              A swap is two people filling each other&apos;s gaps. A ring is three: you design Dev&apos;s menus, Dev scores Rin&apos;s
              piece, Rin draws your visuals. Nodal spots both on the graph, so nobody has to map it by hand.
            </p>
            <Link href="#sign-in" className={cn(btn.primary, "mt-6")}>
              Find your swap <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="rounded-xl border border-line p-5">
            <ol className="flex flex-col gap-3">
              {[
                { from: "You", to: "Maya", give: "UI design", get: "ESP32 firmware", kind: "Swap" },
                { from: "Maya", to: "Dev", give: "Firmware", get: "Sound design", kind: "Ring" },
                { from: "Dev", to: "You", give: "Sound design", get: "UI design", kind: "Ring" },
              ].map((row) => (
                <li key={`${row.from}-${row.to}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2.5">
                  <span className="w-10 shrink-0 text-[11px] font-bold uppercase tracking-wide text-teal">{row.kind}</span>
                  <p className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{row.from}</span> {row.from === "You" ? "give" : "gives"}{" "}
                    <span className="font-semibold">{row.give}</span> to <span className="font-semibold">{row.to}</span>
                  </p>
                  <span className="shrink-0 text-xs text-muted-ink max-sm:mt-1 max-sm:block max-sm:w-full">gets {row.get}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-muted-ink">
              Every link shows up on the project graph and in the invite thread, so the trade is explicit.
            </p>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-6 px-5 py-12 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-[26px] font-extrabold tracking-[-0.02em]">Bring the missing piece.</h2>
              <p className="mt-1 text-[15px] text-muted-ink">Post an idea, offer a skill, or start a swap today.</p>
            </div>
            <Link href="#sign-in" className={cn(btn.primary, "h-12 px-6 text-[15px]")}>
              Sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[13px] text-muted-ink">
          <p>Built at Social Hack 2026 · Social Coding Club</p>
          <div className="flex gap-4">
            <Link href="/feed" className="font-semibold hover:text-ink hover:underline">
              Feed
            </Link>
            <Link href="/explore" className="font-semibold hover:text-ink hover:underline">
              Explore
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
