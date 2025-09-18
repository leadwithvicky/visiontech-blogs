'use client';

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';

interface FormData {
  title: string;
  description: string;
  author: string;
  imageUrl: string;
}

const EditNewsletter: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [form, setForm] = useState<FormData>({ title: '', description: '', author: '', imageUrl: '' });
  const [loading, setLoading] = useState<boolean>(true);
  const editorRef = useRef<ReturnType<typeof import('grapesjs').default.init> | null>(null);
  const editorElRef = useRef<HTMLDivElement | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api` : '/api' });
  api.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        // Fetch existing newsletter
        const res = await api.get(`/newsletters/${id}`);
        const data = res.data || {};
        setForm({
          title: data.title || '',
          description: data.description || data.subtitle || '',
          author: data.author || '',
          imageUrl: data.imageUrl || '',
        });

        // Load GrapesJS CSS only once
        const cssId = 'grapesjs-css';
        if (typeof document !== 'undefined' && !document.getElementById(cssId)) {
          const link = document.createElement('link');
          link.id = cssId;
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/grapesjs/dist/css/grapes.min.css';
          document.head.appendChild(link);
        }
        const grapesjs = (await import('grapesjs')).default;
        if (editorElRef.current) {
          const editor = grapesjs.init({
            container: editorElRef.current,
            height: '70vh',
            fromElement: false,
            storageManager: false,
            assetManager: { upload: (process.env.NEXT_PUBLIC_API_BASE_URL ? `${process.env.NEXT_PUBLIC_API_BASE_URL}` : '') + '/api/uploads', uploadName: 'image' },
          });

          // Parse stored content (expecting <style>css</style> + html)
          const raw = data.content || '';
          const cssMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
          const css = cssMatch ? cssMatch[1] : '';
          const html = raw.replace(/<style[^>]*>[\s\S]*?<\/style>/i, '');
          editor.setComponents(html || '<section style="padding:20px"><h1>Edit your newsletter</h1></section>');
          if (css) editor.setStyle(css);

          // Ensure assets added are absolute URLs
          editor.on('asset:upload:response', (res) => {
            const url = res?.url;
            if (url) {
              const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
              const absoluteUrl = url.startsWith('http') ? url : `${base}${url}`;
              editor.AssetManager.add({ src: absoluteUrl });
            }
          });

          editorRef.current = editor;
        }
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    })();
  }, [id, api]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const editor = editorRef.current;
    const html = editor?.getHtml?.() || '';
    const css = editor?.getCss?.() || '';
    const content = `<style>${css}</style>${html}`;
    await api.put(`/newsletters/${id}`, { ...form, content });
    router.push('/admin/dashboard');
  };

  if (loading) return <div className="max-w-6xl mx-auto p-6">Loading editor...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white text-black">
      <h1 className="text-2xl font-bold mb-4">Edit Newsletter</h1>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="w-full border p-2 rounded" name="title" placeholder="Title" value={form.title} onChange={handleChange} />
          <input className="w-full border p-2 rounded" name="author" placeholder="Author" value={form.author} onChange={handleChange} />
          <input className="w-full border p-2 rounded" name="description" placeholder="Short Description" value={form.description} onChange={handleChange} />
        </div>
        <div className="border rounded">
          <div ref={editorElRef} />
        </div>
        <div className="flex justify-end gap-3">
          <button type="submit" className="bg-black text-white px-4 py-2 rounded">Save Changes</button>
        </div>
      </form>
    </div>
  );
};

export default EditNewsletter;
