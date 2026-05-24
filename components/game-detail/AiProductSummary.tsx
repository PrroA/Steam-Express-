import { useEffect, useState } from 'react';
import { FaMagic, FaRegLightbulb } from 'react-icons/fa';
import type { Game } from '../../types/domain';
import { buildClientPreferenceProfile } from '../../utils/aiPreferenceProfile';

type ProductAiSummary = {
  fitFor: string[];
  notFor: string[];
  highlights: string[];
  buyingTip: string;
  source: 'openai' | 'fallback';
};

interface AiProductSummaryProps {
  game: Game;
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-[#66c0f433] bg-[#101d2a] p-3">
      <p className="text-xs font-bold tracking-[0.12em] text-[#8fb8d5]">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[#c5dced]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8bc53f]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiProductSummary({ game }: AiProductSummaryProps) {
  const [summary, setSummary] = useState<ProductAiSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadSummary = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/ai-product-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: {
              id: game.id,
              name: game.name,
              price: game.price,
              description: game.description,
              variants: game.variants || [],
            },
            userProfile: buildClientPreferenceProfile(game),
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('summary failed');
        const data = await response.json();
        if (!cancelled) setSummary(data);
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadSummary();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [game]);

  return (
    <section className="mt-5 rounded-xl border border-[#8bc53f44] bg-[#102217] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#b7df9e]">AI 商品摘要</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-[#e0f4d9]">
            <FaMagic className="text-[#8bc53f]" aria-hidden />
            購買前快速判斷
          </h2>
        </div>
        <span className="rounded-full border border-[#8bc53f55] bg-[#18351e] px-3 py-1 text-xs font-bold text-[#c9f0b8]">
          {summary?.source === 'openai' ? 'AI 整理' : '依商品資料整理'}
        </span>
      </div>

      {isLoading && <p className="mt-4 text-sm text-[#9ec09e]">正在整理這款遊戲適合哪些玩家...</p>}

      {!isLoading && !summary && (
        <p className="mt-4 text-sm leading-6 text-[#9ec09e]">
          這款商品目前可以先看價格、版本與玩家評論來判斷是否適合你。
        </p>
      )}

      {!isLoading && summary && (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <SummaryList title="適合你，如果你喜歡" items={summary.fitFor} />
            <SummaryList title="可能不適合，如果你想要" items={summary.notFor} />
          </div>
          <SummaryList title="值得注意" items={summary.highlights} />
          <div className="rounded-lg border border-[#8bc53f44] bg-[#132816] p-3 text-sm leading-6 text-[#d6edce]">
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-[#b7df9e]">
              <FaRegLightbulb aria-hidden />
              購買建議
            </p>
            <p className="mt-2">{summary.buyingTip}</p>
          </div>
        </div>
      )}
    </section>
  );
}
