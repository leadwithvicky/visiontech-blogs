'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type Newsletter = {
  _id: string;
  title: string;
  description?: string;
  author?: string;
  content?: string; // stored as <style>...</style><html>
  imageUrl?: string;
};

type EditorLike = {
  getHtml: () => string;
  getCss: () => string;
  setComponents: (html: string) => void;
  setStyle: (css: string) => void;
  on: (eventName: string, cb: (...args: unknown[]) => void) => void;
  AssetManager: { add: (asset: { src: string }) => void };
  destroy?: () => void;
};

type GrapesJs = {
  init: (config: {
    container: HTMLElement;
    height?: string;
    fromElement?: boolean;
    storageManager?: boolean;
    assetManager?: { upload: string; uploadName: string };
  }) => EditorLike;
};

export default function EditNewsletterPage() {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? (idParam[0] || '') : (idParam || '');

  const [form, setForm] = useState({ title: '', description: '', author: '', imageUrl: '' });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState<string>('');
  const editorRef = useRef<EditorLike | null>(null);
  const editorElRef = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Auth guard
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!t) {
      router.replace('/admin');
      return;
    }
    setToken(t);
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked || !id) return;
    (async () => {
      try {
        setLoadError(null);
        // Try configured base first, then fallback to same-origin
        const baseForGet = API_BASE.replace(/\/+$/, '');
        const candidates = Array.from(new Set([
          `${baseForGet}/api/newsletters/${id}`,
          `/api/newsletters/${id}`
        ]));
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[Edit] params', params, 'resolved id', id, 'candidates', candidates);
        }

        let data: (Newsletter & { subtitle?: string }) | null = null;
        for (const url of candidates) {
          try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            data = await res.json();
            break;
          } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
              console.debug('[Edit] fetch failed', url, err);
            }
            // try next candidate
          }
        }

        if (!data) throw new Error('Failed to load newsletter');
        setForm({
          title: data.title || '',
          description: data.description || (data as { subtitle?: string }).subtitle || '',
          author: data.author || '',
          imageUrl: data.imageUrl || ''
        });
        setRawContent(data.content || '');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load newsletter';
        setLoadError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, authChecked, params]);

  // Initialize GrapesJS only after the container is mounted and loading is done
  useEffect(() => {
    if (!authChecked || loading) return;
    if (!editorElRef.current) return;
    if (editorRef.current) return; // already initialized
    (async () => {
      try {
        const grapesCssId = 'grapesjs-css';
        if (typeof document !== 'undefined' && !document.getElementById(grapesCssId)) {
          const link = document.createElement('link');
          link.id = grapesCssId;
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/grapesjs/dist/css/grapes.min.css';
          document.head.appendChild(link);
        }
        const grapesjs: GrapesJs = (await import('grapesjs')).default as unknown as GrapesJs;
        const editor = grapesjs.init({
          container: editorElRef.current!,
          height: '70vh',
          fromElement: false,
          storageManager: false,
          assetManager: { upload: `${API_BASE}/api/uploads`, uploadName: 'image' },
        });

        // Parse and set initial content
        const raw = rawContent || '';
        const cssMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        const css = cssMatch ? cssMatch[1] : '';
        const html = raw.replace(/<style[^>]*>[\s\S]*?<\/style>/i, '');
        editor.setComponents(html || '<section style="padding:20px"><h1>Edit your newsletter</h1></section>');
        if (css) editor.setStyle(css);

        editor.on('asset:upload:response', (res: unknown) => {
          const maybeUrl = typeof res === 'object' && res !== null && 'url' in res ? (res as { url?: unknown }).url : undefined;
          if (typeof maybeUrl === 'string') {
            const absoluteUrl = maybeUrl.startsWith('http') ? maybeUrl : `${API_BASE}${maybeUrl}`;
            editor.AssetManager.add({ src: absoluteUrl });
          }
        });

        editorRef.current = editor;
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[Edit] GrapesJS init failed', err);
        }
        setLoadError('Editor failed to initialize');
      }
    })();
  }, [authChecked, loading, rawContent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const editor = editorRef.current;
    if (!editor) {
      alert('Editor not ready yet. Please wait a moment and try again.');
      return;
    }
    const html = editor?.getHtml?.() || '';
    const css = editor?.getCss?.() || '';
    const content = `<style>${css}</style>${html}`;

    const baseForPut = API_BASE.replace(/\/+$/, '');
    const candidates = Array.from(new Set([
      `${baseForPut}/api/newsletters/${id}`,
      `/api/newsletters/${id}`
    ]));
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[Edit] save candidates', candidates);
    }

    let ok = false;
    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ ...form, content }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        ok = true;
        break;
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[Edit] save failed', url, err);
        }
        // try next
      }
    }
    if (!ok) {
      alert('Failed to save changes. Please check API connectivity.');
      return;
    }
    router.push('/admin/dashboard');
  };

  if (!authChecked) return null;
  if (loading) return <div className="max-w-6xl mx-auto p-6">Loading editor...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white text-black">
      <h1 className="text-2xl font-bold mb-4">Edit Newsletter</h1>
      {loadError && (
        <div className="mb-4 px-3 py-2 rounded border border-red-300 text-red-700 bg-red-50">
          {loadError}. Please ensure the API is reachable. If you are running everything on one Next.js app, remove NEXT_PUBLIC_API_BASE_URL or set it to your app origin.
        </div>
      )}
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="w-full border border-[#8B4513]/30 p-2 rounded" name="title" placeholder="Title" value={form.title} onChange={handleChange} />
          <input className="w-full border border-[#8B4513]/30 p-2 rounded" name="author" placeholder="Author" value={form.author} onChange={handleChange} />
          <input className="w-full border border-[#8B4513]/30 p-2 rounded" name="description" placeholder="Short description" value={form.description} onChange={handleChange} />
        </div>
        <div className="border border-[#8B4513]/30 rounded">
          <div ref={editorElRef} />
        </div>
        <div className="flex justify-end gap-3">
          <button type="submit" className="text-black px-4 py-2 rounded bg-gradient-to-r from-[#FFD700] via-[#FF6F00] to-[#32CD32] hover:to-[#32CD32]">Save Changes</button>
        </div>
      </form>
    </div>
  );
}
