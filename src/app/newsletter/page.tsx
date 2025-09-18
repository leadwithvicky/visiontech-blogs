'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Breadcrumbs from '@/components/Breadcrumbs';

type Newsletter = {
  _id: string;
  title: string;
  description?: string;
  content?: string;
  date?: string;
  imageUrl?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<null | 'ok' | 'error'>(null);
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/subscribers/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Subscribe failed');
      setStatus('ok');
      setMessage('Subscribed successfully!');
      setEmail('');
    } catch (err) {
      setStatus('error');
      if (err instanceof Error) {
        setMessage(err.message || 'Subscribe failed');
      } else {
        setMessage('Subscribe failed');
      }
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 flex gap-2 max-w-xl">
      <input
        type="email"
        required
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded">
        Subscribe
      </button>
      {status && (
        <span className={status === 'ok' ? 'text-green-600 ml-2 self-center' : 'text-red-600 ml-2 self-center'}>
          {message}
        </span>
      )}
    </form>
  );
}

export default function NewsletterListPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/newsletters`, { cache: 'no-store' });
        const data = await res.json();
        setNewsletters(Array.isArray(data) ? data : []);
      } catch {
        setNewsletters([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen">
      <div className="bg-g">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Newsletter' }]} />
          <div className="flex items-center justify-between">
            <h1 className="text-3xl md:text-4xl font-bold">VisionTech Newsletter</h1>
          </div>
          <p className="mt-2 text-black/90">Curated tech insights, updates, and product news.</p>
          <SubscribeForm />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <p>Loading newsletters...</p>
        ) : newsletters.length === 0 ? (
          <p>No newsletters available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsletters.map((n) => (
              <Link
                key={n._id}
                href={`/newsletter/${n._id}`}
                className="group bg-white rounded-lg border shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
              >
                <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
                  <img
                    src={n.imageUrl && n.imageUrl.startsWith('http') ? n.imageUrl : '/next.svg'}
                    alt={n.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-lg font-semibold mb-1 line-clamp-2">{n.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {n.description || (typeof n.content === 'string' ? `${n.content.replace(/<[^>]+>/g, '').slice(0, 160)}...` : '')}
                  </p>
                  <div className="mt-3 text-xs text-gray-500">
                    {n.date ? new Date(n.date).toLocaleDateString() : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
