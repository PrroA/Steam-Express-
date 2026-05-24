type AiSource = 'openai' | 'browser-ai' | 'fallback' | string | undefined | null;

const sourceLabels: Record<string, string> = {
  openai: 'AI 整理',
  'browser-ai': '本機 AI 整理',
  fallback: '商品資料整理',
};

const sourceTones: Record<string, string> = {
  openai: 'border-[#8bc53f55] bg-[#18351e] text-[#c9f0b8]',
  'browser-ai': 'border-[#66c0f455] bg-[#13283a] text-[#cceeff]',
  fallback: 'border-[#66c0f433] bg-[#102131] text-[#9eb4c8]',
};

export function AiSourceBadge({ source, prefix = false }: { source: AiSource; prefix?: boolean }) {
  const normalizedSource = source || 'fallback';
  const label = sourceLabels[normalizedSource] || sourceLabels.fallback;
  const tone = sourceTones[normalizedSource] || sourceTones.fallback;

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>
      {prefix ? `這次由${label}` : label}
    </span>
  );
}
