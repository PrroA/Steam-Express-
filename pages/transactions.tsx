import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaFileInvoiceDollar } from 'react-icons/fa';
import { fetchTransactions } from '../services/orderService';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransactions = async () => {
      const token = localStorage.getItem('token');
      try {
        const data = await fetchTransactions(token);
        setTransactions(data || []);
      } catch (error) {
        console.error('無法獲取交易記錄:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, []);

  if (loading) {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#66c0f4] border-t-transparent" />
          <p className="mt-4 text-sm text-[#9eb4c8]">載入交易資料中...</p>
        </div>
      </main>
    );
  }

  if (transactions.length === 0) {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl p-10 text-center">
          <FaFileInvoiceDollar size={68} className="mx-auto text-[#58738a]" />
          <h1 className="mt-4 text-3xl font-black text-[#d8e6f3]">目前沒有交易記錄</h1>
          <p className="mt-2 text-[#9eb4c8]">完成付款後，會在這裡看到交易明細。</p>
          <Link href="/" className="steam-btn mt-5 inline-flex rounded-md px-5 py-2 text-sm">
            返回商店
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-5xl">
        <h1 className="text-3xl font-black text-[#d8e6f3]">交易記錄</h1>
        <p className="mt-1 text-sm text-[#9eb4c8]">付款成功後的每筆交易都會列在這裡。</p>

        <div className="steam-panel mt-5 rounded-2xl p-4 md:p-5">
          <ul className="space-y-3">
            {transactions.map((txn) => (
              <li
                key={txn.transactionId}
                className="rounded-xl border border-[#66c0f433] bg-[#132434] p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#d8e6f3]">交易 ID: {txn.transactionId}</p>
                    <p className="text-xs text-[#9eb4c8]">
                      支付時間: {new Date(txn.paidAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-[#9eb4c8]">
                      訂單 ID:
                      <Link
                        href={`/orders/${txn.orderId}`}
                        className="ml-1 text-[#8fb8d5] transition hover:text-[#66c0f4]"
                      >
                        {txn.orderId}
                      </Link>
                    </p>
                  </div>
                  <p className="text-lg font-black text-[#8bc53f]">${txn.total.toFixed(2)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
