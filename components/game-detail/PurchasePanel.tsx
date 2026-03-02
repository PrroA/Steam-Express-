import type { GameVariant } from '../../types/domain';

export interface PriceInfo {
  currentText: string;
  originalText: string;
  discount: number;
}

interface PurchasePanelProps {
  priceInfo: PriceInfo;
  variants?: GameVariant[];
  selectedVariantId?: string;
  onSelectVariant?: (variantId: string) => void;
  onAddToCart: () => void;
  onAddToWishlist: () => void;
  onGoToCart: () => void;
}

export function PurchasePanel({
  priceInfo,
  variants = [],
  selectedVariantId = '',
  onSelectVariant,
  onAddToCart,
  onAddToWishlist,
  onGoToCart,
}: PurchasePanelProps) {
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) || variants[0] || null;
  const hasVariantStock = selectedVariant ? selectedVariant.stock > 0 : true;

  return (
    <aside className="rounded-xl border border-[#66c0f433] bg-[#142536] p-5">
      <p className="text-xs font-bold tracking-[0.14em] text-[#8fb8d5]">PURCHASE PANEL</p>
      <div className="mt-4 rounded-xl border border-[#66c0f433] bg-[#1a2f43] p-4">
        <p className="text-xs text-[#9eb4c8]">限時優惠</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded bg-[#1f3b2a] px-2 py-1 text-xs font-bold text-[#8bc53f]">
            -{priceInfo.discount}%
          </span>
          <span className="text-sm text-[#8ea9bd] line-through">{priceInfo.originalText}</span>
        </div>
        <p className="mt-2 text-3xl font-black text-[#8bc53f]">{priceInfo.currentText}</p>
      </div>

      <div className="mt-5 grid gap-3">
        {variants.length > 0 && (
          <div className="rounded-md border border-[#66c0f433] bg-[#132334] p-3">
            <p className="text-xs text-[#9eb4c8]">版本選擇</p>
            <select
              value={selectedVariant?.id || ''}
              onChange={(e) => onSelectVariant?.(e.target.value)}
              className="mt-2 w-full rounded-md border border-[#66c0f455] bg-[#1a2f43] px-3 py-2 text-sm text-[#d8e6f3] focus:border-[#66c0f4] focus:outline-none"
            >
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name} | {variant.price} | 庫存 {variant.stock}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-[#9eb4c8]">
              {selectedVariant && selectedVariant.stock > 0
                ? `可購買，剩餘 ${selectedVariant.stock} 份`
                : '目前無庫存'}
            </p>
          </div>
        )}

        <button
          onClick={onAddToCart}
          disabled={!hasVariantStock}
          className="steam-btn rounded-md py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          加入購物車
        </button>
        <button
          onClick={onAddToWishlist}
          className="rounded-md border border-[#66c0f455] bg-[#1b2f44] py-2.5 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
        >
          加入願望清單
        </button>
        <button
          onClick={onGoToCart}
          className="rounded-md border border-[#66c0f455] bg-[#152332] py-2.5 text-sm font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
        >
          前往購物車
        </button>
      </div>

      <div className="mt-5 rounded-lg border border-[#66c0f433] bg-[#122131] p-3 text-xs text-[#9eb4c8]">
        提示：此頁面為作品集練習用途，付款流程為模擬。
      </div>
    </aside>
  );
}
