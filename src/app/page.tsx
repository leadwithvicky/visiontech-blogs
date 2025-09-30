'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// Simple canvas-based particles background (no extra CSS needed)
function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; c: string }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    const colors = ['#FFD700', '#FF6F00', '#32CD32', '#556B2F', '#8B4513'];

    const init = () => {
      particlesRef.current = Array.from({ length: 60 }).map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: 1.2 + Math.random() * 2.5,
        c: colors[Math.floor(Math.random() * colors.length)],
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c + 'AA';
        ctx.fill();
      }
      // connective lines (subtle)
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const a = particlesRef.current[i];
          const b = particlesRef.current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < 120) {
            const alpha = Math.max(0, 1 - d / 120) * 0.15;
            ctx.strokeStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };

    resize();
    init();
    draw();
    const ro = new ResizeObserver(() => {
      resize();
      init();
    });
    ro.observe(canvas);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    fromRef.current = display;
    const from = fromRef.current;
    let raf: number;
    const start = performance.now();
    const duration = 800;
    const to = value;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, display]);
  return <span>{display.toLocaleString()}</span>;
}

type Newsletter = {
  _id: string;
  title: string;
  description?: string;
  content?: string;
  date?: string;
  imageUrl?: string;
};

type Stats = { total?: number; active?: number; unsubscribed?: number; pending?: number };

function getCategory(n: Newsletter): string {
  const text = `${n.title} ${n.description ?? ''} ${n.content ?? ''}`.toLowerCase();
  if (/ai|ml|gpt|neural|model/.test(text)) return 'AI';
  if (/cloud|serverless|kubernetes|aws|gcp|azure/.test(text)) return 'Cloud';
  if (/devops|ci\/?cd|pipeline|docker/.test(text)) return 'DevOps';
  if (/security|auth|jwt|encryption|privacy/.test(text)) return 'Security';
  return 'General';
}

