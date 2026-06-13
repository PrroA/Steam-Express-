import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { fetchGames } from '../services/storeService';
import type { Game } from '../types/domain';
import { buildClientPreferenceProfile } from '../utils/aiPreferenceProfile';
import type { BrowserAiCapability, ComparisonAdvice } from '../utils/browserBuyingAdvice';
import {
  buildFallbackComparisonAdvice,
  generateBrowserComparisonAdvice,
  getBrowserAiCapability,
} from '../utils/browserBuyingAdvice';
import { AiSourceBadge } from '../components/ui/AiSourceBadge';

const compareStorageKey = 'compareGameIds';

function parseIds(raw: string | string[] | undefined): number[] {
  const source = Array.isArray(raw) ? raw[0] : raw;
  if (!source) return [];
  return source
    .split(',')
    .map((id) => Number(id))
    .filter(Boolean)
    .slice(0, 3);
}

function parsePrice(priceText: string) {
  return parseFloat((priceText || '$0').replace('$', '')) || 0;
}

function getStock(game: Game) {
  if (!Array.isArray(game.variants) || game.variants.length === 0) return 0;
  return game.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0);
}

function isGame(value: Game | undefined): value is Game {
  return Boolean(value);
}

export default function ComparePage() {
  const router = useRouter();
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [comparedIds, setComparedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyShowDiff, setOnlyShowDiff] = useState(false);
  const [aiSummary, setAiSummary] = useState<{
    headline: string;
    bestForBudget: string;
    bestForAvailability: string;
    recommendation: string;
    cautions: string[];
    source?: string;
  } | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [browserAiCapability, setBrowserAiCapability] = useState<BrowserAiCapability | null>(null);
  const [comparisonAdvice, setComparisonAdvice] = useState<ComparisonAdvice | null>(null);
  const [comparisonAdviceLoading, setComparisonAdviceLoading] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const idsFromQuery = parseIds(router.query.ids);
    if (idsFromQuery.length > 0) {
      setComparedIds(idsFromQuery);
      localStorage.setItem(compareStorageKey, JSON.stringify(idsFromQuery));
      return;
    }
    try {
      const raw = localStorage.getItem(compareStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setComparedIds(parsed.map((id) => Number(id)).filter(Boolean).slice(0, 3));
      }
    } catch {
      setComparedIds([]);
    }
  }, [router.isReady, router.query.ids]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchGames('');
        setAllGames(Array.isArray(data) ? data : []);
      } catch {
        setAllGames([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    let canceled = false;
    getBrowserAiCapability().then((capability) => {
      if (!canceled) setBrowserAiCapability(capability);
    });
    return () => {
      canceled = true;
    };
  }, []);

  const comparedGames = useMemo(() => {
    if (!comparedIds.length || !allGames.length) return [];
    const gameMap = new Map(allGames.map((game) => [game.id, game]));
    return comparedIds.map((id) => gameMap.get(id)).filter(isGame);
  }, [comparedIds, allGames]);

  const lowestPriceId = useMemo(() => {
    if (comparedGames.length === 0) return null;
    return comparedGames.reduce((best, game) =>
      parsePrice(game.price) < parsePrice(best.price) ? game : best
    ).id;
  }, [comparedGames]);

  const highestStockId = useMemo(() => {
    if (comparedGames.length === 0) return null;
    return comparedGames.reduce((best, game) => (getStock(game) > getStock(best) ? game : best)).id;
  }, [comparedGames]);

  const removeCompared = useCallback((id: number) => {
    setComparedIds((prev) => {
      const next = prev.filter((item) => item !== id);
      localStorage.setItem(compareStorageKey, JSON.stringify(next));
      return next;
    });
  }, []);

  const loadComparisonAdvice = async () => {
    if (comparedGames.length < 2) return;
    const profile = buildClientPreferenceProfile();
    setComparisonAdviceLoading(true);
    setComparisonAdvice(buildFallbackComparisonAdvice(comparedGames, profile));
    try {
      const advice = await generateBrowserComparisonAdvice(comparedGames, profile);
      setComparisonAdvice(advice);
    } finally {
      setComparisonAdviceLoading(false);
    }
  };

  useEffect(() => {
    if (comparedGames.length < 2) {
      setAiSummary(null);
      return;
    }

    let canceled = false;
    const fetchSummary = async () => {
      try {
        setAiSummaryLoading(true);
        const payload = comparedGames.map((game) => ({
          id: game.id,
          name: game.name,
          price: game.price,
          description: game.description,
          stock: getStock(game),
          variantCount: Array.isArray(game.variants) ? game.variants.length : 1,
        }));

        const response = await fetch('/api/ai-compare-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: payload }),
        });
        const data = await response.json();
        if (canceled) return;
        if (!response.ok) {
          setAiSummary(null);
          return;
        }
        setAiSummary({
          headline: data?.headline || '',
          bestForBudget: data?.bestForBudget || '',
          bestForAvailability: data?.bestForAvailability || '',
          recommendation: data?.recommendation || '',
          cautions: Array.isArray(data?.cautions) ? data.cautions : [],
          source: data?.source || 'fallback',
        });
      } catch {
        if (canceled) return;
        setAiSummary(null);
      } finally {
        if (!canceled) setAiSummaryLoading(false);
      }
    };

    fetchSummary();
    return () => {
      canceled = true;
    };
  }, [comparedGames]);

  const rows = useMemo(
    () => [
      {
        id: 'price',
        label: '價格',
        values: comparedGames.map((game) => game.price),
        bestIndex: comparedGames.findIndex((game) => game.id === lowestPriceId),
        compact: false,
      },
      {
        id: 'variants',
        label: '版本',
        values: comparedGames.map((game) =>
          Array.isArray(game.variants) ? `${game.variants.length} 種版本` : '1 種版本'
        ),
        bestIndex: -1,
        compact: false,
      },
      {
        id: 'stock',
        label: '庫存',
        values: comparedGames.map((game) => `${getStock(game)} 件`),
        bestIndex: comparedGames.findIndex((game) => game.id === highestStockId),
        compact: false,
      },
      {
        id: 'desc',
        label: '商品介紹',
        values: comparedGames.map((game) => game.description || '目前沒有商品介紹。'),
        bestIndex: -1,
        compact: true,
      },
    ],
    [comparedGames, highestStockId, lowestPriceId]
  );

  const rowDiffMap = useMemo(() => {
    const map = new Map<string, boolean>();
    rows.forEach((row) => {
      map.set(row.id, new Set(row.values).size > 1);
    });
    return map;
  }, [rows]);

  const visibleRows = useMemo(() => {
    if (!onlyShowDiff) return rows;
    return rows.filter((row) => rowDiffMap.get(row.id));
  }, [onlyShowDiff, rowDiffMap, rows]);

  if (loading) {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <p className="text-sm text-[#9eb4c8]">正在載入比較資料...</p>
      </main>
    );
  }

  if (comparedGames.length === 0) {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl p-8 text-center">
          <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">商品比較</p>
          <h1 className="mt-2 text-2xl font-black text-[#d8e6f3]">目前沒有可比較商品</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#9eb4c8]">
            先回商店挑 2 到 3 款商品，按「加入比較」後再回來，AI 助理就能幫你整理差異與選擇建議。
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/#games" className="steam-btn inline-flex rounded-md px-5 py-2 text-sm">
              回到商品列表
            </Link>
            <Link
              href="/ChatPage"
              className="inline-flex rounded-md border border-[#66c0f455] bg-[#1b2f44] px-5 py-2 text-sm font-bold text-[#d8e6f3] transition hover:bg-[#24384d]"
            >
              先問 AI 推薦
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="steam-shell px-4 py-8">
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">商品比較</p>
            <h1 className="mt-1 text-3xl font-black text-[#d8e6f3]">商品比較</h1>
          </div>
          <Link
            href="/"
            className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
          >
            回到商店
          </Link>
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[#66c0f433] bg-[#14283a] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#b9d1e3]">先看價格、版本、庫存與介紹差異，再用 AI 建議輔助判斷。</p>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#d8e6f3]">
            <input
              type="checkbox"
              checked={onlyShowDiff}
              onChange={(event) => setOnlyShowDiff(event.target.checked)}
            />
            只看有差異的項目
          </label>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[#8bc53f66] bg-[#243b2a] p-3 text-sm text-[#def4c7]">
            最低價格：{comparedGames.find((game) => game.id === lowestPriceId)?.name}
          </div>
          <div className="rounded-xl border border-[#66c0f466] bg-[#173246] p-3 text-sm text-[#cae6f8]">
            最大庫存：{comparedGames.find((game) => game.id === highestStockId)?.name}
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-[#8bc53f66] bg-[#1a3324] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-[0.14em] text-[#b9e0bd]">AI 比較摘要</p>
            {aiSummaryLoading && <span className="text-xs text-[#cce9c7]">正在整理...</span>}
          </div>
          {aiSummary ? (
            <div className="mt-2 space-y-2 text-sm text-[#def4c7]">
              <p className="font-semibold text-[#e7ffd8]">{aiSummary.headline}</p>
              <p>預算優先：{aiSummary.bestForBudget || '目前沒有明確差異'}</p>
              <p>庫存優先：{aiSummary.bestForAvailability || '目前沒有明確差異'}</p>
              <p className="text-[#cde8c8]">{aiSummary.recommendation}</p>
              {aiSummary.cautions.length > 0 && (
                <ul className="list-inside list-disc space-y-1 text-xs text-[#c4dfbf]">
                  {aiSummary.cautions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              <AiSourceBadge source={aiSummary.source} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#c4dfbf]">尚未生成比較摘要。</p>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-[#66c0f466] bg-[#12283a] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[#9fd2f1]">購買決策助理</p>
              <h2 className="mt-1 text-xl font-black text-[#d8e6f3]">幫我選一款比較適合的</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#66c0f455] bg-[#173246] px-2.5 py-1 text-xs font-bold text-[#d8f1ff]">
                  {browserAiCapability?.label || '使用內建規則建議'}
                </span>
                {comparisonAdvice && <AiSourceBadge source={comparisonAdvice.source} prefix />}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#b9d1e3]">
                {comparisonAdviceLoading
                  ? '正在根據比較中的商品、價格、庫存與近期偏好整理建議。'
                  : browserAiCapability?.description ||
                    '根據比較中的商品、價格、庫存與近期偏好，整理一份購買判斷。'}
              </p>
            </div>
            <button
              data-testid="compare-ai-advice-button"
              type="button"
              onClick={loadComparisonAdvice}
              disabled={comparisonAdviceLoading || comparedGames.length < 2}
              className="rounded-md border border-[#66c0f466] bg-[#1b3b52] px-3 py-2 text-xs font-bold text-[#d8f1ff] transition hover:border-[#66c0f4] hover:bg-[#24506f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {comparisonAdviceLoading ? '整理建議中...' : '產生選購建議'}
            </button>
          </div>

          {comparisonAdvice ? (
            <div data-testid="compare-ai-advice-result" className="mt-3 grid gap-3 text-sm text-[#d7e8f4]">
              <div className="rounded-lg border border-[#66c0f433] bg-[#0e1924] p-3">
                <p className="text-xs font-bold tracking-[0.12em] text-[#8fb8d5]">建議首選</p>
                <p className="mt-1 text-lg font-black text-[#e8f6ff]">{comparisonAdvice.winnerName}</p>
                <p className="mt-2 leading-6">{comparisonAdvice.summary}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <DecisionList title="為什麼適合" items={comparisonAdvice.reasons} />
                <DecisionList title="需要注意" items={comparisonAdvice.tradeoffs} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#66c0f433] bg-[#0e1924] p-3">
                <p className="text-sm leading-6 text-[#d7e8f4]">{comparisonAdvice.nextAction}</p>
                {comparisonAdvice.winnerId > 0 && (
                  <Link
                    href={`/game/${comparisonAdvice.winnerId}`}
                    className="steam-btn inline-flex rounded-md px-4 py-2 text-xs"
                  >
                    查看建議商品
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#b9d1e3]">選滿 2 到 3 款商品後，可以讓助理幫你整理選購建議。</p>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#66c0f433]">
          <table className="min-w-[900px] w-full border-collapse">
            <thead>
              <tr className="bg-[#122333] text-left text-sm text-[#9eb4c8]">
                <th className="border-b border-[#66c0f433] px-4 py-3 font-semibold">比較項目</th>
                {comparedGames.map((game) => (
                  <th key={game.id} className="border-b border-[#66c0f433] px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#d8e6f3]">{game.name}</span>
                      <button
                        type="button"
                        onClick={() => removeCompared(game.id)}
                        className="rounded border border-[#ff8d8d66] bg-[#4a212a] px-2 py-0.5 text-xs font-semibold text-[#ffd6d6]"
                      >
                        移除
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <CompareRow
                  key={row.id}
                  label={row.label}
                  values={row.values}
                  highlightIndex={row.bestIndex}
                  compact={row.compact}
                  diffIndices={getDiffIndices(row.values)}
                />
              ))}
              <tr className="bg-[#102131]">
                <td className="border-t border-[#66c0f433] px-4 py-3 text-sm font-semibold text-[#9eb4c8]">
                  下一步
                </td>
                {comparedGames.map((game) => (
                  <td
                    key={`action-${game.id}`}
                    className="border-t border-[#66c0f433] px-4 py-3 text-center"
                  >
                    <Link
                      href={`/game/${game.id}`}
                      className="steam-btn inline-flex rounded-md px-4 py-2 text-xs"
                    >
                      查看商品
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function CompareRow({
  label,
  values,
  highlightIndex = -1,
  compact = false,
  diffIndices = [],
}: {
  label: string;
  values: string[];
  highlightIndex?: number;
  compact?: boolean;
  diffIndices?: number[];
}) {
  return (
    <tr className="bg-[#132536]">
      <td className="border-t border-[#66c0f433] px-4 py-3 text-sm font-semibold text-[#9eb4c8]">{label}</td>
      {values.map((value, index) => {
        const highlighted = index === highlightIndex;
        const isDiff = diffIndices.includes(index);
        return (
          <td
            key={`${label}-${index}`}
            className={`border-t border-[#66c0f433] px-4 py-3 text-sm ${
              compact ? 'text-[#b7cbdd]' : 'text-[#d8e6f3]'
            } ${highlighted ? 'font-black text-[#8bc53f]' : ''} ${
              isDiff ? 'bg-[#1b3348]' : ''
            }`}
          >
            {isDiff && (
              <span className="mr-2 inline-block rounded border border-[#66c0f477] bg-[#21415d] px-1.5 py-0.5 text-[10px] font-bold text-[#c7e7ff]">
                差異
              </span>
            )}
            {value}
          </td>
        );
      })}
    </tr>
  );
}

function DecisionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-[#66c0f433] bg-[#0e1924] p-3">
      <p className="text-xs font-bold tracking-[0.12em] text-[#8fb8d5]">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[#c5dced]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#66c0f4]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getDiffIndices(values: string[]) {
  if (values.length <= 1) return [];
  const first = values[0];
  if (values.every((value) => value === first)) return [];
  return values.map((_, index) => index);
}
