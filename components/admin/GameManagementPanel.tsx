import { useEffect, useState } from 'react';
import type { Game, GameVariant } from '../../types/domain';

interface GameManagementPanelProps {
  games: Game[];
  onToggleActive: (game: Game) => void;
  onSaveBasic: (
    gameId: number,
    payload: { name?: string; description?: string; image?: string; price?: string }
  ) => void;
  onSaveVariant: (gameId: number, variantId: string, payload: { stock?: number; price?: string }) => void;
  onEnsureVariant: (gameId: number) => void;
}

export function GameManagementPanel({
  games,
  onToggleActive,
  onSaveBasic,
  onSaveVariant,
  onEnsureVariant,
}: GameManagementPanelProps) {
  return (
    <div className="steam-panel mt-5 rounded-2xl p-6">
      <h2 className="text-xl font-black text-[#d8e6f3]">商品管理</h2>
      <div className="mt-4 space-y-3">
        {games.map((game) => (
          <div key={game.id} className="rounded-lg border border-[#66c0f433] bg-[#132434] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-[#d8e6f3]">{game.name}</p>
                <p className="text-xs text-[#8fb8d5]">ID: {game.id}</p>
              </div>
              <button
                onClick={() => onToggleActive(game)}
                className={`rounded-md border px-3 py-1.5 text-xs font-bold ${
                  game.isActive !== false
                    ? 'border-[#ff9f9f55] bg-[#4a202a] text-[#ffd6d6]'
                    : 'border-[#66c0f455] bg-[#1b2f44] text-[#d8e6f3]'
                }`}
              >
                {game.isActive !== false ? '下架' : '上架'}
              </button>
            </div>

            <GameBasicEditor game={game} onSave={(payload) => onSaveBasic(game.id, payload)} />

            {Array.isArray(game.variants) && game.variants.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {game.variants.map((variant) => (
                  <VariantEditor
                    key={`${game.id}-${variant.id}`}
                    variant={variant}
                    onSave={(payload) => onSaveVariant(game.id, variant.id, payload)}
                  />
                ))}
              </div>
            )}

            {(!Array.isArray(game.variants) || game.variants.length === 0) && (
              <div className="mt-3 rounded-md border border-[#66c0f433] bg-[#102131] p-3">
                <p className="text-xs text-[#9eb4c8]">此商品尚未建立版本，無法調整庫存。</p>
                <button
                  onClick={() => onEnsureVariant(game.id)}
                  className="mt-2 rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
                >
                  建立預設版本（Standard）
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function GameBasicEditor({
  game,
  onSave,
}: {
  game: Game;
  onSave: (payload: { name?: string; description?: string; image?: string; price?: string }) => void;
}) {
  const [draftName, setDraftName] = useState(game.name || '');
  const [draftDescription, setDraftDescription] = useState(game.description || '');
  const [draftImage, setDraftImage] = useState(game.image || '');
  const [draftPrice, setDraftPrice] = useState(String(game.price || '').replace('$', ''));

  useEffect(() => {
    setDraftName(game.name || '');
    setDraftDescription(game.description || '');
    setDraftImage(game.image || '');
    setDraftPrice(String(game.price || '').replace('$', ''));
  }, [game.id, game.name, game.description, game.image, game.price]);

  const handleSave = () => {
    onSave({
      name: draftName,
      description: draftDescription,
      image: draftImage,
      price: draftPrice,
    });
  };

  return (
    <div className="mt-3 rounded-md border border-[#66c0f433] bg-[#102131] p-3">
      <p className="text-xs font-bold text-[#8fb8d5]">基本資料編輯</p>
      <div className="mt-2 grid gap-2">
        <input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="商品名稱"
          className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-xs text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <textarea
          value={draftDescription}
          onChange={(e) => setDraftDescription(e.target.value)}
          rows={2}
          placeholder="商品描述"
          className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-xs text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
          <input
            type="text"
            value={draftImage}
            onChange={(e) => setDraftImage(e.target.value)}
            placeholder="封面 URL / 路徑"
            className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-xs text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
          />
          <input
            type="text"
            value={draftPrice}
            onChange={(e) => setDraftPrice(e.target.value)}
            placeholder="價格"
            className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-xs text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
          />
        </div>
        <button
          onClick={handleSave}
          className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
        >
          更新商品基本資料
        </button>
      </div>
    </div>
  );
}

function VariantEditor({
  variant,
  onSave,
}: {
  variant: GameVariant;
  onSave: (payload: { stock?: number; price?: string }) => void;
}) {
  const [stock, setStock] = useState(variant.stock);
  const [price, setPrice] = useState(String(variant.price || '').replace('$', ''));

  useEffect(() => {
    setStock(variant.stock);
    setPrice(String(variant.price || '').replace('$', ''));
  }, [variant.stock, variant.price]);

  const handleSave = () => {
    const typedPayload: { stock?: number; price?: string } = {};
    const parsedStock = Number(stock);
    if (Number.isFinite(parsedStock) && parsedStock >= 0) {
      typedPayload.stock = Math.floor(parsedStock);
    }

    const trimmedPrice = String(price || '').trim();
    if (trimmedPrice) {
      typedPayload.price = trimmedPrice.startsWith('$') ? trimmedPrice : `$${trimmedPrice}`;
    }

    onSave(typedPayload);
  };

  return (
    <div className="rounded-md border border-[#66c0f433] bg-[#102131] p-3">
      <p className="text-sm font-bold text-[#d8e6f3]">{variant.name}</p>
      <p className="text-xs text-[#8faac0]">價格 {variant.price}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(Number(e.target.value))}
          className="w-24 rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-xs text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <input
          type="text"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="59.99"
          className="w-28 rounded-md border border-[#66c0f444] bg-[#162737] px-3 py-2 text-xs text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
        />
        <button
          onClick={handleSave}
          className="rounded-md border border-[#66c0f455] bg-[#1b2f44] px-3 py-2 text-xs font-semibold text-[#d8e6f3] transition hover:bg-[#24384d]"
        >
          更新價格/庫存
        </button>
      </div>
    </div>
  );
}
