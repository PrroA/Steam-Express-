import Link from 'next/link';

export function Carousel() {
  return (
    <section className="steam-fade-up mx-auto mt-5 w-[95%] max-w-6xl overflow-hidden rounded-xl border border-[#66c0f433] bg-[#111f2ce6]">
      <div className="p-5 md:p-8">
        <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">遊戲商店</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-[#d8e6f3] md:text-5xl">
          找到下一款想玩的遊戲
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#a9bfd2] md:text-base">
          搜尋商品、比較差異、加入購物車，付款和訂單狀態都能在同一個流程完成。
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/#games" className="steam-btn rounded-md px-5 py-3 text-center text-sm transition-all">
            開始逛商店
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-5 py-3 text-center text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
          >
            登入 / 註冊
          </Link>
        </div>
      </div>
    </section>
  );
}
