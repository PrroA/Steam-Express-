import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Carousel } from '../components/Carousel';
import { GameCard } from '../components/GameCard';

export default function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); // 搜索狀態

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch(`http://localhost:4000/games?query=${searchQuery}`);
        const data = await response.json();
        setGames(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching games:', error);
        setLoading(false);
      }
    };
    fetchGames();
  }, [searchQuery]); // 搜索變化時觸發

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Header />
      <Carousel />

      {/* 搜索框 */}
      <div className="p-4 max-w-2xl mx-auto">
        <input
          type="text"
          placeholder="🔍 搜索遊戲..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* 加載中效果 */}
      {loading ? (
        <div className="text-center p-10">
          <div className="w-10 h-10 border-4 border-blue-500 border-dotted rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-400">加載中...</p>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {games.length === 0 ? (
            <p className="text-center col-span-4 text-gray-400">未找到符合的遊戲。</p>
          ) : (
            games.map((game) => (
              <div key={game.id} className="hover:scale-105 transition transform duration-200">
                <GameCard game={game} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
