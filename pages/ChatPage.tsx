import { useEffect, useMemo, useRef, useState } from 'react';
import { FaHeadset, FaPaperPlane } from 'react-icons/fa';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://steam-express.onrender.com' : 'http://localhost:4000');

type ChatSource = {
  id: string;
  title: string;
  type: 'faq' | 'policy' | 'catalog';
  score?: number;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  status?: 'grounded' | 'general' | 'unavailable';
  sources?: ChatSource[];
};

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getStatusLabel(message: ChatMessage) {
  if (message.status === 'grounded') return '根據商城資料回答';
  if (message.status === 'unavailable') return '目前 AI 暫時無法使用';
  return '一般客服回覆';
}

function getSourceTypeLabel(type: ChatSource['type']) {
  if (type === 'catalog') return '商品資料';
  if (type === 'policy') return '服務規則';
  return '常見問題';
}

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '你好，我是商城客服助理。可以問我商品推薦、付款方式、訂單狀態、退款、配送或帳號相關問題。',
      status: 'general',
      sources: [],
    },
  ]);
  const [isReplying, setIsReplying] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = useMemo(
    () => ['怎麼付款？', '可以退款嗎？', '推薦便宜的遊戲', '訂單付款失敗怎麼辦？'],
    []
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
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
      const response = await fetch(`${API_BASE_URL}/chat/rag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('request failed');
      }

      const data = await response.json();
      const sources = Array.isArray(data?.sources) ? data.sources.slice(0, 2) : [];
      const status = data?.grounded
        ? 'grounded'
        : data?.mode === 'service-fallback'
          ? 'unavailable'
          : 'general';

      setMessages((previous) => [
        ...previous,
        {
          id: createMessageId(),
          role: 'assistant',
          text: data?.reply || '我暫時沒有整理出合適回答，請換個方式再問一次。',
          status,
          sources,
        },
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          id: createMessageId(),
          role: 'assistant',
          text: '目前 AI 暫時無法使用。你可以先到訂單中心查看付款與退款狀態，或回到商店確認商品資訊。',
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
            有問題可以先問我
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9eb4c8]">
            我可以協助商品、購物車、付款、訂單、退款、配送、帳號與願望清單問題。回答會盡量根據目前商城資料整理。
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
                    </div>
                  </article>
                );
              })}
              {isReplying && (
                <article className="flex justify-start">
                  <div className="rounded-2xl border border-[#66c0f433] bg-[#132434] px-4 py-3 text-sm text-[#9eb4c8]">
                    正在整理回答...
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
                  placeholder="輸入你的問題，例如：怎麼付款？"
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
            <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">快速提問</p>
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
            <p className="mt-4 rounded-lg border border-[#66c0f433] bg-[#101d2a] p-3 text-xs leading-5 text-[#9eb4c8]">
              客服助理不會直接替你付款、退款或取消訂單；需要操作時，會引導你到對應頁面完成。
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
