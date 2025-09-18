// Converted to TypeScript TSX
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import Image from 'next/image';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface FormData {
  title: string;
  description: string;
  author: string;
  content: string;
  imageUrl: string;
}

const CreateNewsletter: React.FC = () => {
  const [form, setForm] = useState<FormData>({ title: '', description: '', author: '', content: '', imageUrl: '' });
  const [uploading, setUploading] = useState<boolean>(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api` : '/api' });
  api.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const data = new FormData();
    data.append('image', file);
    const res = await api.post('/uploads', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    setForm(prev => ({ ...prev, imageUrl: res.data.url }));
    setUploading(false);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await api.post('/newsletters', form);
    window.location.href = '/admin/dashboard';
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Create Newsletter</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border p-2 rounded" name="title" placeholder="Title" onChange={handleChange} />
        <input className="w-full border p-2 rounded" name="author" placeholder="Author" onChange={handleChange} />
        <textarea className="w-full border p-2 rounded" name="description" placeholder="Short Description" onChange={handleChange} />
        <div className="w-full">
          <label className="block text-sm mb-1">Content</label>
          <ReactQuill theme="snow" value={form.content} onChange={(val) => setForm(prev => ({ ...prev, content: val }))} />
        </div>
        <div className="space-y-2">
          <input type="file" accept="image/*" onChange={handleImage} />
          {uploading ? <p>Uploading...</p> : form.imageUrl && <Image src={form.imageUrl} alt="preview" width={300} height={200} className="max-h-48 rounded" />}
        </div>
        <button className="bg-black text-white px-4 py-2 rounded" type="submit">Save</button>
      </form>
    </div>
  );
};

export default CreateNewsletter;
