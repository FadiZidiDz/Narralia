# Narralia — Story Learning Platform

AI-assisted story writing for students and teachers (Groq, optional illustrations, vocabulary sheets).

## Quick start (Windows)

### 1. Install Docker Desktop (one time)

Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/). Start it and wait until Docker is **running**.

### 2. One-click setup

1. Copy this project folder to the new PC.
2. Double-click **`install.bat`** in the project root.
3. When prompted, edit **`.env`** with your API keys (see `.env.example`).
4. The script builds containers, starts the app, and opens your browser.

Default URL: **http://localhost:3000** (or the port in `FRONTEND_PORT`).

### Daily use

| Action | Double-click |
|--------|----------------|
| Start app | `start.bat` |
| Stop app | `stop.bat` |
| First install / rebuild | `install.bat` |

### Optional demo accounts

After the stack is running:

```powershell
docker exec narralia_backend node src/scripts/seed.js
```

Demo logins: `teacher@narralia.app` / `alex@narralia.app` — password `password123`

## Manual commands

```powershell
cd path\to\Story-app
docker compose up --build -d
docker compose down
docker compose logs -f backend
```

## Vocabulary Excel (teachers)

1. Log in as **teacher** → **Story & Curriculum Workshop**.
2. Select a story → section **Vocabulary sheet (Excel)**.
3. Upload `.xlsx` or `.xls` with a header row, for example:

| Word | Definition | Example |
|------|------------|---------|
| adventure | An exciting journey | We went on an adventure. |

Headers can be English or French (`Mot`, `Définition`, `Exemple`). **Word** column is required.

Students see the vocabulary in the **Writer** left panel for every part of that story.

## Environment

Copy `.env.example` to `.env` and set at minimum:

- `JWT_SECRET` — long random string
- `GROQ_API_KEY` — from [Groq Console](https://console.groq.com)
- `CLOUDINARY_*` — for teacher reference image uploads (optional for student illustrations if using `ILLUSTRATION_STORAGE=pollinations-url`)

For Docker, keep:

- `MONGODB_URI=mongodb://mongodb:27017/narralia`
- `LANGUAGETOOL_URL=http://languagetool:8010/v2/check`

## Services

| Service | Port |
|---------|------|
| Frontend (nginx) | `FRONTEND_PORT` (default 3000) |
| Backend API | 5000 |
| MongoDB | 27017 |
| LanguageTool | 8010 |

## Moving to another PC

1. Copy the whole `Story-app` folder (include `.env` if you want the same secrets — do not share publicly).
2. Install Docker Desktop on the new machine.
3. Run **`install.bat`**.

Illustration files in `backend/storage/illustrations` are included if you copy that folder; MongoDB data lives in a Docker volume (`mongo_data`) and is recreated unless you export it.
