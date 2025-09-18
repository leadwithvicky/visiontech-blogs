// Converted to TypeScript TSX
import React, { useState } from 'react';
import Image from 'next/image';

interface Newsletter {
  title: string;
  date?: string;
  author?: string;
  description?: string;
  imageUrl?: string;
  content: string;
}

interface NewsletterDetailProps {
  newsletter: Newsletter | null;
  token?: string | null;
}

const NewsletterDetail: React.FC<NewsletterDetailProps> = ({ newsletter, token }) => {
  const [isUnsubscribing, setIsUnsubscribing] = useState<boolean>(false);
  const [isUnsubscribed, setIsUnsubscribed] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  if (!newsletter) {
    return <p>Newsletter not found.</p>;
  }

  const handleUnsubscribe = async () => {
    if (!token) return;
    try {
      setIsUnsubscribing(true);
      setMessage('');
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/subscribers/unsubscribe/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to unsubscribe');
      }
      const data = await res.json();
      setIsUnsubscribed(true);
      setMessage(data.message || 'Successfully unsubscribed');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(err.message || 'Failed to unsubscribe');
      } else {
        setMessage('Failed to unsubscribe');
      }
    } finally {
      setIsUnsubscribing(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1 className="text-3xl font-bold mb-2">{newsletter.title}</h1>
      <div className="text-sm text-gray-500 mb-4">
        {newsletter.date ? new Date(newsletter.date).toLocaleDateString() : ''}
        {newsletter.author ? ` • ${newsletter.author}` : ''}
      </div>
      <p className="text-gray-700 mb-6">{newsletter.description}</p>
      <div>
        {newsletter.imageUrl && (
          <Image
            src={newsletter.imageUrl && newsletter.imageUrl.startsWith('http') ? newsletter.imageUrl : '/next.svg'}
            alt={newsletter.title}
            width={800}
            height={450}
            className="mb-6 max-w-full rounded"
          />
        )}
        <div dangerouslySetInnerHTML={{ __html: newsletter.content }} />
      </div>

      {token && (
        <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
          {!isUnsubscribed ? (
            <button
              onClick={handleUnsubscribe}
              disabled={isUnsubscribing}
              style={{
                background: '#ef4444',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                border: 0,
                cursor: isUnsubscribing ? 'not-allowed' : 'pointer',
              }}
            >
              {isUnsubscribing ? 'Unsubscribing...' : 'Unsubscribe'}
            </button>
          ) : (
            <span style={{ color: '#16a34a' }}>You have unsubscribed.</span>
          )}
          {message && <div style={{ marginTop: 8 }}>{message}</div>}
        </div>
      )}
    </div>
  );
};

export async function getServerSideProps({ params, query }: { params: { id: string }; query: { token?: string } }) {
  const token = query?.token || null;
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const res = await fetch(`${API_BASE}/api/newsletters/${params.id}`);
  const data = await res.json();

  return {
    props: {
      newsletter: data || null,
      token,
    },
  };
}

export default NewsletterDetail;
