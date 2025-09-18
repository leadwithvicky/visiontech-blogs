import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Subscriber } from '../../../../../lib/newsletterBackend';
export const runtime = 'nodejs';

// GET for email links -> mark unsubscribed and return HTML (unchanged)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    await connectDB();
    const { token } = await params;
    const subscriber = await Subscriber.findOne({ unsubscribeToken: token });
    if (!subscriber) {
      return new NextResponse('<h1>Invalid unsubscribe link</h1>', { status: 404, headers: { 'Content-Type': 'text/html' } });
    }
    subscriber.status = 'unsubscribed';
    await subscriber.save();
    return new NextResponse('<h1>Successfully unsubscribed</h1>', { headers: { 'Content-Type': 'text/html' } });
  } catch (error) {
    console.error('Unsubscribe GET error:', error);
    return new NextResponse('<h1>Server error</h1>', { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
}

// POST mark unsubscribed (unchanged)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    await connectDB();
    const { token } = await params;
    const subscriber = await Subscriber.findOne({ unsubscribeToken: token });
    if (!subscriber) return NextResponse.json({ message: 'Invalid unsubscribe link' }, { status: 404 });
    subscriber.status = 'unsubscribed';
    await subscriber.save();
    return NextResponse.json({ message: 'Successfully unsubscribed' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Server error', error: errorMessage }, { status: 500 });
  }
}

// DELETE remove from DB (unchanged)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    await connectDB();
    const { token } = await params;
    const deleted = await Subscriber.findOneAndDelete({ unsubscribeToken: token });
    if (!deleted) return NextResponse.json({ message: 'Invalid unsubscribe link' }, { status: 404 });
    return NextResponse.json({ message: 'You have been unsubscribed and removed from our mailing list.' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Server error', error: errorMessage }, { status: 500 });
  }
}
