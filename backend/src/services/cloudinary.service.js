import { v2 as cloudinary } from 'cloudinary';

function ensureCloudinaryConfig() {
  cloudinary.config({
    cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
    api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
    api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  });
}

/**
 * Uploads a buffer (from multer) to Cloudinary
 */
export const uploadImage = async (fileBuffer) => {
  ensureCloudinaryConfig();
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'narralia_stories' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Uploads a base64 string to Cloudinary (for generated assets)
 */
export const uploadBase64 = async (base64String, folder = 'submissions') => {
  ensureCloudinaryConfig();
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder: `narralia_${folder}`,
    });
    return result.secure_url;
  } catch (err) {
    console.error('Cloudinary Upload Error:', err.message);
    return null;
  }
};
