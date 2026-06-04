import { useEffect, useState, useMemo, useCallback } from 'react';
import debounce from 'lodash.debounce';
import Link from 'next/link';
import { Carousel } from '../components/Carousel';
import { GameCard } from '../components/GameCard';
import { fetchGames as fetchGamesList } from '../services/storeService';
import type { Game } from '../types/domain';

const compareStorageKey = 'compareGameIds';

const aiShowcaseSteps = [
  {
    title: '商品決策',
    description: '先看單一商品適不適合你，適合展示「幫我判斷」。',
    action: '挑一款商品',
    getHref: (firstGameId?: number) => (firstGameId ? `/game/${firstGameId}` : '#games'),
  },
  {
    title: '商品比較',
    description: '把 2 到 3 款加入比較，再讓助理幫你收斂選擇。',
    action: '前往比較',
    getHref: () => '/compare',
  },
  {
    title: '客服問答',
    description: '詢問付款、退款、推薦或個人訂單狀態，回答會顯示參考資料。',
    action: '詢問客服',
    getHref: () => '/ChatPage',
  },
];

function parsePrice(priceText?: string) {
  return parseFloat((priceText || '$0').replace('$', '')) || 0;
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('default');
  const [priceRange, setPriceRange] = useState('all');
  const [comparedIds, setComparedIds] = useState<number[]>([]);

  const fetchGames = useCallback(async (query: string) => {
    try {
      const data = await fetchGamesList(query);
      setGames(data);
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedFetchGames = useMemo(() => debounce(fetchGames, 300), [fetchGames]);

  useEffect(() => {
    setLoading(true);
    debouncedFetchGames(searchQuery);
    return () => {
      debouncedFetchGames.cancel();
    };
  }, [searchQuery, debouncedFetchGames]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(compareStorageKey);
      const ids = raw ? JSON.parse(raw) : [];
      if (Array.isArray(ids)) {
        setComparedIds(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)).slice(0, 3));
      }
    } catch {
      setComparedIds([]);
    }
  }, []);

  const filteredGames = useMemo(() => {
    const nextGames = games.filter((game) => {
      const price = parsePrice(game.price);
      if (priceRange === 'under20') return price < 20;
      if (priceRange === '20to50') return price >= 20 && price <= 50;
      if (priceRange === '50plus') return price > 50;
      return true;
    });

    if (sortOrder === 'low-to-high') {
      return [...nextGames].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    }

    if (sortOrder === 'high-to-low') {
      return [...nextGames].sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }

    return nextGames;
  }, [games, priceRange, sortOrder]);

  const hasActiveFilters = searchQuery.trim() !== '' || sortOrder !== 'default' || priceRange !== 'all';
  const firstGameId = filteredGames[0]?.id;

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSortOrder('default');
    setPriceRange('all');
  }, []);

  const handleToggleCompare = useCallback((id: number) => {
    setComparedIds((previous) => {
      const next = previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id].slice(-3);
      localStorage.setItem(compareStorageKey, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <main className="steam-shell pb-8">
      <Carousel />

      <section className="mx-auto mt-6 w-[95%] max-w-6xl">
        <div className="mb-5 rounded-xl border border-[#8bc53f44] bg-[#142a20] p-4">
          <p className="text-xs font-bold tracking-[0.14em] text-[#b9e0bd]">展示流程</p>
          <div className="mt-3 grid gap-3 text-sm text-[#d8e6f3] md:grid-cols-4">
            {['登入或註冊帳號', '加入購物車', '前往付款', '查看訂單'].map((label, index) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-md border border-[#8bc53f33] bg-[#10251a] px-3 py-2"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8bc53f] text-xs font-black text-[#0d1b12]">
                  {index + 1}
                </span>
                <span className="font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <section className="mb-5 rounded-xl border border-[#66c0f433] bg-[#122333] p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">AI 助理</p>
              <h2 className="mt-1 text-xl font-black text-[#d8e6f3]">從選商品到售後，一條線展示</h2>
              <p className="mt-1 text-sm text-[#b9d1e3]">不用先解釋技術，直接照順序點就能看到 AI 怎麼幫使用者做決策。</p>
            </div>
            <Link
              href="/ChatPage"
              className="rounded-md border border-[#66c0f466] bg-[#1b2f44] px-3 py-2 text-sm font-bold text-[#d8e6f3] transition hover:bg-[#24384d]"
            >
              打開 AI 客服
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {aiShowcaseSteps.map((step, index) => (
              <div key={step.title} className="rounded-lg border border-[#66c0f433] bg-[#101f2d] p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#66c0f4] text-xs font-black text-[#0f1d2a]">
                    {index + 1}
                  </span>
                  <h3 className="font-bold text-[#e1f2ff]">{step.title}</h3>
                </div>
                <p className="mt-2 min-h-[44px] text-sm leading-6 text-[#9eb4c8]">{step.description}</p>
                <Link
                  href={step.getHref(firstGameId)}
                  className="mt-3 inline-flex rounded-md border border-[#66c0f455] px-3 py-1.5 text-xs font-bold text-[#bfe4fb] transition hover:bg-[#1a3044]"
                >
                  {step.action}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <div id="games" className="mb-5 flex flex-col gap-4 rounded-xl border border-[#66c0f433] bg-[#122333] p-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">遊戲商店</p>
            <h2 className="mt-1 text-2xl font-black text-[#d8e6f3]">所有遊戲</h2>
            <p className="mt-1 text-xs text-[#8faac0]">
              目前顯示 {filteredGames.length} / {games.length} 款
            </p>
          </div>

          <div className="grid w-full gap-3 md:w-auto md:grid-cols-[minmax(220px,320px)_160px_150px]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#8faac0]">搜尋</span>
              <input
                type="text"
                placeholder="搜尋遊戲名稱..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-2.5 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#8faac0]">排序</span>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-2.5 text-sm text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
              >
                <option value="default">預設排序</option>
                <option value="low-to-high">價格由低到高</option>
                <option value="high-to-low">價格由高到低</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#8faac0]">價格</span>
              <select
                value={priceRange}
                onChange={(event) => setPriceRange(event.target.value)}
                className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-2.5 text-sm text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
              >
                <option value="all">全部價格</option>
                <option value="under20">低於 $20</option>
                <option value="20to50">$20 - $50</option>
                <option value="50plus">高於 $50</option>
              </select>
            </label>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
            >
              清除篩選
            </button>
          </div>
        )}

        {comparedIds.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#66c0f433] bg-[#102131] px-4 py-3 text-sm text-[#d8e6f3]">
            <span>
              已選 {comparedIds.length} 款商品
              {comparedIds.length < 2 ? '，再選一款就能開始比較。' : '，可以讓 AI 幫你整理差異。'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(compareStorageKey);
                  setComparedIds([]);
                }}
                className="rounded-md border border-[#66c0f455] px-3 py-2 text-xs font-bold text-[#bfe4fb] transition hover:bg-[#1a3044]"
              >
                清除
              </button>
              <Link
                href="/compare"
                className={`rounded-md px-3 py-2 text-xs font-bold transition ${
                  comparedIds.length >= 2
                    ? 'border border-[#8bc53f88] bg-[#263f2b] text-[#e7f8d8] hover:bg-[#315337]'
                    : 'pointer-events-none border border-[#66c0f433] bg-[#162737] text-[#7895aa]'
                }`}
              >
                前往比較
              </Link>
            </div>
          </div>
        )}

        {loading ? (
          <div className="steam-panel flex min-h-44 items-center justify-center rounded-xl p-10">
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#66c0f4] border-t-transparent" />
              <p className="mt-3 text-sm text-[#9eb4c8]">正在整理遊戲清單...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {filteredGames.length === 0 ? (
              <div className="steam-panel col-span-full rounded-xl p-10 text-center text-[#9eb4c8]">
                <p>找不到符合條件的遊戲。</p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-3 rounded-md border border-[#66c0f455] bg-[#1b2f44] px-4 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
                  >
                    回到全部遊戲
                  </button>
                )}
              </div>
            ) : (
              filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onToggleCompare={handleToggleCompare}
                  isCompared={comparedIds.includes(game.id)}
                />
              ))
            )}
          </div>
        )}
      </section>
    </main>
  );
}
