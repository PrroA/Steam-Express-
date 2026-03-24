import { useMemo, useState } from 'react';

interface PriceTrendChartProps {
  gameId: number;
  currentPriceText: string;
}

function parsePrice(priceText: string) {
  return parseFloat((priceText || '$0').replace('$', '')) || 0;
}

function buildSeries(gameId: number, currentPrice: number, days: 7 | 30) {
  const base = currentPrice > 0 ? currentPrice : 1;
  const length = days;
  const driftFactor = days === 7 ? 0.008 : 0.0025;
  const wobbleSeed = days === 7 ? 17 : 31;
  const series = Array.from({ length }, (_, index) => {
    const drift = (length - 1 - index) * driftFactor;
    const wobble = (((gameId + index * wobbleSeed) % 7) - 3) * 0.006;
    return Number((base * (1 + drift + wobble)).toFixed(2));
  });
  series[length - 1] = Number(base.toFixed(2));
  return series;
}

export function PriceTrendChart({ gameId, currentPriceText }: PriceTrendChartProps) {
  const [period, setPeriod] = useState<7 | 30>(7);
  const currentPrice = parsePrice(currentPriceText);
  const points = useMemo(
    () => buildSeries(gameId, currentPrice, period),
    [gameId, currentPrice, period]
  );
  const min = Math.min(...points);
  const max = Math.max(...points);
  const valueRange = Math.max(0.01, max - min);

  const coordinates = points
      .map((value, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 320;
      const y = 110 - ((value - min) / valueRange) * 90;
      return `${x},${y}`;
    })
    .join(' ');

  const delta = points[6] - points[0];
  const deltaText = `${delta >= 0 ? '+' : ''}$${delta.toFixed(2)}`;
  const deltaClass = delta <= 0 ? 'text-[#8bc53f]' : 'text-[#ffc86a]';

  return (
    <section className="rounded-xl border border-[#66c0f433] bg-[#132334] p-4">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">PRICE TREND</p>
          <h3 className="mt-1 text-lg font-black text-[#d8e6f3]">近 {period} 天價格走勢</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPeriod(7)}
            className={`rounded border px-2 py-1 text-[11px] font-semibold transition ${
              period === 7
                ? 'border-[#66c0f4aa] bg-[#1a3b53] text-[#d8e6f3]'
                : 'border-[#66c0f455] bg-[#1b2f44] text-[#9eb4c8] hover:bg-[#24384d]'
            }`}
          >
            7 天
          </button>
          <button
            type="button"
            onClick={() => setPeriod(30)}
            className={`rounded border px-2 py-1 text-[11px] font-semibold transition ${
              period === 30
                ? 'border-[#66c0f4aa] bg-[#1a3b53] text-[#d8e6f3]'
                : 'border-[#66c0f455] bg-[#1b2f44] text-[#9eb4c8] hover:bg-[#24384d]'
            }`}
          >
            30 天
          </button>
          <p className={`text-sm font-bold ${deltaClass}`}>{deltaText}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[#66c0f433] bg-[#0f1f2e] p-2">
        <svg viewBox="0 0 320 120" className="h-32 w-full">
          <polyline
            points={coordinates}
            fill="none"
            stroke="#66c0f4"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((value, index) => {
            const x = (index / Math.max(1, points.length - 1)) * 320;
            const y = 110 - ((value - min) / valueRange) * 90;
            return <circle key={index} cx={x} cy={y} r="3.5" fill="#8bc53f" />;
          })}
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-[#8faac0]">
        {period === 7
          ? ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1', 'Now'].map((label) => (
              <span key={label}>{label}</span>
            ))
          : ['D-30', 'D-25', 'D-20', 'D-15', 'D-10', 'D-5', 'Now'].map((label) => (
          <span key={label}>{label}</span>
            ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[#9eb4c8]">
        <span>最低 ${min.toFixed(2)}</span>
        <span>目前 {currentPriceText}</span>
        <span>最高 ${max.toFixed(2)}</span>
      </div>
      <p className="mt-2 text-[11px] text-[#7fa0b8]">* 模擬數據，用於作品集展示價格走勢 UI。</p>
    </section>
  );
}
