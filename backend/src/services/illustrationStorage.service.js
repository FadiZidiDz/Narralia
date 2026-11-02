/**
 * Where to persist student-generated illustrations (same story flow as before).
 *
 * The children-stories-main repo (OhanashiGPT-style) uses local Python/diffusers notebooks;
 * this Node app cannot execute those directly. Use:
 * - pollinations-url: Pollinations generates the image; the backend downloads it once and serves a
 *   short same-origin URL (/api/illustrations/public/...) so the browser always shows it (raw Pollinations URLs are often too long or blocked as img src).
 * - local-file: bytes saved under storage/illustrations (similar spirit to local outputs in that repo).
 * - cloudinary: previous behavior (teacher uploads can still use Cloudinary separately).
 */
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fetchIllustrationImageBuffer } from './imageGen.service.js';
import { uploadImage } from './cloudinary.service.js';

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'illustrations');

function storageMode() {
  // Default avoids Cloudinary for student illustrations (teacher uploads may still use Cloudinary).
  // Set ILLUSTRATION_STORAGE=cloudinary to upload generated images there instead.
  return (process.env.ILLUSTRATION_STORAGE || 'pollinations-url').toLowerCase();
}

async function savePngToDisk(buffer) {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const token = crypto.randomBytes(24).toString('hex');
  const filePath = path.join(STORAGE_DIR, `${token}.png`);
  await fs.writeFile(filePath, buffer);
  return `/api/illustrations/public/${token}.png`;
}

/**
 * @param {string} imagePrompt
 * @returns {Promise<{ url: string }>}
 */
export async function persistStudentIllustration(imagePrompt) {
  const mode = storageMode();

  if (mode === 'pollinations-url') {
    const buffer = await fetchIllustrationImageBuffer(imagePrompt);
    return { url: await savePngToDisk(buffer) };
  }

  if (mode === 'local-file') {
    const buffer = await fetchIllustrationImageBuffer(imagePrompt);
    return { url: await savePngToDisk(buffer) };
  }

  const buffer = await fetchIllustrationImageBuffer(imagePrompt);
  const uploaded = await uploadImage(buffer);
  return { url: uploaded.secure_url };
}
