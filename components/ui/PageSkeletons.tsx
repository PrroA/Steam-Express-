function PulseBlock({ className = '' }) {
  return <div className={`animate-pulse rounded bg-[#1a3043] ${className}`} />;
}

export function CartPageSkeleton() {
  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <PulseBlock className="h-8 w-48" />
        <PulseBlock className="mt-2 h-4 w-72" />
        <PulseBlock className="mt-4 h-2 w-full" />

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="steam-panel rounded-2xl p-4 md:p-5">
            <PulseBlock className="h-6 w-44" />
            <PulseBlock className="mt-2 h-4 w-64" />
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="rounded-xl border border-[#66c0f433] bg-[#142536] p-3 md:p-4">
                  <div className="flex items-center gap-3">
                    <PulseBlock className="h-16 w-24" />
                    <div className="flex-1">
                      <PulseBlock className="h-4 w-2/3" />
                      <PulseBlock className="mt-2 h-3 w-1/3" />
                    </div>
                    <PulseBlock className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="steam-panel h-fit rounded-2xl p-5">
            <PulseBlock className="h-4 w-24" />
            <PulseBlock className="mt-2 h-7 w-32" />
            <div className="mt-4 space-y-2 rounded-lg border border-[#66c0f433] bg-[#132334] p-4">
              <PulseBlock className="h-4 w-full" />
              <PulseBlock className="h-4 w-full" />
              <PulseBlock className="h-4 w-full" />
            </div>
            <PulseBlock className="mt-4 h-10 w-full" />
            <PulseBlock className="mt-2 h-10 w-full" />
          </aside>
        </div>
      </section>
    </main>
  );
}

export function OrdersPageSkeleton() {
  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <PulseBlock className="h-4 w-28" />
        <PulseBlock className="mt-2 h-8 w-48" />
        <PulseBlock className="mt-2 h-4 w-64" />

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          {[0, 1].map((item) => (
            <div key={item} className="steam-panel rounded-2xl p-5">
              <PulseBlock className="h-6 w-36" />
              <PulseBlock className="mt-3 h-10 w-full" />
              <PulseBlock className="mt-2 h-10 w-full" />
              <PulseBlock className="mt-2 h-10 w-full" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function WishlistPageSkeleton() {
  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <div className="rounded-2xl border border-[#66c0f433] bg-[#132434] p-5">
          <PulseBlock className="h-4 w-36" />
          <PulseBlock className="mt-2 h-8 w-56" />
          <PulseBlock className="mt-2 h-4 w-80" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <article key={item} className="steam-panel flex gap-4 rounded-2xl border border-[#66c0f433] p-4">
              <PulseBlock className="h-32 w-52" />
              <div className="flex flex-1 flex-col gap-3">
                <PulseBlock className="h-6 w-2/3" />
                <PulseBlock className="h-4 w-full" />
                <div className="mt-auto flex items-center justify-between">
                  <PulseBlock className="h-6 w-20" />
                  <PulseBlock className="h-9 w-24" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

