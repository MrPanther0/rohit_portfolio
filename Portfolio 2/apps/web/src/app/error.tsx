'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the digest so a production incident can be traced in the logs.
    console.error('Unhandled route error', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">Something broke</p>
      <h1 className="display mt-6 text-fluid-2xl text-white">The exhibition tripped a fuse</h1>
      <p className="mt-5 max-w-md text-fluid-base leading-relaxed text-white/50">
        An unexpected error interrupted this page. Reloading usually settles it.
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.24em] text-white/25">
          Reference {error.digest}
        </p>
      ) : null}

      <button
        type="button"
        onClick={reset}
        className="mt-10 rounded-full bg-bone px-7 py-3.5 text-sm font-medium text-void transition-colors hover:bg-white"
      >
        Try again
      </button>
    </div>
  );
}
