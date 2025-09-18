// Centralized backend utilities for Next.js API routes
// - Mongoose connection singleton
// - Models: Subscriber, Newsletter (mirrors existing schemas)
// - Auth: requireAuth() to verify JWT from Authorization header
// - Email: sendNewsletter identical behavior to existing emailService

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import jwtLib from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
// SendGrid removed; using nodemailer only

// ====== DB CONNECTION ======
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.warn('MONGO_URI is not set in environment');
}

let cached = global.__mongoose_conn;
if (!cached) cached = global.__mongoose_conn = { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI, {
      bufferCommands: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// ====== MODELS ======
const SubscriberSchema = new mongoose.Schema({
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

const NewsletterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  content: { type: String, default: '' },
  author: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  imageUrl: { type: String, default: '' }
});

export const Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', SubscriberSchema);
export const Newsletter = mongoose.models.Newsletter || mongoose.model('Newsletter', NewsletterSchema);

// ====== AUTH (mirror middleware/auth.js) ======
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export function requireAuth(headers) {
  const header = headers.get('authorization') || headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.substring(7) : null;
  if (!token) {
    return { ok: false, error: { status: 401, message: 'No token provided' } };
  }
  try {
    if (!jwtLib) throw new Error('JWT library not available');
    const decoded = jwtLib.verify(token, JWT_SECRET);
    return { ok: true, user: decoded };
  } catch (err) {
    const msg = err && err.message ? err.message : 'Invalid token';
    const status = msg === 'JWT library not available' ? 500 : 401;
    return { ok: false, error: { status, message: msg } };
  }
}

// ====== EMAIL (mirror services/emailService.js behavior) ======
class EmailService {
  constructor() {
    this.useSendGrid = false;
    this.transporter = null;
    this.initialize();
  }
  initialize() {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
    }
  }
  async sendNewsletter(newsletter, subscribers) {
    const results = [];
    for (const subscriber of subscribers) {
      try {
        const emailData = {
          to: subscriber.email,
          from: process.env.FROM_EMAIL || 'noreply@visiontech.com',
          subject: newsletter.title,
          html: this.generateEmailHTML(newsletter, subscriber),
          text: this.generateEmailText(newsletter)
        };
        let result;
        if (this.transporter) {
          result = await this.transporter.sendMail(emailData);
        } else {
          throw new Error('No email transporter configured');
        }
        results.push({ email: subscriber.email, success: true, messageId: result.messageId || 'sent' });
      } catch (error) {
        results.push({ email: subscriber.email, success: false, error: error.message });
      }
    }
    return results;
  }
  generateEmailHTML(newsletter, subscriber) {
    const frontendUrl = process.env.FRONTEND_URL;
    const backendUrl = process.env.BACKEND_URL;
    const homepageLink = frontendUrl ? `${frontendUrl}/?token=${subscriber.unsubscribeToken}` : `${backendUrl}`;
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
  generateEmailText(newsletter) {
    return `${newsletter.title}\n\n${newsletter.description || ''}\n\n${newsletter.content}`;
  }
}

export const emailService = new EmailService();
