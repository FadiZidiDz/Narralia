You are a senior full-stack engineer with deep expertise in Node.js, React, MongoDB, and AI API integration. Build "Antigravity AI" — a story learning platform for students and teachers — production-ready, fully wired end-to-end, zero placeholders, zero TODO comments.

════════════════════════════════════════
TECH STACK
════════════════════════════════════════
Frontend:  React 18 + Vite + Tailwind CSS + React Router v6 + Axios + TanStack Query
Backend:   Node.js 20 + Express 5 + Mongoose + bcryptjs + jsonwebtoken
AI Text:   Groq SDK — model: llama-3.1-8b-instant
AI Vision: Groq SDK — model: meta-llama/llama-4-scout-17b-16e-instruct
Grammar:   LanguageTool Docker (self-hosted, HTTP API)
TTS:       Browser Web Speech API (free, no server)
Storage:   Cloudinary v2 (images + audio)
DB:        MongoDB 7.0 Docker + Mongoose
Infra:     Docker Compose (4 services: mongodb, backend, frontend, languagetool)
Upload:    multer (memory storage, 4MB limit, images only)

════════════════════════════════════════
ENVIRONMENT VARIABLES
════════════════════════════════════════
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=<32+ char secret>
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb://mongodb:27017/antigravity_ai
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-8b-instant
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
LANGUAGETOOL_URL=http://languagetool:8010/v2
TTS_PROVIDER=browser

════════════════════════════════════════
ARCHITECTURE — READ CAREFULLY
════════════════════════════════════════
The core learning flow is:
1. Teacher creates story → uploads ONE image per story part (max 4MB)
2. Student opens writer page → sees teacher's image on the left
3. Student clicks "Get Story Idea from Image" → backend fetches image
   from Cloudinary, converts to base64, sends to Groq Llama 4 Scout vision
   model → returns 3-5 sentence story continuation → appended to editor
4. Student writes, gets grammar hints (LanguageTool), text AI hints (Groq text),
   listens via browser TTS, then submits
5. Groq evaluates the writing with a rubric → returns JSON score
6. Teacher reviews and adds feedback

THERE IS NO TEXT-TO-IMAGE. No HuggingFace. No SDXL.
Images flow ONE direction only: teacher uploads → Cloudinary stores →
student sees → Groq vision reads → story continuation returned.

════════════════════════════════════════
BACKEND FILE STRUCTURE
════════════════════════════════════════
backend/
├── server.js
├── scripts/seed.js
└── src/
    ├── app.js
    ├── config/
    │   ├── db.js          (mongoose connect, 3 retries, 5s delay)
    │   └── groq.js        (new Groq({ apiKey }))
    ├── middleware/
    │   ├── auth.middleware.js      (protect, restrictTo)
    │   ├── rateLimiter.middleware.js  (aiLimiter 10/min, writingLimiter 30/min)
    │   └── error.middleware.js
    ├── models/
    │   ├── User.model.js       (name, email, passwordHash, role, ageLevel)
    │   ├── Story.model.js      (title, description, theme, ageLevel, artStyle, createdBy)
    │   ├── StoryPart.model.js  (storyId, order, title, text, imageUrl, writingPrompt, characters, setting, mood, rubric)
    │   ├── Submission.model.js (studentId, storyId, storyPartId, writtenText, audioUrl, languageToolResult, essaiResult, teacherFeedback, status)
    │   └── Feedback.model.js   (submissionId, teacherId, comment, score)
    ├── prompts/index.js
    ├── services/
    │   ├── groq.service.js         (generateStoryContinuation, evaluateStudentText, generateWritingHint, generateTeacherSummary)
    │   ├── vision.service.js       (generateContinuationFromImage, describeImage)
    │   ├── cloudinary.service.js   (uploadBase64, uploadAudioBuffer)
    │   ├── languageTool.service.js (checkText — always returns [] on error, never blocks)
    │   └── tts.service.js          (browser returns {useBrowser:true}, elevenlabs optional)
    ├── controllers/
    │   ├── auth.controller.js       (register, login, getMe)
    │   ├── story.controller.js      (getAllStories, getStory, getStoryPart, createStory, addStoryPart w/ multer, uploadPartImage)
    │   ├── submission.controller.js (createSubmission, getSubmission, saveText, getMySubmissions)
    │   ├── ai.controller.js         (analyzeImageAndContinue, generateStoryContinuation, getWritingHint, generateAudio)
    │   ├── evaluation.controller.js (evaluateSubmission)
    │   ├── writing.controller.js    (checkText)
    │   ├── feedback.controller.js   (createFeedback, getFeedback)
    │   └── teacher.controller.js    (getAllSubmissions, getClassSummary)
    └── routes/
        ├── auth.routes.js
        ├── story.routes.js      (multer on POST /:id/parts and PUT /:id/parts/:partId/image)
        ├── submission.routes.js
        ├── ai.routes.js         (all routes: protect + aiLimiter)
        ├── writing.routes.js    (protect + writingLimiter)
        ├── evaluation.routes.js (protect + aiLimiter)
        ├── feedback.routes.js
        └── teacher.routes.js    (protect + restrictTo('teacher'))

