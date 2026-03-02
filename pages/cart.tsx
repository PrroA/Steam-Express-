import { useEffect, useMemo, useState } from 'react';
import {
  checkout,
  fetchCart,
  removeFromCart,
  updateCartQuantity,
} from '../services/cartService';
import { toast } from 'react-toastify';
import { FaShoppingCart, FaPlus, FaMinus, FaCheckCircle } from 'react-icons/fa';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { calculateTotalPrice } from '../utils/cartUtils';
import type { CartItem } from '../types/domain';

type CheckoutStep = 1 | 2 | 3;

type PaymentMethod = 'credit-card' | 'line-pay' | 'wallet';

const checkoutSteps = [
  { id: 1 as CheckoutStep, label: '購物清單' },
  { id: 2 as CheckoutStep, label: '付款資訊' },
  { id: 3 as CheckoutStep, label: '確認送出' },
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

const promoRules: Record<string, number> = {
  STEAM10: 0.1,
  NEWBIE15: 0.15,
};

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeStep, setActiveStep] = useState<CheckoutStep>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit-card');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState('');

  useEffect(() => {
    const loadCart = async () => {
      const token = localStorage.getItem('token');
      try {
        const data = await fetchCart(token);
        const nextCart = Array.isArray(data) ? data : [];
        setCart(nextCart);
        if (nextCart.length === 0) {
          setActiveStep(1);
        }
      } catch (error) {
        setCart([]);
        setActiveStep(1);
      }
    };
    loadCart();
  }, []);

  const total = useMemo(() => calculateTotalPrice(cart), [cart]);
  const discountRate = useMemo(() => promoRules[appliedPromo] || 0, [appliedPromo]);
  const discountAmount = useMemo(() => total * discountRate, [total, discountRate]);
  const payableTotal = useMemo(() => Math.max(0, total - discountAmount), [total, discountAmount]);
  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [cart]
  );

  const handleRemove = async (id: number) => {
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
      const results = await Promise.allSettled(cart.map((item) => removeFromCart(item.id, token)));
      const failedItems = results.filter((result) => result.status === 'rejected');
      if (failedItems.length > 0) {
        toast.error(`部分商品清空失敗 (${failedItems.length} 項)`);
      } else {
        toast.success('購物車已清空');
      }
      setCart([]);
      setActiveStep(1);
    } catch (error) {
      toast.error('清空購物車失敗，請稍後再試');
    }
  };

  const handleQuantityChange = async (id: number, change: number) => {
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

  const handleNextFromItems = () => {
    if (cart.length === 0) {
      toast.error('購物車是空的，無法結帳');
      return;
    }
    setActiveStep(2);
  };

  const handleNextFromPayment = () => {
    if (fullName.trim().length < 2) {
      toast.error('請輸入收件人姓名');
      return;
    }
    if (!isValidPhone(phone)) {
      toast.error('請輸入有效電話');
      return;
    }
    if (!isValidEmail(contactEmail)) {
      toast.error('請輸入有效 Email 以接收訂單通知');
      return;
    }
    if (!agreed) {
      toast.error('請先勾選同意交易條款');
      return;
    }
    setActiveStep(3);
  };

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      toast.error('請先輸入優惠碼');
      return;
    }
    if (!promoRules[code]) {
      toast.error('優惠碼無效');
      return;
    }
    setAppliedPromo(code);
    toast.success(`已套用優惠碼 ${code}`);
  };

  const handleSubmitOrder = async () => {
    if (isSubmitting) return;
    const token = localStorage.getItem('token');
    try {
      setIsSubmitting(true);
      const result = await checkout(token);
      const orderId = result?.order?.id;
      setCreatedOrderId(orderId || 'new-order');
      toast.success('訂單建立成功，正在前往付款頁');
      setCart([]);
      setTimeout(() => {
        router.push(orderId ? `/orders?orderId=${orderId}` : '/orders');
      }, 1200);
    } catch (error) {
      toast.error('結帳失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdOrderId) {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl border border-[#66c0f455] p-10 text-center">
          <FaCheckCircle size={64} className="mx-auto text-[#8bc53f]" />
          <h1 className="mt-4 text-3xl font-black text-[#d8e6f3]">訂單建立成功</h1>
          <p className="mt-2 text-[#9eb4c8]">
            訂單編號：
            <span className="ml-1 font-bold text-[#cfe4f5]">{createdOrderId}</span>
          </p>
          <p className="mt-2 text-sm text-[#9eb4c8]">系統正在帶你前往付款頁...</p>
        </div>
      </main>
    );
  }

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
        <h1 className="text-3xl font-black text-[#d8e6f3]">一頁式結帳</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">三步完成下單，建立訂單後會自動帶你到付款頁。</p>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-[#66c0f433] bg-[#122333] p-2">
          {checkoutSteps.map((step) => {
            const isActive = step.id === activeStep;
            const isDone = step.id < activeStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => step.id <= activeStep && setActiveStep(step.id)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border border-[#66c0f4aa] bg-[#193a52] text-[#d8e6f3]'
                    : isDone
                      ? 'border border-[#8bc53f55] bg-[#1f3a2a] text-[#cde8a5]'
                      : 'border border-transparent bg-[#16293a] text-[#8faac0]'
                }`}
              >
                {step.id}. {step.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="steam-panel rounded-2xl p-4 md:p-5">
            {activeStep === 1 && (
              <>
                <h2 className="text-xl font-black text-[#d8e6f3]">步驟 1：確認購物清單</h2>
                <p className="mt-1 text-sm text-[#9eb4c8]">調整數量或移除商品後，再進入付款資訊。</p>

                <ul className="mt-4 space-y-3">
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
                              <h3 className="text-base font-bold text-[#d8e6f3]">{item.name}</h3>
                              {item.variantName && (
                                <p className="text-xs text-[#8fb8d5]">版本: {item.variantName}</p>
                              )}
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
              </>
            )}

            {activeStep === 2 && (
              <>
                <h2 className="text-xl font-black text-[#d8e6f3]">步驟 2：付款與聯絡資訊</h2>
                <p className="mt-1 text-sm text-[#9eb4c8]">此步驟先收集付款偏好，實際刷卡仍在下一頁完成。</p>

                <div className="mt-4 rounded-xl border border-[#66c0f433] bg-[#142536] p-4">
                  <p className="text-sm font-semibold text-[#d8e6f3]">付款方式</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {[
                      { id: 'credit-card', label: '信用卡' },
                      { id: 'line-pay', label: 'LINE Pay' },
                      { id: 'wallet', label: 'Steam 錢包' },
                    ].map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          paymentMethod === method.id
                            ? 'border-[#66c0f4aa] bg-[#1a3b53] text-[#d8e6f3]'
                            : 'border-[#66c0f433] bg-[#11202f] text-[#9eb4c8] hover:bg-[#1a3044]'
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>

                  <label className="mt-4 block text-sm text-[#9eb4c8]">收件人姓名</label>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="王小明"
                    className="mt-2 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                  />
                  {fullName.trim() && fullName.trim().length < 2 && (
                    <p className="mt-1 text-xs text-[#ff9e9e]">姓名至少需要 2 個字元</p>
                  )}

                  <label className="mt-4 block text-sm text-[#9eb4c8]">聯絡電話</label>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="0912345678"
                    className="mt-2 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                  />
                  {phone.trim() && !isValidPhone(phone) && (
                    <p className="mt-1 text-xs text-[#ff9e9e]">請輸入 8-15 碼電話號碼</p>
                  )}

                  <label className="mt-4 block text-sm text-[#9eb4c8]">通知 Email</label>
                  <input
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="mt-2 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                  />
                  {contactEmail.trim() && !isValidEmail(contactEmail) && (
                    <p className="mt-1 text-xs text-[#ff9e9e]">Email 格式不正確</p>
                  )}

                  <label className="mt-4 block text-sm text-[#9eb4c8]">優惠碼（選填）</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={promoInput}
                      onChange={(event) => setPromoInput(event.target.value)}
                      placeholder="輸入 STEAM10 或 NEWBIE15"
                      className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-4 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
                    >
                      套用
                    </button>
                  </div>
                  {appliedPromo && (
                    <p className="mt-1 text-xs text-[#8bc53f]">
                      已套用 {appliedPromo}，折抵 {(discountRate * 100).toFixed(0)}%
                    </p>
                  )}

                  <label className="mt-4 block text-sm text-[#9eb4c8]">訂單備註（可選）</label>
                  <textarea
                    value={orderNote}
                    onChange={(event) => setOrderNote(event.target.value)}
                    placeholder="例如：希望收到折扣通知"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                  />

                  <label className="mt-4 flex items-start gap-2 text-sm text-[#9eb4c8]">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                      className="mt-1"
                    />
                    <span>我同意交易條款，了解建立訂單後可於訂單頁進行付款與退款操作。</span>
                  </label>
                </div>
              </>
            )}

            {activeStep === 3 && (
              <>
                <h2 className="text-xl font-black text-[#d8e6f3]">步驟 3：確認並建立訂單</h2>
                <p className="mt-1 text-sm text-[#9eb4c8]">確認資訊無誤後送出，系統會建立未付款訂單並導向付款頁。</p>

                <div className="mt-4 rounded-xl border border-[#66c0f433] bg-[#142536] p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoRow label="付款方式" value={paymentMethodLabel(paymentMethod)} />
                    <InfoRow label="收件人" value={fullName || '未填寫'} />
                    <InfoRow label="聯絡電話" value={phone || '未填寫'} />
                    <InfoRow label="通知 Email" value={contactEmail || '未填寫'} />
                    <InfoRow label="商品件數" value={`${itemCount} 件`} />
                    <InfoRow
                      label={appliedPromo ? `優惠碼 (${appliedPromo})` : '優惠折抵'}
                      value={appliedPromo ? `-$${discountAmount.toFixed(2)}` : '$0.00'}
                    />
                    <InfoRow label="總金額" value={`$${payableTotal.toFixed(2)}`} strong />
                  </div>
                  {orderNote.trim() && (
                    <div className="mt-4 rounded-md border border-[#66c0f433] bg-[#102131] p-3 text-sm text-[#9eb4c8]">
                      備註：{orderNote}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <aside className="steam-panel h-fit rounded-2xl p-5">
            <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">ORDER SUMMARY</p>
            <h2 className="mt-2 text-2xl font-black text-[#d8e6f3]">訂單摘要</h2>

            <div className="mt-4 space-y-2 rounded-lg border border-[#66c0f433] bg-[#132334] p-4 text-sm">
              <div className="flex items-center justify-between text-[#9eb4c8]">
                <span>商品數量</span>
                <span>{itemCount} 件</span>
              </div>
              <div className="flex items-center justify-between text-[#9eb4c8]">
                <span>預估稅金</span>
                <span>$0.00</span>
              </div>
              <div className="flex items-center justify-between text-[#9eb4c8]">
                <span>優惠折抵</span>
                <span className={discountAmount > 0 ? 'text-[#8bc53f]' : ''}>
                  -${discountAmount.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 border-t border-[#66c0f433] pt-2 text-base font-black text-[#d8e6f3]">
                <div className="flex items-center justify-between">
                  <span>應付金額</span>
                  <span className="text-[#8bc53f]">${payableTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {activeStep === 1 && (
              <button onClick={handleNextFromItems} className="steam-btn mt-4 w-full rounded-md py-2.5 text-sm">
                前往付款資訊
              </button>
            )}

            {activeStep === 2 && (
              <div className="mt-4 grid gap-2">
                <button
                  onClick={handleNextFromPayment}
                  className="steam-btn w-full rounded-md py-2.5 text-sm"
                >
                  前往確認送出
                </button>
                <button
                  onClick={() => setActiveStep(1)}
                  className="w-full rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2.5 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
                >
                  返回購物清單
                </button>
              </div>
            )}

            {activeStep === 3 && (
              <div className="mt-4 grid gap-2">
                <button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                  className="steam-btn w-full rounded-md py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? '建立中...' : '建立訂單並前往付款'}
                </button>
                <button
                  onClick={() => setActiveStep(2)}
                  className="w-full rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2.5 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
                >
                  返回付款資訊
                </button>
              </div>
            )}

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

function paymentMethodLabel(method: PaymentMethod) {
  if (method === 'credit-card') return '信用卡';
  if (method === 'line-pay') return 'LINE Pay';
  return 'Steam 錢包';
}

function InfoRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md border border-[#66c0f433] bg-[#102131] p-3">
      <p className="text-xs text-[#8faac0]">{label}</p>
      <p className={`mt-1 text-sm ${strong ? 'font-black text-[#8bc53f]' : 'font-semibold text-[#d8e6f3]'}`}>
        {value}
      </p>
    </div>
  );
}
