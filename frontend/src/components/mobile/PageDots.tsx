'use client';

interface PageDotsProps {
  count: number;
  active: number;
}

export default function PageDots({ count, active }: PageDotsProps) {
  return (
    <div className="flex items-center justify-center gap-1.5" role="tablist">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          aria-current={i === active}
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            i === active ? 'bg-white' : 'bg-white/35'
          }`}
        />
      ))}
    </div>
  );
}
