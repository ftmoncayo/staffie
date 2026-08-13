# staffie

Full-stack MVP scaffold.

## Structure

- `frontend/` — React + Vite + Tailwind CSS
- `backend/` — Node + Express + Prisma (PostgreSQL)

## Getting started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env   # then set DATABASE_URL to your Postgres instance
npm run dev
```

Health check: `GET http://localhost:3001/health`
