import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export function OrderStatusChart({ chartData }: { chartData: any }) {
  if (!chartData) return null;

  return (
    <div className="steam-panel mt-5 rounded-2xl border border-[#66c0f433] p-5">
      <h2 className="text-xl font-black text-[#d8e6f3]">訂單狀態分佈</h2>
      <div className="mt-4 flex justify-center">
        <div className="h-60 w-60">
          <Pie data={chartData} />
        </div>
      </div>
    </div>
  );
}
