import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Header } from "../components/Header";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { toast } from "react-toastify";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

// Stripe 公開金鑰（測試環境）
const stripePromise = loadStripe("pk_test_51Qr9qRRoY6RFAeUcNUZyfm5avjM4YPtAQdKcYnwIKrv02R615cdGXbFdnx45lyY2jjmdS68rHoRbn6hWQmSgCVn100B820Z6iB");

export default function CheckoutPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder) fetchClientSecret();
  }, [selectedOrder]);

  // 獲取用戶訂單
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/orders`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setOrders(data);
      const unpaidOrder = data.find(order => order.status === "未付款");
      if (unpaidOrder) setSelectedOrder(unpaidOrder);
    } catch (error) {
      console.error("訂單失敗:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 付款
  const fetchClientSecret = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: selectedOrder.total }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error("付款請求失敗:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 已付款 / 未付款訂單數量
  const getChartData = () => {
    const paidOrders = orders.filter(order => order.status === "已付款").length;
    const unpaidOrders = orders.filter(order => order.status === "未付款").length;
    return {
      labels: ["已付款", "未付款"],
      datasets: [
        {
          data: [paidOrders, unpaidOrders],
          backgroundColor: ["#4CAF50", "#FF5252"],
          hoverBackgroundColor: ["#45a049", "#e57373"],
        },
      ],
    };
  };

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-900 min-h-screen text-white">
        <h1 className="text-3xl font-bold mb-6">🛒 訂單概覽</h1>

        {loading && <p className="text-gray-400">正在載入訂單資訊...</p>}
        {error && <p className="text-red-400">⚠️ {error}</p>}

        {orders.length > 0 && (
          <div className="mb-4">
            <label className="block text-lg">選擇要支付的訂單：</label>
            <select
              value={selectedOrder?.id || ""}
              onChange={e => setSelectedOrder(orders.find(o => o.id === e.target.value))}
              className="w-full p-2 border rounded bg-gray-700 text-white"
            >
              {orders.map(order => (
                <option key={order.id} value={order.id}>
                  訂單 ID: {order.id} - 總金額: ${order.total.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="text-xl text-yellow-400">總金額: ${selectedOrder?.total.toFixed(2) || "0.00"}</p>
        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm clientSecret={clientSecret} orderId={selectedOrder?.id} />
          </Elements>
        )}
        {orders.length > 0 && (
          <div className="mt-10 bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-4 text-center">📊 訂單狀態統計</h2>
          <div className="w-60 h-60"> 
          <Pie data={getChartData()}/>
          </div>
          </div>
        )}
      </div>
    </>
  );
}


function CheckoutForm({ clientSecret, orderId }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!stripe || !elements) {
      setMessage("付款系統未載入，請稍後再試");
      setLoading(false);
      return;
    }

    if (!orderId) {
      setMessage("⚠️ 無效的訂單 ID，請重新選擇訂單");
      setLoading(false);
      return;
    }
    
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });

    if (error) {
      setMessage(error.message);
    } else if (paymentIntent.status === "succeeded") {
      setMessage("🎉 付款成功！感謝您的購買 🎉 即將跳轉至首頁...");

      await fetch(`${API_BASE_URL}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ orderId }),
      });

      toast.success("感謝你的購買!");
      setTimeout(() => router.push("/"), 1000);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 bg-gray-800 p-6 rounded shadow-lg">
      <CardElement className="p-4 bg-gray-700 rounded" />
      <button
        type="submit"
        className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-700 mt-4 w-full transition"
        disabled={loading || !stripe || !elements}
      >
        {loading ? "付款中..." : "💳 確認付款"}
      </button>
      {message && <p className="mt-4 text-yellow-400">{message}</p>}
    </form>
  );
}
