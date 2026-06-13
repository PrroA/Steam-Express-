import type { AdminAiUsage } from '../../services/adminService';

interface AiUsagePanelProps {
  usage: AdminAiUsage | null;
}

function formatMode(mode: string) {
  const labels: Record<string, string> = {
    'product-recommendation': '商品推薦',
    'personalized-recommendation': '個人化推薦',
    'product-decision': '商品決策',
    'personalized-product-decision': '個人化商品決策',
    'product-comparison': '商品比較',
    'personalized-product-comparison': '個人化商品比較',
    'product-search': '商品搜尋',
    'personalized-product-search': '個人化商品搜尋',
    'service-rag': '客服問答',
    'service-rag-fallback': '一般客服回覆',
    'order-status': '訂單狀態',
    'order-care': '訂單後續協助',
    'cart-review': '購物車檢查',
    'cart-auth-required': '購物車登入提醒',
    'order-auth-required': '訂單登入提醒',
    'out-of-scope': '非商城問題',
  };
  return labels[mode] || mode;
}

function formatProvider(provider: string | null) {
  if (provider === 'openai') return '線上 AI';
  if (provider === 'ollama') return '本機 AI';
  return '內建回覆';
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '時間不明';
  return date.toLocaleString();
}

function formatPercent(value: number | undefined) {
  return `${Math.round(Math.max(0, Math.min(1, value || 0)) * 100)}%`;
}

export function AiUsagePanel({ usage }: AiUsagePanelProps) {
  const summary = usage?.summary;
  const events = usage?.events || [];

  return (
    <section data-testid="admin-ai-usage-panel" className="steam-panel mt-5 rounded-2xl p-5 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">AI 使用概況</p>
          <h2 className="mt-1 text-xl font-black text-[#d8e6f3]">客服與商品建議紀錄</h2>
        </div>
        <p className="text-xs text-[#8faac0]">追蹤最近 AI 回覆是否有根據商城資料，以及回覆速度與 fallback 比例。</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <StatTile testId="admin-ai-usage-total" label="回覆次數" value={summary?.total || 0} />
        <StatTile testId="admin-ai-usage-grounded" label="根據商城資料" value={summary?.grounded || 0} tone="success" />
        <StatTile testId="admin-ai-usage-fallback" label="一般回覆" value={summary?.fallback || 0} tone="warn" />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <MetricTile testId="admin-ai-usage-grounded-rate" label="資料命中率" value={formatPercent(summary?.groundedRate)} tone="success" />
        <MetricTile testId="admin-ai-usage-fallback-rate" label="一般回覆比例" value={formatPercent(summary?.fallbackRate)} tone="warn" />
        <MetricTile testId="admin-ai-usage-average-duration" label="平均回覆時間" value={`${summary?.averageDurationMs || 0}ms`} />
      </div>

      <div className="mt-4 rounded-xl border border-[#66c0f433] bg-[#122333] p-4">
        <h3 className="text-sm font-black text-[#d8e6f3]">最近 AI 回覆</h3>
        <div className="mt-3 space-y-2">
          {events.length > 0 ? (
            events.slice(0, 3).map((event) => (
              <article key={event.id} className="rounded-md border border-[#66c0f433] bg-[#102131] p-3">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm font-bold text-[#d8e6f3]">{formatMode(event.mode)}</p>
                  <p className="text-xs text-[#8faac0]">{formatTime(event.createdAt)}</p>
                </div>
                <p className="mt-1 text-xs text-[#9eb4c8]">
                  {event.grounded ? '根據商城資料回答' : '一般客服回覆'} · {formatProvider(event.provider)} · 參考 {event.sourceCount} 筆資料 · {event.durationMs}ms
                </p>
                {event.messagePreview && <p className="mt-2 line-clamp-1 text-xs text-[#b9d1e3]">{event.messagePreview}</p>}
              </article>
            ))
          ) : (
            <p className="rounded-md border border-[#66c0f433] bg-[#102131] p-3 text-sm text-[#9eb4c8]">
              目前還沒有 AI 使用紀錄。從客服或商品推薦問一次後，這裡會顯示最近狀態。
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  tone = 'default',
  testId,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warn';
  testId?: string;
}) {
  const toneClass = {
    default: 'border-[#66c0f433] bg-[#102131] text-[#d8e6f3]',
    success: 'border-[#8bc53f44] bg-[#13271d] text-[#b7f0a2]',
    warn: 'border-[#ffcf5a44] bg-[#2a2417] text-[#ffe0a6]',
  }[tone];

  return (
    <article data-testid={testId} className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-xs opacity-75">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </article>
  );
}

function StatTile({
  label,
  value,
  tone = 'default',
  testId,
}: {
  label: string;
  value: number;
  tone?: 'default' | 'success' | 'warn';
  testId?: string;
}) {
  const toneClass = {
    default: 'border-[#66c0f455] bg-[#123047] text-[#8fd1ff]',
    success: 'border-[#8bc53f55] bg-[#172b20] text-[#b7f0a2]',
    warn: 'border-[#ffcf5a55] bg-[#2c2617] text-[#ffe0a6]',
  }[tone];

  return (
    <article data-testid={testId} className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </article>
  );
}
