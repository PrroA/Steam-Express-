import { useEffect, useMemo, useRef, useState } from 'react';
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

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  status?: 'grounded' | 'general' | 'unavailable' | 'account';
  sources?: ChatSource[];
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
    () => ['適合我的推薦', '推薦便宜的遊戲', '我的訂單狀態', '付款失敗怎麼辦？'],
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
      const status =
        data?.mode === 'order-status'
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
                      {!isUser && message.sources && message.sources.length > 0 && (
                        <div className="mt-3 rounded-lg border border-[#66c0f433] bg-[#101d2a] p-2">
                          <p className="text-[11px] font-bold text-[#8faac0]">參考資料</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {message.sources.map((source) => (
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
