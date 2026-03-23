import Link from 'next/link';

export function ErrorPageView({
  code,
  title,
  description,
  primaryLabel = '回到首頁',
  primaryHref = '/',
}) {
  return (
    <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="steam-panel w-full max-w-2xl rounded-2xl border border-[#66c0f455] p-8 text-center md:p-10">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">SYSTEM MESSAGE</p>
        <p className="mt-3 text-6xl font-black text-[#66c0f4]">{code}</p>
        <h1 className="mt-3 text-3xl font-black text-[#d8e6f3]">{title}</h1>
        <p className="mt-2 text-sm text-[#9eb4c8]">{description}</p>

        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link href={primaryHref} className="steam-btn rounded-md px-5 py-2 text-sm">
            {primaryLabel}
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-5 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
          >
            重新整理
          </button>
        </div>
      </section>
    </main>
  );
}
