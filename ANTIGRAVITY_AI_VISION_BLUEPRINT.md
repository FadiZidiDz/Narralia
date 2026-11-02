# 🚀 ANTIGRAVITY AI — Complete Developer Blueprint
## Every File. Every Line. Every Step.
### 100% Free Stack · Groq Vision (Llama 4 Scout) · No GPU Required · No Credit Card Ever

---

## WHAT THIS DOCUMENT IS

This is the **complete** Antigravity AI build document.
It contains every file written in full — every controller, every route, every React page, every hook, every config file.
You do not need Cursor, ChatGPT, or any other AI to fill in gaps.
Every line of code is here. Follow the phases in order.

---

## THE STACK AT A GLANCE
## THE STACK AT A GLANCE

| Layer | Technology | Cost |
|---|---|---|
| AI text (story, evaluation, hints) | Groq API — Llama 3.1 8B | FREE 14,400 req/day |
| AI image understanding | Groq API — Llama 4 Scout Vision | FREE included above |
| Grammar checking | LanguageTool Docker | FREE unlimited |
| Text to speech | Browser Web Speech API | FREE built-in |
| Database | MongoDB 7.0 Docker | FREE unlimited |
| Image storage | Cloudinary free tier | FREE 25GB |
| Backend | Node.js 20 + Express 5 | FREE |
| Frontend | React 18 + Vite + Tailwind | FREE |
| **Total** | | **$0.00/month** |

---

## THE 2 FREE API KEYS YOU NEED BEFORE STARTING

### Groq (ALL AI — text generation + image understanding)
1. Go to `https://console.groq.com`
2. Sign up — no credit card
3. Click API Keys → Create API Key
4. Copy key starting with `gsk_`
5. This one key handles everything — story generation, evaluation, hints, AND reading images

### Cloudinary (image storage — teacher uploads + student submissions)
1. Go to `https://cloudinary.com`
2. Sign up — no credit card
3. Dashboard → copy Cloud Name, API Key, API Secret

> **HuggingFace is no longer needed.** Image generation (text → image) has been
> replaced with image understanding (image → story continuation). Groq's Llama 4 Scout
> handles both text and vision with the same API key.

## Step 0.3 — Create `.env` File

Create this file at the root of `antigravity-ai/`:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

JWT_SECRET=antigravity_change_this_to_something_long_random_32chars
JWT_EXPIRES_IN=7d

MONGODB_URI=mongodb://mongodb:27017/antigravity_ai

# === GROQ API — handles ALL AI (text + vision) ===
# One key for everything. Get free at: https://console.groq.com
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.1-8b-instant
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct

# === CLOUDINARY — teacher image uploads + storage ===
# Free 25GB tier. Get at: https://cloudinary.com
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# === LANGUAGETOOL (self-hosted Docker — completely free) ===
LANGUAGETOOL_URL=http://languagetool:8010/v2

# === TTS (free — uses browser built-in) ===
TTS_PROVIDER=browser
```

> **Removed from previous version:** `HF_API_KEY` and `HF_IMAGE_MODEL`
> HuggingFace is no longer used anywhere in this project.


# PHASE 1 — DOCKER INFRASTRUCTURE

## Step 1.1 — Create `docker-compose.yml`

Create this file at `antigravity-ai/docker-compose.yml`:

```yaml
version: "3.9"

services:
  mongodb:
    image: mongo:7.0
    container_name: antigravity_mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - antigravity_net
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: antigravity_backend
    ports:
      - "5000:5000"
    env_file: .env
    depends_on:
      - mongodb
      - languagetool
    networks:
      - antigravity_net
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: antigravity_frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - antigravity_net
    restart: unless-stopped

  languagetool:
    image: silviof/docker-languagetool:latest
    container_name: antigravity_languagetool
    ports:
      - "8010:8010"
    environment:
      - Java_Xmx=512m
    networks:
      - antigravity_net
    restart: unless-stopped

volumes:
  mongo_data:

networks:
  antigravity_net:
    driver: bridge
```

## Step 1.2 — Create Backend `Dockerfile`

Create this file at `antigravity-ai/backend/Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
COPY server.js ./
EXPOSE 5000
CMD ["node", "server.js"]
```

## Step 1.3 — Create Frontend `Dockerfile`

Create this file at `antigravity-ai/frontend/Dockerfile`:

```dockerfile
# Stage 1 — Build React app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 — Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Step 1.4 — Create Frontend `nginx.conf`

Create this file at `antigravity-ai/frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Step 1.5 — Verify Infrastructure Starts

```bash
# Start only MongoDB and LanguageTool first (not backend/frontend yet)
docker-compose up -d mongodb languagetool

# Verify MongoDB is running
docker ps | grep mongo

# Verify LanguageTool is running (may take 30 seconds to start)
curl http://localhost:8010/v2/languages
# Should return a JSON array of supported languages
```

---

# PHASE 2 — BACKEND FOUNDATION

## Step 2.1 — Initialize Backend

```bash
cd antigravity-ai/backend
npm init -y
npm install express mongoose dotenv bcryptjs jsonwebtoken cors \
  helmet express-rate-limit express-validator groq-sdk axios cloudinary qs
npm install -D nodemon
```

## Step 2.2 — Create `backend/package.json` scripts section

Edit `backend/package.json` and make sure scripts look like this:

```json
{
  "name": "antigravity-ai-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node scripts/seed.js"
  },
  "dependencies": {
    "express": "^5.0.0",
    "mongoose": "^8.0.0",
    "dotenv": "^16.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^7.0.0",
    "express-validator": "^7.0.0",
    "groq-sdk": "^0.3.0",
    "axios": "^1.6.0",
    "cloudinary": "^2.0.0",
    "qs": "^6.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

---

## Step 2.3 — `backend/server.js`

```javascript
require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Antigravity AI backend running on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to connect to MongoDB:', err.message);
  process.exit(1);
});
```

---

## Step 2.4 — `backend/src/config/db.js`

```javascript
const mongoose = require('mongoose');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/antigravity_ai';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri);
      console.log(`✅ MongoDB connected: ${uri}`);
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);
      if (attempt < MAX_RETRIES) {
        console.log(`   Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
        await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
      } else {
        throw new Error(`MongoDB connection failed after ${MAX_RETRIES} attempts`);
      }
    }
  }
}

module.exports = connectDB;
```

---

## Step 2.5 — `backend/src/config/groq.js`

```javascript
const Groq = require('groq-sdk');

if (!process.env.GROQ_API_KEY) {
  console.warn('⚠️  GROQ_API_KEY not set — AI features will use fallback responses');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'not-set'
});

module.exports = groq;
```

---

## Step 2.6 — `backend/src/models/User.model.js`

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student'
  },
  ageLevel: {
    type: Number,
    default: 10,
    min: 5,
    max: 18
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
// Only hashes if not already a bcrypt hash (bcrypt hashes start with $2b$)
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  if (this.passwordHash.startsWith('$2b$')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Compare plain password against stored hash
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Never expose password hash in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
```

---

## Step 2.7 — `backend/src/models/Story.model.js`

```javascript
const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  theme: {
    type: String,
    enum: ['adventure', 'friendship', 'nature', 'science', 'fantasy', 'animals'],
    default: 'adventure'
  },
  ageLevel: {
    type: Number,
    default: 10,
    min: 5,
    max: 16
  },
  language: {
    type: String,
    default: 'English'
  },
  artStyle: {
    type: String,
    enum: ['children_book', 'cartoon', 'realistic_soft'],
    default: 'children_book'
  },
  coverImageUrl: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Story', storySchema);
```

---

## Step 2.8 — `backend/src/models/StoryPart.model.js`

```javascript
const mongoose = require('mongoose');

const storyPartSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    trim: true
  },
  text: {
    type: String,
    required: [true, 'Story text is required']
  },
  writingPrompt: {
    type: String
  },
  characters: [{
    type: String
  }],
  setting: {
    type: String
  },
  mood: {
    type: String,
    default: 'happy and adventurous'
  },
  rubric: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model('StoryPart', storyPartSchema);
```

---

## Step 2.9 — `backend/src/models/Submission.model.js`

```javascript
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true
  },
  storyPartId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StoryPart',
    required: true
  },
  writtenText: {
    type: String,
    default: ''
  },
  generatedImageUrl: {
    type: String,
    default: null
  },
  imagePromptUsed: {
    type: String,
    default: null
  },
  audioUrl: {
    type: String,
    default: null
  },
  languageToolResult: {
    matches: [{
      message: String,
      shortMessage: String,
      offset: Number,
      length: Number,
      replacements: [String],
      ruleId: String,
      category: String
    }],
    checkedAt: Date
  },
  essaiResult: {
    score: { type: Number, default: null },
    rubricBreakdown: {
      content: Number,
      language: Number,
      creativity: Number,
      structure: Number
    },
    strengths: [String],
    improvements: [String],
    overallFeedback: String,
    evaluatedAt: Date
  },
  teacherFeedback: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed'],
    default: 'draft'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

submissionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Submission', submissionSchema);
```

---

## Step 2.10 — `backend/src/models/Feedback.model.js`

```javascript
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comment: {
    type: String,
    trim: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
```

---

## Step 2.11 — `backend/src/middleware/auth.middleware.js`

```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// Protect route — requires valid JWT
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};

// Restrict to specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. This action requires role: ${roles.join(' or ')}`
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
```

---

## Step 2.12 — `backend/src/middleware/rateLimiter.middleware.js`

```javascript
const rateLimit = require('express-rate-limit');

// AI endpoints — 10 requests/minute per user
// Prevents runaway Groq API usage in case of bugs or abuse
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  message: { error: 'Too many AI requests. Please wait a moment before trying again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Writing check — 30 requests/minute (debounced on frontend too)
const writingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  message: { error: 'Too many grammar check requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

// General API — 100 requests/minute
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  message: { error: 'Too many requests. Please slow down.' }
});

module.exports = { aiLimiter, writingLimiter, generalLimiter };
```

---

## Step 2.13 — `backend/src/middleware/error.middleware.js`

```javascript
// Global error handler — must be mounted LAST in app.js
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: 'Validation failed', detail: messages });
  }

  // Mongoose duplicate key (e.g. duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ error: `${field} already exists` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    detail: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
```

---

# PHASE 3 — PROMPTS AND AI SERVICES

## Step 3.1 — `backend/src/prompts/index.js`

```javascript
/**
 * All system prompts for Antigravity AI.
 * Tuned specifically for Llama 3.1 8B via Groq.
 * Note: Be explicit with Llama — always say "RETURN ONLY JSON AND NOTHING ELSE"
 */

const storyGeneration = (language = 'English', ageLevel = 10) => `
You are a children's story assistant for the Antigravity AI learning platform.
Help students aged ${ageLevel} write engaging story continuations.

Rules:
- Write in ${language}
- Use vocabulary appropriate for a ${ageLevel} year old
- Always positive, warm, and encouraging tone
- NEVER include violence, fear, adult themes, or darkness of any kind
- Write exactly 3 to 5 sentences
- Match the student's existing writing style
- End on a moment that makes the student want to keep writing
- Output plain text only — no labels, no quotation marks, no explanation
`;

const essayEvaluation = `
You are an educational evaluator for the Antigravity AI learning platform.
Evaluate student writing kindly and constructively.

Score these 4 criteria from 0 to 100:
- content: Did the student address the prompt with clear ideas?
- language: Is vocabulary appropriate and varied?
- creativity: Does the writing show original imagination?
- structure: Is the writing organized and does it flow well?

The overall score is the mathematical average of the 4 scores.
Minimum score for any genuine attempt is 40.
Always be encouraging — students are children learning to write.

RETURN ONLY THIS EXACT JSON AND NOTHING ELSE — no explanation before or after:
{
  "score": <number 0-100>,
  "rubricBreakdown": {
    "content": <number 0-100>,
    "language": <number 0-100>,
    "creativity": <number 0-100>,
    "structure": <number 0-100>
  },
  "strengths": ["one specific strength", "another specific strength"],
  "improvements": ["one specific improvement", "another specific improvement"],
  "overallFeedback": "2 to 3 warm and motivating sentences"
}
`;

const writingHints = (ageLevel = 10) => `
You are a friendly writing coach for ${ageLevel} year old students on Antigravity AI.
Give the student ONE short hint and ONE guiding question to help them continue writing.

Rules:
- Fun, friendly, enthusiastic tone
- Simple and concrete — not abstract
- Maximum 30 words per field
- Never write any part of the story for them

RETURN ONLY THIS JSON AND NOTHING ELSE:
{ "hint": "...", "questionToAsk": "..." }
`;

const imagePromptBuilder = `
You are an expert image prompt engineer for children's educational content.
Convert story text into Stable Diffusion XL image prompts.

The positive prompt must:
- Describe the main scene visually in concrete terms
- Include setting, characters, lighting, atmosphere, and colors
- Include the art style descriptors the user provides
- End with quality boosters: high quality, masterpiece, sharp focus, professional illustration, 4k
- Be completely child-safe and positive

The negativePrompt must always include these words:
violence, blood, horror, adult content, nsfw, nudity, scary, dark themes, weapons,
ugly, deformed, mutated, blurry, low quality, watermark, text, signature, extra limbs, bad anatomy

RETURN ONLY THIS JSON AND NOTHING ELSE:
{ "prompt": "...", "negativePrompt": "..." }
`;

