import { useRouter } from 'next/router';
import Link from 'next/link';
import { GameGallery } from '../../components/game-detail/GameGallery';
import { PurchasePanel } from '../../components/game-detail/PurchasePanel';
import { ReviewForm } from '../../components/game-detail/ReviewForm';
import { ReviewList } from '../../components/game-detail/ReviewList';
import {
  GameDetailLoadingState,
  GameDetailNotFoundState,
} from '../../components/game-detail/DetailState';
import { useGameDetail } from '../../hooks/useGameDetail';

export default function GameDetail() {
  const router = useRouter();
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

        <div className="steam-panel rounded-2xl p-4 md:p-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <GameGallery
              gameName={game.name}
              description={game.description}
              shots={galleryShots}
              selectedShot={selectedShot}
              onSelectShot={setSelectedShot}
            />
            <PurchasePanel
              priceInfo={priceInfo}
              variants={game.variants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={setSelectedVariantId}
              onAddToCart={handleAddToCart}
              onAddToWishlist={handleAddToWishlist}
              onGoToCart={() => router.push('/cart')}
            />
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
