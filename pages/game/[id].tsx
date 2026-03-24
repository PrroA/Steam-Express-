import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GameGallery } from '../../components/game-detail/GameGallery';
import { PurchasePanel } from '../../components/game-detail/PurchasePanel';
import { PriceTrendChart } from '../../components/game-detail/PriceTrendChart';
import { ReviewForm } from '../../components/game-detail/ReviewForm';
import { ReviewList } from '../../components/game-detail/ReviewList';
import {
  GameDetailLoadingState,
  GameDetailNotFoundState,
} from '../../components/game-detail/DetailState';
import { useGameDetail } from '../../hooks/useGameDetail';

export default function GameDetail() {
  const router = useRouter();
  const [flashFromAlert, setFlashFromAlert] = useState(false);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const {
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
  } = useGameDetail({ id: router.query.id, isReady: router.isReady });

  useEffect(() => {
    if (!router.isReady) return;
    const fromAlert = router.query.fromAlert === '1';
    if (!fromAlert) return;
    setFlashFromAlert(true);
    window.setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    const timer = window.setTimeout(() => setFlashFromAlert(false), 2200);
    return () => window.clearTimeout(timer);
  }, [router.isReady, router.query.fromAlert]);

  if (loading) {
    return <GameDetailLoadingState />;
  }

  if (!game) {
    return <GameDetailNotFoundState />;
  }

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <Link href="/" className="mb-4 inline-block text-sm text-[#8fb8d5] transition hover:text-[#66c0f4]">
          ← 返回商店
        </Link>

        <div
          ref={highlightRef}
          className={`steam-panel rounded-2xl p-4 transition-all md:p-6 ${
            flashFromAlert ? 'ring-2 ring-[#66c0f4aa] shadow-[0_0_0_2px_rgba(102,192,244,0.25)]' : ''
          }`}
        >
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <GameGallery
              gameName={game.name}
              description={game.description}
              shots={galleryShots}
              selectedShot={selectedShot}
              onSelectShot={setSelectedShot}
            />
            <div className="space-y-4">
              <PurchasePanel
                priceInfo={priceInfo}
                variants={game.variants}
                selectedVariantId={selectedVariantId}
                onSelectVariant={setSelectedVariantId}
                onAddToCart={handleAddToCart}
                onAddToWishlist={handleAddToWishlist}
                onGoToCart={() => router.push('/cart')}
              />
              <PriceTrendChart gameId={game.id} currentPriceText={priceInfo.currentText} />
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <ReviewForm
            value={newReview}
            isSubmitting={isSubmitting}
            onChange={setNewReview}
            onSubmit={handleSubmitReview}
          />
          <ReviewList reviews={reviews} />
        </section>
      </section>
    </main>
  );
}
