import Image from 'next/image';
import type { AiGameCopyDraft } from '../../services/adminService';

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
            alt="封面預覽"
            fill
            unoptimized
            className="object-cover"
            onError={() => onFieldChange('imageUrlError', '圖片載入失敗，請確認網址可公開存取')}
            onLoad={() => onFieldChange('imageUrlError', '')}
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <div className="mt-4 grid gap-3">
        <input
          type="text"
          placeholder="遊戲名稱"
          value={form.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <input
          type="number"
          placeholder="價格（例如：59.99）"
          value={form.price}
          onChange={(e) => onFieldChange('price', e.target.value)}
          className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <textarea
          placeholder="遊戲描述"
          value={form.description}
          onChange={(e) => onFieldChange('description', e.target.value)}
          className="min-h-24 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <div className="rounded-md border border-[#8bc53f55] bg-[#172b1f] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold tracking-[0.12em] text-[#b9d8b9]">AI COPY ASSISTANT</p>
            <button
              type="button"
              onClick={onGenerateAiCopy}
              disabled={aiGenerating}
              className="rounded-md border border-[#8bc53f88] bg-[#2f4a33] px-3 py-1.5 text-xs font-semibold text-[#e6f6d9] transition hover:bg-[#3b5c41] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiGenerating ? '生成中...' : 'AI 生成文案'}
            </button>
          </div>
          {!aiDraft && (
            <p className="mt-2 text-xs text-[#9ec09e]">先輸入遊戲名稱，可選填價格與描述，再按 AI 生成文案。</p>
          )}
          {aiDraft && (
            <div className="mt-3 space-y-2 text-xs text-[#d2e7d2]">
              <div className="rounded-md border border-[#8bc53f33] bg-[#112318] p-2">
                <p className="font-semibold text-[#dff3d2]">短描述</p>
                <p className="mt-1 text-[#c3dbc3]">{aiDraft.shortDescription}</p>
                <button
                  type="button"
                  onClick={onApplyAiShortDescription}
                  className="mt-2 rounded border border-[#8bc53f66] bg-[#29412f] px-2 py-1 text-[11px] font-semibold text-[#e2f4d1]"
                >
                  套用短描述
                </button>
              </div>
              <div className="rounded-md border border-[#8bc53f33] bg-[#112318] p-2">
                <p className="font-semibold text-[#dff3d2]">賣點</p>
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
                  追加到描述
                </button>
              </div>
              <div className="rounded-md border border-[#8bc53f33] bg-[#112318] p-2">
                <p className="font-semibold text-[#dff3d2]">SEO 標題</p>
                <p className="mt-1 text-[#c3dbc3]">{aiDraft.seoTitle}</p>
                <button
                  type="button"
                  onClick={onApplyAiSeoTitle}
                  className="mt-2 rounded border border-[#8bc53f66] bg-[#29412f] px-2 py-1 text-[11px] font-semibold text-[#e2f4d1]"
                >
                  套用到名稱
                </button>
              </div>
              <p className="text-[11px] text-[#99bd99]">來源：{aiDraft.source || 'fallback'}</p>
            </div>
          )}
        </div>
        <input
          type="text"
          placeholder="封面圖片 URL"
          value={form.image}
          onChange={(e) => onImageUrlChange(e.target.value)}
          className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <div className="rounded-md border border-dashed border-[#66c0f455] bg-[#112334] p-3">
          <p className="text-xs text-[#9eb4c8]">或直接上傳圖片（建議 2MB 內）</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onImageFileChange(e.target.files?.[0])}
            className="mt-2 block w-full text-xs text-[#d8e6f3] file:mr-3 file:rounded-md file:border-0 file:bg-[#1b2f44] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#d8e6f3] hover:file:bg-[#24384d]"
          />
          {form.uploadingImage && <p className="mt-2 text-xs text-[#8fb8d5]">圖片處理中...</p>}
        </div>
        {form.imageUrlError && <p className="text-xs text-[#ff9e9e]">{form.imageUrlError}</p>}
        <button onClick={onSubmit} className="steam-btn rounded-md py-2.5 text-sm">
          添加遊戲
        </button>
      </div>
    </div>
  );
}
