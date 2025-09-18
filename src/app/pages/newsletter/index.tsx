// Converted to TypeScript TSX
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Newsletter {
  _id: string;
  title: string;
  subtitle?: string;
  content: string;
}

interface NewsletterListProps {
  newsletters: Newsletter[];
}

const NewsletterList: React.FC<NewsletterListProps> = ({ newsletters }) => {
  const [email, setEmail] = useState<string>('');

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Add subscribe logic here
    alert('Subscribe functionality not implemented yet');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Newsletters</h1>
      {newsletters.length === 0 && <p>No newsletters available.</p>}

      <ul>
        <form onSubmit={handleSubscribe} style={{ marginTop: '20px' }}>
          <input
            type="email"
            placeholder="Enter Your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Subscribe</button>
        </form>
        {newsletters.map((item) => (
          <li key={item._id} style={{ marginBottom: '10px' }}>
            <Link href={`/newsletter/${item._id}`}>
              <strong>{item.title}</strong> – {item.subtitle || (typeof item.content === 'string' ? item.content.slice(0, 100) + '...' : '')}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Fetch newsletters from backend
export async function getServerSideProps() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const res = await fetch(`${API_BASE}/api/newsletters`);
  const data = await res.json();

  return {
    props: {
      newsletters: data || [],
    },
  };
}

export default NewsletterList;
