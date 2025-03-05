import { useEffect, useState } from 'react';
import axios from 'axios';
import { Header } from '../components/Header';
import Link from 'next/link';
import { FaFileInvoiceDollar } from 'react-icons/fa';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransactions = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get(`${API_BASE_URL}/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTransactions(response.data);
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
      <>
        <Header />
        <div className="p-6 bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white">
          <div className="w-12 h-12 border-4 border-blue-500 border-dotted rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-400">加載中...</p>
        </div>
      </>
    );
  }

  if (transactions.length === 0) {
    return (
      <>
        <Header />
        <div className="p-6 bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white">
          <FaFileInvoiceDollar size={80} className="text-gray-600 mb-4" />
          <h1 className="text-2xl font-bold">目前沒有交易記錄</h1>
          <p className="text-gray-400">去買一些遊戲來看看吧！</p>
          <a href="/" className="mt-4 bg-blue-500 py-2 px-4 rounded hover:bg-blue-700 transition">
            返回商店
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-900 min-h-screen text-white">
        <h1 className="text-3xl font-bold mb-6 text-center">💰 交易記錄</h1>

        <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
          {transactions.map((txn) => (
            <div key={txn.transactionId} className="border-b py-4">
              <h2 className="text-lg font-bold">交易 ID: {txn.transactionId}</h2>
              <p className="text-gray-400">支付時間: {new Date(txn.paidAt).toLocaleString()}</p>
              
              <p className="text-gray-300">
                訂單 ID: 
                <p href ={`/orders/${txn.orderId}`} className="text-blue-400 hover:underline ml-1">
                  {txn.orderId}
                </p>
              </p>

              <p className="text-yellow-400 font-bold">總金額: ${txn.total.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
