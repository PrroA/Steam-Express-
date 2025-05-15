import Image from 'next/image';
import Link from 'next/link';

export function GameCard({ game }) {
  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow flex flex-col h-[350px]">
      <div className="w-full h-[200px] relative">
        <Image
          src={game.image || '/public/vercel.svg'}
          alt={game.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: 'cover' }}
          className="rounded-lg"
          priority={true}
        />
      </div>
      <div className="flex flex-col flex-1 justify-between mt-2">
        <div>
          <h3 className="text-lg font-bold">{game.name}</h3>
          <p className="text-gray-400">{game.price}</p>
        </div>
        <Link href={`/game/${game.id}`}>
          <button className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-4 rounded mt-2">
            查看詳情
          </button>
        </Link>
      </div>
    </div>
  );
}
