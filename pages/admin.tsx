import { AddGamePanel } from '../components/admin/AddGamePanel';
import { GameManagementPanel } from '../components/admin/GameManagementPanel';
import { MetricCard } from '../components/admin/MetricCard';
import { OrderManagementPanel } from '../components/admin/OrderManagementPanel';
import { useAdminPage } from '../hooks/useAdminPage';

export default function AdminPage() {
  const {
    loading,
    dashboard,
    games,
    sortedOrders,
    addGameForm,
    aiDraft,
    aiGenerating,
    updateAddGameField,
    handleImageChange,
    handleImageFileChange,
    handleAddGame,
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
  } = useAdminPage();

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-7xl">
        <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">ADMIN CONTROL CENTER</p>
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">後台管理</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">商品管理、訂單控管、基本營運儀表板。</p>

        {loading ? (
          <div className="steam-panel mt-5 rounded-2xl p-8 text-center text-[#9eb4c8]">資料載入中...</div>
        ) : (
          <>
            {dashboard && (
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="總訂單" value={dashboard.totalOrders} />
                <MetricCard label="已付款" value={dashboard.paidOrders} highlight />
                <MetricCard label="總營收" value={`$${dashboard.totalRevenue.toFixed(2)}`} highlight />
                <MetricCard label="售出件數" value={dashboard.totalItemsSold} />
              </div>
            )}

            <AddGamePanel
              form={addGameForm}
              onFieldChange={updateAddGameField}
              onImageUrlChange={handleImageChange}
              onImageFileChange={handleImageFileChange}
              onSubmit={handleAddGame}
              aiDraft={aiDraft}
              aiGenerating={aiGenerating}
              onGenerateAiCopy={handleGenerateAiCopy}
              onApplyAiShortDescription={handleApplyAiShortDescription}
              onAppendAiSellingPoints={handleAppendAiSellingPoints}
              onApplyAiSeoTitle={handleApplyAiSeoTitle}
            />

            <GameManagementPanel
              games={games}
              onToggleActive={handleToggleActive}
              onSaveBasic={handleGameBasicUpdate}
              onSaveVariant={handleVariantUpdate}
              onEnsureVariant={handleEnsureVariant}
            />

            <OrderManagementPanel
              orders={sortedOrders}
              onUpdateStatus={handleUpdateOrderStatus}
              onUpdateFulfillmentStatus={handleUpdateFulfillmentStatus}
              onUpdateShippingDetails={handleUpdateShippingDetails}
            />
          </>
        )}
      </section>
    </main>
  );
}