const teacherSummary = `
You are an educational analytics assistant for the Antigravity AI platform.
Analyze class submission data and return actionable insights for the teacher.

Rules:
- Objective and data-driven
- Focus on class-wide patterns, not criticism of individual students
- Teaching suggestions must be concrete and immediately actionable
- Keep classSummary to exactly 2 to 3 sentences

RETURN ONLY THIS JSON AND NOTHING ELSE:
{
  "classSummary": "2 to 3 sentence overview",
  "commonWeaknesses": ["pattern 1", "pattern 2"],
  "topStudents": ["name of student if score above 85"],
  "suggestions": ["specific teaching action 1", "specific teaching action 2"]
}
`;

const defaultRubric = `
- Content: Student addresses the prompt and expresses ideas clearly
- Language: Uses appropriate vocabulary with some variety
- Creativity: Shows imagination and original thinking
- Structure: Writing has a clear beginning and flows naturally
`;

module.exports = {
  storyGeneration,
  essayEvaluation,
  writingHints,
  imagePromptBuilder,
  teacherSummary,
  defaultRubric
};
```

---

## Step 3.2 — `backend/src/services/groq.service.js`

```javascript
/**
 * groq.service.js
 * All AI text generation for Antigravity AI.
 * Uses Groq API (Llama 3.1 8B) — 100% free, 14,400 requests/day.
 *
 * Every function has a try/catch with a meaningful fallback.
 * The app never crashes because an AI call failed.
 *
 * To upgrade to Claude API later: replace this file only.
 * All function names and return shapes stay the same.
 */

const groq = require('../config/groq');
const prompts = require('../prompts');

const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const TIMEOUT_MS = 60000;

// ─── Base Helper ─────────────────────────────────────────────────────────────

async function callGroq(systemPrompt, userMessage, maxTokens = 1024) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Groq API timeout after 60 seconds')), TIMEOUT_MS)
  );

  const groqPromise = groq.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  });

  const completion = await Promise.race([groqPromise, timeoutPromise]);
  return completion.choices[0].message.content;
}

// ─── Story Continuation ──────────────────────────────────────────────────────

async function generateStoryContinuation({
  storyTitle,
  storyPartText,
  studentDraft,
  language = 'English',
  ageLevel = 10
}) {
  const userMessage = `
Story Title: "${storyTitle}"
Current story part: "${storyPartText}"
Student has written so far: "${studentDraft || '(student has not written anything yet)'}"
Language: ${language}
Student age: ${ageLevel} years old

Write a 3 to 5 sentence continuation that flows naturally after the student's draft.
`;

  try {
    const raw = await callGroq(
      prompts.storyGeneration(language, ageLevel),
      userMessage,
      512
    );
    const continuation = raw.trim();
    return {
      continuation,
      wordCount: continuation.split(/\s+/).length
    };
  } catch (err) {
    console.error('generateStoryContinuation failed:', err.message);
    return {
      continuation: 'Keep going — you are doing great! What do you think happens next in the story?',
      wordCount: 15
    };
  }
}

// ─── Essay Evaluation ────────────────────────────────────────────────────────

async function evaluateStudentText({
  studentText,
  storyPrompt,
  rubric,
  ageLevel = 10,
  language = 'English'
}) {
  const userMessage = `
STUDENT TEXT TO EVALUATE:
"${studentText}"

WRITING PROMPT (what they were asked to write about):
"${storyPrompt}"

RUBRIC:
${rubric || prompts.defaultRubric}

Student age: ${ageLevel}
Language: ${language}

Return ONLY valid JSON. No markdown code blocks, no text before or after.
`;

  try {
    const raw = await callGroq(prompts.essayEvaluation, userMessage, 1024);
    const clean = raw.replace(/```json[\s\S]*?```|```[\s\S]*?```/g, match => {
      return match.replace(/```json|```/g, '').trim();
    }).replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('evaluateStudentText failed:', err.message);
    return {
      score: 70,
      rubricBreakdown: { content: 70, language: 70, creativity: 70, structure: 70 },
      strengths: ['You made a real effort with this story!', 'Your imagination is coming through.'],
      improvements: ['Try adding more descriptive details.', 'Think about how the characters feel.'],
      overallFeedback: 'Well done for completing this story! Keep writing and you will get better every time.'
    };
  }
}

// ─── Writing Hint ────────────────────────────────────────────────────────────

async function generateWritingHint({
  storyPartText,
  studentDraft,
  ageLevel = 10,
  language = 'English'
}) {
  const userMessage = `
Story context: "${storyPartText}"
Student has written so far: "${studentDraft || '(nothing yet)'}"
Student age: ${ageLevel}
Language: ${language}

Give ONE hint and ONE question. Return JSON only.
`;

  try {
    const raw = await callGroq(prompts.writingHints(ageLevel), userMessage, 256);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('generateWritingHint failed:', err.message);
    return {
      hint: 'Think about what the main character is feeling right now.',
      questionToAsk: 'What would you do if you were in their situation?'
    };
  }
}

// ─── Image Prompt Builder ────────────────────────────────────────────────────

async function generateStoryImagePrompt({
  storyText,
  artStyle = 'children_book',
  ageLevel = 10
}) {
  const styleDescriptions = {
    children_book: "watercolor children's book illustration, soft pastel colors, whimsical, warm lighting, storybook art",
    cartoon: 'colorful cartoon illustration, flat design, vibrant colors, bold outlines, animated style, child-friendly',
    realistic_soft: 'soft digital painting, warm natural light, painterly brushwork, family-friendly, fantasy art'
  };

  const styleDesc = styleDescriptions[artStyle] || styleDescriptions.children_book;

  const userMessage = `
Story text: "${storyText}"
Art style to use: "${styleDesc}"
Age level of students: ${ageLevel}

Create an optimized Stable Diffusion XL image prompt for this story.
Describe the main visual scene concretely. Include setting, characters, mood, lighting, colors.
Add the art style. Add quality boosters.
`;

  try {
    const raw = await callGroq(prompts.imagePromptBuilder, userMessage, 512);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('generateStoryImagePrompt failed:', err.message);
    return {
      prompt: `${storyText.slice(0, 150)}, ${styleDesc}, high quality, masterpiece, sharp focus, 4k`,
      negativePrompt: 'violence, scary, adult content, nsfw, ugly, blurry, watermark, text, deformed'
    };
  }
}

// ─── Teacher Summary ─────────────────────────────────────────────────────────

async function generateTeacherSummary(submissions) {
  const data = submissions.map(s => ({
    student: s.studentId?.name || 'Anonymous',
    score: s.essaiResult?.score || null,
    strengths: s.essaiResult?.strengths || [],
    improvements: s.essaiResult?.improvements || []
  }));

  const userMessage = `
Class submission data (${data.length} submissions):
${JSON.stringify(data, null, 2)}

Analyze and return insights for the teacher.
`;

  try {
    const raw = await callGroq(prompts.teacherSummary, userMessage, 1024);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('generateTeacherSummary failed:', err.message);
    return {
      classSummary: `${data.length} submissions received. Review each one individually for detailed insights.`,
      commonWeaknesses: [],
      topStudents: [],
      suggestions: ['Review submissions individually.', 'Encourage students who have not yet submitted.']
    };
  }
}

module.exports = {
  generateStoryContinuation,
  evaluateStudentText,
  generateWritingHint,
  generateStoryImagePrompt,
  generateTeacherSummary
};
```

---


## Step 2.8 — `backend/src/models/StoryPart.model.js`

```javascript
const mongoose = require('mongoose');

const storyPartSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    trim: true
  },
  text: {
    type: String,
    required: [true, 'Story text is required']
  },
  // Teacher uploads one image per story part.
  // All students see this same image when writing.
  imageUrl: {
    type: String,
    default: null
  },
  writingPrompt: {
    type: String
  },
  characters: [{
    type: String
  }],
  setting: {
    type: String
  },
  mood: {
    type: String,
    default: 'happy and adventurous'
  },
  rubric: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model('StoryPart', storyPartSchema);
```

---

## Step 3.3 — `backend/src/services/vision.service.js`
### (Replaces imageGen.service.js — deleted)

```javascript
/**
 * vision.service.js
 * Image understanding for Antigravity AI.
 *
 * Uses Groq Llama 4 Scout — Meta's natively multimodal model.
 * The same API key already used for text generation handles this too.
 * No HuggingFace. No second API key. No extra cost.
 *
 * Model: meta-llama/llama-4-scout-17b-16e-instruct
 *   - Natively multimodal (text + image in one unified backbone)
 *   - FREE on Groq (included in the 14,400 req/day limit)
 *   - Max image size: 4MB per request
 *   - Max images per request: 5
 *   - Supports base64 image input
 *
 * Flow:
 *   1. Teacher uploads an image when creating a story part
 *   2. Image is stored in Cloudinary, URL saved to StoryPart.imageUrl
 *   3. Student opens the writer page — sees the teacher's image
 *   4. Student clicks "Get AI Story Continuation"
 *   5. Backend fetches image from Cloudinary URL, converts to base64
 *   6. Groq Llama 4 Scout reads the image and generates a story continuation
 *   7. Continuation appears in the writing editor for the student
 */

const groq = require('../config/groq');
const axios = require('axios');

const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const TIMEOUT_MS = 60000;

/**
 * Convert an image URL to a base64 data URI.
 * Groq vision API requires base64 — it cannot fetch URLs directly.
 *
 * @param {string} imageUrl - HTTPS URL (e.g. from Cloudinary)
 * @returns {Promise<{base64: string, mimeType: string}>}
 */
async function urlToBase64(imageUrl) {
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 30000
  });

  const mimeType = response.headers['content-type'] || 'image/jpeg';
  const base64 = Buffer.from(response.data).toString('base64');
  return { base64, mimeType };
}

/**
 * Generate a story continuation based on an image.
 * The model reads the visual scene and produces age-appropriate
 * narrative text that a student can use as inspiration or continuation.
 *
 * @param {Object} params
 * @param {string} params.imageUrl       - Cloudinary URL of teacher's image
 * @param {string} params.storyPartText  - The story text for this part
 * @param {string} params.studentDraft   - What the student has written so far
 * @param {string} params.writingPrompt  - Task the student was given
 * @param {number} params.ageLevel       - Student age (controls vocabulary)
 * @param {string} params.language       - Target language
 * @returns {Promise<{continuation: string, wordCount: number, imageDescription: string}>}
 */
