import Image from 'next/image';
import Link from 'next/link';

export function GameCard({ game, onQuickView, onToggleCompare, isCompared = false }) {
  const priceNumber = parseFloat((game.price || '$0').replace('$', '')) || 0;
  const basePrice = priceNumber > 0 ? priceNumber * 1.35 : 1;
  const originalPrice = basePrice.toFixed(2);
  const discountPercent = Math.min(70, Math.max(5, Math.round((1 - priceNumber / basePrice) * 100)));

  return (
    <article className="steam-panel group flex h-[370px] flex-col overflow-hidden rounded-xl transition duration-300 hover:-translate-y-1 hover:border-[#66c0f477] hover:bg-[#24384d]">
      <div className="relative h-[205px] w-full overflow-hidden">
        <Image
          src={game.image || '/vercel.svg'}
          alt={game.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: 'cover' }}
          className="transition duration-300 group-hover:scale-105"
          priority
        />
        <div className="absolute left-3 top-3 rounded bg-[#1b2f44d9] px-2 py-1 text-xs font-bold text-[#8bc53f]">
          -{discountPercent}%
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="space-y-2">
          <h3 className="min-h-14 text-lg font-extrabold text-[#d8e6f3]">{game.name}</h3>
          <p className="text-xs text-[#9eb4c8]">{game.description || 'No description available.'}</p>
          <div className="flex items-end gap-2">
            <span className="text-xs text-[#8ca7bc] line-through">${originalPrice}</span>
            <span className="text-lg font-black text-[#8bc53f]">{game.price}</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={`/game/${game.id}`}>
            <button className="steam-btn w-full rounded-md py-2 text-sm transition-all">查看詳情</button>
          </Link>
          <button
            type="button"
            onClick={() => onQuickView?.(game)}
            className="rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
          >
            快速預覽
          </button>
          <button
            type="button"
            onClick={() => onToggleCompare?.(game.id)}
            className={`col-span-2 rounded-md border py-2 text-sm font-semibold transition ${
              isCompared
                ? 'border-[#8bc53f88] bg-[#2d4727] text-[#d9f1ba] hover:bg-[#375a30]'
                : 'border-[#66c0f455] bg-[#1b2f44] text-[#d8e6f3] hover:bg-[#24384d]'
            }`}
          >
            {isCompared ? '已加入比較' : '加入比較'}
          </button>
        </div>
      </div>
    </article>
  );
}
