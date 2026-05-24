import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaHeadset, FaPaperPlane } from 'react-icons/fa';

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return 'http://localhost:4000';
    }
  }

  return 'https://steam-express.onrender.com';
}

type ChatSource = {
  id: string;
  title: string;
  type: 'faq' | 'policy' | 'catalog' | 'order';
  score?: number;
  gameId?: number;
  price?: string;
  image?: string;
  reason?: string;
  href?: string;
};

type RagScoreBreakdown = {
  exact?: number;
  title?: number;
  content?: number;
  tags?: number;
  intent?: number;
};

type RagDebug = {
  retriever: string;
  query: string;
  matches: Array<{
    id: string;
    title: string;
    type: string;
    score: number;
    scoreBreakdown?: RagScoreBreakdown;
  }>;
};

type ProductComparisonRow = {
  gameId: number;
  name: string;
  price: string;
  stock: number;
  fit: string;
  tradeoff: string;
  href: string;
};

type CartReviewItem = {
  gameId: number;
  name: string;
  quantity: number;
  variantName?: string;
  lineTotal: string;
  advice: string;
  href: string;
};

type CartReview = {
  total: string;
  itemCount: number;
  verdict: string;
  nextStep: string;
  items: CartReviewItem[];
};

type OrderCare = {
  orderId: string;
  shortId: string;
  status: string;
  fulfillmentStatus: string;
  total: string;
  items: string;
  primaryAction: string;
  nextStep: string;
  canRequestRefund: boolean;
  href: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  status?: 'grounded' | 'general' | 'unavailable' | 'account';
  sources?: ChatSource[];
  comparison?: ProductComparisonRow[];
  cartReview?: CartReview;
  orderCare?: OrderCare;
  debug?: RagDebug;
};

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getStatusLabel(message: ChatMessage) {
  if (message.status === 'account') return '根據你的訂單回答';
  if (message.status === 'grounded') return '根據商城資料回答';
  if (message.status === 'unavailable') return '目前先用客服建議回覆';
  return '一般客服回覆';
}

function getSourceTypeLabel(type: ChatSource['type']) {
  if (type === 'catalog') return '商品資料';
  if (type === 'policy') return '商店規則';
  if (type === 'order') return '你的訂單';
  return '客服說明';
}

