'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Newsletter {
  _id: string;
  title: string;
  status?: string;
  date?: string;
  createdAt?: string;
}

interface Stats {
  active?: number;
  total?: number;
  unsubscribed?: number;
}

const AdminDashboard: React.FC = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [newslettersRes, statsRes] = await Promise.all([
        fetch((process.env.NEXT_PUBLIC_API_BASE_URL || '') + '/api/newsletters'),
        fetch((process.env.NEXT_PUBLIC_API_BASE_URL || '') + '/api/subscribers/stats')
      ]);

      const newslettersData: Newsletter[] = await newslettersRes.json();
      const statsData: Stats = await statsRes.json();

      setNewsletters(newslettersData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold">Total Newsletters</h3>
          <p className="text-2xl">{newsletters.length}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold">Active Subscribers</h3>
          <p className="text-2xl">{stats.active || 0}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold">Total Subscribers</h3>
          <p className="text-2xl">{stats.total || 0}</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold">Unsubscribed</h3>
          <p className="text-2xl">{stats.unsubscribed || 0}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6">
        <Link href="/admin/create" className="bg-blue-500 text-white px-4 py-2 rounded mr-2">
          Create Newsletter
        </Link>
        <Link href="/admin/schedule" className="bg-green-500 text-white px-4 py-2 rounded">
          Schedule Newsletter
        </Link>
      </div>

      {/* Newsletters List */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Recent Newsletters</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Title</th>
                <th className="py-2 px-4 border-b">Status</th>
                <th className="py-2 px-4 border-b">Date</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {newsletters.slice(0, 5).map(newsletter => (
                <tr key={newsletter._id}>
                  <td className="py-2 px-4 border-b">{newsletter.title}</td>
                  <td className="py-2 px-4 border-b">{newsletter.status || 'draft'}</td>
                  <td className="py-2 px-4 border-b">
                    {new Date(newsletter.date ?? newsletter.createdAt ?? '').toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <Link href={`/admin/edit/${newsletter._id}`} className="text-blue-500 mr-2">
                      Edit
                    </Link>
                    <Link href={`/admin/analytics/${newsletter._id}`} className="text-green-500">
                      Analytics
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