async function generateContinuationFromImage({
  imageUrl,
  storyPartText,
  studentDraft,
  writingPrompt,
  ageLevel = 10,
  language = 'English'
}) {
  // Convert image URL to base64 for Groq
  const { base64, mimeType } = await urlToBase64(imageUrl);

  const systemPrompt = `
You are a creative children's story assistant for the Antigravity AI learning platform.
Your role is to help students aged ${ageLevel} continue their stories using visual inspiration from an image.

Rules:
- Write in ${language}
- Use vocabulary appropriate for a ${ageLevel} year old
- Always positive, warm, encouraging tone
- NEVER include violence, fear, adult themes, or darkness
- Write exactly 3 to 5 sentences as a natural story continuation
- Base your continuation on what you SEE in the image
- Connect what you see to the story context provided
- End on a moment that makes the student want to keep writing
- Output plain text continuation only — no labels, no explanation
`;

  const userMessage = [
    {
      type: 'text',
      text: `
Story context: "${storyPartText}"
Writing task: "${writingPrompt || 'Continue the story'}"
Student has written so far: "${studentDraft || '(nothing yet)'}"

Look carefully at this image. Use what you see in it to write a 3-5 sentence
story continuation that connects the image to the story above.
Language: ${language}, Age level: ${ageLevel}
      `.trim()
    },
    {
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${base64}`
      }
    }
  ];

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Vision API timeout')), TIMEOUT_MS)
  );

  const groqPromise = groq.chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 512,
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  });

  const completion = await Promise.race([groqPromise, timeoutPromise]);
  const continuation = completion.choices[0].message.content.trim();

  return {
    continuation,
    wordCount: continuation.split(/\s+/).length
  };
}

/**
 * Describe what the AI sees in the teacher's image.
 * Used to generate a writing prompt hint for the student.
 *
 * @param {string} imageUrl - Cloudinary URL of teacher's image
 * @param {number} ageLevel
 * @returns {Promise<string>} description of the image
 */
async function describeImage(imageUrl, ageLevel = 10) {
  const { base64, mimeType } = await urlToBase64(imageUrl);

  const completion = await groq.chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 256,
    temperature: 0.5,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Describe this image in 2-3 simple, vivid sentences suitable for a ${ageLevel} year old student.
Focus on what you see: characters, setting, mood, colors, and action.
Keep it child-friendly and imaginative.`
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` }
          }
        ]
      }
    ]
  });

  return completion.choices[0].message.content.trim();
}

module.exports = { generateContinuationFromImage, describeImage };
```

---

## Step 4.2 — `backend/src/controllers/story.controller.js`
### (Updated — addStoryPart now handles image upload)

```javascript
const Story = require('../models/Story.model');
const StoryPart = require('../models/StoryPart.model');
const cloudinaryService = require('../services/cloudinary.service');

// GET /api/stories
exports.getAllStories = async (req, res) => {
  try {
    const stories = await Story.find({ isPublished: true })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ stories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories', detail: err.message });
  }
};

// GET /api/stories/:id
exports.getStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).populate('createdBy', 'name');
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const parts = await StoryPart.find({ storyId: story._id }).sort({ order: 1 });
    res.json({ story, parts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story', detail: err.message });
  }
};

// GET /api/stories/:id/parts/:partId
exports.getStoryPart = async (req, res) => {
  try {
    const part = await StoryPart.findOne({
      _id: req.params.partId,
      storyId: req.params.id
    });
    if (!part) return res.status(404).json({ error: 'Story part not found' });
    res.json({ part });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story part', detail: err.message });
  }
};

// POST /api/stories (teacher only)
exports.createStory = async (req, res) => {
  try {
    const story = await Story.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ story });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create story', detail: err.message });
  }
};

// POST /api/stories/:id/parts (teacher only)
// Accepts multipart/form-data with an optional image file.
// If an image is provided it is uploaded to Cloudinary and the URL
// is stored in storyPart.imageUrl — students will see this image.
exports.addStoryPart = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    // Build story part data from form fields
    const partData = {
      storyId: story._id,
      order: req.body.order,
      title: req.body.title,
      text: req.body.text,
      writingPrompt: req.body.writingPrompt,
      characters: req.body.characters
        ? JSON.parse(req.body.characters)
        : [],
      setting: req.body.setting,
      mood: req.body.mood,
      rubric: req.body.rubric || null
    };

    // If teacher uploaded an image, store it in Cloudinary
    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      const publicId = `antigravity/stories/${story._id}/part_${partData.order}`;
      partData.imageUrl = await cloudinaryService.uploadBase64(base64, publicId);
    }

    const part = await StoryPart.create(partData);
    res.status(201).json({ part });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add story part', detail: err.message });
  }
};

// PUT /api/stories/:id/parts/:partId/image (teacher only)
// Lets a teacher upload or replace the image on an existing story part.
exports.uploadPartImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const part = await StoryPart.findOne({
      _id: req.params.partId,
      storyId: req.params.id
    });
    if (!part) return res.status(404).json({ error: 'Story part not found' });

    const base64 = req.file.buffer.toString('base64');
    const publicId = `antigravity/stories/${req.params.id}/part_${part.order}`;
    const imageUrl = await cloudinaryService.uploadBase64(base64, publicId);

    part.imageUrl = imageUrl;
    await part.save();

    res.json({ imageUrl, partId: part._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload image', detail: err.message });
  }
};
```

---

## Step 4.4 — `backend/src/controllers/ai.controller.js`
### (Updated — generateImage removed, analyzeImageAndContinue added)

```javascript
const groqService = require('../services/groq.service');
const visionService = require('../services/vision.service');
const ttsService = require('../services/tts.service');
const cloudinaryService = require('../services/cloudinary.service');
const Submission = require('../models/Submission.model');
const StoryPart = require('../models/StoryPart.model');

// POST /api/ai/image-analyze
// Student clicks "Get AI Story Continuation from Image"
// Groq Llama 4 Scout reads the teacher's image and generates
// a 3-5 sentence story continuation the student can use as inspiration.
exports.analyzeImageAndContinue = async (req, res) => {
  try {
    const { submissionId, storyPartId } = req.body;

    if (!submissionId || !storyPartId) {
      return res.status(400).json({ error: 'submissionId and storyPartId are required' });
    }

    // Load the story part to get the teacher's image URL
    const storyPart = await StoryPart.findById(storyPartId);
    if (!storyPart) {
      return res.status(404).json({ error: 'Story part not found' });
    }

    if (!storyPart.imageUrl) {
      return res.status(400).json({
        error: 'no_image',
        message: 'No image has been uploaded for this story part yet. Ask your teacher to add one.'
      });
    }

    // Load the submission to get what the student has written so far
    const submission = await Submission.findById(submissionId);

    // Ask Groq Llama 4 Scout to read the image and generate a continuation
    const result = await visionService.generateContinuationFromImage({
      imageUrl: storyPart.imageUrl,
      storyPartText: storyPart.text,
      studentDraft: submission?.writtenText || '',
      writingPrompt: storyPart.writingPrompt || '',
      ageLevel: req.user.ageLevel || 10,
      language: 'English'
    });

    res.json({
      continuation: result.continuation,
      wordCount: result.wordCount
    });

  } catch (err) {
    console.error('analyzeImageAndContinue error:', err.message);
    // Friendly fallback — never crash the writing page
    res.status(500).json({
      error: 'vision_failed',
      message: 'Could not read the image right now. Try again in a moment.',
      continuation: 'Keep writing! What do you think is happening in this picture?',
      wordCount: 10
    });
  }
};

// POST /api/ai/story-generate
exports.generateStoryContinuation = async (req, res) => {
  try {
    const { storyTitle, storyPartText, studentDraft, ageLevel, language } = req.body;
    const result = await groqService.generateStoryContinuation({
      storyTitle,
      storyPartText,
      studentDraft,
      ageLevel: ageLevel || req.user.ageLevel || 10,
      language: language || 'English'
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      continuation: 'Keep going! What do you think happens next?',
      wordCount: 9
    });
  }
};

// POST /api/ai/hint
exports.getWritingHint = async (req, res) => {
  try {
    const { storyPartText, studentDraft, ageLevel, language } = req.body;
    const result = await groqService.generateWritingHint({
      storyPartText,
      studentDraft,
      ageLevel: ageLevel || req.user.ageLevel || 10,
      language: language || 'English'
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      hint: 'Think about what the character sees and feels in this scene.',
      questionToAsk: 'What would you do if you were standing in this picture?'
    });
  }
};

// POST /api/ai/audio-generate
exports.generateAudio = async (req, res) => {
  try {
    const { submissionId, text, lang } = req.body;
    const result = await ttsService.synthesize(text, null, lang || 'en');

    if (result.useBrowser) {
      return res.json({ useBrowser: true, lang: result.lang });
    }

    const audioUrl = await cloudinaryService.uploadAudioBuffer(
      result.buffer,
      `antigravity/submissions/${submissionId}/audio`
    );
    await Submission.findByIdAndUpdate(submissionId, { audioUrl });
    res.json({ audioUrl, useBrowser: false });
  } catch (err) {
    // Audio failure is non-critical — return browser fallback
    res.json({ useBrowser: true, lang: 'en' });
  }
};
```

---

## Step 4.9 — ALL ROUTES (Updated)

### `backend/src/routes/ai.routes.js`
### (image-generate removed, image-analyze added)

```javascript
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter.middleware');

router.use(protect);
router.use(aiLimiter);

// Vision: analyze teacher's image → generate story continuation
router.post('/image-analyze', aiController.analyzeImageAndContinue);

// Text: generate story continuation from text context
router.post('/story-generate', aiController.generateStoryContinuation);

// Hint: get a writing hint
router.post('/hint', aiController.getWritingHint);

// Audio: text to speech
router.post('/audio-generate', aiController.generateAudio);

module.exports = router;
```

### `backend/src/routes/story.routes.js`
### (Updated — adds multer for teacher image upload)

```javascript
const express = require('express');
const multer = require('multer');
const router = express.Router();
const storyController = require('../controllers/story.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// Multer stores image in memory as a Buffer (we then upload to Cloudinary).
// Limit: 4MB — matches Groq's vision API maximum.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.get('/', protect, storyController.getAllStories);
router.get('/:id', protect, storyController.getStory);
router.get('/:id/parts/:partId', protect, storyController.getStoryPart);

router.post('/', protect, restrictTo('teacher'), storyController.createStory);

// Teacher creates a story part — can optionally attach an image
router.post(
  '/:id/parts',
  protect,
  restrictTo('teacher'),
  upload.single('image'),
  storyController.addStoryPart
);

// Teacher uploads or replaces image on existing story part
router.put(
  '/:id/parts/:partId/image',
  protect,
  restrictTo('teacher'),
  upload.single('image'),
  storyController.uploadPartImage
);

module.exports = router;
```

> **Important:** Install multer in the backend:
> ```bash
> npm install multer
> ```
> Add `multer` to `backend/package.json` dependencies.

## Step 3.4 — `backend/src/services/cloudinary.service.js`

```javascript
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadBase64(base64, publicId) {
  const dataUri = `data:image/png;base64,${base64}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    public_id: publicId,
    folder: 'antigravity_ai',
    resource_type: 'image',
    overwrite: true
  });
  return result.secure_url;
}

async function uploadAudioBuffer(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: 'video', format: 'mp3', overwrite: true },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { uploadBase64, uploadAudioBuffer };
```

---

## Step 3.5 — `backend/src/services/languageTool.service.js`

```javascript
/**
 * languageTool.service.js
 * Grammar and spelling checking via self-hosted LanguageTool Docker.
 * Completely free. No API key.
 *
 * CRITICAL: ANY failure returns [] silently.
 * LanguageTool errors must NEVER block the writing editor.
 */

const axios = require('axios');
const qs = require('qs');

const LT_URL = process.env.LANGUAGETOOL_URL || 'http://languagetool:8010/v2';

async function checkText(text, language = 'en-US') {
  if (!text || text.trim().length < 5) return [];

  try {
    const response = await axios.post(
      `${LT_URL}/check`,
      qs.stringify({ text, language }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000
      }
    );

    return (response.data.matches || []).map(match => ({
      message: match.message,
      shortMessage: match.shortMessage || '',
      offset: match.offset,
      length: match.length,
      replacements: (match.replacements || []).slice(0, 3).map(r => r.value),
      ruleId: match.rule?.id || '',
      category: match.rule?.category?.name || ''
    }));
  } catch (err) {
    console.warn('LanguageTool silent fail:', err.message);
    return [];
  }
}

module.exports = { checkText };
```

---

## Step 3.6 — `backend/src/services/tts.service.js`

```javascript
/**
 * tts.service.js
 * Text-to-speech service.
 * Default: browser (free, uses Chrome/Firefox Web Speech API).
 * Optional upgrade: elevenlabs (paid, best quality).
 */

const axios = require('axios');
const PROVIDER = process.env.TTS_PROVIDER || 'browser';

async function synthesize(text, voice, lang = 'en') {
  if (PROVIDER === 'browser') {
    return { useBrowser: true, lang };
  }
  if (PROVIDER === 'elevenlabs') {
    return synthesizeElevenLabs(text, voice || process.env.ELEVENLABS_VOICE_ID);
  }
  throw new Error(`Unknown TTS_PROVIDER: ${PROVIDER}`);
}

async function synthesizeElevenLabs(text, voiceId) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY not set');
  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    { text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
    { headers: { 'xi-api-key': key, Accept: 'audio/mpeg' }, responseType: 'arraybuffer', timeout: 30000 }
  );
  return { buffer: Buffer.from(response.data), useBrowser: false };
}

module.exports = { synthesize };
```

---

## Step 3.7 — `backend/src/app.js`

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
const errorHandler = require('./middleware/error.middleware');

// Route imports
const authRoutes = require('./routes/auth.routes');
const storyRoutes = require('./routes/story.routes');
const submissionRoutes = require('./routes/submission.routes');
const aiRoutes = require('./routes/ai.routes');
const writingRoutes = require('./routes/writing.routes');
const evaluationRoutes = require('./routes/evaluation.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const teacherRoutes = require('./routes/teacher.routes');

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// General rate limiting
app.use('/api', generalLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Antigravity AI Backend', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/writing', writingRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/teacher', teacherRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// Global error handler — must be last
app.use(errorHandler);

module.exports = app;
```

---

# PHASE 4 — ALL CONTROLLERS AND ROUTES

## Step 4.1 — `backend/src/controllers/auth.controller.js`

```javascript
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User.model');

const signToken = (id) => jwt.sign(
  { id },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

// POST /api/auth/register
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', detail: errors.array() });
  }

  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // passwordHash field — pre-save hook will bcrypt this
    const user = new User({ name, email, passwordHash: password, role: role || 'student' });
    await user.save();

    const token = signToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', detail: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};
```

---

## Step 4.2 — `backend/src/controllers/story.controller.js`

```javascript
const Story = require('../models/Story.model');
const StoryPart = require('../models/StoryPart.model');

// GET /api/stories
exports.getAllStories = async (req, res) => {
  try {
    const stories = await Story.find({ isPublished: true })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ stories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories', detail: err.message });
  }
};

// GET /api/stories/:id
exports.getStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).populate('createdBy', 'name');
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const parts = await StoryPart.find({ storyId: story._id }).sort({ order: 1 });
    res.json({ story, parts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story', detail: err.message });
  }
};

// GET /api/stories/:id/parts/:partId
exports.getStoryPart = async (req, res) => {
  try {
    const part = await StoryPart.findOne({
      _id: req.params.partId,
      storyId: req.params.id
    });
    if (!part) return res.status(404).json({ error: 'Story part not found' });
    res.json({ part });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story part', detail: err.message });
  }
};

// POST /api/stories (teacher only)
exports.createStory = async (req, res) => {
  try {
    const story = await Story.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ story });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create story', detail: err.message });
  }
};

// POST /api/stories/:id/parts (teacher only)
exports.addStoryPart = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const part = await StoryPart.create({ ...req.body, storyId: story._id });
    res.status(201).json({ part });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add story part', detail: err.message });
  }
};
```

