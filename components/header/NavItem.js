import Link from 'next/link';

export function NavItem({ href, label, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-md border border-[#66c0f433] bg-[#1b2b3a] px-3 py-2 text-sm font-semibold text-[#d8e6f3] transition hover:border-[#66c0f488] hover:bg-[#24384d]"
    >
      {label}
    </Link>
  );
}
