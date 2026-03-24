import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { fetchProfile } from '../services/profileService';
import { ErrorState } from '../components/ui/PageStates';
import { CartPageSkeleton } from '../components/ui/PageSkeletons';
import { trackJourneyEvent } from '../utils/journeyTracker';

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

type ShippingTier = 'local' | 'domestic' | 'remote';

const promoRules: Record<string, number> = {
  STEAM10: 0.1,
  NEWBIE15: 0.15,
};
const checkoutDraftKey = 'steam_checkout_draft_v1';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartLoadError, setCartLoadError] = useState('');
  const [activeStep, setActiveStep] = useState<CheckoutStep>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit-card');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [paymentValidationTriggered, setPaymentValidationTriggered] = useState(false);
  const fullNameInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const addressInputRef = useRef<HTMLTextAreaElement | null>(null);
  const agreedInputRef = useRef<HTMLInputElement | null>(null);

  const loadCart = useCallback(async () => {
    const token = localStorage.getItem('token');
    setCartLoading(true);
    setCartLoadError('');
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
      setCartLoadError('購物車資料載入失敗，請檢查網路或稍後重試。');
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    const hydrateProfileDefaults = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const profile = await fetchProfile(token);
        if (profile?.defaultFullName) setFullName(profile.defaultFullName);
        if (profile?.defaultPhone) setPhone(profile.defaultPhone);
        if (profile?.email && profile.email !== '未提供') setContactEmail(profile.email);
        if (profile?.defaultAddress) setShippingAddress(profile.defaultAddress);
        if (profile?.defaultPaymentMethod) setPaymentMethod(profile.defaultPaymentMethod);
      } catch (error) {
        // ignore profile hydrate errors in checkout flow
      }
    };

    hydrateProfileDefaults();
  }, []);

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
      if (typeof draft.promoInput === 'string') setPromoInput(draft.promoInput);
      if (typeof draft.appliedPromo === 'string') setAppliedPromo(draft.appliedPromo);
      if (typeof draft.agreed === 'boolean') setAgreed(draft.agreed);
      if (draft.paymentMethod === 'credit-card' || draft.paymentMethod === 'line-pay' || draft.paymentMethod === 'wallet') {
        setPaymentMethod(draft.paymentMethod);
      }
    } catch (error) {
      // ignore invalid draft format
    }
  }, []);

  const total = useMemo(() => calculateTotalPrice(cart), [cart]);
  const discountRate = useMemo(() => promoRules[appliedPromo] || 0, [appliedPromo]);
  const discountAmount = useMemo(() => total * discountRate, [total, discountRate]);
  const shippingTier = useMemo(
    () => getShippingTier(shippingAddress),
    [shippingAddress]
  );
  const shippingFee = useMemo(
    () => getShippingFee(shippingTier, paymentMethod, total - discountAmount),
    [discountAmount, paymentMethod, shippingTier, total]
  );
  const estimatedDelivery = useMemo(
    () => getEstimatedDeliveryText(shippingTier),
    [shippingTier]
  );
  const payableTotal = useMemo(
    () => Math.max(0, total - discountAmount + shippingFee),
    [total, discountAmount, shippingFee]
  );
  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [cart]
  );
  const paymentErrors = useMemo(
    () => ({
      fullName: fullName.trim().length >= 2 ? '' : '姓名至少需要 2 個字元',
      phone: isValidPhone(phone) ? '' : '請輸入 8-15 碼電話號碼',
      contactEmail: isValidEmail(contactEmail) ? '' : 'Email 格式不正確',
      shippingAddress: shippingAddress.trim().length >= 6 ? '' : '地址至少需要 6 個字元',
      agreed: agreed ? '' : '請先勾選同意交易條款',
    }),
    [agreed, contactEmail, fullName, phone, shippingAddress]
  );
  const hasPaymentErrors = useMemo(
    () => Object.values(paymentErrors).some(Boolean),
    [paymentErrors]
  );

  useEffect(() => {
    const payload = {
      fullName,
      phone,
      contactEmail,
      shippingAddress,
      orderNote,
      promoInput,
      appliedPromo,
      agreed,
      paymentMethod,
    };
    localStorage.setItem(checkoutDraftKey, JSON.stringify(payload));
  }, [
    agreed,
    appliedPromo,
    contactEmail,
    fullName,
    orderNote,
    paymentMethod,
    phone,
    promoInput,
    shippingAddress,
  ]);

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
      toast.error('庫存沒貨了');
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
    setPaymentValidationTriggered(true);
    if (hasPaymentErrors) {
      const firstError = Object.values(paymentErrors).find(Boolean) || '請先完成付款資訊';
      toast.error(firstError);
      if (paymentErrors.fullName) fullNameInputRef.current?.focus();
      else if (paymentErrors.phone) phoneInputRef.current?.focus();
      else if (paymentErrors.contactEmail) emailInputRef.current?.focus();
      else if (paymentErrors.shippingAddress) addressInputRef.current?.focus();
      else if (paymentErrors.agreed) agreedInputRef.current?.focus();
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
      const result = await checkout(
        {
          fullName: fullName.trim(),
          phone: phone.trim(),
          contactEmail: contactEmail.trim(),
          shippingAddress: shippingAddress.trim(),
          orderNote: orderNote.trim(),
          paymentMethod,
        },
        token
      );
      const orderId = result?.order?.id;
      setCreatedOrderId(orderId || 'new-order');
      trackJourneyEvent({
        type: 'checkout_created',
        title: '建立訂單',
        subtitle: orderId ? `訂單 ${orderId.slice(0, 8)}...` : '新訂單',
      });
      toast.success('訂單建立成功，正在前往付款頁');
      setCart([]);
      localStorage.removeItem(checkoutDraftKey);
      setTimeout(() => {
        router.push({
          pathname: '/orders',
          query: orderId ? { orderId } : undefined,
        });
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

  if (cartLoading) {
    return <CartPageSkeleton />;
  }

  if (cartLoadError) {
    return <ErrorState title="購物車暫時不可用" description={cartLoadError} onAction={loadCart} />;
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
    <main className="steam-shell px-4 py-6 pb-28 md:px-6 md:pb-6">
      <section className="mx-auto w-full max-w-6xl">
        <h1 className="text-3xl font-black text-[#d8e6f3]">一頁式結帳</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">三步完成下單，建立訂單後會自動帶你到付款頁。</p>
        <p className="mt-2 text-xs font-semibold tracking-[0.08em] text-[#8fb8d5]">
          STEP {activeStep} / {checkoutSteps.length}
        </p>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#102131]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#66c0f4] to-[#8bc53f] transition-all duration-300"
            style={{ width: `${(activeStep / checkoutSteps.length) * 100}%` }}
          />
        </div>

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
                    ref={fullNameInputRef}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="王小明"
                    aria-invalid={(paymentValidationTriggered || fullName.trim()) && Boolean(paymentErrors.fullName)}
                    className={`mt-2 w-full rounded-md border bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:outline-none ${
                      (paymentValidationTriggered || fullName.trim()) && paymentErrors.fullName
                        ? 'border-[#ff9e9e] focus:border-[#ff9e9e]'
                        : 'border-[#66c0f444] focus:border-[#66c0f4aa]'
                    }`}
                  />
                  {(paymentValidationTriggered || fullName.trim()) && paymentErrors.fullName && (
                    <p className="mt-1 text-xs text-[#ff9e9e]">{paymentErrors.fullName}</p>
                  )}

                  <label className="mt-4 block text-sm text-[#9eb4c8]">聯絡電話</label>
                  <input
                    ref={phoneInputRef}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="0912345678"
                    aria-invalid={(paymentValidationTriggered || phone.trim()) && Boolean(paymentErrors.phone)}
                    className={`mt-2 w-full rounded-md border bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:outline-none ${
                      (paymentValidationTriggered || phone.trim()) && paymentErrors.phone
                        ? 'border-[#ff9e9e] focus:border-[#ff9e9e]'
                        : 'border-[#66c0f444] focus:border-[#66c0f4aa]'
                    }`}
                  />
                  {(paymentValidationTriggered || phone.trim()) && paymentErrors.phone && (
                    <p className="mt-1 text-xs text-[#ff9e9e]">{paymentErrors.phone}</p>
                  )}

                  <label className="mt-4 block text-sm text-[#9eb4c8]">通知 Email</label>
                  <input
                    ref={emailInputRef}
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="you@example.com"
                    aria-invalid={(paymentValidationTriggered || contactEmail.trim()) && Boolean(paymentErrors.contactEmail)}
                    className={`mt-2 w-full rounded-md border bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:outline-none ${
                      (paymentValidationTriggered || contactEmail.trim()) && paymentErrors.contactEmail
                        ? 'border-[#ff9e9e] focus:border-[#ff9e9e]'
                        : 'border-[#66c0f444] focus:border-[#66c0f4aa]'
                    }`}
                  />
                  {(paymentValidationTriggered || contactEmail.trim()) && paymentErrors.contactEmail && (
                    <p className="mt-1 text-xs text-[#ff9e9e]">{paymentErrors.contactEmail}</p>
                  )}

                  <label className="mt-4 block text-sm text-[#9eb4c8]">收件地址</label>
                  <textarea
                    ref={addressInputRef}
                    value={shippingAddress}
                    onChange={(event) => setShippingAddress(event.target.value)}
                    placeholder="台北市中正區..."
                    rows={2}
                    aria-invalid={(paymentValidationTriggered || shippingAddress.trim()) && Boolean(paymentErrors.shippingAddress)}
                    className={`mt-2 w-full resize-none rounded-md border bg-[#162737] px-3 py-2 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:outline-none ${
                      (paymentValidationTriggered || shippingAddress.trim()) && paymentErrors.shippingAddress
                        ? 'border-[#ff9e9e] focus:border-[#ff9e9e]'
                        : 'border-[#66c0f444] focus:border-[#66c0f4aa]'
                    }`}
                  />
                  {(paymentValidationTriggered || shippingAddress.trim()) && paymentErrors.shippingAddress && (
                    <p className="mt-1 text-xs text-[#ff9e9e]">{paymentErrors.shippingAddress}</p>
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
                      ref={agreedInputRef}
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                      className="mt-1"
                    />
                    <span>我同意交易條款，了解建立訂單後可於訂單頁進行付款與退款操作。</span>
                  </label>
                  {paymentValidationTriggered && paymentErrors.agreed && (
                    <p className="mt-1 text-xs text-[#ff9e9e]">{paymentErrors.agreed}</p>
                  )}
                  <p className="mt-2 text-xs text-[#8faac0]">已自動儲存本次填寫內容</p>
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
                    <InfoRow label="收件地址" value={shippingAddress || '未填寫'} />
                    <InfoRow label="商品件數" value={`${itemCount} 件`} />
                    <InfoRow
                      label={appliedPromo ? `優惠碼 (${appliedPromo})` : '優惠折抵'}
                      value={appliedPromo ? `-$${discountAmount.toFixed(2)}` : '$0.00'}
                    />
                    <InfoRow label="預估運費" value={`$${shippingFee.toFixed(2)}`} />
                    <InfoRow label="預計送達" value={estimatedDelivery} />
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
                <span>預估運費</span>
                <span>${shippingFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-[#9eb4c8]">
                <span>優惠折抵</span>
                <span className={discountAmount > 0 ? 'text-[#8bc53f]' : ''}>
                  -${discountAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#9eb4c8]">
                <span>預計送達</span>
                <span>{estimatedDelivery}</span>
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

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#66c0f433] bg-[#0e1a26ee] p-3 backdrop-blur md:hidden">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-[#8faac0]">
                Step {activeStep}/3
                {activeStep === 1 ? '・確認購物清單' : activeStep === 2 ? '・付款資訊' : '・確認送出'}
              </p>
              <p className="truncate text-[11px] text-[#9eb4c8]">預計送達：{estimatedDelivery}</p>
              <p className="text-sm font-black text-[#8bc53f]">${payableTotal.toFixed(2)}</p>
            </div>

            {activeStep !== 1 && (
              <button
                onClick={() => setActiveStep(activeStep === 3 ? 2 : 1)}
                className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-xs font-semibold text-[#d8e6f3]"
              >
                上一步
              </button>
            )}

            {activeStep === 1 && (
              <button onClick={handleNextFromItems} className="steam-btn rounded-md px-3 py-2 text-xs">
                下一步
              </button>
            )}

            {activeStep === 2 && (
              <button
                onClick={handleNextFromPayment}
                className="steam-btn rounded-md px-3 py-2 text-xs"
              >
                下一步
              </button>
            )}

            {activeStep === 3 && (
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="steam-btn rounded-md px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? '建立中...' : '送出訂單'}
              </button>
            )}
          </div>
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

function getShippingTier(address: string): ShippingTier {
  const text = address.trim();
  if (!text) return 'domestic';
  if (/(台北|新北|taipei)/i.test(text)) return 'local';
  if (/(金門|馬祖|澎湖|連江|kinmen|matsu|penghu)/i.test(text)) return 'remote';
  return 'domestic';
}

function getShippingFee(
  tier: ShippingTier,
  paymentMethod: PaymentMethod,
  subtotalAfterDiscount: number
) {
  if (subtotalAfterDiscount >= 60) return 0;
  const base = tier === 'local' ? 2 : tier === 'remote' ? 8 : 5;
  if (paymentMethod === 'wallet') return Math.max(0, base - 1);
  return base;
}

function getEstimatedDeliveryText(tier: ShippingTier) {
  if (tier === 'local') return '1-2 天';
  if (tier === 'remote') return '4-6 天';
  return '2-4 天';
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
