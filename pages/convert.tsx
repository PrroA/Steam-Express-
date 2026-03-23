import { useState } from 'react';

export default function ConvertPage() {
  const [tValue, setTValue] = useState('');
  const [wcValue, setWcValue] = useState('');
  const [snowValue, setSnowValue] = useState('');
  const [snowFromT, setSnowFromT] = useState(0);
  const [snowFromWC, setSnowFromWC] = useState(0);
  const [wcFromT, setWcFromT] = useState(0);
  const [tFromWC, setTFromWC] = useState(0);
  const [wcFromSnow, setWcFromSnow] = useState(0);

  // 台幣換 WC、雪
  const handleTChange = (e) => {
    const input = e.target.value;
    setTValue(input);
    const t = parseFloat(input);
    if (!isNaN(t)) {
      const wc = (t / 120) * 800;
      const snow = (wc / 300) * 11;
      setWcFromT(Math.floor(wc));
      setSnowFromT(Math.floor(snow));
    } else {
      setWcFromT(0);
      setSnowFromT(0);
    }
  };
  // WC 換 雪、台幣
  const handleWCChange = (e) => {
    const input = e.target.value;
    setWcValue(input);
    const wc = parseFloat(input);
    if (!isNaN(wc)) {
      const snow = (wc / 300) * 11;
      setSnowFromWC(Math.floor(snow));
      const t = (wc / 800) * 120;
      setTFromWC(Math.floor(t));
    } else {
      setSnowFromWC(0);
      setTFromWC(0);
    }
  };

  // 雪 換 WC
  const handleSnowChange = (e) => {
    const input = e.target.value;
    setSnowValue(input);
    const snow = parseFloat(input);
    if (!isNaN(snow)) {
      const wc = (snow / 11) * 300;
      setWcFromSnow(Math.floor(wc));
    } else {
      setWcFromSnow(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold mb-6">💱 Bin 楓之谷教學換算</h1>
      <div className="bg-gray-800 p-4 rounded-lg w-full max-w-md mb-6">
        <h2 className="text-lg font-semibold mb-2">台幣</h2>
        <input
          type="number"
          placeholder="例如：120"
          value={tValue}
          onChange={handleTChange}
          className="border border-gray-600 bg-gray-700 px-4 py-2 rounded mb-2 w-full text-white focus:outline-none"
        />
        <p className="text-sm text-green-400">🎮 約可兌換：<strong>{wcFromT}</strong> WC</p>
        <p className="text-sm text-blue-400">🌨️ 約可兌換：<strong>{snowFromT}</strong> 雪</p>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg w-full max-w-md mb-6">
        <h2 className="text-lg font-semibold mb-2">遊戲幣(W)</h2>
        <input
          type="number"
          placeholder="例如：3000"
          value={wcValue}
          onChange={handleWCChange}
          className="border border-gray-600 bg-gray-700 px-4 py-2 rounded mb-2 w-full text-white focus:outline-none"
        />
        <p className="text-sm text-green-400">💵 約可兌換：<strong>{tFromWC}</strong> 台幣</p>
        <p className="text-sm text-blue-400">🌨️ 約可兌換：<strong>{snowFromWC}</strong> 雪</p>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">雪</h2>
        <input
          type="number"
          placeholder="例如：22"
          value={snowValue}
          onChange={handleSnowChange}
          className="border border-gray-600 bg-gray-700 px-4 py-2 rounded mb-2 w-full text-white focus:outline-none"
        />
        <p className="text-sm text-green-400">🎮 約可兌換：<strong>{wcFromSnow}</strong> WC</p>
      </div>
    </div>
  );
}
