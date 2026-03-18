import { useEffect, useState, useMemo, useCallback } from 'react';
import { Carousel } from '../components/Carousel';
import { GameCard } from '../components/GameCard';
import debounce from 'lodash.debounce';
import { fetchGames as fetchGamesList } from '../services/storeService'

function parsePrice(priceText) {
  return parseFloat((priceText || '$0').replace('$', '')) || 0;
}

function extractKeywords(text = '') {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 2);
}

export default function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('default');
  const [priceRange, setPriceRange] = useState('all');
  const [genreKeyword, setGenreKeyword] = useState('all');
  const [onlyInStock, setOnlyInStock] = useState(false);
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

  const recentPreference = useMemo(() => {
    if (recentlyViewedGames.length === 0) {
      return { averagePrice: 0, topKeywords: [] };
    }
    const averagePrice =
      recentlyViewedGames.reduce((sum, game) => sum + parsePrice(game.price), 0) /
      recentlyViewedGames.length;
    const keywordCounter = new Map();
    recentlyViewedGames.forEach((game) => {
      extractKeywords(`${game.name || ''} ${game.description || ''}`).forEach((word) => {
        keywordCounter.set(word, (keywordCounter.get(word) || 0) + 1);
      });
    });
    const topKeywords = [...keywordCounter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([keyword]) => keyword);
    return { averagePrice, topKeywords };
  }, [recentlyViewedGames]);

  const recommendedGames = useMemo(() => {
    if (!games.length) return [];
    const recentSet = new Set(recentlyViewedGames.map((game) => game.id));
    if (recentlyViewedGames.length === 0) {
      return games.slice(0, 4);
    }
    const avgRecentPrice = recentPreference.averagePrice;
    const keywordSet = new Set(recentPreference.topKeywords);

    return [...games]
      .filter((game) => !recentSet.has(game.id))
      .sort((a, b) => {
        const aText = `${a.name || ''} ${a.description || ''}`.toLowerCase();
        const bText = `${b.name || ''} ${b.description || ''}`.toLowerCase();

        let aKeywordScore = 0;
        let bKeywordScore = 0;
        keywordSet.forEach((keyword) => {
          if (aText.includes(keyword)) aKeywordScore += 1;
          if (bText.includes(keyword)) bKeywordScore += 1;
        });

        if (aKeywordScore !== bKeywordScore) {
          return bKeywordScore - aKeywordScore;
        }

        const aPrice = parsePrice(a.price);
        const bPrice = parsePrice(b.price);
        return Math.abs(aPrice - avgRecentPrice) - Math.abs(bPrice - avgRecentPrice);
      })
      .slice(0, 4);
  }, [games, recentlyViewedGames, recentPreference]);

  const genreOptions = useMemo(() => {
    const counter = new Map();
    games.forEach((game) => {
      extractKeywords(`${game.name || ''} ${game.description || ''}`).forEach((word) => {
        counter.set(word, (counter.get(word) || 0) + 1);
      });
    });
    return [...counter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word);
  }, [games]);

  const filteredGames = useMemo(() => {
    return sortedGames.filter((game) => {
      const price = parsePrice(game.price);
      const hasStock =
        !Array.isArray(game.variants) || game.variants.some((variant) => Number(variant.stock) > 0);
      const gameText = `${game.name || ''} ${game.description || ''}`.toLowerCase();

      const passPrice =
        priceRange === 'all' ||
        (priceRange === 'under20' && price < 20) ||
        (priceRange === '20to50' && price >= 20 && price <= 50) ||
        (priceRange === '50plus' && price > 50);

      const passGenre = genreKeyword === 'all' || gameText.includes(genreKeyword.toLowerCase());
      const passStock = !onlyInStock || hasStock;

      return passPrice && passGenre && passStock;
    });
  }, [sortedGames, priceRange, genreKeyword, onlyInStock]);

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
              {recentPreference.topKeywords.length > 0 && (
                <p className="mt-2 text-xs text-[#9eb4c8]">
                  依據最近偏好關鍵字：
                  {recentPreference.topKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="ml-2 inline-block rounded-full border border-[#66c0f455] bg-[#162737] px-2 py-0.5 text-[#b8d4e8]"
                    >
                      {keyword}
                    </span>
                  ))}
                </p>
              )}
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
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
            >
              <option value="all">價格：全部</option>
              <option value="under20">低於 $20</option>
              <option value="20to50">$20 - $50</option>
              <option value="50plus">高於 $50</option>
            </select>
            <select
              value={genreKeyword}
              onChange={(e) => setGenreKeyword(e.target.value)}
              className="rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
            >
              <option value="all">類型：全部</option>
              {genreOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3]">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
              />
              只看有庫存
            </label>
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
            {filteredGames.length === 0 ? (
              <p className="steam-panel col-span-4 rounded-xl p-10 text-center text-[#9eb4c8]">
                沒有符合搜尋條件的遊戲。
              </p>
            ) : (
              filteredGames.map((game) => <GameCard key={game.id} game={game} />)
            )}
          </div>
        )}
      </section>
    </main>
  );
}
