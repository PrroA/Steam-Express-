import Link from 'next/link';

const quickTags = ['開放世界', '多人連線', '劇情向', '獨立遊戲', '特價中'];

export function Carousel() {
  return (
    <section className="steam-fade-up mx-auto mt-5 w-[95%] max-w-6xl overflow-hidden rounded-2xl border border-[#66c0f433] bg-[#111f2ce6] shadow-2xl">
      <div className="relative grid gap-5 p-5 md:grid-cols-[1.3fr_1fr] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(102,192,244,0.25),transparent_42%)]" />
        <div className="relative">
          <p className="mb-3 inline-block rounded-full border border-[#66c0f466] bg-[#1b2f44] px-3 py-1 text-xs font-bold tracking-[0.15em] text-[#9fc4df]">
            FEATURED COLLECTION
          </p>
          <h1 className="text-3xl font-black leading-tight text-[#d8e6f3] md:text-5xl">
            Discover Your Next
            <br />
            Favorite Game
          </h1>
          <p className="mt-4 max-w-xl text-sm text-[#a9bfd2] md:text-base">
            以 Steam 風格打造的練習商店。瀏覽、比較、收藏，再用最少步驟完成購買流程。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {quickTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#66c0f455] bg-[#162a3d] px-3 py-1 text-xs font-semibold text-[#c0d8eb]"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/wishlist" className="steam-btn rounded-md px-5 py-2 text-sm transition-all">
              前往願望清單
            </Link>
            <Link
              href="/orders"
              className="rounded-md border border-[#66c0f455] bg-[#1a2a3b] px-5 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
            >
              查看訂單
            </Link>
          </div>
        </div>

        <div className="relative rounded-xl border border-[#66c0f42e] bg-[linear-gradient(140deg,#1c2f44,#142230)] p-5">
          <p className="text-xs font-bold tracking-[0.14em] text-[#8cc8ea]">WEEKEND DEAL</p>
          <p className="mt-2 text-2xl font-extrabold text-[#d8e6f3]">Action & RPG Bundle</p>
          <p className="mt-2 text-sm text-[#a9bfd2]">最多 60% OFF，限時活動結束前可加入購物車。</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[#66c0f433] bg-[#1a3044] p-3">
              <p className="text-xs text-[#9db8cc]">最低折扣</p>
              <p className="text-xl font-black text-[#8bc53f]">-30%</p>
            </div>
            <div className="rounded-lg border border-[#66c0f433] bg-[#1a3044] p-3">
              <p className="text-xs text-[#9db8cc]">最高折扣</p>
              <p className="text-xl font-black text-[#8bc53f]">-60%</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
