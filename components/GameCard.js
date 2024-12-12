import Image from 'next/image';
import Link from 'next/link';

export function GameCard({ game }) {
  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow">
      <Image
        src={game.image || '/public/vercel.svg'} // 默認圖片
        alt={game.name}
        width={300}
        height={200}
        className="rounded-lg"
      />
      <h3 className="text-lg font-bold mt-4">{game.name}</h3>
      <p className="text-gray-400">{game.price}</p>
      <Link href={`/game/${game.id}`}>
        <button className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-4 rounded mt-2">
          查看詳情
        </button>
      </Link>
    </div>
  );
}
