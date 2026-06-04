import { useEffect, useState } from 'react';
import { FaMagic, FaRegLightbulb, FaRobot } from 'react-icons/fa';
import type { Game } from '../../types/domain';
import { buildClientPreferenceProfile } from '../../utils/aiPreferenceProfile';
import type { BrowserAiCapability, BuyingAdvice } from '../../utils/browserBuyingAdvice';
import {
  buildFallbackBuyingAdvice,
  generateBrowserBuyingAdvice,
  getBrowserAiCapability,
} from '../../utils/browserBuyingAdvice';
import { AiSourceBadge } from '../ui/AiSourceBadge';

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
  const [buyingAdvice, setBuyingAdvice] = useState<BuyingAdvice | null>(null);
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);
  const [browserAiCapability, setBrowserAiCapability] = useState<BrowserAiCapability | null>(null);

  const loadBuyingAdvice = async () => {
    const profile = buildClientPreferenceProfile(game);
    setIsAdviceLoading(true);
    setBuyingAdvice(buildFallbackBuyingAdvice(game, profile));
    try {
      const advice = await generateBrowserBuyingAdvice(game, profile);
      setBuyingAdvice(advice);
    } finally {
      setIsAdviceLoading(false);
    }
  };

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

  useEffect(() => {
    let cancelled = false;

    getBrowserAiCapability().then((capability) => {
      if (!cancelled) setBrowserAiCapability(capability);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section data-testid="ai-product-summary" className="rounded-xl border border-[#8bc53f44] bg-[#102217] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#b7df9e]">AI 商品摘要</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-[#e0f4d9]">
            <FaMagic className="text-[#8bc53f]" aria-hidden />
            適不適合你？
          </h2>
        </div>
        <AiSourceBadge source={summary?.source} />
      </div>

      {isLoading && <p className="mt-4 text-sm text-[#9ec09e]">正在整理這款遊戲的重點...</p>}

      {!isLoading && !summary && (
        <p className="mt-4 text-sm leading-6 text-[#9ec09e]">
          這款商品目前可以先看價格、版本與玩家心得來判斷是否適合你。
        </p>
      )}

      {!isLoading && summary && (
        <div className="mt-4 grid gap-3">
          <div className="rounded-lg border border-[#8bc53f44] bg-[#132816] p-3 text-sm leading-6 text-[#d6edce]">
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-[#b7df9e]">
              <FaRegLightbulb aria-hidden />
              重點建議
            </p>
            <p className="mt-2">{summary.buyingTip}</p>
          </div>

          <details className="rounded-lg border border-[#66c0f433] bg-[#101d2a] p-3">
            <summary className="cursor-pointer text-sm font-bold text-[#d8e6f3]">
              查看更多判斷
            </summary>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <SummaryList title="適合你，如果你喜歡" items={summary.fitFor} />
                <SummaryList title="可能不適合，如果你想要" items={summary.notFor} />
              </div>
              <SummaryList title="值得注意" items={summary.highlights} />
            </div>
          </details>

          <div className="rounded-lg border border-[#66c0f433] bg-[#101d2a] p-3 text-sm leading-6 text-[#d7e8f4]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-[#8fb8d5]">
                  <FaRobot aria-hidden />
                  想更快決定？
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#66c0f455] bg-[#13283a] px-2.5 py-1 text-xs font-bold text-[#cceeff]">
                    {browserAiCapability?.label || '正在確認本機分析方式'}
                  </span>
                  {buyingAdvice && <AiSourceBadge source={buyingAdvice.source} prefix />}
                </div>
                <p className="mt-2 text-[#c5dced]">
                  {isAdviceLoading
                    ? '正在根據商品、版本與近期偏好整理建議。'
                    : browserAiCapability?.description ||
                      '可以根據商品、版本與近期偏好，整理一份購買判斷。'}
                </p>
              </div>
              <button
                data-testid="ai-buying-advice-button"
                type="button"
                onClick={loadBuyingAdvice}
                disabled={isAdviceLoading}
                className="rounded-md border border-[#66c0f466] bg-[#1b3b52] px-3 py-2 text-xs font-bold text-[#d8f1ff] transition hover:border-[#66c0f4] hover:bg-[#24506f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAdviceLoading ? '正在整理建議' : '幫我判斷'}
              </button>
            </div>

            {buyingAdvice && (
              <div data-testid="ai-buying-advice-result" className="mt-3 grid gap-3">
                <div className="rounded-md border border-[#66c0f422] bg-[#0e1924] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#8bc53f55] bg-[#17351f] px-2.5 py-1 text-xs font-bold text-[#c9f0b8]">
                      {buyingAdvice.verdict === 'recommended'
                        ? '適合優先考慮'
                        : buyingAdvice.verdict === 'skip'
                          ? '建議先略過'
                          : '可以再比較'}
                    </span>
                  </div>
                  <p className="mt-2 text-[#d7e8f4]">{buyingAdvice.summary}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <SummaryList title="推薦理由" items={buyingAdvice.reasons} />
                  <SummaryList title="先注意" items={buyingAdvice.concerns} />
                </div>

                <details className="rounded-md border border-[#66c0f422] bg-[#0e1924] p-3">
                  <summary className="cursor-pointer text-sm font-bold text-[#d8e6f3]">
                    查看判斷依據
                  </summary>
                  <div className="mt-3">
                    <SummaryList title="判斷依據" items={buyingAdvice.evidence} />
                  </div>
                </details>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-[#66c0f422] bg-[#0e1924] p-3">
                    <p className="text-xs font-bold tracking-[0.12em] text-[#8fb8d5]">建議版本</p>
                    <p className="mt-2 text-[#d7e8f4]">{buyingAdvice.bestEdition}</p>
                  </div>
                  <div className="rounded-md border border-[#66c0f422] bg-[#0e1924] p-3">
                    <p className="text-xs font-bold tracking-[0.12em] text-[#8fb8d5]">下一步</p>
                    <p className="mt-2 text-[#d7e8f4]">{buyingAdvice.nextAction}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