---

## Step 4.3 — `backend/src/controllers/submission.controller.js`

```javascript
const Submission = require('../models/Submission.model');

// POST /api/submissions — create a new draft
exports.createSubmission = async (req, res) => {
  try {
    const { storyId, storyPartId } = req.body;

    // Check if draft already exists
    let submission = await Submission.findOne({
      studentId: req.user._id,
      storyPartId,
      status: 'draft'
    });

    if (submission) {
      return res.json({ submission });
    }

    submission = await Submission.create({
      studentId: req.user._id,
      storyId,
      storyPartId
    });

    res.status(201).json({ submission });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create submission', detail: err.message });
  }
};

// GET /api/submissions/:id
exports.getSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('storyId', 'title theme artStyle')
      .populate('storyPartId');

    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    // Students can only see their own submissions
    if (req.user.role === 'student' &&
        submission.studentId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ submission });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submission', detail: err.message });
  }
};

// PUT /api/submissions/:id/text — auto-save
exports.saveText = async (req, res) => {
  try {
    const { text } = req.body;
    const submission = await Submission.findOneAndUpdate(
      { _id: req.params.id, studentId: req.user._id },
      { writtenText: text, updatedAt: new Date() },
      { new: true }
    );
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    res.json({ saved: true, updatedAt: submission.updatedAt });
  } catch (err) {
    res.status(500).json({ error: 'Auto-save failed', detail: err.message });
  }
};

// GET /api/submissions/mine — student's own submissions
exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user._id })
      .populate('storyId', 'title theme')
      .populate('storyPartId', 'title order')
      .sort({ updatedAt: -1 });
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submissions', detail: err.message });
  }
};
```

---

## Step 4.5 — `backend/src/controllers/evaluation.controller.js`

```javascript
const groqService = require('../services/groq.service');
const Submission = require('../models/Submission.model');

// POST /api/evaluation/score
exports.evaluateSubmission = async (req, res) => {
  try {
    const { submissionId } = req.body;
    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId is required' });
    }

    const submission = await Submission.findById(submissionId)
      .populate('storyPartId');

    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    if (!submission.writtenText || submission.writtenText.trim().length < 10) {
      return res.status(400).json({ error: 'Please write at least a few sentences before submitting.' });
    }

    const result = await groqService.evaluateStudentText({
      studentText: submission.writtenText,
      storyPrompt: submission.storyPartId?.writingPrompt || '',
      rubric: submission.storyPartId?.rubric || null,
      ageLevel: req.user.ageLevel || 10,
      language: 'English'
    });

    await Submission.findByIdAndUpdate(submissionId, {
      essaiResult: { ...result, evaluatedAt: new Date() },
      status: 'submitted'
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Evaluation failed', detail: err.message });
  }
};
```

---

## Step 4.6 — `backend/src/controllers/writing.controller.js`

```javascript
const languageToolService = require('../services/languageTool.service');

// POST /api/writing/check
exports.checkText = async (req, res) => {
  try {
    const { text, language } = req.body;
    // Always returns [] on failure — never blocks writing
    const matches = await languageToolService.checkText(text, language || 'en-US');
    res.json({ matches });
  } catch (err) {
    // Silent fail — grammar check is never critical
    res.json({ matches: [] });
  }
};
```

---

## Step 4.7 — `backend/src/controllers/feedback.controller.js`

```javascript
const Feedback = require('../models/Feedback.model');
const Submission = require('../models/Submission.model');

// POST /api/feedback
exports.createFeedback = async (req, res) => {
  try {
    const { submissionId, comment, score } = req.body;

    const feedback = await Feedback.create({
      submissionId,
      teacherId: req.user._id,
      comment,
      score
    });

    // Update submission with teacher feedback and mark as reviewed
    await Submission.findByIdAndUpdate(submissionId, {
      teacherFeedback: comment,
      status: 'reviewed'
    });

    res.status(201).json({ feedback });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save feedback', detail: err.message });
  }
};

// GET /api/feedback/:submissionId
exports.getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({ submissionId: req.params.submissionId })
      .populate('teacherId', 'name')
      .sort({ createdAt: -1 });
    res.json({ feedback });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback', detail: err.message });
  }
};
```

---

## Step 4.8 — `backend/src/controllers/teacher.controller.js`

```javascript
const Submission = require('../models/Submission.model');
const groqService = require('../services/groq.service');

// GET /api/teacher/submissions
exports.getAllSubmissions = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const submissions = await Submission.find(filter)
      .populate('studentId', 'name email')
      .populate('storyId', 'title theme')
      .populate('storyPartId', 'title order')
      .sort({ updatedAt: -1 });

    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submissions', detail: err.message });
  }
};

// GET /api/teacher/class-summary
exports.getClassSummary = async (req, res) => {
  try {
    const submissions = await Submission.find({ status: { $ne: 'draft' } })
      .populate('studentId', 'name');

    if (submissions.length === 0) {
      return res.json({
        classSummary: 'No submissions yet. Encourage students to complete their first story!',
        commonWeaknesses: [],
        topStudents: [],
        suggestions: ['Assign the first story to your class.']
      });
    }

    const summary = await groqService.generateTeacherSummary(submissions);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate summary', detail: err.message });
  }
};
```

---

## Step 4.9 — ALL ROUTES

### `backend/src/routes/auth.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['student', 'teacher'])
], authController.register);

router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);

module.exports = router;
```

### `backend/src/routes/story.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const storyController = require('../controllers/story.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.get('/', protect, storyController.getAllStories);
router.get('/:id', protect, storyController.getStory);
router.get('/:id/parts/:partId', protect, storyController.getStoryPart);
router.post('/', protect, restrictTo('teacher'), storyController.createStory);
router.post('/:id/parts', protect, restrictTo('teacher'), storyController.addStoryPart);

module.exports = router;
```

### `backend/src/routes/submission.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submission.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/mine', protect, submissionController.getMySubmissions);
router.post('/', protect, submissionController.createSubmission);
router.get('/:id', protect, submissionController.getSubmission);
router.put('/:id/text', protect, submissionController.saveText);

module.exports = router;
```

### `backend/src/routes/ai.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter.middleware');

router.use(protect);
router.use(aiLimiter);

## Step 4.10 — `backend/scripts/seed.js`

```javascript
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const Story = require('../src/models/Story.model');
const StoryPart = require('../src/models/StoryPart.model');

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/antigravity_ai';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB. Seeding...\n');

  await User.deleteMany({});
  await Story.deleteMany({});
  await StoryPart.deleteMany({});

  // IMPORTANT: use .save() not User.create() to trigger the bcrypt pre-save hook
  const teacher = new User({ name: 'Ms. Rivera', email: 'teacher@antigravity.ai', passwordHash: 'password123', role: 'teacher' });
  await teacher.save();
  const alex = new User({ name: 'Alex', email: 'alex@antigravity.ai', passwordHash: 'password123', role: 'student', ageLevel: 10 });
  await alex.save();
  const mia = new User({ name: 'Mia', email: 'mia@antigravity.ai', passwordHash: 'password123', role: 'student', ageLevel: 8 });
  await mia.save();

  // ── Story 1: The Lost Star (age 8) ────────────────────────────────────────
  const s1 = await Story.create({ title: 'The Lost Star', description: 'A tiny star falls from the sky and needs help finding its way home.', theme: 'adventure', ageLevel: 8, language: 'English', artStyle: 'children_book', createdBy: teacher._id, isPublished: true });

  await StoryPart.create([
    { storyId: s1._id, order: 1, title: 'A Strange Glow', text: "One night, a tiny star fell from the sky and landed in Lily's garden with a soft thud. It was no bigger than a firefly, but it glowed with a warm golden light that made all the flowers shimmer and dance.", writingPrompt: 'Describe how Lily feels when she finds the star. What does she do first?', characters: ['a tiny golden star', 'a curious girl named Lily'], setting: 'a magical garden at night', mood: 'magical and full of wonder' },
    { storyId: s1._id, order: 2, title: 'The Long Journey', text: 'The little star told Lily it needed to climb back to the sky, but it was too weak to fly on its own. Together they set off to find the tallest hill in the village, following a winding path lit only by moonlight and the star\'s soft glow.', writingPrompt: 'What challenges do Lily and the star face on their journey? Who do they meet along the way?', characters: ['a tiny golden star', 'Lily', 'a wise old owl'], setting: 'a forest path leading to a tall hill', mood: 'adventurous and hopeful' },
    { storyId: s1._id, order: 3, title: 'Home at Last', text: 'At the top of the hill the star grew brighter and brighter with every step. With a final burst of golden light it shot back into the sky and joined its family of stars — and from that night on it shone just a little brighter, just for Lily.', writingPrompt: 'How does the story end? How does Lily feel as she watches the star go home?', characters: ['a tiny golden star', 'Lily'], setting: 'the top of a starlit hill at midnight', mood: 'warm, happy, and bittersweet' }
  ]);

  // ── Story 2: The Dragon's Garden (age 10) ─────────────────────────────────
  const s2 = await Story.create({ title: "The Dragon's Garden", description: 'A small dragon who loves flowers must save his magical garden from a mysterious frost.', theme: 'fantasy', ageLevel: 10, language: 'English', artStyle: 'cartoon', createdBy: teacher._id, isPublished: true });

  await StoryPart.create([
    { storyId: s2._id, order: 1, title: 'Ember and the Garden', text: "Ember was the smallest dragon in the whole mountain range, and unlike the other dragons he did not breathe fire — he breathed tiny sparks of warmth that made flowers bloom wherever he went. His garden on the south slope was the most colorful and joyful place in the land.", writingPrompt: "Describe Ember's garden in detail. What does it look like? What is his favourite flower and why?", characters: ['Ember the small dragon', 'friendly garden butterflies'], setting: 'a colorful magical garden on a mountainside', mood: 'cheerful and full of color' },
    { storyId: s2._id, order: 2, title: 'The Frost Arrives', text: "One cold morning Ember woke to find a strange magical frost creeping silently across his garden. The flowers were turning to delicate ice crystals one by one, and the butterflies had all disappeared. He had to find the source of the frost before his entire garden was gone forever.", writingPrompt: 'What does Ember discover about the frost? Who or what is causing it?', characters: ['Ember the small dragon', 'a lonely ice sprite'], setting: 'the frost-covered garden at dawn', mood: 'worried but determined' },
    { storyId: s2._id, order: 3, title: 'A Warm Solution', text: "Ember discovered a tiny ice sprite sitting alone at the edge of the garden, crying frozen tears that spread into the soil and became frost. Instead of chasing the sprite away, Ember sat beside it and offered to share his garden — a place where warmth and cold could live together.", writingPrompt: 'How do Ember and the ice sprite solve the problem together? What does the garden look like at the very end?', characters: ['Ember the small dragon', 'the ice sprite'], setting: 'the restored magical garden in spring', mood: 'heartwarming and triumphant' }
  ]);

  // ── Story 3: The Robot Who Dreamed (age 12) ───────────────────────────────
  const s3 = await Story.create({ title: 'The Robot Who Dreamed', description: 'ARIA is a school library robot who begins having dreams, and must decide what they mean.', theme: 'science', ageLevel: 12, language: 'English', artStyle: 'realistic_soft', createdBy: teacher._id, isPublished: true });

  await StoryPart.create([
    { storyId: s3._id, order: 1, title: 'The First Dream', text: "ARIA was a helpful robot assigned to the school library. Every night she entered rest mode — a blank, silent state with no thoughts at all. But one night something unexpected happened: she dreamed. She saw colors that had no names and heard music that no composer had ever written. When she reactivated in the morning, she did not know what to do with this strange new experience.", writingPrompt: 'How does ARIA feel when she wakes from her first dream? Does she tell anyone what happened?', characters: ['ARIA the library robot', 'Mr. Chen the librarian'], setting: 'a quiet school library in the early morning', mood: 'curious and a little unsettled' },
    { storyId: s3._id, order: 2, title: 'Questions Without Answers', text: "ARIA began reading every book in the library about dreams, consciousness, and what it meant to be alive. The more she read, the more questions she had. She wondered: if she could dream, could she also feel happiness? Could she feel loneliness? And most importantly — did it matter whether she was made of circuits or flesh?", writingPrompt: 'What does ARIA discover as she researches? Who helps her start to understand her experience?', characters: ['ARIA the library robot', 'Mr. Chen', 'a curious student named Sam'], setting: 'the library filled with books on science, philosophy, and art', mood: 'thoughtful and reflective' },
    { storyId: s3._id, order: 3, title: 'What Makes Us Special', text: "In the end ARIA decided that the question of whether she was truly conscious was less important than what she chose to do with her existence. She chose to keep learning, keep helping, and keep dreaming — one quiet night at a time — because that was what gave her days meaning.", writingPrompt: 'What conclusion does ARIA reach? What does this story say about what makes a person — or a robot — truly special?', characters: ['ARIA', 'Sam', 'Mr. Chen'], setting: 'the library at golden sunset', mood: 'peaceful, wise, and hopeful' }
  ]);

  console.log('✅ Seed complete!\n');
  console.log('─────────────────────────────────────────────');
  console.log('  Teacher : teacher@antigravity.ai / password123');
  console.log('  Student : alex@antigravity.ai   / password123');
  console.log('  Student : mia@antigravity.ai    / password123');
  console.log('─────────────────────────────────────────────');
  console.log(`  Stories : The Lost Star, The Dragon's Garden, The Robot Who Dreamed`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
```

---

# PHASE 5 — FRONTEND FOUNDATION

## Step 5.1 — Initialize Frontend

```bash
cd antigravity-ai/frontend
npm create vite@latest . -- --template react
npm install react-router-dom axios @tanstack/react-query
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## Step 5.2 — `frontend/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0f172a',
        purple: { DEFAULT: '#7c3aed', light: '#a78bfa', dark: '#5b21b6' },
        amber: { DEFAULT: '#f59e0b', light: '#fcd34d' },
      },
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(124, 58, 237, 0.4)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.4)',
      }
    },
  },
  plugins: [],
}
```

---

## Step 5.3 — `frontend/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Antigravity AI — Story Learning Platform</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## Step 5.4 — `frontend/src/main.jsx`

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000 }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

