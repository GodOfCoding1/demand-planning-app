# Demand Planning Dashboard

A full-stack demand planning dashboard with a **Next.js** frontend and **FastAPI** (Python) backend backed by SQLite.

Deployed Link: https://demand-planning-app-pi.vercel.app/
Please note if it says Failed to load chart: Failed to fetch its because its a free teir just refresh the page in 1-2 mins and the backend should start up

## Local Development

### Prerequisites

- Python 3.10+ and `pip`
- Node.js 18+ and `npm`

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/load_data.py        # one-time: load CSV data into SQLite
uvicorn app.main:app --reload      # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                        # http://localhost:3000
```

### Run both services locally

1. Start the backend first from `backend/`:
   - `source .venv/bin/activate`
   - `uvicorn app.main:app --reload`
2. In a second terminal, start the frontend from `frontend/`:
   - `npm run dev`
3. Open [http://localhost:3000](http://localhost:3000).

### Local environment variables (optional)

Defaults work out of the box for local development. You only need these if you want to override defaults.

- Frontend (`frontend/.env.local`)
  - `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Backend (`backend/.env`)
  - `CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`

---

## Deploying to Render (Free Tier)

The backend is ready for one-click deploy on [Render](https://render.com).

### Option A — One-click Blueprint

1. Push this repo to GitHub.
2. Go to **Render Dashboard → New → Blueprint**.
3. Connect your repo — Render will detect `render.yaml` and set everything up.
4. Update the `CORS_ORIGINS` env var to include your actual frontend URL.

### Option B — Manual Service

1. Go to **Render Dashboard → New → Web Service**.
2. Connect your GitHub repo.
3. Configure:

| Setting            | Value                             |
| ------------------ | --------------------------------- |
| **Root Directory** | `backend`                         |
| **Runtime**        | Python                            |
| **Build Command**  | `pip install -r requirements.txt` |
| **Start Command**  | `bash start.sh`                   |

4. Add environment variable:

| Key            | Value                                                    |
| -------------- | -------------------------------------------------------- |
| `CORS_ORIGINS` | `https://your-frontend.vercel.app,http://localhost:3000` |

5. Deploy. On first startup the server automatically detects that the SQLite DB is missing and rebuilds it from the bundled CSV files (~30 seconds).

### Notes on Render Free Tier

- The free tier spins down after 15 minutes of inactivity. First request after spin-down takes ~30-50 seconds (cold start + DB rebuild).
- The filesystem is ephemeral — the DB is rebuilt from CSV on every cold start, which is fine since the data is static.

---

## Deploying the Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**.
2. Import your repo, set **Root Directory** to `frontend`.
3. Add environment variable:

| Key                   | Value                                      |
| --------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | `https://your-render-service.onrender.com` |

4. Deploy.

---

## Environment Variables Reference

### Backend (`backend/`)

| Variable       | Default                                       | Description                               |
| -------------- | --------------------------------------------- | ----------------------------------------- |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated allowed origins           |
| `PORT`         | `8000`                                        | Server port (set automatically by Render) |

### Frontend (`frontend/`)

| Variable              | Default                 | Description          |
| --------------------- | ----------------------- | -------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |
