import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-[#66c0f433] bg-[#0d1824] py-8 text-[#d8e6f3]">
      <div className="mx-auto flex w-[95%] max-w-6xl flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
        <div>
          <h2 className="text-base font-bold tracking-wide">Proa Game Store Practice</h2>
          <p className="text-sm text-[#9eb4c8]">王奕軒 | Steam 風格前端練習作品</p>
        </div>
        <div className="flex items-center gap-5 text-sm text-[#9eb4c8]">
          <Link
            href="https://github.com/PrroA"
            target="_blank"
            className="transition hover:text-[#66c0f4]"
          >
            GitHub
          </Link>
          <Link href="mailto:ga2006049738@gmail.com" className="transition hover:text-[#66c0f4]">
            Email
          </Link>
          <span className="text-xs text-[#7e98ab]">UI Iteration v1</span>
        </div>
      </div>
    </footer>
  );
}
