import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { fetchProfile, updateProfile } from '../services/profileService';
import { ErrorState, LoadingState } from '../components/ui/PageStates';

type PaymentMethod = 'credit-card' | 'line-pay' | 'wallet';

function normalizeStoredEmail(email?: string | null) {
  const value = (email || '').trim();
  if (!value || value === '未設定' || !value.includes('@')) return '';
  return value;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [defaultFullName, setDefaultFullName] = useState('');
  const [defaultPhone, setDefaultPhone] = useState('');
  const [defaultAddress, setDefaultAddress] = useState('');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod>('credit-card');

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchProfile(token);
      setUsername(data.username || '');
      localStorage.setItem('profile_username', data.username || '');
      window.dispatchEvent(new Event('auth-user-updated'));
      setEmail(normalizeStoredEmail(data.email));
      setDefaultFullName(data.defaultFullName || '');
      setDefaultPhone(data.defaultPhone || '');
      setDefaultAddress(data.defaultAddress || '');
      setDefaultPaymentMethod((data.defaultPaymentMethod || 'credit-card') as PaymentMethod);
    } catch (error) {
      setLoadError('目前無法載入個人資料，請稍後再試。');
      toast.error('個人資料載入失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleUpdateProfile = async () => {
    const token = localStorage.getItem('token');
    try {
      await updateProfile(
        { username, email, defaultFullName, defaultPhone, defaultAddress, defaultPaymentMethod },
        token
      );
      localStorage.setItem('profile_username', username || '');
      window.dispatchEvent(new Event('auth-user-updated'));
      toast.success('個人資料已更新。');
    } catch (error) {
      toast.error('暫時無法儲存資料，請稍後再試。');
    }
  };

  if (loading) {
    return <LoadingState title="正在載入個人資料" description="請稍候，我們正在整理你的帳號資訊。" />;
  }

  if (loadError) {
    return <ErrorState title="個人資料載入失敗" description={loadError} onAction={loadProfile} />;
  }

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-3xl">
        <div className="steam-panel rounded-2xl p-6 md:p-7">
          <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">帳號資料</p>
          <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">個人資料</h1>
          <p className="mt-1 text-sm text-[#9eb4c8]">
            更新帳號資訊、常用收件資料與預設付款方式，結帳時會自動帶入。
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-[#9eb4c8]">顯示名稱</label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#9eb4c8]">電子信箱</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                placeholder="name@example.com"
              />
            </div>

            <div className="rounded-xl border border-[#66c0f433] bg-[#132434] p-4">
              <p className="text-sm font-bold text-[#d8e6f3]">常用收件資料</p>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-[#9eb4c8]">收件人姓名</label>
                  <input
                    type="text"
                    value={defaultFullName}
                    onChange={(event) => setDefaultFullName(event.target.value)}
                    className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-2.5 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                    placeholder="王小明"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#9eb4c8]">聯絡電話</label>
                  <input
                    type="text"
                    value={defaultPhone}
                    onChange={(event) => setDefaultPhone(event.target.value)}
                    className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-2.5 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                    placeholder="09xxxxxxxx"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#9eb4c8]">預設地址</label>
                  <textarea
                    value={defaultAddress}
                    onChange={(event) => setDefaultAddress(event.target.value)}
                    className="min-h-20 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-2.5 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                    placeholder="請輸入常用收件地址"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#9eb4c8]">預設付款方式</label>
              <select
                value={defaultPaymentMethod}
                onChange={(event) => setDefaultPaymentMethod(event.target.value as PaymentMethod)}
                className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
              >
                <option value="credit-card">信用卡</option>
                <option value="line-pay">LINE Pay</option>
                <option value="wallet">Steam 錢包</option>
              </select>
            </div>

            <button onClick={handleUpdateProfile} className="steam-btn w-full rounded-md py-2.5 text-sm">
              儲存資料
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
