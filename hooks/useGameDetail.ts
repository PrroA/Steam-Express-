import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { addToCart } from '../services/cartService';
import {
  addWishlist,
  createReview,
  fetchGameDetails,
  fetchReviews as fetchReviewsByGame,
} from '../services/storeService';
import type { Game, Review } from '../types/domain';
import type { GalleryShot } from '../components/game-detail/GameGallery';
import type { PriceInfo } from '../components/game-detail/PurchasePanel';
import { trackJourneyEvent } from '../utils/journeyTracker';

interface UseGameDetailParams {
  id: string | string[] | undefined;
  isReady: boolean;
}

interface UseGameDetailResult {
  game: Game | null;
  loading: boolean;
  reviews: Review[];
  newReview: string;
  isSubmitting: boolean;
  selectedShot: number;
  selectedVariantId: string;
  galleryShots: GalleryShot[];
  priceInfo: PriceInfo;
  setNewReview: (value: string) => void;
  setSelectedShot: (index: number) => void;
  setSelectedVariantId: (variantId: string) => void;
  handleSubmitReview: () => Promise<void>;
  handleAddToWishlist: () => Promise<void>;
  handleAddToCart: () => Promise<void>;
}

export function useGameDetail({ id, isReady }: UseGameDetailParams): UseGameDetailResult {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedShot, setSelectedShot] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState('');

  const gameId = useMemo(() => {
    if (Array.isArray(id)) {
      return id[0];
    }
    return id;
  }, [id]);

  useEffect(() => {
    if (!isReady) return;
    if (!gameId) {
      setLoading(false);
      return;
    }

    const loadGameDetails = async () => {
      try {
        const data = await fetchGameDetails(gameId);
        setGame(data);
      } catch (error) {
        toast.error('無法獲取遊戲詳情');
      } finally {
        setLoading(false);
      }
    };

    loadGameDetails();
  }, [gameId, isReady]);

  useEffect(() => {
    if (!isReady || !gameId) return;

    const fetchReviews = async () => {
      try {
        const data = await fetchReviewsByGame(gameId);
        setReviews(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知錯誤';
        console.error('無法加載評論:', message);
      }
    };

    fetchReviews();
  }, [gameId, isReady]);

  useEffect(() => {
    setSelectedShot(0);
  }, [gameId]);

  useEffect(() => {
    if (!game?.variants || game.variants.length === 0) {
      setSelectedVariantId('');
      return;
    }
    setSelectedVariantId((prev) => {
      if (prev && game.variants?.some((variant) => variant.id === prev)) {
        return prev;
      }
      return game.variants[0].id;
    });
  }, [game?.variants]);

  useEffect(() => {
    if (!game) return;
    try {
      const key = 'recentlyViewedGames';
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      const nextList = [
        {
          id: game.id,
          viewedAt: new Date().toISOString(),
        },
        ...(Array.isArray(parsed) ? parsed.filter((item) => item?.id !== game.id) : []),
      ].slice(0, 12);
      localStorage.setItem(key, JSON.stringify(nextList));
      trackJourneyEvent({
        type: 'view_game',
        title: '瀏覽商品',
        subtitle: game.name,
      });
    } catch (error) {
      console.error('Failed to save recently viewed games');
    }
  }, [game]);

  const galleryShots = useMemo(() => {
    const source = game?.image || '/vercel.svg';
    return [
      { id: 'hero', src: source, label: '主視覺', objectPosition: 'center' },
      { id: 'shot1', src: source, label: '玩法畫面', objectPosition: 'top' },
      { id: 'shot2', src: source, label: '場景畫面', objectPosition: 'bottom' },
    ];
  }, [game?.image]);

  const priceInfo = useMemo(() => {
    const selectedVariant =
      game?.variants?.find((variant) => variant.id === selectedVariantId) || game?.variants?.[0];
    const currentText = selectedVariant?.price || game?.price || '$0.00';
    const current = parseFloat((currentText || '$0').replace('$', '')) || 0;
    const original = current > 0 ? current * 1.35 : 1;
    const discount = Math.min(70, Math.max(5, Math.round((1 - current / original) * 100)));
    return {
      currentText,
      originalText: `$${original.toFixed(2)}`,
      discount,
    };
  }, [game?.price, game?.variants, selectedVariantId]);

  const numericGameId = useMemo(() => Number(gameId), [gameId]);

  const handleSubmitReview = async () => {
    if (!newReview.trim()) {
      toast.error('評論內容不可為空');
      return;
    }

    if (Number.isNaN(numericGameId)) {
      toast.error('遊戲資訊異常');
      return;
    }

    const token = localStorage.getItem('token');
    setIsSubmitting(true);

    try {
      const review = await createReview(numericGameId, newReview, token);
      setReviews((prev) => [...prev, review]);
      setNewReview('');
      toast.success('感謝你的評論！');
    } catch (error) {
      toast.error('評論失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (Number.isNaN(numericGameId)) {
      toast.error('遊戲資訊異常');
      return;
    }

    const token = localStorage.getItem('token');

    try {
      await addWishlist(numericGameId, token);
      toast.success('已加入願望清單');
      trackJourneyEvent({
        type: 'add_wishlist',
        title: '加入願望清單',
        subtitle: game?.name || `商品 #${numericGameId}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      console.error('添加到收藏清單失敗:', message);
      toast.error('添加到收藏清單失敗');
    }
  };

  const handleAddToCart = async () => {
    if (Number.isNaN(numericGameId)) {
      toast.error('遊戲資訊異常');
      return;
    }

    const token = localStorage.getItem('token');

    try {
      await addToCart(numericGameId, token, selectedVariantId || undefined);
      toast.success('已加入購物車');
      trackJourneyEvent({
        type: 'add_cart',
        title: '加入購物車',
        subtitle: game?.name || `商品 #${numericGameId}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      console.error('加入購物車失敗:', message);
      toast.error('加入購物車失敗');
    }
  };

  return {
    game,
    loading,
    reviews,
    newReview,
    isSubmitting,
    selectedShot,
    selectedVariantId,
    galleryShots,
    priceInfo,
    setNewReview,
    setSelectedShot,
    setSelectedVariantId,
    handleSubmitReview,
    handleAddToWishlist,
    handleAddToCart,
  };
}
