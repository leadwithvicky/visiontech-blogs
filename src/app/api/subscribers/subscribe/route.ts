import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Subscriber } from '../../../../lib/newsletterBackend';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, name = '' } = await req.json();
    if (!email) return NextResponse.json({ message: 'Email is required' }, { status: 400 });

    const existing = await Subscriber.findOne({ email });
    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ message: 'Already subscribed' }, { status: 400 });
      } else {
        existing.status = 'active';
        await existing.save();
        return NextResponse.json({ message: 'Subscription reactivated' });
      }
    }

    const created = await Subscriber.create({ email, name, status: 'active' });
    return NextResponse.json({ message: 'Successfully subscribed', subscriber: created }, { status: 201 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Unknown error');
    return NextResponse.json({ message: 'Server error', error: errMsg }, { status: 500 });
  }
}
