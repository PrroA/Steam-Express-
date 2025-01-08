import { useEffect, useState } from 'react';
import axios from 'axios';
import { Header } from '../components/Header';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const loadTransactions = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get('http://localhost:4000/transactions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTransactions(response.data);
      } catch (error) {
        console.error('無法獲取交易記錄:', error.response?.data || error.message);
      }
    };
    loadTransactions();
  }, []);
  

  if (transactions.length === 0) {
    return (
      <>
        <Header />
        <div className="p-6 bg-gray-100 min-h-screen text-center">
          <h1 className="text-2xl font-bold text-gray-700">目前沒有交易記錄</h1>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-700 mb-4">交易記錄</h1>
        <div className="max-w-4xl mx-auto bg-white p-4 rounded-lg shadow">
          {transactions.map((txn) => (
            <div key={txn.transactionId} className="border-b py-4">
              <h2 className="text-lg font-bold text-gray-700">交易 ID: {txn.transactionId}</h2>
              <p className="text-gray-700">訂單 ID: {txn.orderId}</p>
              <p className="text-gray-700">支付時間: {new Date(txn.paidAt).toLocaleString()}</p>
              <p className="text-gray-700">總金額: ${txn.total.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
