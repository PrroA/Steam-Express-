import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AdminActionPanel } from '../components/admin/AdminActionPanel';
import { AddGamePanel } from '../components/admin/AddGamePanel';
import { GameManagementPanel } from '../components/admin/GameManagementPanel';
import { MetricCard } from '../components/admin/MetricCard';
import { OrderManagementPanel } from '../components/admin/OrderManagementPanel';
import { useAdminPage } from '../hooks/useAdminPage';
import { clearStoredAuth, isTokenExpired, parseTokenPayload } from '../utils/authToken';

type AdminAccessState = 'checking' | 'allowed' | 'denied';

export default function AdminPage() {
  const router = useRouter();
  const [accessState, setAccessState] = useState<AdminAccessState>('checking');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const payload = parseTokenPayload(token);

    if (!payload || isTokenExpired(payload)) {
      clearStoredAuth();
      router.replace('/login?redirect=/admin');
      return;
    }

    setAccessState(payload.role === 'admin' ? 'allowed' : 'denied');
  }, [router]);

  if (accessState === 'checking') {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#66c0f4] border-t-transparent" />
          <h1 className="mt-4 text-2xl font-black text-[#d8e6f3]">檢查管理員權限</h1>
          <p className="mt-2 text-sm text-[#9eb4c8]">正在確認登入狀態，確認後才會載入後台資料。</p>
        </div>
      </main>
    );
  }

  if (accessState === 'denied') {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl p-10 text-center">
          <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">ADMIN ONLY</p>
          <h1 className="mt-3 text-2xl font-black text-[#d8e6f3]">沒有管理員權限</h1>
          <p className="mt-2 text-sm text-[#9eb4c8]">
            目前登入帳號不是 admin，因此不會呼叫後台管理 API。請使用 admin/admin 登入後再進入管理後台。
          </p>
          <button
            type="button"
            onClick={() => router.push('/login?redirect=/admin')}
            className="steam-btn mt-5 rounded-md px-4 py-2 text-sm"
          >
            前往登入
          </button>
        </div>
      </main>
    );
  }

  return <AdminPageContent />;
}

function AdminPageContent() {
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
        <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">管理後台</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">管理商品、訂單、庫存與首頁展示資料。</p>

        {loading ? (
          <div className="steam-panel mt-5 rounded-2xl p-8 text-center text-[#9eb4c8]">後台資料載入中...</div>
        ) : (
          <>
            {dashboard && (
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="總訂單數" value={dashboard.totalOrders} />
                <MetricCard label="已付款訂單" value={dashboard.paidOrders} highlight />
                <MetricCard label="總營收" value={`$${dashboard.totalRevenue.toFixed(2)}`} highlight />
                <MetricCard label="售出品項數" value={dashboard.totalItemsSold} />
              </div>
            )}

            <AdminActionPanel dashboard={dashboard} orders={sortedOrders} games={games} />

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
