export function MetricCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <article className="steam-panel rounded-xl p-4">
      <p className="text-xs text-[#9eb4c8]">{label}</p>
      <p className={`mt-1 text-2xl font-black ${highlight ? 'text-[#8bc53f]' : 'text-[#d8e6f3]'}`}>
        {value}
      </p>
    </article>
  );
}
