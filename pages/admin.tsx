import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { addGame } from '../services/storeService';
import {
  fetchAdminDashboard,
  fetchAdminGames,
  fetchAdminOrders,
  updateAdminOrderStatus,
  updateGameActiveStatus,
  updateGameVariant,
} from '../services/adminService';

const ORDER_STATUS_OPTIONS = ['未付款', '付款失敗', '已付款', '已取消', '已退款'];

export default function AdminPage() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [preview, setPreview] = useState('');

  const [dashboard, setDashboard] = useState(null);
  const [games, setGames] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardData, gamesData, ordersData] = await Promise.all([
        fetchAdminDashboard(token),
        fetchAdminGames(token),
        fetchAdminOrders(token),
      ]);
      setDashboard(dashboardData);
      setGames(gamesData);
      setOrders(ordersData);
    } catch (error) {
      toast.error('載入後台資料失敗（請確認你是管理員）');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [orders]
  );

  const handleAddGame = async () => {
    try {
      await addGame({ name, price, description, image }, token);
      toast.success('遊戲已添加');
      setName('');
      setPrice('');
      setDescription('');
      setImage('');
      setPreview('');
      await loadAdminData();
    } catch (error) {
      toast.error('添加遊戲失敗：你不是管理員或資料有誤');
    }
  };

  const handleImageChange = (e) => {
    const url = e.target.value;
    setImage(url);
    setPreview(url);
  };

  const handleToggleActive = async (game) => {
    try {
      await updateGameActiveStatus(game.id, !(game.isActive !== false), token);
      toast.success(game.isActive !== false ? '商品已下架' : '商品已上架');
      await loadAdminData();
    } catch (error) {
      toast.error('更新上架狀態失敗');
    }
  };

  const handleVariantStockChange = async (gameId, variantId, stock) => {
    try {
      await updateGameVariant(gameId, variantId, { stock }, token);
      toast.success('庫存已更新');
      await loadAdminData();
    } catch (error) {
      toast.error('更新庫存失敗');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await updateAdminOrderStatus(orderId, status, token, 'Admin panel update');
      toast.success('訂單狀態已更新');
      await loadAdminData();
    } catch (error) {
      toast.error('更新訂單狀態失敗');
    }
  };

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-7xl">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">ADMIN CONTROL CENTER</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">後台管理</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">商品管理、訂單控管、基本營運儀表板。</p>

        {loading ? (
          <div className="steam-panel mt-5 rounded-2xl p-8 text-center text-[#9eb4c8]">資料載入中...</div>
        ) : (
          <>
            {dashboard && (
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="總訂單" value={dashboard.totalOrders} />
                <MetricCard label="已付款" value={dashboard.paidOrders} highlight />
                <MetricCard label="總營收" value={`$${dashboard.totalRevenue.toFixed(2)}`} highlight />
                <MetricCard label="售出件數" value={dashboard.totalItemsSold} />
              </div>
            )}

            <div className="steam-panel mt-5 rounded-2xl p-6">
              <h2 className="text-xl font-black text-[#d8e6f3]">新增商品</h2>
              {preview && (
                <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-[#66c0f433] bg-[#0f1d2b]">
                  <Image src={preview || '/vercel.svg'} alt="封面預覽" fill style={{ objectFit: 'cover' }} />
                </div>
              )}
              <div className="mt-4 grid gap-3">
                <input
                  type="text"
                  placeholder="遊戲名稱"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="價格（例如：59.99）"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                />
                <textarea
                  placeholder="遊戲描述"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-24 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="封面圖片 URL"
                  value={image}
                  onChange={handleImageChange}
                  className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                />
                <button onClick={handleAddGame} className="steam-btn rounded-md py-2.5 text-sm">
                  添加遊戲
                </button>
              </div>
            </div>

            <div className="steam-panel mt-5 rounded-2xl p-6">
              <h2 className="text-xl font-black text-[#d8e6f3]">商品管理</h2>
              <div className="mt-4 space-y-3">
                {games.map((game) => (
                  <div key={game.id} className="rounded-lg border border-[#66c0f433] bg-[#132434] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#d8e6f3]">{game.name}</p>
                        <p className="text-xs text-[#8fb8d5]">ID: {game.id}</p>
                      </div>
                      <button
                        onClick={() => handleToggleActive(game)}
                        className={`rounded-md border px-3 py-1.5 text-xs font-bold ${
                          game.isActive !== false
                            ? 'border-[#ff9f9f55] bg-[#4a202a] text-[#ffd6d6]'
                            : 'border-[#66c0f455] bg-[#1b2f44] text-[#d8e6f3]'
                        }`}
                      >
                        {game.isActive !== false ? '下架' : '上架'}
                      </button>
                    </div>

                    {Array.isArray(game.variants) && game.variants.length > 0 && (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {game.variants.map((variant) => (
                          <VariantEditor
                            key={`${game.id}-${variant.id}`}
                            variant={variant}
                            onSave={(stock) => handleVariantStockChange(game.id, variant.id, stock)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="steam-panel mt-5 rounded-2xl p-6">
              <h2 className="text-xl font-black text-[#d8e6f3]">訂單管理</h2>
              <div className="mt-4 space-y-3">
                {sortedOrders.map((order) => (
                  <div key={order.id} className="rounded-lg border border-[#66c0f433] bg-[#132434] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#d8e6f3]">訂單 {order.id.slice(0, 8)}...</p>
                        <p className="text-xs text-[#8fb8d5]">
                          User #{order.userId} | ${order.total.toFixed(2)} | {order.status}
                        </p>
                      </div>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className="rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-xs text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
                      >
                        {ORDER_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function MetricCard({ label, value, highlight = false }) {
  return (
    <article className="steam-panel rounded-xl p-4">
      <p className="text-xs text-[#9eb4c8]">{label}</p>
      <p className={`mt-1 text-2xl font-black ${highlight ? 'text-[#8bc53f]' : 'text-[#d8e6f3]'}`}>
        {value}
      </p>
    </article>
  );
}

function VariantEditor({ variant, onSave }) {
  const [stock, setStock] = useState(variant.stock);

  useEffect(() => {
    setStock(variant.stock);
  }, [variant.stock]);

  return (
    <div className="rounded-md border border-[#66c0f433] bg-[#102131] p-3">
      <p className="text-sm font-bold text-[#d8e6f3]">{variant.name}</p>
      <p className="text-xs text-[#8faac0]">價格 {variant.price}</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(Number(e.target.value))}
          className="w-24 rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-xs text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <button
          onClick={() => onSave(stock)}
          className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
        >
          更新庫存
        </button>
      </div>
    </div>
  );
}
