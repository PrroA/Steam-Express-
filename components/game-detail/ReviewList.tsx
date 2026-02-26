import type { Review } from '../../types/domain';

interface ReviewListProps {
  reviews: Review[];
}

export function ReviewList({ reviews }: ReviewListProps) {
  return (
    <div className="steam-panel rounded-xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#d8e6f3]">玩家評論</h2>
        <span className="text-xs text-[#8fb8d5]">{reviews.length} 則</span>
      </div>

      {reviews.length === 0 ? (
        <p className="mt-4 rounded-lg border border-[#66c0f433] bg-[#132434] p-4 text-sm text-[#9eb4c8]">
          暫無評論，成為第一位留下心得的玩家。
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((review, index) => (
            <li key={index} className="rounded-lg border border-[#66c0f433] bg-[#132434] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[#66c0f4]">{review.username || '匿名玩家'}</span>
                <span className="text-xs text-[#8faac0]">{new Date(review.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-[#d8e6f3]">{review.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
