interface ReviewFormProps {
  value: string;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function ReviewForm({ value, isSubmitting, onChange, onSubmit }: ReviewFormProps) {
  return (
    <div className="steam-panel rounded-xl p-5">
      <h2 className="text-xl font-black text-[#d8e6f3]">留下評論</h2>
      <p className="mt-1 text-sm text-[#9eb4c8]">分享你的遊玩心得，幫助其他玩家做決策。</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例如：劇情節奏很棒、戰鬥手感不錯、推薦給喜歡開放世界的玩家。"
        className="mt-4 min-h-36 w-full rounded-lg border border-[#66c0f444] bg-[#132434] p-3 text-sm text-[#d8e6f3] placeholder:text-[#88a7be] focus:border-[#66c0f4aa] focus:outline-none"
      />
      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="steam-btn mt-3 rounded-md px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? '提交中...' : '發表評論'}
      </button>
    </div>
  );
}
