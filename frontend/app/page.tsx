import { CoverArt } from "@/components/feed/CoverArt";
import { SignInButton, SignInForm } from "@/components/landing/SignInButton";
import { Logo } from "@/components/shell/Logo";

const steps = [
  { n: "1", title: "Post what you're missing", body: "An idea or a project, and the skills it needs from other disciplines." },
  { n: "2", title: "Get matched both ways", body: "See who can fill each need, and which projects need what you offer." },
  { n: "3", title: "Build in swaps and rings", body: "You help them, they help you. Or a ring of three where everyone gets help." },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-5">
        <Logo />
        <SignInButton variant="ghost" />
      </header>

      <main className="mx-auto grid max-w-[1100px] items-center gap-10 px-5 pb-16 pt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-16">
        <section>
          <h1 className="text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[56px]">
            Find the people your project is missing.
          </h1>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-ink/80">
            Post what you&apos;re building and what it needs. Nodal matches you with people who have the skill, and spots the trades
            where you can help each other.
          </p>
          <div id="sign-in" className="mt-8 scroll-mt-24">
            <SignInForm />
          </div>
        </section>

        <div className="relative hidden aspect-square overflow-hidden rounded-2xl lg:block">
          <CoverArt cover={{ pattern: "rings", tint: "creative" }} seed="nodal-landing" className="absolute inset-0" />
        </div>
      </main>

      <section className="border-t border-line">
        <ol className="mx-auto grid max-w-[1100px] gap-8 px-5 py-12 sm:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n}>
              <p className="flex size-6 items-center justify-center rounded-full bg-teal-tint text-xs font-bold text-teal">{s.n}</p>
              <h2 className="mt-3 text-lg font-extrabold tracking-tight">{s.title}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-ink">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
