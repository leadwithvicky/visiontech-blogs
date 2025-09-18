import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Newsletter, Subscriber, requireAuth, emailService } from '../../../lib/newsletterBackend';
export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('[Newsletters] Connecting to database...');
    await connectDB();
    console.log('[Newsletters] Database connected, fetching newsletters...');
    
    const newsletters = await Newsletter.find().sort({ date: -1 });
    console.log('[Newsletters] Found', newsletters.length, 'newsletters');
    
    return NextResponse.json(newsletters);
  } catch (err) {
    console.error('[Newsletters] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ 
      message: 'Server Error', 
      error: message,
      stack: process.env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req.headers);
    if (!auth.ok) {
      const message = auth.error?.message || 'Unauthorized';
      const status = auth.error?.status || 401;
      return NextResponse.json({ message }, { status });
    }

    await connectDB();
    const body = await req.json();
    const { title, description, content, author, imageUrl } = body;
    if (!title) return NextResponse.json({ message: 'Title is required' }, { status: 400 });

    const created = await Newsletter.create({ title, description, content, author, imageUrl });

    ;(async () => {
      try {
        const subscribers = await Subscriber.find({ status: 'active' }, { email: 1, unsubscribeToken: 1, name: 1 });
        if (subscribers.length > 0) {
          await emailService.sendNewsletter(created, subscribers);
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown email error';
        console.error('Email send error:', errorMessage);
      }
    })();

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Server Error' }, { status: 500 });
  }
}
