import express from 'express';
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';

const router = express.Router();

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'illustrations');

/**
 * Serve a locally stored illustration (unguessable hex token; no JWT on img tags).
 */
router.get('/public/:filename', (req, res) => {
  const { filename } = req.params;
  if (!/^[a-f0-9]{48}\.png$/i.test(filename)) {
    return res.status(400).end();
  }
  const token = filename.replace(/\.png$/i, '');
  const filePath = path.join(STORAGE_DIR, `${token}.png`);

  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) return res.status(404).end();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    createReadStream(filePath).pipe(res);
  });
});

export default router;
