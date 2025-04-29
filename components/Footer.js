import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white text-center py-6">
      <div className="container mx-auto">
        <h2 className="text-lg font-bold">{`Proa`} | 王奕軒 | 網站持續優化中 </h2>
        <p className="text-sm text-gray-400">歡迎聯絡我，更多資訊如下：</p>
        {/* 社群連結 */}
        <div className="flex justify-center space-x-6 mt-4">
          <Link href="https://github.com/PrroA" target="_blank" className="hover:text-gray-300">
            GitHub
          </Link>
          <Link href="mailto:ga2006049738@gmail.com" className="hover:text-gray-300">
            Email
          </Link>
          <h4>手機號碼 ： 0931-753-733 </h4>
        </div>
      </div>
    </footer>
  );
}
