import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';
import { addGame } from '../services/storeService';

export default function AdminPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [preview, setPreview] = useState('');

  const handleAddGame = async () => {
    const token = localStorage.getItem('token');
    try {
      await addGame({ name, price, description, image }, token);

      toast.success('遊戲已添加');
      router.push('/');
    } catch (error) {
      toast.error('添加遊戲失敗：你不是管理員或資料有誤');
      console.error(error.response?.data || error);
    }
  };

  const handleImageChange = (e) => {
    const url = e.target.value;
    setImage(url);
    setPreview(url);
  };

  return (
    <main className="steam-shell px-4 py-6 md:px-6">
      <section className="mx-auto w-full max-w-3xl">
        <div className="steam-panel rounded-2xl p-6 md:p-7">
          <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">ADMIN PANEL</p>
          <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">新增遊戲</h1>
          <p className="mt-1 text-sm text-[#9eb4c8]">填入遊戲資訊後即可上架到商店首頁。</p>

          {preview && (
            <div className="relative mt-5 aspect-video w-full overflow-hidden rounded-xl border border-[#66c0f433] bg-[#0f1d2b]">
              <Image
                src={preview || '/vercel.svg'}
                alt="封面預覽"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}

          <div className="mt-5 space-y-3">
            <input
              type="text"
              placeholder="遊戲名稱"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            />

            <input
              type="number"
              placeholder="價格（例如：59.99）"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            />

            <textarea
              placeholder="遊戲描述"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-28 w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            />

            <input
              type="text"
              placeholder="封面圖片 URL"
              value={image}
              onChange={handleImageChange}
              className="w-full rounded-md border border-[#66c0f444] bg-[#162737] px-4 py-3 text-sm text-[#d8e6f3] placeholder:text-[#89a8bf] focus:border-[#66c0f4aa] focus:outline-none"
            />

            <button onClick={handleAddGame} className="steam-btn w-full rounded-md py-2.5 text-sm">
              添加遊戲
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
