'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Editor } from 'grapesjs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function CreateNewsletterPage() {
  const [form, setForm] = useState({ title: '', description: '', author: '', imageUrl: '' });
  const [uploading, setUploading] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const editorElRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Client-side auth guard: require token, else redirect to login
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!t) {
      router.replace('/admin');
      return;
    }
    setToken(t);
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    if (initialized.current) return;
    initialized.current = true;
    let editor: Editor;
    (async () => {
      // Ensure GrapesJS CSS is loaded at runtime to avoid Next/Turbopack CSS parsing issues
      const id = 'grapesjs-css';
      if (typeof document !== 'undefined' && !document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/grapesjs/dist/css/grapes.min.css';
        document.head.appendChild(link);
      }
      const grapesjs = (await import('grapesjs')).default;
      editor = grapesjs.init({
        container: editorElRef.current!,
        height: '70vh',
        fromElement: false,
        storageManager: false,
        assetManager: {
          upload: `${API_BASE}/api/uploads`,
          uploadName: 'image',
        },
        styleManager: {
          sectors: [
            {
              name: 'Typography',
              open: true,
              buildProps: ['font-family', 'font-size', 'font-weight', 'color', 'line-height', 'letter-spacing', 'text-align'],
            },
            { name: 'Background', buildProps: ['background-color', 'border-radius'] },
            { name: 'Decorations', buildProps: ['opacity', 'box-shadow', 'border', 'border-width', 'border-color'] },
          ],
        },
        blockManager: {
          blocks: [
            { id: 'section', label: 'Section', content: '<section style="padding:20px"></section>' },
            { id: 'text', label: 'Text', content: '<p>Write something...</p>' },
            { id: 'image', label: 'Image', content: '<img src="" style="max-width:100%"/>' },
            { id: 'link', label: 'Link', content: '<a href="#">A link</a>' },
            { id: 'two-cols', label: '2 Columns', content: '<div class="row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="cell">Left</div><div class="cell">Right</div></div>' },
          ],
        },
      });

      // Allow ctrl/cmd-click on links inside canvas to open in new tab (keeps editing UX)
      editor.on('component:click', (mdl: unknown, view: unknown, ev: unknown) => {
        try {
          const href = (mdl as { getAttributes?: () => { href?: string } })?.getAttributes?.()?.href;
          if (href && ((ev as { ctrlKey?: boolean })?.ctrlKey || (ev as { metaKey?: boolean })?.metaKey)) window.open(href, '_blank');
        } catch {}
      });
      // Custom upload handling to accept backend response { url: '/uploads/..' }
      editor.on('asset:upload:response', (res: unknown) => {
        const url = (res as { url?: string })?.url;
        if (url) {
          const absoluteUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
          editor.AssetManager.add({ src: absoluteUrl });
        }
      });

      editorRef.current = editor;
    })();

    return () => {
      try { editor?.destroy?.(); } catch {}
      initialized.current = false;
    };
  }, [authChecked]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const data = new FormData();
    data.append('image', file);
    const res = await fetch(`${API_BASE}/api/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: data,
    });
    const json = await res.json();
    const absoluteUrl = json.url?.startsWith('http') ? json.url : `${API_BASE}${json.url || ''}`;
    setForm(prev => ({ ...prev, imageUrl: absoluteUrl }));
    setUploading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const editor = editorRef.current;
    const html = editor?.getHtml?.() || '';
    const css = editor?.getCss?.() || '';
    const content = `<style>${css}</style>${html}`;

    await fetch(`${API_BASE}/api/newsletters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...form, content }),
    });
    window.location.href = '/admin/dashboard';
  };

  const preview = () => {
    try {
      const editor = editorRef.current;
      const html = editor?.getHtml?.() || '';
      const css = editor?.getCss?.() || '';
      const content = `<style>${css}</style>${html}`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(content); w.document.close(); }
    } catch {}
  };

  if (!authChecked) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white text-black">
      <h1 className="text-2xl font-bold mb-4">Create Newsletter (Visual Editor)</h1>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="w-full border border-[#8B4513]/30 p-2 rounded" name="title" placeholder="Title" onChange={handleChange} />
          <input className="w-full border border-[#8B4513]/30 p-2 rounded" name="author" placeholder="Author" onChange={handleChange} />
          <input className="w-full border border-[#8B4513]/30 p-2 rounded" name="description" placeholder="Short description" onChange={handleChange} />
        </div>

        <div className="space-y-2">
          <label className="block text-sm">Cover Image (used as thumbnail)</label>
          <input type="file" accept="image/*" onChange={handleImage} />
          {uploading ? <p>Uploading...</p> : form.imageUrl && <Image src={form.imageUrl} alt="preview" width={400} height={160} className="max-h-40 rounded" />}
        </div>

        <div className="border border-[#8B4513]/30 rounded">
          <div ref={editorElRef} />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={preview} className="px-4 py-2 rounded border border-[#8B4513]/30 text-black">Preview</button>
          <button type="submit" className="text-black px-4 py-2 rounded bg-gradient-to-r from-[#FFD700] via-[#FF6F00] to-[#32CD32] hover:to-[#32CD32]">Save</button>
        </div>
      </form>
    </div>
  );
}
