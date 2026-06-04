import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { FaCheckCircle, FaMagic, FaMinus, FaPlus, FaShoppingCart } from 'react-icons/fa';
import { checkout, fetchCart, removeFromCart, updateCartQuantity } from '../services/cartService';
import { ErrorState } from '../components/ui/PageStates';
import { CartPageSkeleton } from '../components/ui/PageSkeletons';
import { AiSourceBadge } from '../components/ui/AiSourceBadge';
import { trackJourneyEvent } from '../utils/journeyTracker';
import { buildClientPreferenceProfile } from '../utils/aiPreferenceProfile';
import {
  buildFallbackCartReviewAdvice,
  generateBrowserCartReviewAdvice,
  type CartReviewAdvice,
} from '../utils/browserBuyingAdvice';
import type { CartItem } from '../types/domain';

type CheckoutStep = 1 | 2 | 3;
const checkoutDraftKey = 'steam_checkout_draft_v1';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function parsePrice(price: string) {
  return parseFloat((price || '$0').replace('$', '')) || 0;
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartLoadError, setCartLoadError] = useState('');
  const [activeStep, setActiveStep] = useState<CheckoutStep>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [validationTriggered, setValidationTriggered] = useState(false);
  const [cartReviewAdvice, setCartReviewAdvice] = useState<CartReviewAdvice | null>(null);
  const [isCartReviewLoading, setIsCartReviewLoading] = useState(false);

  const loadCart = useCallback(async () => {
    const token = localStorage.getItem('token');
    setCartLoading(true);
    setCartLoadError('');
    try {
      const data = await fetchCart(token);
      const nextCart = Array.isArray(data) ? data : [];
      setCart(nextCart);
      if (nextCart.length === 0) setActiveStep(1);
    } catch {
      setCart([]);
      setCartLoadError('購物車暫時無法載入，請稍後再試。');
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(checkoutDraftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (typeof draft.fullName === 'string') setFullName(draft.fullName);
      if (typeof draft.phone === 'string') setPhone(draft.phone);
      if (typeof draft.contactEmail === 'string') setContactEmail(draft.contactEmail);
      if (typeof draft.shippingAddress === 'string') setShippingAddress(draft.shippingAddress);
      if (typeof draft.orderNote === 'string') setOrderNote(draft.orderNote);
      if (typeof draft.agreed === 'boolean') setAgreed(draft.agreed);
    } catch {
      localStorage.removeItem(checkoutDraftKey);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      checkoutDraftKey,
      JSON.stringify({ fullName, phone, contactEmail, shippingAddress, orderNote, agreed })
    );
  }, [agreed, contactEmail, fullName, orderNote, phone, shippingAddress]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + parsePrice(item.price) * item.quantity, 0),
    [cart]
  );
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + (item.quantity || 0), 0), [cart]);
  const payableTotal = subtotal;

  const loadCartReviewAdvice = useCallback(async () => {
    const profile = {
      ...buildClientPreferenceProfile(cart[0] || null),
      averagePrice: cart.length > 0 ? subtotal / cart.length : 0,
    };

    setIsCartReviewLoading(true);
    setCartReviewAdvice(buildFallbackCartReviewAdvice(cart, profile));
    try {
      const advice = await generateBrowserCartReviewAdvice(cart, profile);
      setCartReviewAdvice(advice);
    } finally {
      setIsCartReviewLoading(false);
    }
  }, [cart, subtotal]);

  useEffect(() => {
    setCartReviewAdvice(null);
  }, [cart]);

  const formErrors = useMemo(
    () => ({
      fullName: fullName.trim().length >= 2 ? '' : '請輸入收件人姓名。',
      phone: isValidPhone(phone) ? '' : '請輸入可聯絡的電話。',
      contactEmail: isValidEmail(contactEmail) ? '' : '請輸入正確的 Email。',
      shippingAddress: shippingAddress.trim().length >= 6 ? '' : '請輸入完整地址。',
      agreed: agreed ? '' : '請先確認訂單資料。',
    }),
    [agreed, contactEmail, fullName, phone, shippingAddress]
  );
  const hasFormErrors = Object.values(formErrors).some(Boolean);

  const handleRemove = async (itemToRemove: CartItem) => {
    const token = localStorage.getItem('token');
    const previousCart = cart;
    setCart((current) =>
      current.filter((item) => !(item.id === itemToRemove.id && item.variantId === itemToRemove.variantId))
    );
    try {
      await removeFromCart(Number(itemToRemove.id), token, itemToRemove.variantId);
      toast.success('已從購物車移除。');
    } catch {
      setCart(previousCart);
      toast.error('暫時無法移除商品，請再試一次。');
    }
  };

  const handleQuantityChange = async (item: CartItem, change: number) => {
    const token = localStorage.getItem('token');
    const newQuantity = Math.max(1, item.quantity + change);
    try {
      const response = await updateCartQuantity(Number(item.id), newQuantity, token, item.variantId);
      if (response.cart) setCart(response.cart);
    } catch {
      toast.error('數量沒有更新成功，請再試一次。');
    }
  };

  const handleNextFromItems = () => {
    if (cart.length === 0) {
      toast.error('購物車是空的，請先加入商品。');
      return;
    }
    setActiveStep(2);
  };

  const handleNextFromCustomer = () => {
    setValidationTriggered(true);
    if (hasFormErrors) {
      toast.error(Object.values(formErrors).find(Boolean) || '請確認訂單資料。');
      return;
    }
    setActiveStep(3);
  };

  const handleSubmitOrder = async () => {
    if (isSubmitting) return;
    setValidationTriggered(true);
    if (hasFormErrors) {
      toast.error(Object.values(formErrors).find(Boolean) || '請確認訂單資料。');
      setActiveStep(2);
      return;
    }

    const token = localStorage.getItem('token');
    try {
      setIsSubmitting(true);
      const result = await checkout(
        {
          fullName: fullName.trim(),
          phone: phone.trim(),
          contactEmail: contactEmail.trim(),
          shippingAddress: shippingAddress.trim(),
          orderNote: orderNote.trim(),
          paymentMethod: 'credit-card',
        },
        token
      );
      const orderId = result?.order?.id || 'new-order';
      setCreatedOrderId(orderId);
      trackJourneyEvent({
        type: 'checkout_created',
        title: '建立訂單',
        subtitle: orderId ? `訂單 ${orderId.slice(0, 8)}...` : '等待付款',
        orderId,
        total: payableTotal,
      });
      toast.success('訂單已建立，接著前往付款。');
      setCart([]);
      localStorage.removeItem(checkoutDraftKey);
      setTimeout(() => {
        router.push({ pathname: '/orders', query: orderId ? { orderId } : undefined });
      }, 900);
    } catch {
      toast.error('訂單還沒建立成功，請再試一次。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdOrderId) {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl border border-[#66c0f455] p-10 text-center">
          <FaCheckCircle size={64} className="mx-auto text-[#8bc53f]" />
          <h1 className="mt-4 text-3xl font-black text-[#d8e6f3]">訂單已建立</h1>
          <p className="mt-2 text-[#9eb4c8]">正在帶你前往訂單中心完成付款。</p>
        </div>
      </main>
    );
  }

  if (cartLoading) return <CartPageSkeleton />;
  if (cartLoadError) return <ErrorState title="購物車暫時無法使用" description={cartLoadError} onAction={loadCart} />;

  if (cart.length === 0) {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl p-10 text-center">
          <FaShoppingCart size={68} className="mx-auto text-[#58738a]" />
          <h1 className="mt-4 text-3xl font-black text-[#d8e6f3]">購物車是空的</h1>
          <p className="mt-2 text-[#9eb4c8]">先挑一款想玩的遊戲，再回來完成結帳。</p>
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
        <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">購物車</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">確認商品</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">確認想買的遊戲，留下聯絡資料後就能建立訂單。</p>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-[#66c0f433] bg-[#122333] p-2">
          {[
            { id: 1, label: '購物車' },
            { id: 2, label: '聯絡資料' },
            { id: 3, label: '建立訂單' },
          ].map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => step.id <= activeStep && setActiveStep(step.id as CheckoutStep)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                step.id === activeStep
                  ? 'border border-[#66c0f4aa] bg-[#193a52] text-[#d8e6f3]'
                  : step.id < activeStep
                    ? 'border border-[#8bc53f55] bg-[#1f3a2a] text-[#cde8a5]'
                    : 'border border-transparent bg-[#16293a] text-[#8faac0]'
              }`}
            >
              {step.id}. {step.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="steam-panel rounded-2xl p-4 md:p-5">
            {activeStep === 1 && (
              <>
                <h2 className="text-xl font-black text-[#d8e6f3]">購物車內容</h2>
                <ul className="mt-4 space-y-3">
                  {cart.map((item) => {
                    const unitPrice = parsePrice(item.price);
                    return (
                      <li key={`${item.id}-${item.variantId || 'default'}`} className="rounded-xl border border-[#66c0f433] bg-[#142536] p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative h-16 w-24 overflow-hidden rounded-md border border-[#66c0f433] bg-[#0f1d2b]">
                              <Image src={item.image || '/vercel.svg'} alt={item.name} fill style={{ objectFit: 'cover' }} />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-[#d8e6f3]">{item.name}</h3>
                              {item.variantName && <p className="text-xs text-[#8fb8d5]">{item.variantName}</p>}
                              <p className="text-xs text-[#9eb4c8]">單價 ${unitPrice.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-md border border-[#66c0f433] bg-[#1a2f43] px-2 py-1">
                              <button type="button" onClick={() => handleQuantityChange(item, -1)} aria-label="減少數量" className="rounded p-1 text-[#c6ddef] hover:bg-[#24384d]">
                                <FaMinus size={11} />
                              </button>
                              <span className="w-7 text-center text-sm font-bold text-[#d8e6f3]">{item.quantity}</span>
                              <button type="button" onClick={() => handleQuantityChange(item, 1)} aria-label="增加數量" className="rounded p-1 text-[#c6ddef] hover:bg-[#24384d]">
                                <FaPlus size={11} />
                              </button>
                            </div>
                            <p className="min-w-24 text-right text-sm font-black text-[#8bc53f]">
                              ${(unitPrice * item.quantity).toFixed(2)}
                            </p>
                            <button type="button" onClick={() => handleRemove(item)} className="rounded-md border border-[#ff8d8d66] bg-[#4a212a] px-3 py-1.5 text-xs font-semibold text-[#ffd6d6] hover:bg-[#65313d]">
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
                <h2 className="text-xl font-black text-[#d8e6f3]">留下聯絡資料</h2>
                <p className="mt-1 text-sm text-[#9eb4c8]">
                  這些資料會放在訂單中心，方便你確認付款與訂單狀態。
                </p>
                <div className="mt-4 grid gap-4 rounded-xl border border-[#66c0f433] bg-[#142536] p-4">
                  <Field label="收件人" error={validationTriggered ? formErrors.fullName : ''}>
                    <input data-testid="checkout-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="王小明" className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none" />
                  </Field>
                  <Field label="電話" error={validationTriggered ? formErrors.phone : ''}>
                    <input data-testid="checkout-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0912345678" className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none" />
                  </Field>
                  <Field label="Email" error={validationTriggered ? formErrors.contactEmail : ''}>
                    <input data-testid="checkout-email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none" />
                  </Field>
                  <Field label="聯絡地址" error={validationTriggered ? formErrors.shippingAddress : ''}>
                    <textarea data-testid="checkout-shipping-address" value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} rows={2} placeholder="請輸入可聯絡地址" className="w-full resize-none rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none" />
                  </Field>
                  <Field label="訂單備註">
                    <textarea value={orderNote} onChange={(event) => setOrderNote(event.target.value)} rows={3} placeholder="有需要補充的資訊可以寫在這裡" className="w-full resize-none rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none" />
                  </Field>
                  <label className="flex items-start gap-2 text-sm text-[#9eb4c8]">
                    <input data-testid="checkout-agree" type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1" />
                    <span>我已確認商品與聯絡資料正確。</span>
                  </label>
                  {validationTriggered && formErrors.agreed && <p className="text-xs text-[#ff9e9e]">{formErrors.agreed}</p>}
                </div>
              </>
            )}

            {activeStep === 3 && (
              <>
                <h2 className="text-xl font-black text-[#d8e6f3]">最後確認</h2>
                <div className="mt-4 grid gap-3 rounded-xl border border-[#66c0f433] bg-[#142536] p-4 sm:grid-cols-2">
                  <InfoRow label="付款" value="建立訂單後前往訂單中心付款" />
                  <InfoRow label="收件人" value={fullName} />
                  <InfoRow label="電話" value={phone} />
                  <InfoRow label="Email" value={contactEmail} />
                  <InfoRow label="地址" value={shippingAddress} />
                  <InfoRow label="商品數量" value={`${itemCount} 件`} />
                  <InfoRow label="應付金額" value={`$${payableTotal.toFixed(2)}`} strong />
                </div>
              </>
            )}
          </div>

          <aside className="steam-panel h-fit rounded-2xl p-5">
            <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">結帳摘要</p>
            <h2 className="mt-2 text-2xl font-black text-[#d8e6f3]">共 {itemCount} 件商品</h2>
            <div className="mt-4 space-y-2 rounded-lg border border-[#66c0f433] bg-[#132334] p-4 text-sm">
              <SummaryRow label="商品小計" value={`$${subtotal.toFixed(2)}`} />
              <SummaryRow label="總計" value={`$${payableTotal.toFixed(2)}`} strong />
            </div>

            <CartReviewPanel
              advice={cartReviewAdvice}
              isLoading={isCartReviewLoading}
              onReview={loadCartReviewAdvice}
            />

            {activeStep === 1 && (
              <button data-testid="checkout-next-payment" type="button" onClick={handleNextFromItems} className="steam-btn mt-4 w-full rounded-md py-2.5 text-sm">
                填寫聯絡資料
              </button>
            )}
            {activeStep === 2 && (
              <div className="mt-4 grid gap-2">
                <button data-testid="checkout-next-review" type="button" onClick={handleNextFromCustomer} className="steam-btn w-full rounded-md py-2.5 text-sm">
                  前往最後確認
                </button>
                <button type="button" onClick={() => setActiveStep(1)} className="w-full rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2.5 text-sm font-semibold text-[#d8e6f3] hover:bg-[#24384d]">
                  回到購物車
                </button>
              </div>
            )}
            {activeStep === 3 && (
              <div className="mt-4 grid gap-2">
                <button data-testid="checkout-submit" type="button" onClick={handleSubmitOrder} disabled={isSubmitting} className="steam-btn w-full rounded-md py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60">
                  {isSubmitting ? '建立訂單中...' : '建立訂單並前往付款'}
                </button>
                <button type="button" onClick={() => setActiveStep(2)} className="w-full rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2.5 text-sm font-semibold text-[#d8e6f3] hover:bg-[#24384d]">
                  修改資料
                </button>
              </div>
            )}
            <Link href="/" className="mt-2 block w-full rounded-md border border-[#66c0f433] bg-[#11202f] py-2.5 text-center text-sm text-[#a9c1d5] hover:bg-[#1a3044]">
              繼續逛商店
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({ label, error = '', children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-[#9eb4c8]">
      {label}
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1 text-xs text-[#ff9e9e]">{error}</p>}
    </label>
  );
}

function CartReviewPanel({
  advice,
  isLoading,
  onReview,
}: {
  advice: CartReviewAdvice | null;
  isLoading: boolean;
  onReview: () => void;
}) {
  const verdictLabel = advice
    ? advice.verdict === 'ready'
      ? '可以結帳'
      : advice.verdict === 'check'
        ? '先確認預算'
        : '建議調整'
    : '結帳前檢查';

  return (
    <section className="mt-4 rounded-xl border border-[#8bc53f44] bg-[#102217] p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-[#b7df9e]">
            <FaMagic aria-hidden />
            AI 購物車檢查
          </p>
          <h3 className="mt-1 text-base font-black text-[#e0f4d9]">{verdictLabel}</h3>
        </div>
        <button
          type="button"
          data-testid="cart-ai-review"
          onClick={onReview}
          disabled={isLoading}
          className="shrink-0 rounded-md border border-[#8bc53f66] bg-[#18351e] px-3 py-2 text-xs font-bold text-[#dff5d5] transition hover:border-[#8bc53f] hover:bg-[#204a29] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? '正在整理檢查' : advice ? '重新檢查' : '檢查'}
        </button>
      </div>

      {isLoading && (
        <p className="mt-3 leading-6 text-[#9ec09e]">
          正在根據購物車內容、數量與總價整理結帳前提醒。
        </p>
      )}

      {!isLoading && advice ? (
        <div className="mt-3 space-y-3 leading-6 text-[#cde8c7]">
          <p>{advice.summary}</p>
          <div className="rounded-lg border border-[#8bc53f33] bg-[#132816] p-3">
            <p className="text-xs font-bold text-[#b7df9e]">重點</p>
            <ul className="mt-2 space-y-1">
              {advice.highlights.map((item) => (
                <li key={item}>・{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-[#66c0f433] bg-[#101d2a] p-3 text-[#d7e8f4]">
            <p className="text-xs font-bold text-[#8fb8d5]">送出前看一下</p>
            <ul className="mt-2 space-y-1">
              {advice.concerns.map((item) => (
                <li key={item}>・{item}</li>
              ))}
            </ul>
            <p className="mt-2 font-semibold text-[#e8f6ff]">{advice.nextAction}</p>
          </div>
          <AiSourceBadge source={advice.source} prefix />
        </div>
      ) : !isLoading ? (
        <p className="mt-3 leading-6 text-[#9ec09e]">
          送出訂單前，可以先讓助理幫你看總價、版本和數量是否合理。
        </p>
      ) : null}
    </section>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? 'border-t border-[#66c0f433] pt-2 text-base font-black text-[#d8e6f3]' : 'text-[#9eb4c8]'}`}>
      <span>{label}</span>
      <span className={strong ? 'text-[#8bc53f]' : ''}>{value}</span>
    </div>
  );
}

function InfoRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md border border-[#66c0f433] bg-[#102131] p-3">
      <p className="text-xs text-[#8faac0]">{label}</p>
      <p className={`mt-1 text-sm ${strong ? 'font-black text-[#8bc53f]' : 'font-semibold text-[#d8e6f3]'}`}>{value}</p>
    </div>
  );
}
