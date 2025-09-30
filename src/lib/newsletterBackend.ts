// Centralized backend utilities for Next.js API routes
// - Mongoose connection singleton
// - Models: Subscriber, Newsletter (mirrors existing schemas)
// - Auth: requireAuth() to verify JWT from Authorization header
// - Email: sendNewsletter identical behavior to existing emailService

import mongoose, { Document, Model } from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Types
interface SubscriberDoc extends Document {
  email: string;
  name: string;
  preferences: {
    categories: string[];
    frequency: 'daily' | 'weekly' | 'monthly';
  };
  status: 'active' | 'unsubscribed' | 'pending';
  unsubscribeToken: string;
  signupDate: Date;
  lastEngagement?: Date;
  engagementScore: number;
  ipAddress?: string;
  userAgent?: string;
}

interface NewsletterDoc extends Document {
  title: string;
  description: string;
  content: string;
  author: string;
  date: Date;
  imageUrl: string;
}

interface User {
  email?: string;
  // Add other user properties as needed
}

interface AuthResult {
  ok: boolean;
  user?: User;
  error?: { status: number; message: string };
}

interface EmailResult {
  email: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

// Environment variables
// Sanitize to remove hidden characters that can break MongoDB URI parsing (e.g., BOM, zero-width spaces)
const RAW_MONGO_URI = process.env.MONGO_URI;
const MONGO_URI = RAW_MONGO_URI
  ?.replace(/\u200B|\u200C|\u200D|\uFEFF/g, '') // zero-width chars
  ?.replace(/\n|\r/g, '') // stray newlines
  ?.trim();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@visiontech.com';
const FRONTEND_URL = process.env.FRONTEND_URL;
const BACKEND_URL = process.env.BACKEND_URL;

if (!MONGO_URI) {
  console.warn('MONGO_URI is not set in environment');
}

// Global type declaration for mongoose connection
declare global {
  var __mongoose_conn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

// ====== DB CONNECTION ======
const cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = global.__mongoose_conn || { conn: null, promise: null };

if (!global.__mongoose_conn) {
  global.__mongoose_conn = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    // Validate URI early to provide a clearer error than MongoParseError
    const isValidUri = typeof MONGO_URI === 'string' && (MONGO_URI.startsWith('mongodb://') || MONGO_URI.startsWith('mongodb+srv://'));
    if (process.env.NODE_ENV !== 'production') {
      try {
        const scheme = typeof MONGO_URI === 'string' && MONGO_URI.includes('://') ? MONGO_URI.split('://')[0] : String(MONGO_URI);
        console.log('[DB] MONGO_URI scheme detected:', scheme);
      } catch {}
    }
    if (!isValidUri) {
      throw new Error('Invalid MONGO_URI: expected to start with "mongodb://" or "mongodb+srv://". Check your environment (.env.local) and restart the server.');
    }

    cached.promise = mongoose.connect(MONGO_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// ====== MODELS ======
const SubscriberSchema = new mongoose.Schema<SubscriberDoc>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  preferences: {
    categories: [{ type: String }],
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly' }
  },
  status: { type: String, enum: ['active', 'unsubscribed', 'pending'], default: 'pending' },
  unsubscribeToken: { type: String, unique: true },
  signupDate: { type: Date, default: Date.now },
  lastEngagement: { type: Date },
  engagementScore: { type: Number, default: 0 },
  ipAddress: { type: String },
  userAgent: { type: String }
});

SubscriberSchema.pre('save', function(next) {
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = crypto.randomBytes(32).toString('hex');
  }
  next();
});

const NewsletterSchema = new mongoose.Schema<NewsletterDoc>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  content: { type: String, default: '' },
  author: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  imageUrl: { type: String, default: '' }
});

export const Subscriber: Model<SubscriberDoc> = mongoose.models.Subscriber || mongoose.model('Subscriber', SubscriberSchema);
export const Newsletter: Model<NewsletterDoc> = mongoose.models.Newsletter || mongoose.model('Newsletter', NewsletterSchema);

// ====== AUTH ======
export function requireAuth(headers: Headers): AuthResult {
  const header = headers.get('authorization') || headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.substring(7) : null;
  if (!token) {
    return { ok: false, error: { status: 401, message: 'No token provided' } };
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'string') {
      return { ok: false, error: { status: 401, message: 'Invalid token payload' } };
    }
    // Extract user info from decoded JWT payload
    const user: User = {};
    if (typeof decoded === 'object' && decoded !== null) {
      const payload = decoded as jwt.JwtPayload;
      if (typeof payload.email === 'string') {
        user.email = payload.email;
      }
    }
    return { ok: true, user };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid token';
    const status = msg === 'jwt malformed' || msg === 'invalid signature' ? 401 : 500;
    return { ok: false, error: { status, message: msg } };
  }
}

// ====== EMAIL ======
class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (EMAIL_USER && EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
      });
    }
  }

  async sendNewsletter(newsletter: NewsletterDoc, subscribers: SubscriberDoc[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    for (const subscriber of subscribers) {
      try {
        const emailData = {
          to: subscriber.email,
          from: FROM_EMAIL,
          subject: newsletter.title,
          html: this.generateEmailHTML(newsletter, subscriber),
          text: this.generateEmailText(newsletter)
        };
        if (this.transporter) {
          const result = await this.transporter.sendMail(emailData);
          results.push({ email: subscriber.email, success: true, messageId: result.messageId });
        } else {
          throw new Error('No email transporter configured');
        }
      } catch (error) {
        results.push({
          email: subscriber.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown email error'
        });
      }
    }
    return results;
  }

  private generateEmailHTML(newsletter: NewsletterDoc, subscriber: SubscriberDoc): string {
    const homepageLink = FRONTEND_URL ? `${FRONTEND_URL}/?token=${subscriber.unsubscribeToken}` : `${BACKEND_URL}`;
    const greeting = subscriber.name ? `Hi ${subscriber.name},` : 'Hello,';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${newsletter.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${newsletter.title}</h1>
            ${newsletter.description ? `<p>${newsletter.description}</p>` : ''}
          </div>
          <div class="content">
            <p>${greeting}</p>
            ${newsletter.content}
            ${newsletter.imageUrl ? `<img src="${newsletter.imageUrl}" alt="${newsletter.title}" style="max-width: 100%; height: auto;">` : ''}
          </div>
          <div class="footer">
            <p>You're receiving this because you subscribed to VisionTech Newsletter.</p>
            <p><a href="${homepageLink}">Unsubscribe</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateEmailText(newsletter: NewsletterDoc): string {
    return `${newsletter.title}\n\n${newsletter.description || ''}\n\n${newsletter.content}`;
  }
}

export const emailService = new EmailService();
