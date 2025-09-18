'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
// Update the import path below to the correct relative path for Breadcrumbs
import Breadcrumbs from '../../../components/Breadcrumbs';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface Newsletter {
  _id: string;
  title: string;
  description: string;
  date?: string;
  createdAt?: string;
}

interface Subscriber {
  _id: string;
  email: string;
  status: string;
}

interface Stats {
  active?: number;
  total?: number;
  unsubscribed?: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.replace('/admin');
      return;
    }
    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      const [newslettersRes, subscribersRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/newsletters`, { cache: 'no-store' }),
        fetch(`${API_BASE}/api/subscribers`, { cache: 'no-store' }),
        fetch(`${API_BASE}/api/subscribers/stats`, { cache: 'no-store' }),
      ]);

      const [newslettersData, subscribersData, statsData] = await Promise.all([
        newslettersRes.json(),
        subscribersRes.json(),
        statsRes.json(),
      ]);

      // Ensure we always have arrays, even if API returns errors
      setNewsletters(Array.isArray(newslettersData) ? newslettersData : []);
      setSubscribers(Array.isArray(subscribersData) ? subscribersData : []);
      setStats(statsData || {});
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set empty arrays on error to prevent slice() errors
      setNewsletters([]);
      setSubscribers([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto p-6 bg-white text-black">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white text-black">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Admin', href: '/admin' }, { label: 'Dashboard' }]} />
      <h1 className="text-3xl font-extrabold mb-6 text-black">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-[#FFF8E1] border border-[#8B4513]/30">
          <div className="text-sm">Total Newsletters</div>
          <div className="text-3xl font-bold">{newsletters.length}</div>
        </div>
        <div className="rounded-xl p-4 bg-[#FFF8E1] border border-[#8B4513]/30">
          <div className="text-sm">Active Subscribers</div>
          <div className="text-3xl font-bold">{stats.active || 0}</div>
        </div>
        <div className="rounded-xl p-4 bg-[#FFF8E1] border border-[#8B4513]/30">
          <div className="text-sm">Total Subscribers</div>
          <div className="text-3xl font-bold">{stats.total || 0}</div>
        </div>
        <div className="rounded-xl p-4 bg-[#FFF8E1] border border-[#8B4513]/30">
          <div className="text-sm">Unsubscribed</div>
          <div className="text-3xl font-bold">{stats.unsubscribed || 0}</div>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Recent Newsletters</h2>
        <Link href="/admin/create" className="vt-btn vt-btn-cta">
          Create Newsletter
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(newsletters || []).slice(0, 6).map((n, _) => (
          <div key={n._id} className="rounded-xl bg-white border border-[#8B4513]/30 shadow-sm hover:shadow-md transition">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold truncate pr-2">{n.title}</h3>
                <span className="text-xs text-gray-600">{new Date(n.date || n.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1 line-clamp-2">{n.description}</p>
              <div className="mt-3 flex gap-3">
                <Link href={`/newsletter/${n._id}`} className="text-[#B7412E] text-sm">View</Link>
                <Link href={`/admin/edit/${n._id}`} className="text-[#7A8854] text-sm">Edit</Link>
                <button onClick={() => (async () => {
                  if (!confirm('Delete this newsletter?')) return;
                  try {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                    const res = await fetch(`${API_BASE}/api/newsletters/${n._id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
                    if (!res.ok) throw new Error('Delete failed');
                    // Remove from local list
                    setNewsletters(prev => (prev || []).filter((x: Newsletter) => x._id !== n._id));
                    // Refresh stats and subscribers silently
                    fetchDashboardData();
                  } catch (e) { alert('Failed to delete'); }
                })()} className="text-[#B7412E] text-sm">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-3">Recent Subscribers ({(subscribers || []).length})</h2>
        <div className="rounded-xl bg-white border border-[#8B4513]/30 shadow-sm">
          <div className="divide-y">
            {(subscribers || []).slice(0, 8).map((s: Subscriber) => (
              <div key={s._id} className="p-3 flex items-center justify-between">
                <span className="font-mono text-sm">{s.email}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-[#FFF8E1] text-black border border-[#8B4513]/30">{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
