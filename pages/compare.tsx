import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { fetchGames } from '../services/storeService';
import type { Game } from '../types/domain';

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
    } catch (error) {
      setComparedIds([]);
    }
  }, [router.isReady, router.query.ids]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchGames('');
        setAllGames(Array.isArray(data) ? data : []);
      } catch (error) {
        setAllGames([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const comparedGames = useMemo(() => {
    if (!comparedIds.length || !allGames.length) return [];
    const gameMap = new Map(allGames.map((game) => [game.id, game]));
    return comparedIds.map((id) => gameMap.get(id)).filter(Boolean);
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
      } catch (error) {
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
        label: '版本數',
        values: comparedGames.map((game) =>
          Array.isArray(game.variants) ? `${game.variants.length} 種` : '1 種'
        ),
        bestIndex: -1,
        compact: false,
      },
      {
        id: 'stock',
        label: '總庫存',
        values: comparedGames.map((game) => `${getStock(game)} 件`),
        bestIndex: comparedGames.findIndex((game) => game.id === highestStockId),
        compact: false,
      },
      {
        id: 'desc',
        label: '描述',
        values: comparedGames.map((game) => game.description || '無描述'),
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
        <p className="text-sm text-[#9eb4c8]">比較資料載入中...</p>
      </main>
    );
  }

  if (comparedGames.length === 0) {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl p-8 text-center">
          <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">COMPARE</p>
          <h1 className="mt-2 text-2xl font-black text-[#d8e6f3]">目前沒有可比較商品</h1>
          <p className="mt-2 text-sm text-[#9eb4c8]">回首頁按「加入比較」，最多可選 3 款。</p>
          <Link href="/" className="steam-btn mt-5 inline-flex rounded-md px-5 py-2 text-sm">
            返回首頁
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="steam-shell px-4 py-8">
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">PRODUCT COMPARISON</p>
            <h1 className="mt-1 text-3xl font-black text-[#d8e6f3]">商品比較</h1>
          </div>
          <Link
            href="/"
            className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
          >
            回商店繼續選
          </Link>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-xl border border-[#66c0f433] bg-[#14283a] px-4 py-3">
          <p className="text-sm text-[#b9d1e3]">可切換只看不同欄位，快速找出差異點</p>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#d8e6f3]">
            <input
              type="checkbox"
              checked={onlyShowDiff}
              onChange={(event) => setOnlyShowDiff(event.target.checked)}
            />
            只顯示差異
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
            <p className="text-xs font-bold tracking-[0.14em] text-[#b9e0bd]">AI COMPARE SUMMARY</p>
            {aiSummaryLoading && <span className="text-xs text-[#cce9c7]">分析中...</span>}
          </div>
          {aiSummary ? (
            <div className="mt-2 space-y-2 text-sm text-[#def4c7]">
              <p className="font-semibold text-[#e7ffd8]">{aiSummary.headline}</p>
              <p>預算優先：{aiSummary.bestForBudget || '—'}</p>
              <p>可買性優先：{aiSummary.bestForAvailability || '—'}</p>
              <p className="text-[#cde8c8]">{aiSummary.recommendation}</p>
              {aiSummary.cautions.length > 0 && (
                <ul className="list-inside list-disc space-y-1 text-xs text-[#c4dfbf]">
                  {aiSummary.cautions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-[#9bc496]">來源：{aiSummary.source || 'fallback'}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#c4dfbf]">尚未生成比較摘要。</p>
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
                  快速操作
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
                      查看詳情
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
                DIFF
              </span>
            )}
            {value}
          </td>
        );
      })}
    </tr>
  );
}

function getDiffIndices(values: string[]) {
  if (values.length <= 1) return [];
  const first = values[0];
  if (values.every((value) => value === first)) return [];
  return values.map((_, index) => index);
}
