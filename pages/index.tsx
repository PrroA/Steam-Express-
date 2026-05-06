import { useEffect, useState, useMemo, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { Carousel } from '../components/Carousel';
import { GameCard } from '../components/GameCard';
import { fetchGames as fetchGamesList } from '../services/storeService';
import type { Game } from '../types/domain';

function parsePrice(priceText?: string) {
  return parseFloat((priceText || '$0').replace('$', '')) || 0;
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('default');
  const [priceRange, setPriceRange] = useState('all');

  const fetchGames = useCallback(async (query: string) => {
    try {
      const data = await fetchGamesList(query);
      setGames(data);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedFetchGames = useMemo(() => {
    return debounce(fetchGames, 300);
  }, [fetchGames]);

  useEffect(() => {
    setLoading(true);
    debouncedFetchGames(searchQuery);
    return () => {
      debouncedFetchGames.cancel();
    };
  }, [searchQuery, debouncedFetchGames]);

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

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSortOrder('default');
    setPriceRange('all');
  }, []);

  return (
    <main className="steam-shell pb-8">
      <Carousel />

      <section className="mx-auto mt-6 w-[95%] max-w-6xl">
        <div className="mb-5 rounded-xl border border-[#8bc53f44] bg-[#142a20] p-4">
          <p className="text-xs font-bold tracking-[0.14em] text-[#b9e0bd]">快速開始</p>
          <div className="mt-3 grid gap-3 text-sm text-[#d8e6f3] md:grid-cols-4">
            {['登入商店', '加入購物車', '完成結帳付款', '查看訂單狀態'].map((label, index) => (
              <div key={label} className="flex items-center gap-3 rounded-md border border-[#8bc53f33] bg-[#10251a] px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8bc53f] text-xs font-black text-[#0d1b12]">
                  {index + 1}
                </span>
                <span className="font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-4 rounded-xl border border-[#66c0f433] bg-[#122333] p-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">瀏覽商品</p>
            <h2 className="mt-1 text-2xl font-black text-[#d8e6f3]">全部遊戲</h2>
            <p className="mt-1 text-xs text-[#8faac0]">顯示 {filteredGames.length} / {games.length} 款</p>
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
                <option value="low-to-high">價格低到高</option>
                <option value="high-to-low">價格高到低</option>
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

        {loading ? (
          <div className="steam-panel flex min-h-44 items-center justify-center rounded-xl p-10">
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#66c0f4] border-t-transparent" />
              <p className="mt-3 text-sm text-[#9eb4c8]">資料載入中...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {filteredGames.length === 0 ? (
              <div className="steam-panel col-span-full rounded-xl p-10 text-center text-[#9eb4c8]">
                <p>沒有符合搜尋條件的遊戲。</p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-3 rounded-md border border-[#66c0f455] bg-[#1b2f44] px-4 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
                  >
                    查看全部
                  </button>
                )}
              </div>
            ) : (
              filteredGames.map((game) => <GameCard key={game.id} game={game} />)
            )}
          </div>
        )}
      </section>
    </main>
  );
}
