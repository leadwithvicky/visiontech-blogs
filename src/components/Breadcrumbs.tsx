'use client';

import Link from 'next/link';

type Item = { label: string; href?: string };

export default function Breadcrumbs({ items }: { items: Item[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm mb-3">
      <ol className="flex items-center gap-2 text-gray-600">
        {items.map((it, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-2">
              {it.href && !isLast ? (
                <Link href={it.href} className="hover:underline text-gray-700">{it.label}</Link>
              ) : (
                <span className={isLast ? 'font-medium text-black' : 'text-gray-700'}>{it.label}</span>
              )}
              {!isLast && <span className="text-gray-400">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
