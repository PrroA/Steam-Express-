import { GameCard } from '../GameCard';
import type { Game } from '../../types/domain';
import type { AiRecommendationItem } from '../../services/aiRecommendationService';

interface AiRecommendationSectionProps {
  items: AiRecommendationItem[];
  comparedIds: number[];
  onToggleCompare: (id: number) => void;
  onQuickView?: (game: Game) => void;
}

export function AiRecommendationSection({
  items,
  comparedIds,
  onToggleCompare,
  onQuickView,
}: AiRecommendationSectionProps) {
  if (!items.length) return null;

  return (
    <section className="mb-7 rounded-xl border border-[#66c0f433] bg-[#122333] p-4">
      <div className="mb-4">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">AI 推薦</p>
        <h2 className="mt-1 text-2xl font-black text-[#d8e6f3]">根據你的瀏覽與購物行為</h2>
        <p className="mt-1 text-xs text-[#9eb4c8]">
          推薦理由會參考最近看過、願望清單、購物車與價格區間。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={`ai-recommend-${item.game.id}`} className="space-y-2">
            <GameCard
              game={item.game}
              onQuickView={onQuickView}
              onToggleCompare={onToggleCompare}
              isCompared={comparedIds.includes(item.game.id)}
            />
            <div className="rounded-md border border-[#66c0f433] bg-[#132434] px-3 py-2">
              <p className="text-xs font-bold text-[#8fd1ff]">AI 適合度 {item.score}%</p>
              {item.reasons.map((reason) => (
                <p key={reason} className="mt-1 text-xs text-[#b8d4e8]">
                  {reason}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
