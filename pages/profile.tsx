import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { fetchProfile, updateProfile } from '../services/profileService';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      try {
        const data = await fetchProfile(token);
        setUsername(data.username || '');
        setEmail(data.email === '未提供' ? '' : data.email || '');
      } catch (error) {
        toast.error('無法載入個人資料');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    const token = localStorage.getItem('token');
    try {
      await updateProfile({ username, email }, token);
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
          <p className="mt-1 text-sm text-[#9eb4c8]">更新你的顯示名稱與聯絡信箱。</p>

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

            <button onClick={handleUpdateProfile} className="steam-btn w-full rounded-md py-2.5 text-sm">
              更新資料
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
