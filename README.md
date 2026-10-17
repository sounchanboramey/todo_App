# Daylist Todo App

A beginner-friendly full-stack todo app. The React frontend sends todo requests to a NestJS API, which stores tasks in PostgreSQL.

## Requirements

- Node.js and npm
- Docker Desktop

## 1. Start PostgreSQL

Open Docker Desktop. In PowerShell, set a local database password, then start PostgreSQL:

```powershell
$env:DB_PASSWORD = 'choose-a-local-password'
docker run --name todo-db --restart unless-stopped -e "POSTGRES_PASSWORD=$env:DB_PASSWORD" -e POSTGRES_DB=todo -p 127.0.0.1:5433:5432 -v todo-db-data:/var/lib/postgresql/data -d postgres:16
```

If the container already exists, use `docker start todo-db` instead.

## 2. Start the NestJS backend

In a new PowerShell window:

```powershell
cd backend
$env:DB_PASSWORD = 'choose-a-local-password'
npm install
npm run typeorm -- migration:run -d src/data-source.ts
npm run start:dev
```

The API runs at `http://localhost:3001/api/todos`. The backend reads `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` from the environment. In a new terminal, set `DB_PASSWORD` to the same local password you used for Docker.

## 3. Start the React frontend

In another PowerShell window:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (usually `http://localhost:5173`). Keep Docker and both development servers running while using the app.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/todos` | List todos |
| POST | `/api/todos` | Create a todo |
| GET | `/api/todos/:id` | Read one todo |
| PATCH | `/api/todos/:id` | Edit title, status, or priority |
| DELETE | `/api/todos/:id` | Delete a todo |

The React app uses local state for the profile and todo ordering. Todo records are stored by the NestJS backend in PostgreSQL.

## Project folders

- `frontend/` — React, TypeScript, and Vite application
- `backend/` — NestJS API, TypeORM entities, and migrations

Use a unique local password. Never commit passwords or reuse local database credentials for a public or production database.
