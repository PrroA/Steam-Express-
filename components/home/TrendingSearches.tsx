interface TrendingSearchesProps {
  keywords: string[];
  activeKeyword: string;
  onSelectKeyword: (keyword: string) => void;
  onClear: () => void;
}

export function TrendingSearches({
  keywords,
  activeKeyword,
  onSelectKeyword,
  onClear,
}: TrendingSearchesProps) {
  if (!keywords.length) return null;

  return (
    <section className="steam-fade-up mx-auto mt-4 w-[95%] max-w-6xl rounded-xl border border-[#66c0f433] bg-[#14283a] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">TRENDING</p>
          <h3 className="mt-1 text-lg font-black text-[#d8e6f3]">熱門搜尋詞</h3>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded border border-[#66c0f455] px-2.5 py-1 text-xs text-[#d8e6f3] transition hover:bg-[#24384d]"
        >
          清除熱門篩選
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, index) => {
          const active = activeKeyword === keyword;
          return (
            <button
              key={keyword}
              type="button"
              onClick={() => onSelectKeyword(keyword)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? 'border-[#8bc53f88] bg-[#2d4727] text-[#d9f1ba]'
                  : 'border-[#66c0f455] bg-[#1b2f44] text-[#d8e6f3] hover:bg-[#24384d]'
              }`}
            >
              #{index + 1} {keyword}
            </button>
          );
        })}
      </div>
    </section>
  );
}
