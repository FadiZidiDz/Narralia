import axios from 'axios';

const DEFAULT_PROVIDER = 'pollinations';

function safePrompt(prompt) {
  return (prompt || 'children book friendly forest adventure colorful').trim().slice(0, 500);
}

function pollinationsApiKey() {
  return (process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_TOKEN || '').trim();
}

function parseJsonErrorBuffer(buf) {
  try {
    const j = JSON.parse(buf.toString('utf8'));
    return j.error?.message || j.error || j.message || null;
  } catch {
    return null;
  }
}

function isImageBuffer(buf, contentType = '') {
  if (!buf || buf.length < 500) return false;
  if (contentType.includes('image/')) return true;
  // PNG, JPEG, WEBP magic bytes
  if (buf[0] === 0x89 && buf[1] === 0x50) return true;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf[0] === 0x52 && buf[1] === 0x49) return true; // RIFF webp
  return buf[0] !== 0x7b && buf[0] !== 0x3c; // not JSON/HTML
}

/**
 * Hosted text-to-image for student illustrations.
 * Pollinations (gen.pollinations.ai + optional API key) or Hugging Face (IMAGE_GEN_PROVIDER=hf + HF_TOKEN).
 */
export const fetchIllustrationImageBuffer = async (prompt) => {
  const safe = safePrompt(prompt);
  const provider = (process.env.IMAGE_GEN_PROVIDER || DEFAULT_PROVIDER).toLowerCase();

  if (provider === 'hf') {
    return fetchFromHuggingFace(safe);
  }

  try {
    return await fetchFromPollinations(safe);
  } catch (pollErr) {
    const hfToken = (process.env.HF_TOKEN || '').trim();
    if (hfToken) {
      console.warn('Pollinations failed, trying Hugging Face fallback:', pollErr.message);
      return fetchFromHuggingFace(safe);
    }
    throw pollErr;
  }
};

/** @deprecated Prefer server-side fetch; kept for reference */
export function buildPollinationsImageUrl(prompt) {
  const safe = safePrompt(prompt);
  const encoded = encodeURIComponent(safe);
  const model = process.env.POLLINATIONS_IMAGE_MODEL || 'flux';
  return `https://gen.pollinations.ai/image/${encoded}?model=${model}&width=768&height=768`;
}

async function requestImageUrl(url, { apiKey } = {}) {
  const headers = { Accept: 'image/png,image/jpeg,image/webp,*/*' };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const res = await axios.get(url, {
    headers,
    responseType: 'arraybuffer',
    timeout: 120000,
    validateStatus: () => true,
  });

  const buf = Buffer.from(res.data || []);
  const ct = res.headers['content-type'] || '';

  if (isImageBuffer(buf, ct)) {
    return buf;
  }

  const apiMsg = parseJsonErrorBuffer(buf);
  const detail = apiMsg || `HTTP ${res.status}`;
  throw new Error(detail);
}

async function fetchFromPollinations(prompt) {
  const safe = safePrompt(prompt);
  const encoded = encodeURIComponent(safe);
  const apiKey = pollinationsApiKey();
  const model = process.env.POLLINATIONS_IMAGE_MODEL || 'flux';

  const attempts = [];

  // Current Pollinations API (requires API key since 2026)
  const genBase = `https://gen.pollinations.ai/image/${encoded}?model=${model}&width=768&height=768`;
  if (apiKey) {
    attempts.push(() => requestImageUrl(genBase, { apiKey }));
    attempts.push(() => requestImageUrl(`${genBase}&key=${encodeURIComponent(apiKey)}`, {}));
  } else {
    attempts.push(() => requestImageUrl(genBase, {}));
  }

  // Legacy host — often 402 queue-full without payment; try once if no key
  const legacyUrl = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&nologo=true`;
  attempts.push(() => requestImageUrl(legacyUrl, {}));

  let lastErr;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (e) {
      lastErr = e;
    }
  }

  const hint = apiKey
    ? 'Check POLLINATIONS_API_KEY at enter.pollinations.ai, or set HF_TOKEN for Hugging Face fallback.'
    : 'Pollinations now requires a free API key: sign up at https://enter.pollinations.ai and add POLLINATIONS_API_KEY to .env — or set IMAGE_GEN_PROVIDER=hf with HF_TOKEN.';

  throw new Error(
    `${lastErr?.message || 'Image service unavailable'}. ${hint}`
  );
}

async function postHfInferenceImage(apiUrl, token, prompt) {
  const res = await axios.post(
    apiUrl,
    { inputs: prompt },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'image/png,image/jpeg,*/*',
      },
      responseType: 'arraybuffer',
      timeout: 120000,
      validateStatus: () => true,
    }
  );

  if (res.status === 503) {
    throw new Error('Hugging Face model is loading. Wait a minute and try again.');
  }

  const buf = Buffer.from(res.data);
  const ct = res.headers['content-type'] || '';
  if (ct.includes('application/json') || (buf.length < 500 && buf[0] === 0x7b)) {
    let msg = 'Hugging Face image generation failed.';
    try {
      const j = JSON.parse(buf.toString('utf8'));
      msg = j.error || j.message || msg;
    } catch (_) {
      /* keep default msg */
    }
    throw new Error(msg);
  }

  if (res.status >= 400 || !res.data || buf.length < 500) {
    throw new Error(`Hugging Face image error (${res.status}).`);
  }

  return buf;
}

async function fetchFromHuggingFace(prompt) {
  const token = process.env.HF_TOKEN;
  if (!token) {
    throw new Error('HF_TOKEN is required when IMAGE_GEN_PROVIDER=hf');
  }

  const model =
    process.env.HF_IMAGE_MODEL ||
    'stabilityai/stable-diffusion-2-1';

  const baseOverride = (process.env.HF_INFERENCE_BASE_URL || '').trim().replace(/\/$/, '');
  const candidates = baseOverride
    ? [`${baseOverride}/${model}`]
    : [
        `https://router.huggingface.co/hf-inference/models/${model}`,
        `https://api-inference.huggingface.co/models/${model}`,
      ];

  let lastErr;
  for (const apiUrl of candidates) {
    try {
      return await postHfInferenceImage(apiUrl, token, prompt);
    } catch (e) {
      lastErr = e;
    }
  }

  throw new Error(
    `${lastErr?.message || 'Hugging Face image generation failed.'} Check HF_TOKEN, HF_IMAGE_MODEL, or set HF_INFERENCE_BASE_URL to your account's inference base.`
  );
}
