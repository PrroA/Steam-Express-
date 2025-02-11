import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js";

// Stripe 公開金鑰（使用測試環境金鑰）
const stripePromise = loadStripe("pk_test_51Qr9qRRoY6RFAeUcNUZyfm5avjM4YPtAQdKcYnwIKrv02R615cdGXbFdnx45lyY2jjmdS68rHoRbn6hWQmSgCVn100B820Z6iB");

export default function CheckoutPage() {
  const [orders, setOrders] = useState([]); // 用戶的歷史訂單
  const [selectedOrder, setSelectedOrder] = useState(null); // 當前選擇的訂單
  const [clientSecret, setClientSecret] = useState(null); // Stripe 客戶端秘鑰
  const [loading, setLoading] = useState(false); // 是否加載中
  const [error, setError] = useState(null); // 錯誤訊息

//  - 從後端 API `/orders` 取得用戶的訂單列表


  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token"); // 取得 JWT Token

      try {
        const res = await fetch("http://localhost:4000/orders", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        const data = await res.json();
        console.log("✅ [DEBUG] 訂單:", data);
        setOrders(data);

        // 自動選擇第一筆「未付款」的訂單
        const unpaidOrder = data.find(order => order.status === "未付款");
        if (unpaidOrder) {
          setSelectedOrder(unpaidOrder);
        }
      } catch (error) {
        console.error("❌ 無法獲取訂單:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  /**
   * 📌 取得付款 Client Secret
   * - 當用戶選擇不同訂單時，自動請求 Stripe 建立付款意圖
   */
  useEffect(() => {
    const fetchClientSecret = async () => {
      if (!selectedOrder) return; // 沒有選擇訂單時，不請求 Stripe

      setLoading(true);
      setError(null);

      try {
        console.log("🔍 [DEBUG] 取得付款資訊，金額:", selectedOrder.total);

        const res = await fetch("http://localhost:4000/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: selectedOrder.total }), // 傳送訂單金額
        });

        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        const data = await res.json();
        if (!data.clientSecret) {
          throw new Error("clientSecret is missing");
        }

        console.log("✅ [DEBUG] 取得的 clientSecret:", data.clientSecret);
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error("❌ 無法創建付款請求:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClientSecret();
  }, [selectedOrder]);

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-900 min-h-screen text-white">
        <h1 className="text-3xl font-bold mb-6">🛒 確認付款</h1>

        {loading && <p className="text-gray-400">正在載入訂單資訊...</p>}
        {error && <p className="text-red-400">⚠️ {error}</p>}

        {/* 訂單選擇下拉選單 */}
        {orders.length > 0 && (
          <div className="mb-4">
            <label className="block text-lg">選擇要支付的訂單：</label>
            <select
              value={selectedOrder ? selectedOrder.id : ""}
              onChange={(e) => {
                const order = orders.find(o => o.id === e.target.value);
                setSelectedOrder(order);
              }}
              className="w-full p-2 border rounded"
            >
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  訂單 ID: {order.id} - 總金額: ${order.total.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="text-xl text-yellow-400">總金額: ${selectedOrder ? selectedOrder.total.toFixed(2) : "0.00"}</p>

        {/* Stripe 付款表單 */}
        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm clientSecret={clientSecret} orderId={selectedOrder.id} />
          </Elements>
        )}
      </div>
    </>
  );
}

// Stripe 付款表單組件
function CheckoutForm({ clientSecret, orderId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /**
   * 📌 處理付款提交
   * - 使用 `stripe.confirmCardPayment()` 來提交付款
   * - 成功後，請求後端 `/pay` API 更新訂單狀態
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!stripe || !elements) {
      setMessage("付款系統未載入，請稍後再試");
      setLoading(false);
      return;
    }

    // 使用 Stripe 確認付款
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });

    if (error) {
      setMessage(error.message);
    } else if (paymentIntent.status === "succeeded") {
      setMessage("🎉 付款成功！即將跳轉...");

      // 更新後端訂單狀態
      await fetch("http://localhost:4000/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ orderId }),
      });

      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 bg-gray-800 p-6 rounded shadow-lg">
      <CardElement className="p-4 bg-gray-700 rounded" />
      <button
        type="submit"
        className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-700 mt-4 w-full"
        disabled={loading || !stripe || !elements}
      >
        {loading ? "付款中..." : "💳 確認付款"}
      </button>
      {message && <p className="mt-4 text-yellow-400">{message}</p>}
    </form>
  );
}
