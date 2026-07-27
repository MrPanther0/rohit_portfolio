import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(139,92,246,0.16), transparent 65%), radial-gradient(ellipse 50% 40% at 30% 70%, rgba(34,211,238,0.1), transparent 68%)',
        }}
      />

      <p className="eyebrow relative">Error 404</p>
      <h1 className="display relative mt-6 text-fluid-3xl text-white">Nothing here</h1>
      <p className="relative mt-5 max-w-md text-fluid-base leading-relaxed text-white/50">
        This page was either archived, renamed, or never existed. The work is all still where you left it.
      </p>

      <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-bone px-7 py-3.5 text-sm font-medium text-void transition-colors hover:bg-white"
        >
          Back to the start
        </Link>
        <Link
          href="/#work"
          className="rounded-full border border-white/25 px-7 py-3.5 text-sm text-bone transition-colors hover:border-white/50"
        >
          Browse the work
        </Link>
      </div>
    </div>
  );
}
