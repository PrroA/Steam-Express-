import Link from 'next/link';

function PulseBlock({ className = '' }) {
  return <div className={`animate-pulse rounded bg-[#1a3043] ${className}`} />;
}

export function GameDetailLoadingState() {
  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <PulseBlock className="mb-4 h-4 w-28" />

        <div className="steam-panel rounded-2xl p-4 md:p-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <PulseBlock className="h-80 w-full" />
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                  <PulseBlock key={item} className="h-16 w-full" />
                ))}
              </div>
              <PulseBlock className="mt-4 h-7 w-2/3" />
              <PulseBlock className="mt-2 h-4 w-full" />
              <PulseBlock className="mt-1 h-4 w-5/6" />
            </div>

            <div className="rounded-xl border border-[#66c0f433] bg-[#142536] p-4">
              <PulseBlock className="h-4 w-24" />
              <PulseBlock className="mt-2 h-8 w-36" />
              <PulseBlock className="mt-4 h-10 w-full" />
              <PulseBlock className="mt-2 h-10 w-full" />
              <PulseBlock className="mt-4 h-10 w-full" />
              <PulseBlock className="mt-2 h-10 w-full" />
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="steam-panel rounded-2xl p-5">
            <PulseBlock className="h-6 w-28" />
            <PulseBlock className="mt-3 h-24 w-full" />
            <PulseBlock className="mt-3 h-10 w-full" />
          </div>
          <div className="steam-panel rounded-2xl p-5">
            <PulseBlock className="h-6 w-24" />
            {[0, 1, 2].map((item) => (
              <div key={item} className="mt-3 rounded-lg border border-[#66c0f433] bg-[#102131] p-3">
                <PulseBlock className="h-4 w-1/3" />
                <PulseBlock className="mt-2 h-4 w-full" />
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export function GameDetailNotFoundState() {
  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="steam-panel w-full max-w-xl rounded-2xl p-8 text-center">
        <p className="text-2xl font-black text-[#ff7777]">遊戲未找到</p>
        <p className="mt-2 text-[#9eb4c8]">請檢查遊戲 ID 或稍後再試。</p>
        <Link href="/" className="steam-btn mt-5 inline-flex rounded-md px-5 py-2 text-sm">
          返回商店
        </Link>
      </div>
    </main>
  );
}