function UnsubscribeHandler() {
  const searchParams = useSearchParams();
  const pendingToken = searchParams.get('token');
  const [unsubState, setUnsubState] = useState<{ status: 'idle'|'ask'|'working'|'done'|'error'; msg?: string }>({ status: 'idle' });

  const confirmUnsubscribe = async () => {
    if (!pendingToken) return;
    const userConfirmed = window.confirm('Are you sure you want to unsubscribe?');
    if (!userConfirmed) return;
    try {
      setUnsubState({ status: 'working' });
      const res = await fetch(`${API_BASE}/api/subscribers/unsubscribe/${pendingToken}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to unsubscribe');
      setUnsubState({ status: 'done', msg: data.message || 'You have been unsubscribed.' });
    } catch (err) {
      setUnsubState({
        status: 'error',
        msg:
          err instanceof Error
            ? err.message || 'Unsubscribe failed'
            : 'Unsubscribe failed',
      });
    }
  };

  if (!pendingToken) return null;

  return (
    <div className="mt-4 p-3 rounded-xl bg-white/80 border border-[#8B4513]/30 max-w-xl">
      {unsubState.status === 'done' ? (
        <div className="text-green-700 text-sm font-medium">{unsubState.msg}</div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="text-sm">This link allows you to unsubscribe from our mailing list.</div>
          <button
            onClick={confirmUnsubscribe}
            disabled={unsubState.status === 'working'}
            className="px-4 py-2 rounded-full text-white bg-red-600 hover:bg-red-700 disabled:opacity-70"
          >
            {unsubState.status === 'working' ? 'Processing…' : 'Unsubscribe'}
          </button>
        </div>
      )}
      {unsubState.status === 'error' && (
        <div className="text-red-600 text-sm mt-2">{unsubState.msg}</div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({});
  const [filter, setFilter] = useState<string>('All');
  const feedRef = useRef<HTMLDivElement | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);

  useEffect(() => {
    (async () => {
      try {
        const [nRes, sRes] = await Promise.all([
          fetch(`${API_BASE}/api/newsletters`, { cache: 'no-store' }),
          fetch(`${API_BASE}/api/subscribers/stats`, { cache: 'no-store' }),
        ]);
        const n = await nRes.json();
        const s = await sRes.json();
        setNewsletters(Array.isArray(n) ? n : []);
        setStats(s || {});
      } catch (e) {
        setNewsletters([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categorized = useMemo(() =>
    newsletters.map(n => ({ ...n, _cat: getCategory(n) })), [newsletters]
  );

  const filtered = useMemo(() =>
    filter === 'All' ? categorized : categorized.filter(n => n._cat === filter), [categorized, filter]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visible = filtered.slice(startIndex, endIndex);

  const scrollToFeed = () => feedRef.current?.scrollIntoView({ behavior: 'smooth' });

  const isNew = (n: Newsletter) => {
    if (!n.date) return false;
    const dt = new Date(n.date).getTime();
    return Date.now() - dt < 1000 * 60 * 60 * 24 * 7; // 7 days
  };

  const isTrending = (n: Newsletter) => /ai|ml|gpt|cloud|security/i.test(`${n.title} ${n.description}` || '');

  // Subscribe inline form
  const [subEmail, setSubEmail] = useState('');
  const [subMsg, setSubMsg] = useState<string | null>(null);
  const [subOk, setSubOk] = useState<boolean | null>(null);
  const submitSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubMsg(null);
    setSubOk(null);
    try {
      const res = await fetch(`${API_BASE}/api/subscribers/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Subscribe failed');
      setSubOk(true);
      setSubMsg('Subscribed! Welcome aboard.');
      setSubEmail('');
    } catch (err) {
      setSubOk(false);
      if (err instanceof Error) {
        setSubMsg(err.message || 'Subscribe failed');
      } else {
        setSubMsg('Subscribe failed');
      }
    }
  };

  // Scroll-triggered animations for cards
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0', 'rotate-0');
          }
        });
      },
      { threshold: 0.2 }
    );
    cardsRef.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [visible]);

  const categories = [
    { name: 'All', icon: '📰' },
    { name: 'AI', icon: '🤖' },
    { name: 'Cloud', icon: '☁️' },
    { name: 'DevOps', icon: '⚙️' },
    { name: 'Security', icon: '🔒' },
    { name: 'General', icon: '💡' }
  ];

  return (
    <div className="bg-[#FFF8E1] text-black">
      {/* HERO */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <ParticlesCanvas />
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/25 via-[#FF6F00]/25 to-[#32CD32]/25" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 w-full">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight">
              <span className="block text-transparent bg-clip-text bg-black">
                Explore the Future
              </span>
              <span className="block mt-2 text-black/90">of Tech with VisionTech!</span>
            </h1>
          </div>

          <p className="mt-6 max-w-2xl text-lg md:text-xl opacity-90 leading-relaxed">
            Bright, energetic insights. Curated weekly. Join thousands of innovators.
          </p>

          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={scrollToFeed}
              className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-black
                         bg-gradient-to-r from-[#FFD700] via-[#FF6F00] to-[#32CD32] hover:to-[#32CD32]
                         transition-transform duration-300 hover:-translate-y-0.5 shadow-lg"
            >
              Subscribe Now
            </button>
            <div className="text-sm opacity-80">
              <span className="font-semibold">Subscribers: </span>
              <AnimatedNumber value={Number(stats?.active || 0)} />
            </div>
          </div>

          {/* Inline Unsubscribe CTA if token present */}
          <Suspense fallback={null}>
            <UnsubscribeHandler />
          </Suspense>

          {/* Enhanced Subscribe Form */}
          <div className="mt-8 max-w-2xl">
            <div className="bg-white/90 backdrop-blur rounded-2xl p-8 shadow-xl border border-white/50">
              <h3 className="text-2xl font-bold mb-2">Join Our Community</h3>
              <p className="text-gray-600 mb-6">Get weekly insights delivered to your inbox</p>
              
              <form onSubmit={submitSubscribe} className="space-y-4">
                <div className="flex gap-3">
                  <input
                    type="email"
                    required
                    value={subEmail}
                    onChange={(e) => setSubEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF6F00] focus:ring-2 focus:ring-[#FF6F00]/20 outline-none transition-all"
                  />
                  <button 
                    type="submit" 
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FF6F00] text-black font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5"
                  >
                    Subscribe
                  </button>
                </div>
                
                {subMsg && (
                  <div className={`p-3 rounded-lg text-sm font-medium ${
                    subOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {subMsg}
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  No spam, unsubscribe at any time. We respect your privacy.
                </p>
              </form>
            </div>
          </div>

          {/* Social Proof */}
          {/* <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 mb-4">Trusted by tech professionals worldwide</p>
            <div className="flex justify-center items-center gap-8 opacity-60">
              <span className="text-sm font-medium">Google</span>
              <span className="text-sm font-medium">Microsoft</span>
              <span className="text-sm font-medium">Apple</span>
              <span className="text-sm font-medium">Meta</span>
            </div>
          </div> */}

          {/* Scroll indicator */}
          <div className="mt-12 flex justify-center">
            <div onClick={scrollToFeed} className="cursor-pointer flex flex-col items-center opacity-90">
              <div className="w-1.5 h-8 rounded-full bg-white/60 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-white rounded-full animate-bounce" />
              </div>
              <span className="text-xs mt-2">scroll</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED NEWSLETTER SECTION */}
      {!loading && newsletters.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Latest Tech Insights</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Stay ahead with our curated selection of the most important tech developments, 
              AI breakthroughs, and industry trends.
            </p>
          </div>
          
          <div className="mb-16">
            <h3 className="text-xl font-semibold mb-6">Featured This Week</h3>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <Image
                  src={newsletters[0].imageUrl || '/next.svg'}
                  alt={newsletters[0].title}
                  width={400}
                  height={256}
                  className="w-full h-64 object-cover"
                />
              </div>
              <div>
                <span className="text-sm px-3 py-1.5 rounded-full bg-[#FF6F00] text-white font-medium">
                  {getCategory(newsletters[0])}
                </span>
                <h4 className="text-2xl font-bold mt-3 mb-3">{newsletters[0].title}</h4>
                <p className="text-gray-600 mb-4">{newsletters[0].description}</p>
                <Link 
                  href={`/newsletter/${newsletters[0]._id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FF6F00] text-black font-semibold hover:shadow-lg transition-all"
                >
                  Read Full Article
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FEED CONTROLS */}
      <section ref={feedRef} className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl font-bold">Latest Newsletters</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => { setFilter(cat.name); setCurrentPage(1); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                  filter === cat.name
                    ? 'text-black bg-gradient-to-r from-[#FFD700] via-[#FF6F00] to-[#32CD32] shadow-lg'
                    : 'bg-white/80 backdrop-blur hover:bg-white text-gray-700 border border-[#8B4513]/30 hover:shadow-md'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* FEED GRID */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/60 backdrop-blur border border-white/50 shadow-sm overflow-hidden">
              <div className="aspect-[16/9] bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
              <div className="p-6 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
                <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
              </div>
            </div>
          ))}

          {!loading && visible.map((n, idx) => (
            <div
              key={n._id}
              ref={el => { cardsRef.current[idx] = el; }}
              className="opacity-0 translate-y-6 rotate-[0.5deg] transition-all duration-700"
            >
              <Link
                href={`/newsletter/${n._id}`}
                className="group block rounded-2xl overflow-hidden bg-white/80 backdrop-blur border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-[400px] flex flex-col"
              >
                <div className="relative aspect-[16/9] overflow-hidden flex-shrink-0">
                  <Image
                    src={n.imageUrl || '/next.svg'}
                    alt={n.title}
                    width={400}
                    height={225}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    {isNew(n) && (
                      <span className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-full bg-yellow-400 text-black font-semibold shadow-lg">
                        New
                      </span>
                    )}
                    {isTrending(n) && (
                      <span className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-full bg-[#FF6F00] text-black font-semibold shadow-lg">
                        Trending
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-6 flex flex-col justify-between flex-grow overflow-hidden">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FF6F00] text-black font-semibold">
                        {getCategory(n)}
                      </span>
                      {n.date && (
                        <span className="text-xs text-gray-500 font-medium">
                          {new Date(n.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{n.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                      {n.description || (typeof n.content === 'string' ? 
                        `${n.content.replace(/<[^>]+>/g, '').slice(0, 120)}...` : 
                        'No description available'
                      )}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2">
              {/* Previous Page */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg font-medium text-gray-600 bg-white/80 border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                ← Previous
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-[#FFD700] to-[#FF6F00] text-black shadow-lg'
                        : 'text-gray-600 bg-white/80 border border-gray-200 hover:bg-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              {/* Next Page */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg font-medium text-gray-600 bg-white/80 border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}
        
        {/* Results Info */}
        {!loading && (
          <div className="text-center mt-4 text-sm p-5 text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length} newsletters
            {filter !== 'All' && ` in ${filter}`}
          </div>
        )}
      </section>

      {/* FEATURED HORIZONTAL SCROLLER (mobile friendly) */}
      {!loading && filtered.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <h3 className="text-xl font-bold mb-3">Featured</h3>
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
            {filtered.slice(0, 8).map(n => (
              <Link
                key={n._id}
                href={`/newsletter/${n._id}`}
                className="snap-center min-w-[260px] rounded-2xl bg-white/70 backdrop-blur border border-white/50 shadow-sm hover:shadow-lg transition"
              >
                <div className="aspect-[16/9] overflow-hidden rounded-t-2xl">
                  <Image src={n.imageUrl || '/next.svg'} alt={n.title} width={260} height={146} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 inline-block mb-1">
                    {getCategory(n)}
                  </div>
                  <div className="font-semibold truncate">{n.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