════════════════════════════════════════
CRITICAL BACKEND RULES
════════════════════════════════════════
- User.model: pre('save') hook hashes passwordHash ONLY if it doesn't start with '$2b$'
- Seed script: ALWAYS use new User({}).save() — never User.create() — to trigger bcrypt hook
- vision.service: fetch image URL with axios (arraybuffer), convert to base64, send to Groq
  as { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } }
- groq.service: every function has try/catch with meaningful fallback — app never crashes
- evaluateStudentText: strip ```json fences before JSON.parse, fallback score 70 on error
- languageTool: ANY failure returns [] silently — never throw, never block writing
- story.controller addStoryPart: accepts multipart/form-data, if req.file exists upload
  to Cloudinary and save URL to partData.imageUrl
- All AI routes: 60 second Promise.race timeout wrapper around every Groq call
- Error responses always: { error: string, detail?: string }
- Mount routes in app.js with helmet(), cors(FRONTEND_URL), express.json()

════════════════════════════════════════
API ROUTES
════════════════════════════════════════
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/stories
GET    /api/stories/:id
GET    /api/stories/:id/parts/:partId
POST   /api/stories                           (teacher)
POST   /api/stories/:id/parts                 (teacher, multipart/form-data + image)
PUT    /api/stories/:id/parts/:partId/image   (teacher, multipart/form-data + image)

POST   /api/submissions
GET    /api/submissions/mine
GET    /api/submissions/:id
PUT    /api/submissions/:id/text

POST   /api/ai/image-analyze    (vision: read teacher image → story continuation)
POST   /api/ai/story-generate   (text: story continuation)
POST   /api/ai/hint             (text: writing hint)
POST   /api/ai/audio-generate   (tts)

POST   /api/evaluation/score
POST   /api/writing/check
POST   /api/feedback            (teacher)
GET    /api/feedback/:submissionId
GET    /api/teacher/submissions
GET    /api/teacher/class-summary

════════════════════════════════════════
GROQ PROMPTS — EXACT BEHAVIOR
════════════════════════════════════════
storyGeneration(language, ageLevel):
  3-5 sentences, age-appropriate, positive only, match student style,
  plain text output, end on a hook. No labels, no quotes.

essayEvaluation:
  Returns ONLY JSON — no preamble, no markdown fences:
  { score, rubricBreakdown{content,language,creativity,structure},
    strengths[], improvements[], overallFeedback }
  Min score 40 for any genuine attempt. Encouraging tone always.

writingHints(ageLevel):
  Returns ONLY JSON: { hint, questionToAsk }
  Max 30 words each. Never writes the story for the student.

teacherSummary:
  Returns ONLY JSON: { classSummary, commonWeaknesses[], topStudents[], suggestions[] }

vision system prompt (in vision.service):
  "Read this image and write a 3-5 sentence story continuation
   connecting what you see to the story context. Age-appropriate,
   positive, plain text only."

════════════════════════════════════════
FRONTEND FILE STRUCTURE
════════════════════════════════════════
frontend/src/
├── main.jsx         (BrowserRouter + QueryClientProvider + AuthProvider)
├── index.css        (Tailwind + fade-in animation + score-ring animation)
├── App.jsx          (all routes, Layout wrapper, ProtectedRoute)
├── context/AuthContext.jsx
├── services/
│   ├── api.js          (axios instance, JWT interceptor, 401 → /login)
│   ├── authService.js
│   ├── storyService.js
│   └── aiService.js    (analyzeImage, generateStoryContinuation, getWritingHint,
│                        generateAudio, evaluateSubmission, checkText,
│                        getClassSummary, getTeacherSubmissions, saveFeedback,
│                        uploadPartImage)
├── hooks/
│   ├── useAuth.js
│   ├── useAutoSave.js       (debounced PUT every 30s, silent fail)
│   ├── useLanguageTool.js   (1.5s debounce, returns [] on any error)
│   ├── useStory.js          (TanStack Query for story + part)
│   └── useVision.js         (analyzeImageAndContinue, loading, error state)
├── components/
│   ├── shared/
│   │   ├── Navbar.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── ErrorBoundary.jsx
│   │   └── ProtectedRoute.jsx
│   └── teacher/
│       └── ImageUpload.jsx  (file input → uploadPartImage → preview)
└── pages/
    ├── Login.jsx
    ├── Register.jsx   (role selector cards: student / teacher)
    ├── NotFound.jsx
    ├── student/
    │   ├── Dashboard.jsx    (stats, recent submissions, "Start New Story" CTA)
    │   ├── Stories.jsx      (story grid cards)
    │   ├── StoryDetail.jsx  (parts list)
    │   ├── Writer.jsx       ← MOST COMPLEX — see below
    │   └── Results.jsx      (score ring SVG, rubric bars, strengths, improvements)
    └── teacher/
        ├── TeacherDashboard.jsx   (AI class summary, stats, recent submissions)
        ├── Submissions.jsx        (filterable table: all/draft/submitted/reviewed)
        └── SubmissionDetail.jsx   (image + text + evaluation + feedback form)

════════════════════════════════════════
WRITER PAGE — EXACT SPECIFICATION
════════════════════════════════════════
Split layout: LEFT 40% | RIGHT 60%

LEFT PANEL:
  1. Story text card (part.text + writing prompt in amber)
  2. Image panel:
     - If part.imageUrl exists: show <img> tag (max-h-72, object-cover)
     - If no image: dashed placeholder "No image yet — teacher will add one"
     - Button: "🖼 Get Story Idea from Image"
       → disabled if no part.imageUrl or no submissionId
       → calls useVision.analyzeImageAndContinue(submissionId, partId)
       → on success: append continuation to textarea
       → loading text: "🔍 Reading image..."
       → error states: no_image (amber warning) | general (red, dismissible)
     - Small note: "Groq AI reads the image and suggests what happens next"

RIGHT PANEL:
  1. Header: "Your Story" + word count + "Saved ✓" flash
  2. Textarea (min-h 300px, auto-save onBlur, placeholder references the image)
  3. Grammar suggestions (from useLanguageTool, debounced 1.5s)
     - Click suggestion → applySuggestion(match, replacement)
     - Never shown if suggestions array is empty
  4. Hint card (shown only after clicking hint, has Dismiss button)
  5. Two buttons: "💡 Get a Hint" | "🤖 Continue with AI"
  6. Bottom bar: "🔊 Listen/Stop" (Web Speech API) | "📤 Submit" (amber, evaluates → /results)

DESIGN SYSTEM (apply everywhere):
  bg: #0f172a (navy) | primary: #7c3aed (purple) | accent: #f59e0b (amber)
  text: #f8fafc | cards: rounded-2xl, border border-slate-700
  font: Nunito (Google Fonts) | fade-in animation on all pages

════════════════════════════════════════
SEED DATA (3 stories, 3 parts each)
════════════════════════════════════════
Users (use new User({}).save() for all):
  teacher@antigravity.ai / password123 / role: teacher
  alex@antigravity.ai   / password123 / role: student / ageLevel: 10
  mia@antigravity.ai    / password123 / role: student / ageLevel: 8

Story 1: "The Lost Star" — adventure, age 8, children_book
Story 2: "The Dragon's Garden" — fantasy, age 10, cartoon
Story 3: "The Robot Who Dreamed" — science, age 12, realistic_soft
Each story: 3 fully written parts with text (4-5 sentences), writingPrompt,
characters[], setting, mood. imageUrl: null (teacher uploads later).

════════════════════════════════════════
NON-NEGOTIABLE RULES
════════════════════════════════════════
✅ Zero TODO comments. Zero placeholder functions. Every file complete.
✅ Every Groq call: try/catch + meaningful fallback. App never crashes on AI failure.
✅ LanguageTool failure: always return [] silently. Never block the writing editor.
✅ Vision endpoint: if no imageUrl on story part → return { error: 'no_image' } with friendly message.
✅ JWT on every protected route. API keys never reach the frontend.
✅ Passwords: bcrypt via pre-save hook. Never plain text. Use .save() not .create() in seed.
✅ MongoDB: 3 retries on startup before throwing.
✅ multer: memory storage, 4MB limit, images only (mimetype check).
✅ All API errors: { error: string } shape. All success: { data } shape.
✅ docker-compose up --build starts all 4 services correctly.
✅ Frontend: loading state on every async action. Error state on every page. Never blank screen.
✅ Install multer: npm install multer (add to package.json dependencies).

Build the complete project now. In this order:
1. docker-compose.yml + Dockerfiles + .env.example
2. Backend: config → models → middleware → prompts → services → controllers → routes → app.js → server.js → seed.js
3. Frontend: setup → context → services → hooks → components → pages
Do not stop or summarize. Write every file in full.
