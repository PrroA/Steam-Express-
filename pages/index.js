import { useEffect, useState, useMemo, useCallback } from 'react';
import { Carousel } from '../components/Carousel';
import { GameCard } from '../components/GameCard';
import debounce from 'lodash.debounce';
import { fetchGames as fetchGamesList } from '../services/storeService'

export default function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('default');
  const [showTip, setShowTip] = useState(true);
  const [recentIds, setRecentIds] = useState([]);

  const fetchGames = useCallback(async (query) => {
    try {
      const data = await fetchGamesList(query);
      setGames(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching games:', error);
      setLoading(false);
    }
  }, []);
  const debouncedFetchGames = useMemo(() => {
    return debounce(fetchGames, 300);
  }, [fetchGames]);

  const sortedGames = useMemo(() => {
    if (sortOrder === 'default') {
      return games;
    }
    const nextGames = [...games];
    if (sortOrder === 'low-to-high') {
      nextGames.sort(
        (a, b) => parseFloat(a.price.replace('$', '')) - parseFloat(b.price.replace('$', ''))
      );
    } else if (sortOrder === 'high-to-low') {
      nextGames.sort(
        (a, b) => parseFloat(b.price.replace('$', '')) - parseFloat(a.price.replace('$', ''))
      );
    }
    return nextGames;
  }, [games, sortOrder]);

  useEffect(() => {
    setLoading(true);
    debouncedFetchGames(searchQuery);
    return () => {
      debouncedFetchGames.cancel();
    };
  }, [searchQuery, debouncedFetchGames]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('recentlyViewedGames');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setRecentIds(parsed.map((item) => item.id).filter(Boolean));
      }
    } catch (error) {
      setRecentIds([]);
    }
  }, []);

  const recentlyViewedGames = useMemo(() => {
    if (!recentIds.length || !games.length) return [];
    const gameMap = new Map(games.map((game) => [game.id, game]));
    return recentIds.map((id) => gameMap.get(id)).filter(Boolean).slice(0, 4);
  }, [recentIds, games]);

  const recommendedGames = useMemo(() => {
    if (!games.length) return [];
    const recentSet = new Set(recentlyViewedGames.map((game) => game.id));
    if (recentlyViewedGames.length === 0) {
      return games.slice(0, 4);
    }
    const avgRecentPrice =
      recentlyViewedGames.reduce(
        (sum, game) => sum + (parseFloat((game.price || '$0').replace('$', '')) || 0),
        0
      ) / recentlyViewedGames.length;
    return [...games]
      .filter((game) => !recentSet.has(game.id))
      .sort((a, b) => {
        const aPrice = parseFloat((a.price || '$0').replace('$', '')) || 0;
        const bPrice = parseFloat((b.price || '$0').replace('$', '')) || 0;
        return Math.abs(aPrice - avgRecentPrice) - Math.abs(bPrice - avgRecentPrice);
      })
      .slice(0, 4);
  }, [games, recentlyViewedGames]);

  return (
    <main className="steam-shell pb-8">
      <Carousel />

      {showTip && (
        <section className="steam-fade-up mx-auto mt-4 flex w-[95%] max-w-6xl items-center justify-between gap-3 rounded-xl border border-[#66c0f433] bg-[#172839] px-4 py-3 text-sm text-[#c0d8eb]">
          <p>提示：這是作品集練習版，註冊後可完整體驗購物流程與付款模擬。</p>
          <button
            onClick={() => setShowTip(false)}
            className="rounded border border-[#66c0f455] px-3 py-1 text-xs transition hover:bg-[#24384d]"
          >
            關閉
          </button>
        </section>
      )}

      <section className="mx-auto mt-6 w-[95%] max-w-6xl">
        {recentlyViewedGames.length > 0 && (
          <div className="mb-7">
            <div className="mb-4">
              <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">RECENTLY VIEWED</p>
              <h2 className="mt-1 text-2xl font-black text-[#d8e6f3]">最近瀏覽</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {recentlyViewedGames.map((game) => (
                <GameCard key={`recent-${game.id}`} game={game} />
              ))}
            </div>
          </div>
        )}

        {recommendedGames.length > 0 && (
          <div className="mb-7">
            <div className="mb-4">
              <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">RECOMMENDED FOR YOU</p>
              <h2 className="mt-1 text-2xl font-black text-[#d8e6f3]">為你推薦</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {recommendedGames.map((game) => (
                <GameCard key={`recommended-${game.id}`} game={game} />
              ))}
            </div>
          </div>
        )}

        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">STORE BROWSE</p>
            <h2 className="mt-1 text-2xl font-black text-[#d8e6f3]">遊戲商店</h2>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <input
              type="text"
              placeholder="搜尋遊戲名稱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none md:w-80"
            />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
            >
              <option value="default">預設排序</option>
              <option value="low-to-high">價格：低到高</option>
              <option value="high-to-low">價格：高到低</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="steam-panel flex min-h-44 items-center justify-center rounded-xl p-10">
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#66c0f4] border-t-transparent" />
              <p className="mt-3 text-sm text-[#9eb4c8]">資料載入中...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {sortedGames.length === 0 ? (
              <p className="steam-panel col-span-4 rounded-xl p-10 text-center text-[#9eb4c8]">
                沒有符合搜尋條件的遊戲。
              </p>
            ) : (
              sortedGames.map((game) => <GameCard key={game.id} game={game} />)
            )}
          </div>
        )}
      </section>
    </main>
  );
}
