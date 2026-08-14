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
cp .env.example .env   # then set DATABASE_URL and JWT_SECRET
npm run dev
```

No local Postgres? Run `npx prisma dev` in `backend/` to start a local dev
database, and point `DATABASE_URL` in `.env` at the connection string it
prints.

After the database is up, apply migrations:

```bash
npx prisma migrate dev
```

## API

- `GET /health` — health check
- `POST /api/auth/signup` — `{ email, password }` → `{ token, user }`
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`
- `GET /api/auth/me` — requires `Authorization: Bearer <token>` → current user

## Frontend routes

- `/` — home page
- `/signup`, `/login` — auth forms
- `/dashboard` — protected; redirects to `/login` if not authenticated