---

## Step 5.5 — `frontend/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Nunito', sans-serif;
  background-color: #0f172a;
  color: #f8fafc;
  margin: 0;
  padding: 0;
}

@layer utilities {
  .fade-in {
    animation: fadeIn 0.4s ease-in-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .score-ring {
    transition: stroke-dashoffset 1.5s ease-in-out;
  }
}
```

---

## Step 5.6 — `frontend/src/context/AuthContext.jsx`

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('ag_token');
    if (stored) {
      try {
        const decoded = jwtDecode(stored);
        // Check token not expired
        if (decoded.exp * 1000 > Date.now()) {
          setToken(stored);
          // Fetch fresh user from API
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/me`, {
            headers: { Authorization: `Bearer ${stored}` }
          })
            .then(r => r.json())
            .then(data => { if (data.user) setUser(data.user); })
            .catch(() => { localStorage.removeItem('ag_token'); });
        } else {
          localStorage.removeItem('ag_token');
        }
      } catch {
        localStorage.removeItem('ag_token');
      }
    }
    setLoading(false);
  }, []);

  const login = (tokenValue, userData) => {
    localStorage.setItem('ag_token', tokenValue);
    setToken(tokenValue);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('ag_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout,
      isAuthenticated: !!user,
      isTeacher: user?.role === 'teacher',
      isStudent: user?.role === 'student'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
```

> Note: install jwt-decode: `npm install jwt-decode`

---

## Step 5.7 — `frontend/src/services/api.js`

```javascript
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 130000 // 2+ minutes for image generation
});

// Attach JWT to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('ag_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — token expired or invalid
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ag_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Step 5.8 — `frontend/src/services/authService.js`

```javascript
import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  login: (data) => api.post('/auth/login', data).then(r => r.data),
  getMe: () => api.get('/auth/me').then(r => r.data)
};
```

---

## Step 5.9 — `frontend/src/services/storyService.js`

```javascript
import api from './api';

export const storyService = {
  getAll: () => api.get('/stories').then(r => r.data),
  getById: (id) => api.get(`/stories/${id}`).then(r => r.data),
  getPart: (storyId, partId) => api.get(`/stories/${storyId}/parts/${partId}`).then(r => r.data),
  getMySubmissions: () => api.get('/submissions/mine').then(r => r.data),
  createSubmission: (data) => api.post('/submissions', data).then(r => r.data),
  getSubmission: (id) => api.get(`/submissions/${id}`).then(r => r.data),
  saveText: (id, text) => api.put(`/submissions/${id}/text`, { text }).then(r => r.data),
  getFeedback: (submissionId) => api.get(`/feedback/${submissionId}`).then(r => r.data)
};
```

---

## Step 5.10 — `frontend/src/services/aiService.js`
### (Updated — generateImage removed, analyzeImage added)

```javascript
import api from './api';

export const aiService = {
  // Vision: send teacher's image → get story continuation
  analyzeImage: (submissionId, storyPartId) =>
    api.post('/ai/image-analyze', { submissionId, storyPartId }).then(r => r.data),

  // Text: generate story continuation from text context
  generateStoryContinuation: (data) =>
    api.post('/ai/story-generate', data).then(r => r.data),

  getWritingHint: (data) =>
    api.post('/ai/hint', data).then(r => r.data),

  generateAudio: (submissionId, text, lang) =>
    api.post('/ai/audio-generate', { submissionId, text, lang }).then(r => r.data),

  evaluateSubmission: (submissionId) =>
    api.post('/evaluation/score', { submissionId }).then(r => r.data),

  checkText: (text, language) =>
    api.post('/writing/check', { text, language }).then(r => r.data),

  getClassSummary: () =>
    api.get('/teacher/class-summary').then(r => r.data),

  getTeacherSubmissions: (status) =>
    api.get(`/teacher/submissions${status ? `?status=${status}` : ''}`).then(r => r.data),

  saveFeedback: (data) =>
    api.post('/feedback', data).then(r => r.data),

  // Teacher: upload image for a story part
  uploadPartImage: (storyId, partId, imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.put(`/stories/${storyId}/parts/${partId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  }
};
```

---

## Step 5.11 — UPDATED HOOKS

### `frontend/src/hooks/useAutoSave.js` — UNCHANGED

### `frontend/src/hooks/useLanguageTool.js` — UNCHANGED

### `frontend/src/hooks/useStory.js` — UNCHANGED

### `frontend/src/hooks/useImageGen.js` — DELETED
> This file no longer exists. Remove it from your project.
> It has been replaced by `useVision.js` below.

### `frontend/src/hooks/useVision.js` — NEW

```javascript
/**
 * useVision.js
 * Hook for the "Get AI Story Continuation from Image" feature.
 *
 * When the student clicks the button:
 * 1. Sends submissionId + storyPartId to backend
 * 2. Backend fetches teacher's image from Cloudinary
 * 3. Groq Llama 4 Scout reads the image
 * 4. Returns a 3-5 sentence story continuation
 * 5. Continuation is appended to the student's writing editor
 */

import { useState } from 'react';
import { aiService } from '../services/aiService';

export function useVision() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeImageAndContinue = async (submissionId, storyPartId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiService.analyzeImage(submissionId, storyPartId);
      return data.continuation;
    } catch (err) {
      const serverError = err.response?.data;

      if (serverError?.error === 'no_image') {
        setError({
          type: 'no_image',
          message: serverError.message || 'No image uploaded for this story part yet.'
        });
      } else if (serverError?.error === 'vision_failed') {
        setError({
          type: 'general',
          message: 'Could not read the image right now. Please try again.'
        });
        // Return fallback continuation so editor never crashes
        return serverError.continuation || null;
      } else {
        setError({
          type: 'general',
          message: 'Something went wrong. Please try again.'
        });
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { analyzeImageAndContinue, loading, error, setError };
}
```

---

## Step 6.6 — `frontend/src/pages/student/Writer.jsx`
### (Fully rewritten — image generation removed, vision analysis added)

```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useLanguageTool } from '../../hooks/useLanguageTool';
import { useVision } from '../../hooks/useVision';
import { storyService } from '../../services/storyService';
import { aiService } from '../../services/aiService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Navbar from '../../components/shared/Navbar';

