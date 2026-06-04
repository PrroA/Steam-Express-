import Link from 'next/link';

export function Carousel() {
  return (
    <section className="steam-fade-up mx-auto mt-5 w-[95%] max-w-6xl overflow-hidden rounded-xl border border-[#66c0f433] bg-[#111f2ce6]">
      <div className="p-5 md:p-8">
        <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">遊戲商店作品</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-[#d8e6f3] md:text-5xl">
          精選遊戲商店
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#a9bfd2] md:text-base">
          搜尋喜歡的作品，查看價格與詳情，快速找到下一款想玩的遊戲。
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/login" className="steam-btn rounded-md px-5 py-3 text-center text-sm transition-all">
            登入後開始購物流程
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-5 py-3 text-center text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
          >
            使用帳號登入
          </Link>
        </div>
      </div>
    </section>
  );
}
