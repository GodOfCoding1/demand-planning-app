# Demand Planning Dashboard

A full-stack demand planning dashboard with a **Next.js** frontend and **FastAPI** (Python) backend backed by SQLite.

Deployed Link: https://demand-planning-app-pi.vercel.app/
Please note if it says Failed to load chart or Failed to fetch its because its a free teir just refresh the page in 1-2 mins and the backend should start up

<img width="1707" height="975" alt="image" src="https://github.com/user-attachments/assets/4fa7e6e3-2a39-402b-b6b5-519ad0037040" />



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
