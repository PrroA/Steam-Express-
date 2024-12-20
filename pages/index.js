import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Carousel } from '../components/Carousel';
import { GameCard } from '../components/GameCard';

export default function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); // 關鍵字

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
  }, [searchQuery]); // 每當搜索關鍵字變化時觸發

  if (loading) {
    return <div className="text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <Header />
      <Carousel />
      <div className="p-4">
        <input
          type="text"
          placeholder="搜索遊戲..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}
