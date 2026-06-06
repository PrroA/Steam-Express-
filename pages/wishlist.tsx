import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { FaHeartBroken } from 'react-icons/fa';
import { addToCart } from '../services/cartService';
import { ErrorState } from '../components/ui/PageStates';
import { WishlistPageSkeleton } from '../components/ui/PageSkeletons';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://steam-express.onrender.com' : 'http://localhost:4000');

function parsePrice(priceText) {
  return parseFloat((priceText || '$0').replace('$', '')) || 0;
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('default');

  const loadWishlist = useCallback(async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setLoadError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWishlist(Array.isArray(response.data) ? response.data : []);
    } catch {
      setLoadError('願望清單暫時無法載入，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const stats = useMemo(() => {
    const itemCount = wishlist.length;
    const totalPrice = wishlist.reduce((sum, game) => sum + parsePrice(game.price), 0);
    return { itemCount, totalPrice };
  }, [wishlist]);

  const filteredWishlist = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    const matched = wishlist.filter((game) => {
      if (!keyword) return true;
      return `${game.name || ''} ${game.description || ''}`.toLowerCase().includes(keyword);
    });

    if (sortOrder === 'default') return matched;
    const next = [...matched];
    if (sortOrder === 'price-low') next.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    if (sortOrder === 'price-high') next.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    if (sortOrder === 'name') next.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hant'));
    return next;
  }, [searchQuery, sortOrder, wishlist]);

  const handleRemoveFromWishlist = async (gameId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_BASE_URL}/wishlist/${gameId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWishlist((prev) => prev.filter((game) => game.id !== gameId));
      toast.success('已從願望清單移除。');
    } catch {
      toast.error('暫時無法移除，請再試一次。');
    }
  };

  const handleAddToCart = async (gameId) => {
    const token = localStorage.getItem('token');
    try {
      await addToCart(gameId, token);
      setWishlist((prev) => prev.filter((game) => game.id !== gameId));
      toast.success('已加入購物車。');
    } catch {
      toast.error('暫時無法加入購物車，請稍後再試。');
    }
  };

  if (loading) return <WishlistPageSkeleton />;
  if (loadError) return <ErrorState title="願望清單暫時無法使用" description={loadError} onAction={loadWishlist} />;

  if (wishlist.length === 0) {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl p-10 text-center">
          <FaHeartBroken size={72} className="mx-auto text-[#58738a]" />
          <h1 className="mt-4 text-3xl font-black text-[#d8e6f3]">願望清單是空的</h1>
          <p className="mt-2 text-[#9eb4c8]">把感興趣的遊戲先收藏起來，之後可以快速加入購物車。</p>
          <Link href="/" className="steam-btn mt-5 inline-flex rounded-md px-5 py-2 text-sm">
            回到商店
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <div className="rounded-2xl border border-[#66c0f433] bg-[#132434] p-5">
          <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">願望清單</p>
          <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">想之後再看的遊戲</h1>
          <p className="mt-1 text-sm text-[#9eb4c8]">收藏感興趣的商品，想買時可以直接加入購物車。</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <StatCard label="收藏數量" value={`${stats.itemCount} 款`} />
            <StatCard label="目前總價" value={`$${stats.totalPrice.toFixed(2)}`} />
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_200px]">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜尋願望清單..."
              className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            />
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className="rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
            >
              <option value="default">預設排序</option>
              <option value="price-low">價格低到高</option>
              <option value="price-high">價格高到低</option>
              <option value="name">名稱 A-Z</option>
            </select>
          </div>
        </div>

        {filteredWishlist.length === 0 ? (
          <div className="steam-panel mt-5 rounded-2xl border border-[#66c0f433] p-8 text-center">
            <p className="text-lg font-black text-[#d8e6f3]">沒有符合條件的商品</p>
            <p className="mt-2 text-sm text-[#9eb4c8]">可以換個關鍵字再搜尋一次。</p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredWishlist.map((game) => {
              const price = parsePrice(game.price);
              return (
                <article
                  key={game.id}
                  className="steam-panel flex flex-col gap-4 rounded-2xl border border-[#66c0f433] p-4 transition hover:border-[#66c0f488] hover:bg-[#24384d] sm:flex-row"
                >
                  <Link
                    href={`/game/${game.id}`}
                    className="relative block h-40 w-full overflow-hidden rounded-lg border border-[#66c0f433] bg-[#0f1d2b] sm:h-32 sm:w-52"
                  >
                    <Image src={game.image || '/vercel.svg'} alt={game.name} fill sizes="(max-width: 640px) 100vw, 208px" style={{ objectFit: 'cover' }} />
                  </Link>
                  <div className="flex flex-1 flex-col justify-between gap-3">
                    <div>
                      <Link href={`/game/${game.id}`}>
                        <h2 className="text-xl font-black text-[#d8e6f3] transition hover:text-[#66c0f4]">{game.name}</h2>
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-[#9eb4c8]">{game.description || '暫無描述'}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xl font-black text-[#8bc53f]">${price.toFixed(2)}</p>
                      <div className="flex w-full gap-2 sm:w-auto">
                        <button type="button" onClick={() => handleAddToCart(game.id)} className="steam-btn flex-1 rounded-md px-4 py-2 text-sm sm:flex-none">
                          加入購物車
                        </button>
                        <button type="button" onClick={() => handleRemoveFromWishlist(game.id)} className="flex-1 rounded-md border border-[#ff8d8d66] bg-[#4a212a] px-4 py-2 text-sm font-semibold text-[#ffd6d6] transition hover:bg-[#65313d] sm:flex-none">
                          移除
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-[#66c0f433] bg-[#102131] p-3">
      <p className="text-xs text-[#8faac0]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#d8e6f3]">{value}</p>
    </div>
  );
}
