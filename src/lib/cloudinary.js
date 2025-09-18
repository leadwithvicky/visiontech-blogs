import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

console.log('Configuring Cloudinary...');
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImageToCloudinary(imageBuffer, filename) {
  console.log('Starting Cloudinary upload for:', filename);
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'newsletter-images',
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload_stream error:', error);
            return reject(error);
          }
          console.log('Cloudinary upload_stream success:', result.secure_url);
          resolve(result);
        }
      );
      stream.end(imageBuffer);
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload failed in function:', error);
    throw error;
  }
}
