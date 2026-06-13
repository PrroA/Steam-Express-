import Image from 'next/image';
import type { AiGameCopyDraft } from '../../services/adminService';
import { AiSourceBadge } from '../ui/AiSourceBadge';

interface AddGamePanelProps {
  form: {
    name: string;
    price: string;
    description: string;
    image: string;
    preview: string;
    imageUrlError: string;
    uploadingImage: boolean;
  };
  onFieldChange: (field: string, value: string | boolean) => void;
  onImageUrlChange: (value: string) => void;
  onImageFileChange: (file?: File | null) => void;
  onSubmit: () => void;
  aiDraft: AiGameCopyDraft | null;
  aiGenerating: boolean;
  onGenerateAiCopy: () => void;
  onApplyAiShortDescription: () => void;
  onAppendAiSellingPoints: () => void;
  onApplyAiSeoTitle: () => void;
}

export function AddGamePanel({
  form,
  onFieldChange,
  onImageUrlChange,
  onImageFileChange,
  onSubmit,
  aiDraft,
  aiGenerating,
  onGenerateAiCopy,
  onApplyAiShortDescription,
  onAppendAiSellingPoints,
  onApplyAiSeoTitle,
}: AddGamePanelProps) {
  return (
    <div className="steam-panel mt-5 rounded-2xl p-6">
      <h2 className="text-xl font-black text-[#d8e6f3]">新增商品</h2>
      {form.preview && (
        <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-[#66c0f433] bg-[#0f1d2b]">
          <Image
            src={form.preview}
            alt="商品預覽"
            fill
            unoptimized
            className="object-cover"
            onError={() => onFieldChange('imageUrlError', '圖片載入失敗，請確認網址或改用上傳。')}
            onLoad={() => onFieldChange('imageUrlError', '')}
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <div className="mt-4 grid gap-3">
        <input
          type="text"
          placeholder="商品名稱"
          value={form.name}
          onChange={(event) => onFieldChange('name', event.target.value)}
          className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <input
          type="number"
          placeholder="價格，例如 59.99"
          value={form.price}
          onChange={(event) => onFieldChange('price', event.target.value)}
          className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <textarea
          placeholder="商品介紹"
          value={form.description}
          onChange={(event) => onFieldChange('description', event.target.value)}
          className="min-h-24 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
        />

        <div className="rounded-md border border-[#8bc53f55] bg-[#172b1f] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold tracking-[0.12em] text-[#b9d8b9]">AI 商品文案</p>
            <button
              type="button"
              onClick={onGenerateAiCopy}
              disabled={aiGenerating}
              className="rounded-md border border-[#8bc53f88] bg-[#2f4a33] px-3 py-1.5 text-xs font-semibold text-[#e6f6d9] transition hover:bg-[#3b5c41] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiGenerating ? '產生中...' : '產生商品文案'}
            </button>
          </div>

          {!aiDraft && (
            <p className="mt-2 text-xs text-[#9ec09e]">
              輸入商品名稱後，可以請 AI 產生商品介紹、賣點與展示標題。
            </p>
          )}

          {aiDraft && (
            <div className="mt-3 space-y-2 text-xs text-[#d2e7d2]">
              <div className="rounded-md border border-[#8bc53f33] bg-[#112318] p-2">
                <p className="font-semibold text-[#dff3d2]">商品介紹</p>
                <p className="mt-1 text-[#c3dbc3]">{aiDraft.shortDescription}</p>
                <button
                  type="button"
                  onClick={onApplyAiShortDescription}
                  className="mt-2 rounded border border-[#8bc53f66] bg-[#29412f] px-2 py-1 text-[11px] font-semibold text-[#e2f4d1]"
                >
                  套用介紹
                </button>
              </div>
              <div className="rounded-md border border-[#8bc53f33] bg-[#112318] p-2">
                <p className="font-semibold text-[#dff3d2]">商品賣點</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-[#c3dbc3]">
                  {aiDraft.sellingPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={onAppendAiSellingPoints}
                  className="mt-2 rounded border border-[#8bc53f66] bg-[#29412f] px-2 py-1 text-[11px] font-semibold text-[#e2f4d1]"
                >
                  加入賣點
                </button>
              </div>
              <div className="rounded-md border border-[#8bc53f33] bg-[#112318] p-2">
                <p className="font-semibold text-[#dff3d2]">展示標題</p>
                <p className="mt-1 text-[#c3dbc3]">{aiDraft.seoTitle}</p>
                <button
                  type="button"
                  onClick={onApplyAiSeoTitle}
                  className="mt-2 rounded border border-[#8bc53f66] bg-[#29412f] px-2 py-1 text-[11px] font-semibold text-[#e2f4d1]"
                >
                  套用標題
                </button>
              </div>
              <AiSourceBadge source={aiDraft.source} />
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="商品圖片 URL"
          value={form.image}
          onChange={(event) => onImageUrlChange(event.target.value)}
          className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <div className="rounded-md border border-dashed border-[#66c0f455] bg-[#112334] p-3">
          <p className="text-xs text-[#9eb4c8]">也可以上傳本機圖片，建議 2MB 以內。</p>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => onImageFileChange(event.target.files?.[0])}
            className="mt-2 block w-full text-xs text-[#d8e6f3] file:mr-3 file:rounded-md file:border-0 file:bg-[#1b2f44] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#d8e6f3] hover:file:bg-[#24384d]"
          />
          {form.uploadingImage && <p className="mt-2 text-xs text-[#8fb8d5]">圖片上傳中...</p>}
        </div>
        {form.imageUrlError && <p className="text-xs text-[#ff9e9e]">{form.imageUrlError}</p>}
        <button onClick={onSubmit} className="steam-btn rounded-md py-2.5 text-sm">
          新增商品
        </button>
      </div>
    </div>
  );
}
