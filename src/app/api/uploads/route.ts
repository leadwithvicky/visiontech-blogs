import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary } from '../../../lib/cloudinary';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  console.log('Received upload request');
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'set' : 'not set');
  console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'set' : 'not set');
  console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'set' : 'not set');

  try {
    const form = await req.formData();
    console.log('Form data keys:', Array.from(form.keys()));
    const file = form.get('image') || form.get('image[]');
    if (file instanceof File) {
      console.log('File:', { name: file.name, size: file.size, type: file.type });
    } else {
      console.log('File is not a File object:', file);
    }
    if (!file || typeof file === 'string') {
      console.log('No valid file uploaded');
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Try to upload to Cloudinary
    try {
      const url = await uploadImageToCloudinary(buffer, file.name);
      console.log('Cloudinary upload success:', url);
      // Return the secure URL from Cloudinary
      return NextResponse.json({ url });
    } catch (cloudinaryError) {
      console.error('Cloudinary upload failed:', cloudinaryError);
      // Cloudinary failed, save locally
      const ext = path.extname(file.name);
      const base = path.basename(file.name, ext);
      const filename = `${base}-${Date.now()}${ext}`;
      const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
      const dir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, buffer);
      console.log('Local upload success:', `/uploads/${filename}`);
      return NextResponse.json({ url: `/uploads/${filename}` });
    }
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: 'Upload failed', error: err.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Upload failed', error: 'Unknown error' }, { status: 500 });
  }
}
