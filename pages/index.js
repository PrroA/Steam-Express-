import { useEffect, useState, useMemo, useCallback } from 'react';
import { Carousel } from '../components/Carousel';
import { GameCard } from '../components/GameCard';
import debounce from 'lodash.debounce';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';


function Popup({ show, onClose, children }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-white relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl"
          aria-label="關閉"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
export default function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('default');
    const [showPopup, setShowPopup] = useState(false);
    useEffect(() => {
    const timer = setTimeout(() => setShowPopup(true), 100);
    return () => clearTimeout(timer);
  }, []);
  const fetchGames = useCallback(async (query) => {
    try { 
      const response = await fetch(`${API_BASE_URL}/games?query=${query}`); 
      const data = await response.json(); 
      setGames(data); 
      setLoading(false); 
    } catch (error) { 
      console.error('Error fetching games:', error); 
      setLoading(false); 
    }
  }, []);
  const debouncedFetchGames = useMemo(() => { 
    return debounce(fetchGames, 300); 
  }, [fetchGames]); 

  useEffect(() => { 
    setLoading(true); 
    debouncedFetchGames(searchQuery); 
    return () => { 
      debouncedFetchGames.cancel(); 
    }; 
  }, [searchQuery, debouncedFetchGames]); 
useEffect(() => { 
  console.log('🔍 API_BASE_URL is', API_BASE_URL); 
}, []); 
  useEffect(() => { 
    if (sortOrder !== 'default' && games.length > 0) { 
      const sortedGames = [...games];
      if (sortOrder === 'low-to-high') { 
        sortedGames.sort(  
          (a, b) => parseFloat(a.price.replace('$', '')) - parseFloat(b.price.replace('$', '')) 
        ); 
      } else if (sortOrder === 'high-to-low') { 
        sortedGames.sort( 
          (a, b) => parseFloat(b.price.replace('$', '')) - parseFloat(a.price.replace('$', '')) 
        );
      }
      setGames(sortedGames);
    }
  }, [sortOrder, games]);

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Carousel />
            <Popup show={showPopup} onClose={() => setShowPopup(false)}>
        <h2 className="text-xl font-bold mb-2">小提醒</h2>
        <p className="mb-4 text-gray-300">
          任何的操作 請先註冊!!!!<br />
          這裡可以搜尋、瀏覽、模擬支付各類遊戲<br />
          有任何問題歡迎聯絡我！
        </p>
        <button
          onClick={() => setShowPopup(false)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-semibold flex justify-center items-center"
        >
          關閉
        </button>
      </Popup>
      <div className="p-4 max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <input
          type="text"
          placeholder="🔍 搜索遊戲..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-1/2 p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <select 
          value={sortOrder} 
          onChange={(e) => setSortOrder(e.target.value)} 
          className="p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" 
        >
          <option value="default">預設排序</option> 
          <option value="low-to-high">價格：低 ➝ 高</option> 
          <option value="high-to-low">價格：高 ➝ 低</option> 
        </select>
      </div>
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
