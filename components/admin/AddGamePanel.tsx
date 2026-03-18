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
}

export function AddGamePanel({
  form,
  onFieldChange,
  onImageUrlChange,
  onImageFileChange,
  onSubmit,
}: AddGamePanelProps) {
  return (
    <div className="steam-panel mt-5 rounded-2xl p-6">
      <h2 className="text-xl font-black text-[#d8e6f3]">新增商品</h2>
      {form.preview && (
        <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-[#66c0f433] bg-[#0f1d2b]">
          <img
            src={form.preview}
            alt="封面預覽"
            className="h-full w-full object-cover"
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
