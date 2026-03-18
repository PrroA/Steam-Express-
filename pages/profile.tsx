import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { fetchProfile, updateProfile } from '../services/profileService';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [defaultFullName, setDefaultFullName] = useState('');
  const [defaultPhone, setDefaultPhone] = useState('');
  const [defaultAddress, setDefaultAddress] = useState('');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'credit-card' | 'line-pay' | 'wallet'>('credit-card');

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem('token');
      try {
        const data = await fetchProfile(token);
        setUsername(data.username || '');
        localStorage.setItem('profile_username', data.username || '');
        window.dispatchEvent(new Event('auth-user-updated'));
        setEmail(data.email === '未提供' ? '' : data.email || '');
        setDefaultFullName(data.defaultFullName || '');
        setDefaultPhone(data.defaultPhone || '');
        setDefaultAddress(data.defaultAddress || '');
        setDefaultPaymentMethod(data.defaultPaymentMethod || 'credit-card');
      } catch (error) {
        toast.error('無法載入個人資料');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleUpdateProfile = async () => {
    const token = localStorage.getItem('token');
    try {
      await updateProfile(
        { username, email, defaultFullName, defaultPhone, defaultAddress, defaultPaymentMethod },
        token
      );
      localStorage.setItem('profile_username', username || '');
      window.dispatchEvent(new Event('auth-user-updated'));
      toast.success('個人資料更新成功');
    } catch (error) {
      toast.error('更新失敗，請稍後再試');
    }
  };

  if (loading) {
    return (
      <main className="steam-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="steam-panel w-full max-w-xl rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#66c0f4] border-t-transparent" />
          <p className="mt-4 text-sm text-[#9eb4c8]">載入個人資料中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-3xl">
        <div className="steam-panel rounded-2xl p-6 md:p-7">
          <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">ACCOUNT PROFILE</p>
          <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">個人資料</h1>
          <p className="mt-1 text-sm text-[#9eb4c8]">更新帳號資訊、常用收件資料與預設付款方式。</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-[#9eb4c8]">用戶名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#9eb4c8]">電子郵件</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                    onChange={(e) => setDefaultFullName(e.target.value)}
                    className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-2.5 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                    placeholder="王小明"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#9eb4c8]">手機號碼</label>
                  <input
                    type="text"
                    value={defaultPhone}
                    onChange={(e) => setDefaultPhone(e.target.value)}
                    className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-2.5 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                    placeholder="09xxxxxxxx"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#9eb4c8]">預設地址</label>
                  <textarea
                    value={defaultAddress}
                    onChange={(e) => setDefaultAddress(e.target.value)}
                    className="min-h-20 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-2.5 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
                    placeholder="台北市中正區..."
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#9eb4c8]">預設付款方式</label>
              <select
                value={defaultPaymentMethod}
                onChange={(e) =>
                  setDefaultPaymentMethod(e.target.value as 'credit-card' | 'line-pay' | 'wallet')
                }
                className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] focus:border-[#66c0f4aa] focus:outline-none"
              >
                <option value="credit-card">信用卡</option>
                <option value="line-pay">LINE Pay</option>
                <option value="wallet">Steam 錢包</option>
              </select>
            </div>

            <button onClick={handleUpdateProfile} className="steam-btn w-full rounded-md py-2.5 text-sm">
              更新資料
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
