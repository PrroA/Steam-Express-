import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { addGame } from '../services/storeService';
import {
  generateAdminGameCopy,
  ensureAdminGameVariant,
  fetchAdminDashboard,
  fetchAdminGames,
  fetchAdminOrders,
  uploadAdminImage,
  updateAdminGame,
  updateAdminFulfillmentStatus,
  updateAdminOrderStatus,
  updateAdminShippingDetails,
  updateGameActiveStatus,
  updateGameVariant,
  type AiGameCopyDraft,
  type AdminDashboard,
  type AdminOrder,
} from '../services/adminService';
import type { Game } from '../types/domain';
import { getApiErrorMessage, normalizeImagePreviewUrl } from '../utils/adminUtils';

interface AddGameForm {
  name: string;
  price: string;
  description: string;
  image: string;
  preview: string;
  imageUrlError: string;
  uploadingImage: boolean;
}

export function useAdminPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [addGameForm, setAddGameForm] = useState<AddGameForm>({
    name: '',
    price: '',
    description: '',
    image: '',
    preview: '',
    imageUrlError: '',
    uploadingImage: false,
  });
  const [aiDraft, setAiDraft] = useState<AiGameCopyDraft | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const [dashboardData, gamesData, ordersData] = await Promise.all([
        fetchAdminDashboard(token),
        fetchAdminGames(token),
        fetchAdminOrders(token),
      ]);
      setDashboard(dashboardData);
      setGames(gamesData);
      setOrders(ordersData);
    } catch (error) {
      toast.error('載入後台資料失敗（請確認你是管理員）');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [orders]
  );

  const updateAddGameField = useCallback((key: keyof AddGameForm, value: string | boolean) => {
    setAddGameForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetAddGameForm = useCallback(() => {
    setAddGameForm({
      name: '',
      price: '',
      description: '',
      image: '',
      preview: '',
      imageUrlError: '',
      uploadingImage: false,
    });
    setAiDraft(null);
  }, []);

  const handleImageChange = useCallback((raw: string) => {
    const normalized = normalizeImagePreviewUrl(raw);
    setAddGameForm((prev) => ({
      ...prev,
      image: raw,
      preview: normalized.url,
      imageUrlError: normalized.error,
    }));
  }, []);

  const handleImageFileChange = useCallback(async (file?: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAddGameForm((prev) => ({ ...prev, imageUrlError: '請選擇圖片檔案' }));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAddGameForm((prev) => ({ ...prev, imageUrlError: '圖片大小需小於 2MB' }));
      return;
    }

    setAddGameForm((prev) => ({ ...prev, uploadingImage: true }));

    try {
      const token = getToken();
      const payload = await uploadAdminImage(file, token);
      const uploadedUrl = payload?.imageUrl;
      if (!uploadedUrl) {
        throw new Error('伺服器未回傳圖片 URL');
      }
      setAddGameForm((prev) => ({
        ...prev,
        image: uploadedUrl,
        preview: uploadedUrl,
        imageUrlError: '',
      }));
      toast.success('圖片上傳成功，可直接新增商品');
    } catch (error: any) {
      setAddGameForm((prev) => ({ ...prev, imageUrlError: getApiErrorMessage(error, '圖片上傳失敗') }));
    } finally {
      setAddGameForm((prev) => ({ ...prev, uploadingImage: false }));
    }
  }, []);

  const handleAddGame = useCallback(async () => {
    if (addGameForm.imageUrlError) {
      toast.warn('圖片預覽失敗，但仍可先新增商品，之後再更換圖片網址');
    }

    try {
      const token = getToken();
      await addGame(
        {
          name: addGameForm.name,
          price: addGameForm.price,
          description: addGameForm.description,
          image: addGameForm.image,
        },
        token
      );
      toast.success('遊戲已添加');
      resetAddGameForm();
      await loadAdminData();
    } catch (error: any) {
      toast.error(`添加遊戲失敗：${getApiErrorMessage(error, '添加遊戲失敗')}`);
    }
  }, [addGameForm, loadAdminData, resetAddGameForm]);

  const handleGenerateAiCopy = useCallback(async () => {
    if (!addGameForm.name.trim()) {
      toast.warn('請先輸入遊戲名稱，再生成文案');
      return;
    }
    try {
      setAiGenerating(true);
      const draft = await generateAdminGameCopy({
        name: addGameForm.name,
        price: addGameForm.price,
        description: addGameForm.description,
      });
      setAiDraft(draft);
      toast.success(`AI 文案已生成（${draft.source || 'fallback'}）`);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'AI 文案生成失敗'));
    } finally {
      setAiGenerating(false);
    }
  }, [addGameForm.description, addGameForm.name, addGameForm.price]);

  const handleApplyAiShortDescription = useCallback(() => {
    if (!aiDraft?.shortDescription) return;
    setAddGameForm((prev) => ({ ...prev, description: aiDraft.shortDescription }));
    toast.success('已套用短描述到商品描述欄位');
  }, [aiDraft?.shortDescription]);

  const handleAppendAiSellingPoints = useCallback(() => {
    if (!aiDraft?.sellingPoints || aiDraft.sellingPoints.length === 0) return;
    const bullets = aiDraft.sellingPoints.map((point) => `• ${point}`).join('\n');
    setAddGameForm((prev) => ({
      ...prev,
      description: prev.description ? `${prev.description}\n${bullets}` : bullets,
    }));
    toast.success('已將賣點加入商品描述');
  }, [aiDraft?.sellingPoints]);

  const handleApplyAiSeoTitle = useCallback(() => {
    if (!aiDraft?.seoTitle) return;
    setAddGameForm((prev) => ({ ...prev, name: aiDraft.seoTitle }));
    toast.success('已套用 SEO 標題到遊戲名稱欄位');
  }, [aiDraft?.seoTitle]);

  const handleToggleActive = useCallback(
    async (game: Game) => {
      try {
        const token = getToken();
        await updateGameActiveStatus(game.id, !(game.isActive !== false), token);
        toast.success(game.isActive !== false ? '商品已下架' : '商品已上架');
        await loadAdminData();
      } catch (error) {
        toast.error('更新上架狀態失敗');
      }
    },
    [loadAdminData]
  );

  const handleVariantUpdate = useCallback(
    async (gameId: number, variantId: string, payload: { stock?: number; price?: string }) => {
      try {
        const token = getToken();
        await updateGameVariant(gameId, variantId, payload, token);
        toast.success('版本資料已更新');
        await loadAdminData();
      } catch (error: any) {
        toast.error(`更新版本資料失敗：${getApiErrorMessage(error)}`);
      }
    },
    [loadAdminData]
  );

  const handleGameBasicUpdate = useCallback(
    async (
      gameId: number,
      payload: { name?: string; description?: string; image?: string; price?: string }
    ) => {
      try {
        const token = getToken();
        await updateAdminGame(gameId, payload, token);
        toast.success('商品基本資料已更新');
        await loadAdminData();
      } catch (error: any) {
        toast.error(`更新商品失敗：${getApiErrorMessage(error)}`);
      }
    },
    [loadAdminData]
  );

  const handleEnsureVariant = useCallback(
    async (gameId: number) => {
      try {
        const token = getToken();
        await ensureAdminGameVariant(gameId, token);
        toast.success('已建立預設版本，可調整價格與庫存');
        await loadAdminData();
      } catch (error: any) {
        toast.error(`建立預設版本失敗：${getApiErrorMessage(error)}`);
      }
    },
    [loadAdminData]
  );

  const handleUpdateOrderStatus = useCallback(
    async (orderId: string, status: AdminOrder['status']) => {
      try {
        const token = getToken();
        await updateAdminOrderStatus(orderId, status, token, 'Admin panel update');
        toast.success('訂單狀態已更新');
        await loadAdminData();
      } catch (error) {
        toast.error('更新訂單狀態失敗');
      }
    },
    [loadAdminData]
  );

  const handleUpdateFulfillmentStatus = useCallback(
    async (orderId: string, fulfillmentStatus: AdminOrder['fulfillmentStatus']) => {
      try {
        const token = getToken();
        await updateAdminFulfillmentStatus(orderId, fulfillmentStatus || '待出貨', token, 'Admin fulfillment update');
        toast.success('出貨狀態已更新');
        await loadAdminData();
      } catch (error) {
        toast.error('更新出貨狀態失敗');
      }
    },
    [loadAdminData]
  );

  const handleUpdateShippingDetails = useCallback(
    async (orderId: string, payload: { carrier?: string; trackingNumber?: string }) => {
      try {
        const token = getToken();
        await updateAdminShippingDetails(orderId, payload, token);
        toast.success('物流資訊已更新');
        await loadAdminData();
      } catch (error) {
        toast.error('更新物流資訊失敗');
      }
    },
    [loadAdminData]
  );

  return {
    loading,
    dashboard,
    games,
    sortedOrders,
    addGameForm,
    updateAddGameField,
    handleImageChange,
    handleImageFileChange,
    handleAddGame,
    aiDraft,
    aiGenerating,
    handleGenerateAiCopy,
    handleApplyAiShortDescription,
    handleAppendAiSellingPoints,
    handleApplyAiSeoTitle,
    handleToggleActive,
    handleVariantUpdate,
    handleGameBasicUpdate,
    handleEnsureVariant,
    handleUpdateOrderStatus,
    handleUpdateFulfillmentStatus,
    handleUpdateShippingDetails,
  };
}
