'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type Newsletter = {
  _id: string;
  title: string;
  description?: string;
  content?: string;
  author?: string;
  date?: string;
  imageUrl?: string;
};

export default function NewsletterDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [n, setN] = useState<Newsletter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/newsletters/${id}`, { cache: 'no-store' });
        const data = await res.json();
        setN(data || null);
      } catch {
        setN(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const displayDate = useMemo(() => (n?.date ? new Date(n.date).toLocaleDateString() : ''), [n?.date]);
  const bannerSrc = useMemo(() => {
  const src = n?.imageUrl || '';
  if (!src) return '';
  // Always use imageUrl directly (Cloudinary URL or fallback)
  return src.startsWith('http') ? src : '';
  }, [n?.imageUrl]);

  const share = () => {
    if (!n) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(n.title)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="vt-card p-6 animate-pulse">
          <div className="h-7 w-2/3 bg-[#E8DECF] rounded" />
          <div className="h-4 w-1/3 bg-[#E8DECF] rounded mt-3" />
          <div className="aspect-[16/9] bg-[#E8DECF] rounded mt-6" />
          <div className="h-3 w-5/6 bg-[#E8DECF] rounded mt-6" />
          <div className="h-3 w-4/6 bg-[#E8DECF] rounded mt-2" />
        </div>
      </div>
    );
  }

  if (!n) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="vt-card p-6">
          <h1 className="text-2xl font-bold">Newsletter not found</h1>
          <p className="mt-2">The requested newsletter could not be located.</p>
          <div className="mt-4">
            <Link href="/newsletter" className="vt-btn">Back to feed</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header section */}
      <section className="max-w-5xl mx-auto px-6 pt-10">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Newsletter', href: '/newsletter' }, { label: n.title }]} />
        <h1 className="text-3xl md:text-4xl font-bold leading-tight">{n.title}</h1>
        <div className="mt-2 text-sm" style={{ color: 'var(--vt-muted)' }}>
          {displayDate}
          {n.author ? ` • ${n.author}` : ''}
        </div>
        <div className="mt-4 flex gap-3">
          <Link href="/newsletter" className="vt-btn">Back to feed</Link>
          <button onClick={share} className="vt-btn vt-btn-cta">Share</button>
        </div>
      </section>

      {/* Content card */}
      <section className="max-w-5xl mx-auto px-6 pb-16 mt-6">
        <article className="vt-card overflow-hidden">
          {bannerSrc && (
            <div className="p-6 pb-0">
              <Image src={bannerSrc} alt={n.title} width={800} height={450} className="vt-img-frame w-full object-cover" />
            </div>
          )}
          <div className="p-6 md:p-8">
            {n.description && (
              <p className="text-lg" style={{ color: 'var(--vt-muted)' }}>{n.description}</p>
            )}
            {n.description && <hr className="mt-4" />}
            <div className="prose max-w-none mt-6">
              <div dangerouslySetInnerHTML={{ __html: n.content || '' }} />
            </div>
            <hr className="mt-8" />
            <div className="mt-4 flex gap-3">
              <Link href="/newsletter" className="vt-btn">← Back</Link>
              <button onClick={share} className="vt-btn vt-btn-cta">Share</button>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