function getAuthHeader() {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isLocalHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function formatScoreBreakdown(scoreBreakdown?: RagScoreBreakdown) {
  if (!scoreBreakdown) return [];
  return [
    ['exact', scoreBreakdown.exact],
    ['title', scoreBreakdown.title],
    ['content', scoreBreakdown.content],
    ['tags', scoreBreakdown.tags],
    ['intent', scoreBreakdown.intent],
  ].filter(([, value]) => Number(value || 0) > 0);
}

function getCatalogSources(sources?: ChatSource[]) {
  return (sources || []).filter((source) => source.type === 'catalog' && source.gameId);
}

function getSupportSources(sources?: ChatSource[]) {
  return (sources || []).filter((source) => source.type !== 'catalog' || !source.gameId);
}

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '你好，我可以幫你找商品、推薦適合的遊戲，也可以在你登入後整理最近的訂單狀態。',
      status: 'general',
      sources: [],
    },
  ]);
  const [isReplying, setIsReplying] = useState(false);
  const [debugAvailable, setDebugAvailable] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = useMemo(
    () => [
      '我想找 1000 元以下、可以放鬆玩的遊戲',
      '這筆訂單接下來怎麼辦？',
      '幫我檢查購物車適不適合結帳',
      'Elden Ring 跟 The Witcher 3 哪個適合？',
      '預算 30 美金，想玩 RPG，哪一款適合？',
    ],
    []
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    setDebugAvailable(isLocalHost());
  }, []);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isReplying) return;

    setInput('');
    setIsReplying(true);
    setMessages((previous) => [...previous, { id: createMessageId(), role: 'user', text: content }]);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);
      const debugQuery = debugAvailable && debugEnabled ? '?debug=1' : '';
      const response = await fetch(`${getApiBaseUrl()}/chat/rag${debugQuery}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ message: content }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('request failed');
      }

      const data = await response.json();
      const sources = Array.isArray(data?.sources) ? data.sources.slice(0, 2) : [];
      const comparison = Array.isArray(data?.comparison) ? data.comparison.slice(0, 3) : undefined;
      const cartReview = data?.cartReview && Array.isArray(data.cartReview.items) ? data.cartReview : undefined;
      const orderCare = data?.orderCare?.orderId ? data.orderCare : undefined;
      const status =
        data?.mode === 'order-status' || data?.mode === 'order-care'
          ? 'account'
          : data?.grounded
            ? 'grounded'
            : data?.mode === 'service-fallback'
              ? 'unavailable'
              : 'general';

      setMessages((previous) => [
        ...previous,
        {
          id: createMessageId(),
          role: 'assistant',
          text: data?.reply || '我暫時沒有整理出答案，你可以換個方式問我商品、付款或訂單問題。',
          status,
          sources,
          comparison,
          cartReview,
          orderCare,
          debug: data?.debug,
        },
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          id: createMessageId(),
          role: 'assistant',
          text: '目前客服助理暫時連不上。你仍然可以先逛商品、加入購物車，或到訂單中心查看狀態。',
          status: 'unavailable',
          sources: [],
        },
      ]);
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <main className="steam-shell min-h-screen px-4 py-6 md:px-6">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">AI 商城客服</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-black text-[#d8e6f3]">
            <FaHeadset className="text-[#66c0f4]" aria-hidden />
            需要我幫你找遊戲嗎？
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9eb4c8]">
            可以問商品推薦、付款、退款、配送、願望清單。登入後也能詢問自己的訂單狀態。
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <section className="steam-panel flex min-h-[560px] flex-col rounded-2xl border border-[#66c0f433]">
            <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-5">
              {messages.map((message) => {
                const isUser = message.role === 'user';
                const catalogSources = getCatalogSources(message.sources);
                const supportSources = getSupportSources(message.sources);
                return (
                  <article key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl border px-4 py-3 text-sm leading-6 ${
                        isUser
                          ? 'border-[#8bc53f66] bg-[#24402b] text-[#edf8de]'
                          : 'border-[#66c0f433] bg-[#132434] text-[#d8e6f3]'
                      }`}
                    >
                      {!isUser && (
                        <p className="mb-1 text-[11px] font-bold tracking-[0.12em] text-[#8fb8d5]">
                          {getStatusLabel(message)}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      {!isUser && message.orderCare && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-[#66c0f455] bg-[#101d2a]">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#66c0f422] px-3 py-2">
                            <p className="text-[11px] font-bold tracking-[0.12em] text-[#8fb8d5]">
                              訂單 {message.orderCare.shortId}
                            </p>
                            <span className="rounded border border-[#66c0f455] bg-[#173149] px-2 py-0.5 text-xs font-bold text-[#c7ebff]">
                              {message.orderCare.total}
                            </span>
                          </div>
                          <div className="grid gap-2 p-3 text-xs leading-5 text-[#c5dced]">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="rounded border border-[#66c0f422] bg-[#132434] p-2">
                                <p className="text-[#8faac0]">付款狀態</p>
                                <p className="font-bold text-[#e3f0fb]">{message.orderCare.status}</p>
                              </div>
                              <div className="rounded border border-[#66c0f422] bg-[#132434] p-2">
                                <p className="text-[#8faac0]">出貨狀態</p>
                                <p className="font-bold text-[#e3f0fb]">{message.orderCare.fulfillmentStatus}</p>
                              </div>
                            </div>
                            <p className="rounded border border-[#66c0f422] bg-[#132434] p-2 text-[#9eb4c8]">
                              {message.orderCare.items}
                            </p>
                            <p className="rounded border border-[#8bc53f33] bg-[#122816] p-2 text-[#d6edce]">
                              {message.orderCare.nextStep}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={message.orderCare.href}
                                className="inline-flex rounded border border-[#66c0f455] px-2.5 py-1 text-xs font-bold text-[#bfe4fb] transition hover:bg-[#1a3044]"
                              >
                                {message.orderCare.primaryAction}
                              </Link>
                              {message.orderCare.canRequestRefund && (
                                <span className="rounded border border-[#8bc53f55] px-2.5 py-1 text-[11px] font-bold text-[#c9f0b8]">
                                  可從訂單詳情申請退款
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {!isUser && message.cartReview && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-[#8bc53f55] bg-[#101d2a]">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#8bc53f33] px-3 py-2">
                            <p className="text-[11px] font-bold tracking-[0.12em] text-[#b7df9e]">購物車健檢</p>
                            <span className="rounded border border-[#8bc53f55] bg-[#18351e] px-2 py-0.5 text-xs font-bold text-[#c9f0b8]">
                              {message.cartReview.total}
                            </span>
                          </div>
                          <div className="p-3 text-xs leading-5 text-[#c5dced]">
                            <p className="font-bold text-[#e3f0fb]">{message.cartReview.verdict}</p>
                            {message.cartReview.items.length > 0 && (
                              <div className="mt-2 grid gap-2">
                                {message.cartReview.items.map((item) => (
                                  <div key={`${item.gameId}-${item.variantName || 'base'}`} className="rounded border border-[#66c0f422] bg-[#132434] p-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="font-bold text-[#e3f0fb]">
                                        {item.name}
                                        {item.variantName ? `（${item.variantName}）` : ''} x{item.quantity}
                                      </p>
                                      <span className="text-[#c9f0b8]">{item.lineTotal}</span>
                                    </div>
                                    <p className="mt-1 text-[#9eb4c8]">{item.advice}</p>
                                    <Link href={item.href} className="mt-1 inline-flex text-[11px] font-bold text-[#9bd5f8] hover:text-[#c7ebff]">
                                      查看商品
                                    </Link>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="mt-2 rounded border border-[#8bc53f33] bg-[#122816] px-2 py-1 text-[#d6edce]">
                              {message.cartReview.nextStep}
                            </p>
                          </div>
                        </div>
                      )}
                      {!isUser && message.comparison && message.comparison.length > 0 && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-[#66c0f433] bg-[#101d2a]">
                          <div className="border-b border-[#66c0f422] px-3 py-2 text-[11px] font-bold tracking-[0.12em] text-[#8fb8d5]">
                            商品差異
                          </div>
                          <div className="divide-y divide-[#66c0f422]">
                            {message.comparison.map((row) => (
                              <div key={row.gameId} className="grid gap-2 p-3 text-xs md:grid-cols-[1fr_88px_1.2fr_1.2fr]">
                                <div>
                                  <p className="font-bold text-[#e3f0fb]">{row.name}</p>
                                  <Link
                                    href={row.href}
                                    className="mt-1 inline-flex text-[11px] font-bold text-[#9bd5f8] hover:text-[#c7ebff]"
                                  >
                                    查看商品
                                  </Link>
                                </div>
                                <div className="text-[#c9f0b8]">
                                  <p className="font-bold">{row.price}</p>
                                  <p className="text-[#8faac0]">庫存 {row.stock}</p>
                                </div>
                                <p className="leading-5 text-[#c5dced]">{row.fit}</p>
                                <p className="leading-5 text-[#9eb4c8]">{row.tradeoff}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {!isUser && catalogSources.length > 0 && (
                        <div className="mt-3 grid gap-2">
                          {catalogSources.map((source) => (
                            <div key={source.id} className="overflow-hidden rounded-lg border border-[#66c0f433] bg-[#101d2a]">
                              <div className="flex gap-3 p-2.5">
                                {source.image && (
                                  <Image
                                    src={source.image}
                                    alt=""
                                    width={48}
                                    height={64}
                                    className="h-16 w-12 shrink-0 rounded object-cover"
                                    loading="lazy"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="truncate text-sm font-bold text-[#e3f0fb]">{source.title}</p>
                                    {source.price && (
                                      <span className="shrink-0 rounded border border-[#8bc53f55] bg-[#18351e] px-2 py-0.5 text-xs font-bold text-[#c9f0b8]">
                                        {source.price}
                                      </span>
                                    )}
                                  </div>
                                  {source.reason && (
                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#9eb4c8]">{source.reason}</p>
                                  )}
                                  <Link
                                    href={source.href || `/game/${source.gameId}`}
                                    className="mt-2 inline-flex rounded border border-[#66c0f455] px-2.5 py-1 text-xs font-bold text-[#bfe4fb] transition hover:bg-[#1a3044]"
                                  >
                                    查看商品
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {!isUser && supportSources.length > 0 && (
                        <div className="mt-3 rounded-lg border border-[#66c0f433] bg-[#101d2a] p-2">
                          <p className="text-[11px] font-bold text-[#8faac0]">參考資料</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {supportSources.map((source) => (
                              <span
                                key={source.id}
                                className="rounded-full border border-[#66c0f433] bg-[#1a3044] px-2 py-1 text-[11px] text-[#c5dced]"
                              >
                                {getSourceTypeLabel(source.type)}：{source.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {!isUser && debugEnabled && message.debug && (
                        <div className="mt-3 rounded-lg border border-[#8bc53f55] bg-[#122816] p-3 text-xs text-[#cfe8c5]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-bold tracking-[0.12em] text-[#b7df9e]">RAG 依據</p>
                            <span className="rounded-full border border-[#8bc53f55] px-2 py-0.5 text-[11px]">
                              {message.debug.retriever}
                            </span>
                          </div>
                          <p className="mt-2 text-[#adcda5]">查詢：{message.debug.query}</p>
                          <div className="mt-2 space-y-2">
                            {message.debug.matches.length === 0 && (
                              <p className="text-[#adcda5]">這次沒有命中文件，使用一般客服範圍回覆。</p>
                            )}
                            {message.debug.matches.slice(0, 3).map((match) => (
                              <div key={match.id} className="rounded-md border border-[#8bc53f33] bg-[#0f2113] p-2">
                                <div className="flex flex-wrap justify-between gap-2">
                                  <span className="font-semibold text-[#e0f4d9]">{match.title}</span>
                                  <span>score {match.score}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-[#bddab4]">
                                  {formatScoreBreakdown(match.scoreBreakdown).map(([label, value]) => (
                                    <span key={String(label)} className="rounded border border-[#8bc53f33] px-1.5 py-0.5">
                                      {label}: {value}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
              {isReplying && (
                <article className="flex justify-start">
                  <div className="rounded-2xl border border-[#66c0f433] bg-[#132434] px-4 py-3 text-sm text-[#9eb4c8]">
                    正在整理回覆...
                  </div>
                </article>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-[#66c0f433] p-3 md:p-4">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="輸入你的問題，例如：推薦便宜的遊戲"
                  className="min-w-0 flex-1 rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                  onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
                />
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={isReplying || !input.trim()}
                  className="steam-btn inline-flex items-center gap-2 rounded-md px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaPaperPlane aria-hidden />
                  送出
                </button>
              </div>
            </div>
          </section>

          <aside className="steam-panel h-fit rounded-2xl border border-[#66c0f433] p-4">
            <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">快速詢問</p>
            <div className="mt-3 grid gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={isReplying}
                  className="rounded-md border border-[#66c0f433] bg-[#11202f] px-3 py-2 text-left text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#1a3044] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
            {debugAvailable && (
              <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#8bc53f55] bg-[#102217] p-3 text-xs text-[#d6edce]">
                <span>
                  <span className="block font-bold">顯示 RAG 依據</span>
                  <span className="mt-1 block text-[#aacda1]">本機展示用，查看命中文件與分數。</span>
                </span>
                <input
                  type="checkbox"
                  checked={debugEnabled}
                  onChange={(event) => setDebugEnabled(event.target.checked)}
                  className="h-4 w-4 accent-[#8bc53f]"
                />
              </label>
            )}
            <p className="mt-4 rounded-lg border border-[#66c0f433] bg-[#101d2a] p-3 text-xs leading-5 text-[#9eb4c8]">
              訂單狀態只會在你登入後顯示自己的資料。客服助理可以協助整理資訊，但不會替你付款、退款或取消訂單。
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
