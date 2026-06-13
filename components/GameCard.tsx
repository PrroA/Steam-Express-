import Image from 'next/image';
import Link from 'next/link';
import type { Game } from '../types/domain';

interface GameCardProps {
  game: Game;
  onQuickView?: (game: Game) => void;
  onToggleCompare?: (id: number) => void;
  isCompared?: boolean;
}

export function GameCard({ game, onQuickView, onToggleCompare, isCompared = false }: GameCardProps) {
  const priceNumber = parseFloat((game.price || '$0').replace('$', '')) || 0;
  const basePrice = priceNumber > 0 ? priceNumber * 1.35 : 1;
  const originalPrice = basePrice.toFixed(2);
  const discountPercent = Math.min(70, Math.max(5, Math.round((1 - priceNumber / basePrice) * 100)));
  const hasExtraActions = Boolean(onQuickView || onToggleCompare);

  return (
    <article
      className={`steam-panel group flex flex-col overflow-hidden rounded-xl transition duration-300 hover:-translate-y-1 hover:border-[#66c0f477] hover:bg-[#24384d] ${
        hasExtraActions ? 'min-h-[370px]' : 'min-h-[330px]'
      }`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
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
      <div className="flex flex-1 flex-col justify-between p-3.5">
        <div className="space-y-2">
          <h3 className="line-clamp-2 min-h-[48px] text-base font-extrabold leading-6 text-[#d8e6f3]">
            {game.name}
          </h3>
          <p className="line-clamp-2 min-h-[36px] text-xs leading-[18px] text-[#9eb4c8]">
            {game.description || '目前沒有商品介紹。'}
          </p>
          <div className="flex items-end justify-between gap-2">
            <span className="text-xs text-[#8ca7bc] line-through">${originalPrice}</span>
            <span className="text-lg font-black text-[#8bc53f]">{game.price}</span>
          </div>
        </div>
        <div className={`mt-4 grid gap-2 ${onQuickView ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <Link href={`/game/${game.id}`} className="steam-btn w-full rounded-md py-2 text-center text-sm transition-all">
            查看商品
          </Link>
          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(game)}
              className="rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
            >
              快速瀏覽
            </button>
          )}
          {onToggleCompare && (
            <button
              type="button"
              onClick={() => onToggleCompare(game.id)}
              className={`col-span-full rounded-md border py-2 text-sm font-semibold transition ${
                isCompared
                  ? 'border-[#8bc53f88] bg-[#2d4727] text-[#d9f1ba] hover:bg-[#375a30]'
                  : 'border-[#66c0f455] bg-[#1b2f44] text-[#d8e6f3] hover:bg-[#24384d]'
              }`}
            >
              {isCompared ? '已加入比較' : '加入比較'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
