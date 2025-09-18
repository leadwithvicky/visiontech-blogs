import { NextResponse } from 'next/server';
import { connectDB, Subscriber } from '../../../../lib/newsletterBackend';
export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('[Stats] Connecting to database...');
    await connectDB();
    console.log('[Stats] Database connected, counting documents...');
    
    const total = await Subscriber.countDocuments();
    const active = await Subscriber.countDocuments({ status: 'active' });
    const unsubscribed = await Subscriber.countDocuments({ status: 'unsubscribed' });
    const pending = await Subscriber.countDocuments({ status: 'pending' });
    
    console.log('[Stats] Counts:', { total, active, unsubscribed, pending });
    return NextResponse.json({ total, active, unsubscribed, pending });
  } catch (error) {
    console.error('[Stats] Error:', error);
    return NextResponse.json({ 
      message: 'Server error',
      error: error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Unknown error'),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
