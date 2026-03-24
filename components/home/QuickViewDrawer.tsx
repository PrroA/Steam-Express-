import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Game } from '../../types/domain';

interface QuickViewDrawerProps {
  game: Game | null;
  onClose: () => void;
}

function getStockSummary(game: Game) {
  if (!Array.isArray(game.variants) || game.variants.length === 0) {
    return '一般版';
  }
  const total = game.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0);
  return `版本 ${game.variants.length} / 總庫存 ${total}`;
}

export function QuickViewDrawer({ game, onClose }: QuickViewDrawerProps) {
  useEffect(() => {
    if (!game) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onEsc);
    };
  }, [game, onClose]);

  if (!game) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        onClick={onClose}
        aria-label="關閉快速預覽"
        className="absolute inset-0 bg-[#020b16cc] backdrop-blur-[1px]"
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md border-l border-[#66c0f466] bg-[#0f1d2d] shadow-[0_0_50px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-[#66c0f433] px-5 py-4">
          <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">QUICK VIEW</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#66c0f455] px-3 py-1 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
          >
            關閉
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="relative h-52 w-full overflow-hidden rounded-lg border border-[#66c0f433]">
            <Image
              src={game.image || '/vercel.svg'}
              alt={game.name}
              fill
              sizes="(max-width: 768px) 100vw, 450px"
              style={{ objectFit: 'cover' }}
            />
          </div>

          <div>
            <h3 className="text-2xl font-black text-[#d8e6f3]">{game.name}</h3>
            <p className="mt-2 text-sm leading-6 text-[#b4ccde]">
              {game.description || 'No description available.'}
            </p>
          </div>

          <div className="rounded-lg border border-[#66c0f433] bg-[#13273a] p-4">
            <p className="text-xs text-[#8fb8d5]">目前價格</p>
            <p className="mt-1 text-3xl font-black text-[#8bc53f]">{game.price || '$0.00'}</p>
            <p className="mt-2 text-xs text-[#9eb4c8]">{getStockSummary(game)}</p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/game/${game.id}`}
              className="steam-btn inline-flex flex-1 items-center justify-center rounded-md px-4 py-2 text-sm"
            >
              前往詳情頁
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#66c0f455] px-4 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
            >
              繼續瀏覽
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