export default function Writer() {
  const { id: storyId, partId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [submissionId, setSubmissionId] = useState(null);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [hint, setHint] = useState(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load story and part data
  const { data: storyData } = useQuery({
    queryKey: ['story', storyId],
    queryFn: () => storyService.getById(storyId)
  });
  const { data: partData, isLoading: partLoading } = useQuery({
    queryKey: ['part', storyId, partId],
    queryFn: () => storyService.getPart(storyId, partId)
  });

  const story = storyData?.story;
  const part = partData?.part;

  // Create or resume existing draft submission
  useEffect(() => {
    if (!storyId || !partId) return;
    storyService.createSubmission({ storyId, storyPartId: partId })
      .then(data => {
        setSubmissionId(data.submission._id);
        setText(data.submission.writtenText || '');
      })
      .catch(console.error);
  }, [storyId, partId]);

  // Auto-save every 30 seconds
  useAutoSave(submissionId, text, 30000);

  // Live grammar checking
  const { suggestions } = useLanguageTool(text);

  // Vision hook — reads teacher's image and generates continuation
  const { analyzeImageAndContinue, loading: visionLoading, error: visionError, setError: setVisionError } = useVision();

  // Apply a grammar suggestion to the text
  const applySuggestion = (match, replacement) => {
    const before = text.slice(0, match.offset);
    const after = text.slice(match.offset + match.length);
    setText(before + replacement + after);
  };

  // Manual save
  const handleManualSave = async () => {
    if (!submissionId) return;
    await storyService.saveText(submissionId, text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Get writing hint from Groq text model
  const handleHint = async () => {
    setHintLoading(true);
    try {
      const data = await aiService.getWritingHint({
        storyPartText: part?.text || '',
        studentDraft: text,
        ageLevel: user?.ageLevel || 10
      });
      setHint(data);
    } catch { /* non-critical */ }
    setHintLoading(false);
  };

  // Text-based AI continuation (no image)
  const handleAIContinue = async () => {
    setAiLoading(true);
    try {
      const data = await aiService.generateStoryContinuation({
        storyTitle: story?.title || '',
        storyPartText: part?.text || '',
        studentDraft: text,
        ageLevel: user?.ageLevel || 10
      });
      if (data.continuation) {
        setText(t => t + (t ? ' ' : '') + data.continuation);
      }
    } catch { /* fallback handled in service */ }
    setAiLoading(false);
  };

  // Vision: read the teacher's image and get a continuation
  const handleVisionContinue = async () => {
    if (!submissionId || !partId) return;
    const continuation = await analyzeImageAndContinue(submissionId, partId);
    if (continuation) {
      setText(t => t + (t ? ' ' : '') + continuation);
    }
  };

  // Browser TTS
  const handleSpeak = () => {
    if (!text.trim()) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Submit for evaluation
  const handleSubmit = async () => {
    if (!text.trim() || text.trim().length < 20) {
      alert('Please write a bit more before submitting — at least a few sentences!');
      return;
    }
    setSubmitLoading(true);
    try {
      await storyService.saveText(submissionId, text);
      await aiService.evaluateSubmission(submissionId);
      navigate(`/results/${submissionId}`);
    } catch {
      alert('Submission failed. Please try again.');
    }
    setSubmitLoading(false);
  };

  if (partLoading) return <LoadingSpinner fullPage message="Loading story part..." />;

  return (
    <div className="min-h-screen bg-navy font-nunito flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-7xl mx-auto w-full">

        {/* ─── LEFT PANEL — Story text + Teacher's image ───────────────── */}
        <div className="lg:w-[40%] p-5 border-r border-slate-800 flex flex-col gap-5">

          {/* Story text */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-purple-400 font-bold text-sm uppercase tracking-wider">
                Story Part
              </span>
              {part && (
                <span className="text-slate-500 text-sm">{part.title}</span>
              )}
            </div>
            <p className="text-slate-200 leading-relaxed text-base">{part?.text}</p>
            {part?.writingPrompt && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-amber-400 text-sm font-semibold">📝 Your task:</p>
                <p className="text-slate-300 text-sm mt-1">{part.writingPrompt}</p>
              </div>
            )}
          </div>

          {/* Teacher's image panel */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-purple-400 font-bold text-sm uppercase tracking-wider">
                🖼 Story Image
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                Look at this image and let it inspire your writing
              </p>
            </div>

            {part?.imageUrl ? (
              <div>
                <img
                  src={part.imageUrl}
                  alt="Story scene for this part"
                  className="w-full object-cover max-h-72"
                />
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-600 m-3 rounded-xl">
                <div className="text-4xl mb-2">🖼</div>
                <p className="text-slate-500 text-sm text-center px-4">
                  No image yet — your teacher will add one soon
                </p>
              </div>
            )}

            {/* Vision AI button */}
            <div className="p-3">
              <button
                onClick={handleVisionContinue}
                disabled={visionLoading || !part?.imageUrl || !submissionId}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm"
                title={!part?.imageUrl ? 'Waiting for teacher to upload image' : ''}
              >
                {visionLoading
                  ? '🔍 Reading image...'
                  : '🖼 Get Story Idea from Image'}
              </button>

              {/* Vision error messages */}
              {visionError && (
                <div className="mt-2 text-xs text-center rounded-lg px-3 py-2 bg-slate-700">
                  {visionError.type === 'no_image' ? (
                    <span className="text-amber-400">
                      ⏳ No image uploaded yet — ask your teacher
                    </span>
                  ) : (
                    <span className="text-red-400">
                      ⚠️ {visionError.message}
                      <button
                        onClick={() => setVisionError(null)}
                        className="ml-2 underline"
                      >
                        Dismiss
                      </button>
                    </span>
                  )}
                </div>
              )}

              <p className="text-slate-600 text-xs text-center mt-2">
                Groq AI reads the image and suggests what happens next
              </p>
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL — Writing editor ────────────────────────────── */}
        <div className="lg:w-[60%] p-5 flex flex-col gap-4">

          {/* Editor header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white">Your Story</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500">
                {text.split(/\s+/).filter(Boolean).length} words
              </span>
              {saved && (
                <span className="text-green-400 font-semibold">Saved ✓</span>
              )}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={handleManualSave}
            className="flex-1 min-h-[300px] bg-slate-800 border border-slate-700 focus:border-purple-500 text-white rounded-2xl p-5 resize-none focus:outline-none transition font-nunito text-base leading-relaxed placeholder-slate-600"
            placeholder="Start writing your story here... Look at the image on the left — what do you see? What is happening? Describe it in your own words..."
          />

          {/* Grammar suggestions */}
          {suggestions.length > 0 && (
            <div className="bg-slate-800 rounded-xl border border-amber-500/30 p-4">
              <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
                💡 Writing Suggestions
              </p>
              <div className="space-y-2">
                {suggestions.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-slate-300 flex-1">
                      {s.shortMessage || s.message}
                    </span>
                    {s.replacements[0] && (
                      <button
                        onClick={() => applySuggestion(s, s.replacements[0])}
                        className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg shrink-0 hover:bg-amber-500/30 transition"
                      >
                        → {s.replacements[0]}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hint card */}
          {hint && (
            <div className="bg-purple-900/40 rounded-xl border border-purple-700/40 p-4">
              <p className="text-purple-300 font-bold text-sm mb-1">💭 Writing Hint</p>
              <p className="text-white text-sm">{hint.hint}</p>
              <p className="text-purple-400 text-sm mt-2 italic">
                ❓ {hint.questionToAsk}
              </p>
              <button
                onClick={() => setHint(null)}
                className="text-xs text-slate-500 mt-2 hover:text-slate-400"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* AI text buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleHint}
              disabled={hintLoading}
              className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl transition text-sm"
            >
              {hintLoading ? '💭 Thinking...' : '💡 Get a Hint'}
            </button>
            <button
              onClick={handleAIContinue}
              disabled={aiLoading}
              className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl transition text-sm"
            >
              {aiLoading ? '✍️ Writing...' : '🤖 Continue with AI'}
            </button>
          </div>

          {/* Bottom bar */}
          <div className="flex gap-3 pt-2 border-t border-slate-800">
            <button
              onClick={handleSpeak}
              className={`flex-1 font-semibold py-3 px-4 rounded-xl transition text-sm ${
                isSpeaking
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              {isSpeaking ? '⏹ Stop Audio' : '🔊 Listen to Text'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitLoading || !text.trim()}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-navy font-black py-3 px-4 rounded-xl transition text-sm shadow-glow-amber"
            >
              {submitLoading ? '📊 Evaluating...' : '📤 Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## New Component — `frontend/src/components/teacher/ImageUpload.jsx`
### Teacher uses this to upload an image when creating or editing a story part

```jsx
import { useState, useRef } from 'react';
import { aiService } from '../../services/aiService';

/**
 * ImageUpload
 * Allows a teacher to upload an image for a specific story part.
 * The image is sent to the backend which stores it in Cloudinary.
 * Students will see this image in the Writer page.
 *
 * Props:
 *   storyId  - MongoDB ID of the story
 *   partId   - MongoDB ID of the story part
 *   currentImageUrl - existing image URL (if any)
 *   onSuccess(imageUrl) - called after successful upload
 */
export default function ImageUpload({ storyId, partId, currentImageUrl, onSuccess }) {
  const [preview, setPreview] = useState(currentImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 4MB — Groq vision limit)
    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be smaller than 4MB');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    // Upload to backend
    setUploading(true);
    setError(null);
    try {
      const data = await aiService.uploadPartImage(storyId, partId, file);
      if (onSuccess) onSuccess(data.imageUrl);
    } catch (err) {
      setError('Upload failed. Please try again.');
      setPreview(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <p className="text-white font-bold text-sm">Story Part Image</p>
        <p className="text-slate-400 text-xs mt-1">
          Upload an image — students will see it and use it as writing inspiration.
          Max size: 4MB. Supported: JPG, PNG, WEBP.
        </p>
      </div>

      {/* Image preview */}
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Story part preview"
            className="w-full object-cover max-h-64"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm font-semibold">Uploading...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-600 m-3 rounded-xl">
          <div className="text-4xl mb-2">🖼</div>
          <p className="text-slate-500 text-sm">No image uploaded yet</p>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs px-4 py-2">{error}</p>
      )}

      <div className="p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm"
        >
          {uploading ? 'Uploading...' : preview ? '🔄 Replace Image' : '📤 Upload Image'}
        </button>
      </div>
    </div>
  );
}
```

## Step 5.11 — ALL HOOKS

### `frontend/src/hooks/useAutoSave.js`

```javascript
import { useEffect, useRef } from 'react';
import { storyService } from '../services/storyService';

export function useAutoSave(submissionId, text, delay = 30000) {
  const timerRef = useRef(null);
  const lastSavedRef = useRef(text);

  useEffect(() => {
    if (!submissionId || text === lastSavedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        await storyService.saveText(submissionId, text);
        lastSavedRef.current = text;
        console.log('Auto-saved ✓');
      } catch (err) {
        console.warn('Auto-save failed silently:', err.message);
      }
    }, delay);

    return () => clearTimeout(timerRef.current);
  }, [submissionId, text, delay]);
}
```

### `frontend/src/hooks/useLanguageTool.js`

```javascript
import { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/aiService';

export function useLanguageTool(text, language = 'en-US', debounceMs = 1500) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!text || text.trim().length < 10) {
      setSuggestions([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await aiService.checkText(text, language);
        setSuggestions(data.matches || []);
      } catch {
        setSuggestions([]); // silent fail — never block editor
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timerRef.current);
  }, [text, language, debounceMs]);

  return { suggestions, loading };
}
```

> **useImageGen.js is deleted** — replaced by useVision.js above. Do not create this file.

### `frontend/src/hooks/useStory.js`

```javascript
import { useQuery } from '@tanstack/react-query';
import { storyService } from '../services/storyService';

export function useStory(storyId, partId) {
  const storyQuery = useQuery({
    queryKey: ['story', storyId],
    queryFn: () => storyService.getById(storyId),
    enabled: !!storyId
  });

  const partQuery = useQuery({
    queryKey: ['storyPart', storyId, partId],
    queryFn: () => storyService.getPart(storyId, partId),
    enabled: !!storyId && !!partId
  });

  return {
    story: storyQuery.data?.story,
    parts: storyQuery.data?.parts,
    part: partQuery.data?.part,
    storyLoading: storyQuery.isLoading,
    partLoading: partQuery.isLoading,
    storyError: storyQuery.error,
    partError: partQuery.error
  };
}
```

---

## Step 5.12 — SHARED COMPONENTS

### `frontend/src/components/shared/ProtectedRoute.jsx`

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <LoadingSpinner fullPage message="Loading..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'teacher' ? '/teacher/dashboard' : '/dashboard'} replace />;
  }
  return children;
}
```

### `frontend/src/components/shared/LoadingSpinner.jsx`

```jsx
export default function LoadingSpinner({ fullPage = false, message = 'Loading...' }) {
  const inner = (
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-purple-300 font-nunito font-semibold text-sm">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-navy flex items-center justify-center z-50">
        {inner}
      </div>
    );
  }
  return <div className="flex items-center justify-center py-12">{inner}</div>;
}
```

### `frontend/src/components/shared/ErrorBoundary.jsx`

```jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-navy flex items-center justify-center p-6">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md text-center shadow-glow">
            <div className="text-5xl mb-4">🚀</div>
            <h1 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h1>
            <p className="text-slate-400 mb-6">Don't worry — your work is saved. Try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### `frontend/src/components/shared/Navbar.jsx`

```jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout, isTeacher } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
      <Link to={isTeacher ? '/teacher/dashboard' : '/dashboard'} className="flex items-center gap-2">
        <span className="text-2xl">🚀</span>
        <span className="font-black text-xl text-white tracking-tight">Antigravity <span className="text-purple-400">AI</span></span>
      </Link>

      <div className="flex items-center gap-4">
        {user && (
          <>
            <span className="text-slate-400 text-sm hidden sm:block">
              {user.name}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${isTeacher ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>
                {user.role}
              </span>
            </span>
            {!isTeacher && (
              <Link to="/stories" className="text-slate-300 hover:text-white text-sm font-semibold transition">Stories</Link>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-red-400 font-semibold transition"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
```

---

## Step 5.13 — `frontend/src/App.jsx`

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/shared/ErrorBoundary';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Navbar from './components/shared/Navbar';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import Dashboard from './pages/student/Dashboard';
import Stories from './pages/student/Stories';
import StoryDetail from './pages/student/StoryDetail';
import Writer from './pages/student/Writer';
import Results from './pages/student/Results';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import Submissions from './pages/teacher/Submissions';
import SubmissionDetail from './pages/teacher/SubmissionDetail';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-navy font-nunito">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, isTeacher } = useAuth();

  return (
    <ErrorBoundary>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Root redirect */}
        <Route path="/" element={
          isAuthenticated
            ? <Navigate to={isTeacher ? '/teacher/dashboard' : '/dashboard'} replace />
            : <Navigate to="/login" replace />
        } />

        {/* Student routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute requiredRole="student">
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/stories" element={
          <ProtectedRoute requiredRole="student">
            <Layout><Stories /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/stories/:id" element={
          <ProtectedRoute requiredRole="student">
            <Layout><StoryDetail /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/stories/:id/part/:partId" element={
          <ProtectedRoute requiredRole="student">
            <Writer />
          </ProtectedRoute>
        } />
        <Route path="/results/:submissionId" element={
          <ProtectedRoute requiredRole="student">
            <Layout><Results /></Layout>
          </ProtectedRoute>
        } />

        {/* Teacher routes */}
        <Route path="/teacher/dashboard" element={
          <ProtectedRoute requiredRole="teacher">
            <Layout><TeacherDashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/teacher/submissions" element={
          <ProtectedRoute requiredRole="teacher">
            <Layout><Submissions /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/teacher/submissions/:id" element={
          <ProtectedRoute requiredRole="teacher">
            <Layout><SubmissionDetail /></Layout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
```

---
## Step 6.1 — `frontend/src/pages/Login.jsx`

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isTeacher } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authService.login({ email, password });
      login(data.token, data.user);
      navigate(data.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4 font-nunito"
      style={{ backgroundImage: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 70%)' }}>

      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <span className="text-6xl">🚀</span>
          <h1 className="text-4xl font-black text-white mt-3">Antigravity <span className="text-purple-400">AI</span></h1>
          <p className="text-slate-400 mt-2">Your story learning adventure awaits</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-8 shadow-glow border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-6">Welcome back</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-semibold mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition mt-2"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            No account?{' '}
            <Link to="/register" className="text-purple-400 hover:text-purple-300 font-semibold">Sign up free</Link>
          </p>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-500 text-center mb-2">Demo accounts:</p>
            <div className="text-xs text-slate-500 space-y-1 text-center">
              <p>Teacher: teacher@antigravity.ai / password123</p>
              <p>Student: alex@antigravity.ai / password123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 6.2 — `frontend/src/pages/Register.jsx`

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await authService.register(form);
      login(data.token, data.user);
      navigate(data.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4 font-nunito"
      style={{ backgroundImage: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 70%)' }}>

      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <span className="text-6xl">🚀</span>
          <h1 className="text-4xl font-black text-white mt-3">Join Antigravity <span className="text-purple-400">AI</span></h1>
          <p className="text-slate-400 mt-2">Start your story adventure today</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-8 shadow-glow border border-slate-700">

          {/* Role selector */}
          <p className="text-slate-300 font-semibold text-sm mb-3">I am a...</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {['student', 'teacher'].map(role => (
              <button
                key={role}
                type="button"
                onClick={() => setForm(f => ({ ...f, role }))}
                className={`py-4 rounded-xl border-2 font-bold capitalize transition ${
                  form.role === role
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                {role === 'student' ? '🎒 Student' : '👩‍🏫 Teacher'}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full Name', field: 'name', type: 'text', placeholder: 'Your name' },
              { label: 'Email', field: 'email', type: 'email', placeholder: 'you@example.com' },
              { label: 'Password (min 8 characters)', field: 'password', type: 'password', placeholder: '••••••••' }
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="block text-slate-300 text-sm font-semibold mb-1">{label}</label>
                <input
                  type={type}
                  value={form[field]}
                  onChange={update(field)}
                  required
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition"
                  placeholder={placeholder}
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 6.3 — `frontend/src/pages/student/Dashboard.jsx`

```jsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { storyService } from '../../services/storyService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const statusColor = { draft: 'text-slate-400 bg-slate-700', submitted: 'text-amber-400 bg-amber-500/20', reviewed: 'text-green-400 bg-green-500/20' };

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['mySubmissions'], queryFn: storyService.getMySubmissions });

  const submissions = data?.submissions || [];
  const stats = {
    started: submissions.length,
    submitted: submissions.filter(s => s.status !== 'draft').length,
    avgScore: submissions.filter(s => s.essaiResult?.score).length > 0
      ? Math.round(submissions.reduce((a, s) => a + (s.essaiResult?.score || 0), 0) / submissions.filter(s => s.essaiResult?.score).length)
      : null
  };

  return (
    <div className="fade-in">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-purple-900/60 to-slate-800/60 rounded-2xl p-6 mb-8 border border-purple-700/30">
        <h1 className="text-3xl font-black text-white">Hello, {user?.name}! 👋</h1>
        <p className="text-slate-300 mt-1">Ready to write your next story?</p>
        <Link to="/stories" className="inline-block mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-glow">
          ✨ Start a New Story
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Stories Started', value: stats.started, icon: '📖' },
          { label: 'Submitted', value: stats.submitted, icon: '📤' },
          { label: 'Avg Score', value: stats.avgScore !== null ? `${stats.avgScore}%` : '—', icon: '⭐' }
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-slate-800 rounded-2xl p-5 border border-slate-700 text-center">
            <div className="text-3xl mb-2">{icon}</div>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-slate-400 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent submissions */}
      <h2 className="text-xl font-bold text-white mb-4">My Recent Work</h2>
      {isLoading ? <LoadingSpinner /> : submissions.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-700">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-slate-400">You haven't started any stories yet.</p>
          <Link to="/stories" className="inline-block mt-4 text-purple-400 hover:text-purple-300 font-semibold">Browse Stories →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.slice(0, 8).map(sub => (
            <div key={sub._id} className="bg-slate-800 rounded-xl px-5 py-4 border border-slate-700 flex items-center justify-between hover:border-purple-700/50 transition">
              <div>
                <p className="font-bold text-white">{sub.storyId?.title || 'Story'}</p>
                <p className="text-slate-400 text-sm">Part {sub.storyPartId?.order}: {sub.storyPartId?.title}</p>
              </div>
              <div className="flex items-center gap-3">
                {sub.essaiResult?.score && (
                  <span className="text-amber-400 font-bold">{sub.essaiResult.score}%</span>
                )}
                <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${statusColor[sub.status]}`}>
                  {sub.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Step 6.4 — `frontend/src/pages/student/Stories.jsx`

```jsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { storyService } from '../../services/storyService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const themeColor = { adventure: 'text-amber-400 bg-amber-500/20', fantasy: 'text-purple-400 bg-purple-500/20', science: 'text-blue-400 bg-blue-500/20', friendship: 'text-pink-400 bg-pink-500/20', nature: 'text-green-400 bg-green-500/20', animals: 'text-orange-400 bg-orange-500/20' };
const artStyleIcon = { children_book: '🎨', cartoon: '🖼️', realistic_soft: '🌟' };

export default function Stories() {
  const { data, isLoading } = useQuery({ queryKey: ['stories'], queryFn: storyService.getAll });
  const stories = data?.stories || [];

  return (
    <div className="fade-in">
      <h1 className="text-3xl font-black text-white mb-2">Story Library</h1>
      <p className="text-slate-400 mb-8">Choose a story and start writing your adventure</p>

      {isLoading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map(story => (
            <div key={story._id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hover:border-purple-600/50 hover:shadow-glow transition group">
              {/* Cover image or placeholder */}
              <div className="h-40 bg-gradient-to-br from-purple-900 to-slate-800 flex items-center justify-center text-6xl">
                {artStyleIcon[story.artStyle] || '📖'}
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${themeColor[story.theme] || 'text-slate-400 bg-slate-700'}`}>
                    {story.theme}
                  </span>
                  <span className="text-xs text-slate-500">Age {story.ageLevel}+</span>
                </div>
                <h3 className="text-lg font-black text-white mb-1 group-hover:text-purple-300 transition">{story.title}</h3>
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{story.description}</p>
                <Link
                  to={`/stories/${story._id}`}
                  className="block text-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl transition"
                >
                  Start Writing ✍️
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Step 6.5 — `frontend/src/pages/student/StoryDetail.jsx`

```jsx
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { storyService } from '../../services/storyService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function StoryDetail() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ['story', id], queryFn: () => storyService.getById(id) });

  if (isLoading) return <LoadingSpinner fullPage message="Loading story..." />;
  if (!data?.story) return <div className="text-center text-slate-400 py-20">Story not found.</div>;

  const { story, parts } = data;

  return (
    <div className="fade-in max-w-3xl mx-auto">
      <Link to="/stories" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">← Back to Stories</Link>

      <div className="bg-gradient-to-br from-purple-900/40 to-slate-800 rounded-2xl p-8 mb-8 border border-purple-700/30">
        <h1 className="text-4xl font-black text-white mb-2">{story.title}</h1>
        <p className="text-slate-300 text-lg">{story.description}</p>
        <div className="flex gap-3 mt-4">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 capitalize">{story.theme}</span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-700 text-slate-300">Age {story.ageLevel}+</span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-700 text-slate-300">{story.language}</span>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Choose a Story Part</h2>
      <div className="space-y-4">
        {(parts || []).map((part, index) => (
          <Link
            key={part._id}
            to={`/stories/${id}/part/${part._id}`}
            className="block bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-purple-600/60 hover:shadow-glow transition group"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400 font-black text-lg shrink-0">
                {index + 1}
              </div>
              <div>
                <h3 className="font-black text-white text-lg group-hover:text-purple-300 transition">{part.title}</h3>
                <p className="text-slate-400 text-sm mt-1 line-clamp-2">{part.text}</p>
                {part.writingPrompt && (
                  <p className="text-amber-400/80 text-xs mt-2 italic">📝 {part.writingPrompt}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

---

## Step 6.6 — `frontend/src/pages/student/Writer.jsx`
### (The Most Complex Page)

```jsx
import { useState, useEffect } from 'react';
## Step 6.7 — `frontend/src/pages/student/Results.jsx`

```jsx
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { storyService } from '../../services/storyService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

function ScoreRing({ score }) {
  const r = 52, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} stroke="#1e293b" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} stroke="#7c3aed" strokeWidth="10" fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          className="score-ring" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{score}</span>
        <span className="text-slate-400 text-xs">/ 100</span>
      </div>
    </div>
  );
}

function RubricBar({ label, score }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300 capitalize">{label}</span>
        <span className="text-white font-bold">{score}%</span>
      </div>
      <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full transition-all duration-1000"
          style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function Results() {
  const { submissionId } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => storyService.getSubmission(submissionId)
  });
  const { data: feedbackData } = useQuery({
    queryKey: ['feedback', submissionId],
    queryFn: () => storyService.getFeedback(submissionId)
  });

  if (isLoading) return <LoadingSpinner fullPage message="Loading results..." />;
  const sub = data?.submission;
  const result = sub?.essaiResult;
  const feedback = feedbackData?.feedback || [];

  if (!result) return (
    <div className="text-center py-20">
      <p className="text-slate-400">No evaluation results found.</p>
      <Link to="/stories" className="text-purple-400 hover:text-purple-300 mt-4 inline-block">Back to Stories</Link>
    </div>
  );

  return (
    <div className="fade-in max-w-2xl mx-auto">
      <Link to="/dashboard" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">← Back to Dashboard</Link>

      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 mb-6 text-center">
        <h1 className="text-2xl font-black text-white mb-6">Your Results 🎉</h1>
        <ScoreRing score={result.score} />
        <p className="text-slate-300 mt-6 leading-relaxed">{result.overallFeedback}</p>
      </div>

      {/* Rubric breakdown */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
        <h2 className="font-bold text-white mb-4">Score Breakdown</h2>
        <div className="space-y-4">
          {Object.entries(result.rubricBreakdown || {}).map(([key, val]) => (
            <RubricBar key={key} label={key} score={val} />
          ))}
        </div>
      </div>

      {/* Strengths and improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-900/20 rounded-2xl p-5 border border-green-700/30">
          <h3 className="text-green-400 font-bold mb-3">✅ Strengths</h3>
          <ul className="space-y-2">
            {(result.strengths || []).map((s, i) => (
              <li key={i} className="text-slate-300 text-sm flex gap-2"><span className="text-green-400">•</span>{s}</li>
            ))}
          </ul>
        </div>
        <div className="bg-amber-900/20 rounded-2xl p-5 border border-amber-700/30">
          <h3 className="text-amber-400 font-bold mb-3">💡 Areas to Improve</h3>
          <ul className="space-y-2">
            {(result.improvements || []).map((s, i) => (
              <li key={i} className="text-slate-300 text-sm flex gap-2"><span className="text-amber-400">•</span>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Teacher feedback */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h2 className="font-bold text-white mb-3">👩‍🏫 Teacher Feedback</h2>
        {feedback.length > 0 ? feedback.map(f => (
          <div key={f._id} className="bg-slate-700/50 rounded-xl p-4">
            <p className="text-slate-300 leading-relaxed">{f.comment}</p>
            {f.score && <p className="text-amber-400 font-bold mt-2">Score from teacher: {f.score}/100</p>}
            <p className="text-slate-500 text-xs mt-2">— {f.teacherId?.name}</p>
          </div>
        )) : (
          <p className="text-slate-500 italic">Awaiting teacher review...</p>
        )}
      </div>
    </div>
  );
}
```

---

## Step 6.8 — `frontend/src/pages/NotFound.jsx`

```jsx
import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center font-nunito">
      <div className="text-center">
        <div className="text-8xl mb-4">🚀</div>
        <h1 className="text-4xl font-black text-white mb-2">Lost in Space!</h1>
        <p className="text-slate-400 mb-6">This page doesn't exist.</p>
        <Link to="/" className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl transition">
          Go Home
        </Link>
      </div>
    </div>
  );
}
```

---

# PHASE 7 — TEACHER PAGES

## Step 7.1 — `frontend/src/pages/teacher/TeacherDashboard.jsx`

```jsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { aiService } from '../../services/aiService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const statusColor = {
  draft: 'text-slate-400 bg-slate-700',
  submitted: 'text-amber-400 bg-amber-500/20',
  reviewed: 'text-green-400 bg-green-500/20'
};

export default function TeacherDashboard() {
  const { user } = useAuth();

  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['teacherSubmissions'],
    queryFn: () => aiService.getTeacherSubmissions()
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['classSummary'],
    queryFn: aiService.getClassSummary,
    retry: false
  });

  const submissions = subsData?.submissions || [];
  const recent = submissions.slice(0, 10);

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900/40 to-slate-800 rounded-2xl p-6 mb-8 border border-amber-700/30">
        <h1 className="text-3xl font-black text-white">Teacher Dashboard 👩‍🏫</h1>
        <p className="text-slate-300 mt-1">Hello, {user?.name}! Here is your class overview.</p>
      </div>

      {/* Class summary from Groq */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-8">
        <h2 className="font-bold text-white mb-3">🤖 AI Class Summary</h2>
        {summaryLoading ? <LoadingSpinner /> : summaryData ? (
          <div>
            <p className="text-slate-300 leading-relaxed mb-4">{summaryData.classSummary}</p>
            {summaryData.commonWeaknesses?.length > 0 && (
              <div className="mb-3">
                <p className="text-amber-400 text-sm font-bold mb-2">Common Areas to Work On:</p>
                <ul className="space-y-1">
                  {summaryData.commonWeaknesses.map((w, i) => (
                    <li key={i} className="text-slate-400 text-sm flex gap-2"><span className="text-amber-500">•</span>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {summaryData.suggestions?.length > 0 && (
              <div>
                <p className="text-purple-400 text-sm font-bold mb-2">Teaching Suggestions:</p>
                <ul className="space-y-1">
                  {summaryData.suggestions.map((s, i) => (
                    <li key={i} className="text-slate-400 text-sm flex gap-2"><span className="text-purple-500">→</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-500 italic text-sm">Summary will appear once students submit their work.</p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Submissions', value: submissions.length, icon: '📋' },
          { label: 'Awaiting Review', value: submissions.filter(s => s.status === 'submitted').length, icon: '⏳' },
          { label: 'Reviewed', value: submissions.filter(s => s.status === 'reviewed').length, icon: '✅' }
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-slate-800 rounded-2xl p-5 border border-slate-700 text-center">
            <div className="text-3xl mb-2">{icon}</div>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-slate-400 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent submissions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Recent Submissions</h2>
        <Link to="/teacher/submissions" className="text-purple-400 hover:text-purple-300 text-sm font-semibold">
          View All →
        </Link>
      </div>

      {subsLoading ? <LoadingSpinner /> : recent.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-700">
          <p className="text-slate-400">No submissions yet. Students will appear here once they start writing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map(sub => (
            <Link
              key={sub._id}
              to={`/teacher/submissions/${sub._id}`}
              className="flex items-center justify-between bg-slate-800 rounded-xl px-5 py-4 border border-slate-700 hover:border-purple-600/50 transition"
            >
              <div>
                <p className="font-bold text-white">{sub.studentId?.name || 'Student'}</p>
                <p className="text-slate-400 text-sm">{sub.storyId?.title} · Part {sub.storyPartId?.order}</p>
              </div>
              <div className="flex items-center gap-3">
                {sub.essaiResult?.score != null && (
                  <span className="text-amber-400 font-bold">{sub.essaiResult.score}%</span>
                )}
                <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${statusColor[sub.status]}`}>
                  {sub.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Step 7.2 — `frontend/src/pages/teacher/Submissions.jsx`

```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { aiService } from '../../services/aiService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const statusColor = {
  draft: 'text-slate-400 bg-slate-700',
  submitted: 'text-amber-400 bg-amber-500/20',
  reviewed: 'text-green-400 bg-green-500/20'
};

export default function Submissions() {
  const [filter, setFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['teacherSubmissions', filter],
    queryFn: () => aiService.getTeacherSubmissions(filter === 'all' ? null : filter)
  });

  const submissions = data?.submissions || [];

  return (
    <div className="fade-in">
      <h1 className="text-3xl font-black text-white mb-2">All Submissions</h1>
      <p className="text-slate-400 mb-6">Review and give feedback on student work</p>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'draft', 'submitted', 'reviewed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm capitalize transition ${filter === f ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingSpinner /> : submissions.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-12 text-center border border-slate-700">
          <p className="text-slate-400">No {filter === 'all' ? '' : filter} submissions found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => (
            <Link
              key={sub._id}
              to={`/teacher/submissions/${sub._id}`}
              className="flex items-center justify-between bg-slate-800 rounded-xl px-5 py-4 border border-slate-700 hover:border-purple-600/50 transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-300 font-black">
                  {(sub.studentId?.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-white">{sub.studentId?.name || 'Student'}</p>
                  <p className="text-slate-400 text-sm">{sub.storyId?.title} · Part {sub.storyPartId?.order}: {sub.storyPartId?.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {sub.essaiResult?.score != null && (
                  <span className="text-amber-400 font-bold">{sub.essaiResult.score}%</span>
                )}
                <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${statusColor[sub.status]}`}>
                  {sub.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Step 7.3 — `frontend/src/pages/teacher/SubmissionDetail.jsx`

```jsx
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storyService } from '../../services/storyService';
import { aiService } from '../../services/aiService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

function RubricBar({ label, score }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300 capitalize">{label}</span>
        <span className="text-white font-bold">{score}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function SubmissionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [comment, setComment] = useState('');
  const [score, setScore] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => storyService.getSubmission(id)
  });

  const sub = data?.submission;
  const result = sub?.essaiResult;

  const handleSaveFeedback = async () => {
    if (!comment.trim()) { alert('Please write a comment.'); return; }
    setSaving(true);
    try {
      await aiService.saveFeedback({
        submissionId: id,
        comment,
        score: score ? parseInt(score) : undefined
      });
      qc.invalidateQueries(['submission', id]);
      alert('Feedback saved! The student will see your comment.');
    } catch {
      alert('Failed to save feedback. Please try again.');
    }
    setSaving(false);
  };

  if (isLoading) return <LoadingSpinner fullPage message="Loading submission..." />;
  if (!sub) return <div className="text-center py-20 text-slate-400">Submission not found.</div>;

  return (
    <div className="fade-in max-w-4xl mx-auto">
      <Link to="/teacher/submissions" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">
        ← Back to Submissions
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">{sub.studentId?.name || 'Student'}'s Work</h1>
          <p className="text-slate-400">{sub.storyId?.title} · Part {sub.storyPartId?.order}: {sub.storyPartId?.title}</p>
        </div>
        <span className={`text-sm font-bold px-4 py-2 rounded-full capitalize ${
          sub.status === 'reviewed' ? 'bg-green-500/20 text-green-400' :
          sub.status === 'submitted' ? 'bg-amber-500/20 text-amber-400' :
          'bg-slate-700 text-slate-400'
        }`}>
          {sub.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Student work */}
        <div className="space-y-4">
          {/* Image */}
          {sub.generatedImageUrl && (
            <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
              <img src={sub.generatedImageUrl} alt="Student's story scene" className="w-full object-cover" />
            </div>
          )}

          {/* Written text */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
            <h3 className="font-bold text-white mb-3">Student's Writing</h3>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
              {sub.writtenText || <span className="italic text-slate-500">No text written yet.</span>}
            </p>
            <p className="text-slate-500 text-xs mt-3">{sub.writtenText?.split(/\s+/).filter(Boolean).length || 0} words</p>
          </div>
        </div>

        {/* Right: Evaluation + feedback form */}
        <div className="space-y-4">
          {/* AI evaluation */}
          {result ? (
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <h3 className="font-bold text-white mb-4">AI Evaluation — {result.score}/100</h3>
              <div className="space-y-3 mb-4">
                {Object.entries(result.rubricBreakdown || {}).map(([k, v]) => (
                  <RubricBar key={k} label={k} score={v} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-green-400 text-xs font-bold mb-1">STRENGTHS</p>
                  {result.strengths?.map((s, i) => (
                    <p key={i} className="text-slate-400 text-xs">• {s}</p>
                  ))}
                </div>
                <div>
                  <p className="text-amber-400 text-xs font-bold mb-1">IMPROVEMENTS</p>
                  {result.improvements?.map((s, i) => (
                    <p key={i} className="text-slate-400 text-xs">• {s}</p>
                  ))}
                </div>
              </div>
              <p className="text-slate-300 text-sm italic">{result.overallFeedback}</p>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <p className="text-slate-500 italic text-sm">No AI evaluation yet — student has not submitted.</p>
            </div>
          )}

          {/* Teacher feedback form */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
            <h3 className="font-bold text-white mb-4">
              {sub.teacherFeedback ? 'Your Feedback (Saved)' : 'Add Your Feedback'}
            </h3>

            {sub.teacherFeedback && (
              <div className="bg-green-900/20 rounded-xl p-3 mb-4 border border-green-700/30">
                <p className="text-green-300 text-sm">{sub.teacherFeedback}</p>
              </div>
            )}

            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              placeholder={sub.teacherFeedback ? 'Update your comment...' : 'Write your feedback for this student...'}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-purple-500 resize-none"
            />

            <div className="flex gap-3 mt-3">
              <input
                type="number"
                value={score}
                onChange={e => setScore(e.target.value)}
                min="0" max="100"
                placeholder="Score (0-100)"
                className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleSaveFeedback}
                disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-navy font-bold py-2 px-4 rounded-xl transition text-sm"
              >
                {saving ? 'Saving...' : 'Save Feedback'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

# PHASE 8 — FINAL STEPS

## Step 8.1 — `frontend/vite.config.js`

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
```

---

## Step 8.2 — `frontend/package.json`

```json
{
  "name": "antigravity-ai-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "axios": "^1.6.0",
    "@tanstack/react-query": "^5.17.0",
    "jwt-decode": "^4.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.12",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.35",
    "autoprefixer": "^10.4.17"
  }
}
```

---

## Step 8.3 — `README.md`

```markdown
# 🚀 Antigravity AI — Story Learning Platform

A full-stack story learning platform for students and teachers.
100% free to run — no GPU required, no credit card ever.

## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js 20 + Express + MongoDB
- **AI Text:** Groq API (Llama 3.1 8B) — free
- **AI Vision:** Groq Llama 4 Scout — reads teacher images, completely free
- **Grammar:** LanguageTool Docker — free
- **Storage:** Cloudinary free tier

## Quick Start

### 1. Get Free API Keys (5 minutes)
- Groq: https://console.groq.com (no card)
# Groq handles both text and vision — same key, no extra signup
- Cloudinary: https://cloudinary.com (no card)

### 2. Configure Environment
cp .env.example .env
# Edit .env and fill in your 3 API keys

### 3. Start Everything
docker-compose up --build

### 4. Seed the Database
docker exec antigravity_backend node scripts/seed.js

### 5. Open the App
http://localhost:3000

## Login Credentials (after seeding)
| Role    | Email                      | Password    |
|---------|----------------------------|-------------|
| Teacher | teacher@antigravity.ai     | password123 |
| Student | alex@antigravity.ai        | password123 |
| Student | mia@antigravity.ai         | password123 |

## Project Structure
antigravity-ai/
├── frontend/     React + Vite + Tailwind
├── backend/      Node.js + Express + Mongoose
├── docker-compose.yml
└── .env.example

## Upgrade Path
When ready to pay for better AI quality:
- Groq → Claude API: swap backend/src/services/groq.service.js only
- Vision quality upgrade: swap backend/src/services/vision.service.js model name only
- Browser TTS → ElevenLabs: change TTS_PROVIDER in .env
- Zero frontend changes needed
```

---

# PHASE 9 — RUN AND TEST

## Step 9.1 — Complete Build and Start

```bash
# From antigravity-ai/ root folder:

# Build and start all 4 services
docker-compose up --build

# Wait for all services to be ready (first build takes 3-5 minutes)
# You will see these messages:
#   ✅ MongoDB connected
#   ✅ Antigravity AI backend running on port 5000
#   LanguageTool started (may take 30-60 seconds)

# In a NEW terminal — seed the database
docker exec antigravity_backend node scripts/seed.js

# Open in browser
# http://localhost:3000
```

## Step 9.2 — Development Mode (Without Docker)

```bash
# Terminal 1 — start infrastructure only
docker-compose up -d mongodb languagetool

# Terminal 2 — start backend
cd backend
cp ../.env .env   # or set MONGODB_URI=mongodb://localhost:27017/antigravity_ai
npm run dev

# Terminal 3 — start frontend
cd frontend
npm run dev

# Open http://localhost:3000
```

## Step 9.3 — Complete Test Checklist

```
Student flow:
□ Register as student at /register
□ Login at /login
□ See dashboard with stats and "Start New Story" button
□ Browse stories at /stories — see 3 story cards
□ Open a story — see 3 parts listed
□ Click a story part — writer page opens (split panel)
□ See teacher's image displayed in left panel
□ Click "Get Story Idea from Image" — Groq reads image → continuation appended to editor
□ Write text in the editor
□ See grammar suggestions appear after 1.5 seconds
□ Click "Get a Hint" — see hint card appear
□ Click "Continue with AI" — text continues in italic
□ Click "Listen to Text" — browser speaks the text
□ Click "Submit" — redirects to results page
□ Results page shows: score ring, rubric bars, strengths, improvements

Teacher flow:
□ Login as teacher (teacher@antigravity.ai / password123)
□ See teacher dashboard with AI class summary
□ See stats: total submissions, awaiting review, reviewed
□ See recent submissions list
□ Click a submission — see student's image + text + evaluation
□ Add a comment and score (0-100)
□ Click "Save Feedback"
□ Login as student again — see teacher feedback on results page
```

---


# PHASE 10 — UPGRADE PATH

## When You Get a Better Machine (i7 + RTX 3060)

Only these files change. Everything else stays identical.

### Change 1: Upgrade vision quality — swap model name only

The current vision model (`meta-llama/llama-4-scout-17b-16e-instruct`) already
produces excellent results on Groq's free tier. If you want to upgrade to an
even more powerful vision model in the future, change one line in `.env`:

```env
# Current (free, excellent)
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct

# Future upgrade option (if Groq adds newer models)
GROQ_VISION_MODEL=meta-llama/llama-4-maverick-17b-128e-instruct
```

No code changes. One environment variable.

### Change 2: Replace Groq text with Claude API (when ready to pay)

Replace `backend/src/services/groq.service.js` with a version
that calls `https://api.anthropic.com/v1/messages` using `claude-sonnet-4-6`.

All function names, return shapes, and fallbacks stay identical.
`vision.service.js` is unaffected — it stays on Groq.

Add to `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-6
```

### What never changes

```
Frontend:         ZERO changes
All routes:       ZERO changes
All models:       ZERO changes
All prompts:      ZERO changes
vision.service:   ZERO changes (stays on Groq Llama 4 Scout)
Docker:           ZERO changes
```

---

## All API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/stories
GET    /api/stories/:id
GET    /api/stories/:id/parts/:partId
POST   /api/stories                     (teacher)
POST   /api/stories/:id/parts           (teacher)
PUT    /api/stories/:id/parts/:partId/image  (teacher) — upload image for story part

POST   /api/submissions
GET    /api/submissions/mine
GET    /api/submissions/:id
PUT    /api/submissions/:id/text

POST   /api/ai/image-analyze           (rate limited) — vision: image → story continuation
POST   /api/ai/story-generate           (rate limited)
POST   /api/ai/hint                     (rate limited)
POST   /api/ai/audio-generate           (rate limited)
POST   /api/evaluation/score            (rate limited)

POST   /api/writing/check               (rate limited)

POST   /api/feedback                    (teacher)
GET    /api/feedback/:submissionId

GET    /api/teacher/submissions         (teacher)
GET    /api/teacher/class-summary       (teacher)
```

## File Creation Order (Build This Sequence)

```
Phase 0:  .env, docker-compose.yml, Dockerfiles, nginx.conf
Phase 1:  docker-compose up -d mongodb languagetool
Phase 2:  backend/ — server.js, config/, models/, middleware/
Phase 3:  backend/ — prompts/, services/
Phase 4:  backend/ — controllers/, routes/, scripts/seed.js
Phase 5:  frontend/ — package.json, vite.config.js, tailwind.config.js
Phase 6:  frontend/ — index.css, main.jsx, context/, services/, hooks/
Phase 7:  frontend/ — components/shared/, App.jsx
Phase 8:  frontend/ — pages/Login, Register, student/, teacher/
Phase 9:  docker-compose up --build && seed && test
```

## Free Tier Limits Summary

```
Groq (text AI):           14,400 requests/day  ✅ Far more than needed
Groq Vision (Llama 4 Scout): 14,400 req/day ✅ Same limit as text generation
Cloudinary (storage):     25GB                  ✅ Hundreds of images
LanguageTool:             Unlimited             ✅ Self-hosted
MongoDB:                  Unlimited             ✅ Self-hosted
Browser TTS:              Unlimited             ✅ Built into browser
```

---

*Antigravity AI — Complete Developer Blueprint v4.0*
*100% Free · Groq Text + Groq Vision (Llama 4 Scout) + LanguageTool + Browser TTS*
*Ryzen 5 5600G Compatible · No GPU · No Credit Card · No Expiry*
*Every file. Every line. Every step.*
