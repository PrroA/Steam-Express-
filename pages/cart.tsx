import { useEffect, useMemo, useState } from 'react';
import {
  checkout,
  fetchCart,
  removeFromCart,
  updateCartQuantity,
} from '../services/cartService';
import { toast } from 'react-toastify';
import { FaShoppingCart, FaPlus, FaMinus } from 'react-icons/fa';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { calculateTotalPrice } from '../utils/cartUtils';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const loadCart = async () => {
      const token = localStorage.getItem('token');
      try {
        const data = await fetchCart(token);
        setCart(Array.isArray(data) ? data : []);
      } catch (error) {
        setCart([]);
      }
    };
    loadCart();
  }, []);

  const total = useMemo(() => calculateTotalPrice(cart), [cart]);

  const handleRemove = async (id) => {
    const token = localStorage.getItem('token');
    const previousCart = cart;
    const updatedCart = cart.filter((item) => item.id !== id);
    setCart(updatedCart);
    try {
      await removeFromCart(id, token);
      toast.success('商品已移除');
    } catch (error) {
      setCart(previousCart);
      toast.error('移除商品失敗，請稍後再試');
    }
  };

  const handleClearCart = async () => {
    const token = localStorage.getItem('token');
    try {
      const results = await Promise.all(
        cart.map((item) => removeFromCart(item.id, token).catch((error) => ({ error, item })))
      );
      const failedItems = results.filter((result) => result?.error);
      if (failedItems.length > 0) {
        toast.error(`部分商品清空失敗 (${failedItems.length} 項)`);
      } else {
        toast.success('購物車已清空');
      }
      setCart([]);
    } catch (error) {
      toast.error('清空購物車失敗，請稍後再試');
    }
  };

  const handleQuantityChange = async (id, change) => {
    const token = localStorage.getItem('token');
    const item = cart.find((cartItem) => cartItem.id === id);
    if (!item) return;
    const newQuantity = Math.max(1, item.quantity + change);

    try {
      const response = await updateCartQuantity(id, newQuantity, token);
      if (response.cart) {
        setCart(response.cart);
      }
    } catch (error) {
      toast.error('更新數量失敗，請稍後再試');
    }
  };

  const handleCheckout = async () => {
    const token = localStorage.getItem('token');
    try {
      await checkout(token);
      toast.success('請至（查看訂單）進行付款');
      setCart([]);
      router.push('/orders');
    } catch (error) {
      toast.error('結帳失敗，請稍後再試');
    }
  };

  if (cart.length === 0) {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl p-10 text-center">
          <FaShoppingCart size={68} className="mx-auto text-[#58738a]" />
          <h1 className="mt-4 text-3xl font-black text-[#d8e6f3]">你的購物車是空的</h1>
          <p className="mt-2 text-[#9eb4c8]">先去挑幾款遊戲，再回來一起結帳。</p>
          <Link href="/" className="steam-btn mt-5 inline-flex rounded-md px-5 py-2 text-sm">
            返回商店
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <h1 className="text-3xl font-black text-[#d8e6f3]">購物車</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">確認商品與數量後即可建立訂單。</p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="steam-panel rounded-2xl p-4 md:p-5">
            <ul className="space-y-3">
              {cart.map((item) => {
                const unitPrice = parseFloat(item.price.replace('$', ''));
                const subtotal = unitPrice * item.quantity;
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-[#66c0f433] bg-[#142536] p-3 md:p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative h-16 w-24 overflow-hidden rounded-md border border-[#66c0f433] bg-[#0f1d2b]">
                          <Image
                            src={item.image || '/vercel.svg'}
                            alt={item.name}
                            fill
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-[#d8e6f3]">{item.name}</h2>
                          <p className="text-xs text-[#9eb4c8]">
                            單價: <span className="text-[#8bc53f]">${unitPrice.toFixed(2)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-md border border-[#66c0f433] bg-[#1a2f43] px-2 py-1">
                          <button
                            onClick={() => handleQuantityChange(item.id, -1)}
                            className="rounded p-1 text-[#c6ddef] transition hover:bg-[#24384d]"
                            aria-label="減少數量"
                          >
                            <FaMinus size={11} />
                          </button>
                          <span className="w-7 text-center text-sm font-bold text-[#d8e6f3]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, 1)}
                            className="rounded p-1 text-[#c6ddef] transition hover:bg-[#24384d]"
                            aria-label="增加數量"
                          >
                            <FaPlus size={11} />
                          </button>
                        </div>
                        <p className="min-w-24 text-right text-sm font-black text-[#8bc53f]">
                          ${subtotal.toFixed(2)}
                        </p>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="rounded-md border border-[#ff8d8d66] bg-[#4a212a] px-3 py-1.5 text-xs font-semibold text-[#ffd6d6] transition hover:bg-[#65313d]"
                        >
                          移除
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <aside className="steam-panel h-fit rounded-2xl p-5">
            <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">ORDER SUMMARY</p>
            <h2 className="mt-2 text-2xl font-black text-[#d8e6f3]">訂單摘要</h2>

            <div className="mt-4 space-y-2 rounded-lg border border-[#66c0f433] bg-[#132334] p-4 text-sm">
              <div className="flex items-center justify-between text-[#9eb4c8]">
                <span>商品數量</span>
                <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} 件</span>
              </div>
              <div className="flex items-center justify-between text-[#9eb4c8]">
                <span>預估稅金</span>
                <span>$0.00</span>
              </div>
              <div className="mt-2 border-t border-[#66c0f433] pt-2 text-base font-black text-[#d8e6f3]">
                <div className="flex items-center justify-between">
                  <span>總價</span>
                  <span className="text-[#8bc53f]">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button onClick={handleCheckout} className="steam-btn mt-4 w-full rounded-md py-2.5 text-sm">
              建立訂單並前往付款
            </button>
            <button
              onClick={handleClearCart}
              className="mt-2 w-full rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2.5 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
            >
              清空購物車
            </button>
            <Link
              href="/"
              className="mt-2 block w-full rounded-md border border-[#66c0f433] bg-[#11202f] py-2.5 text-center text-sm text-[#a9c1d5] transition hover:bg-[#1a3044]"
            >
              繼續購物
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
