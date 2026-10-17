# Daylist — React Todo App

A responsive todo dashboard built with React, TypeScript, Vite, NestJS, TypeORM, and PostgreSQL. Todos are stored in PostgreSQL; the profile and manual ordering remain in React state.

## Start PostgreSQL

Open Docker Desktop, then run:

```powershell
$env:DB_PASSWORD = 'choose-a-local-password'
docker run --name todo-db --restart unless-stopped -e "POSTGRES_PASSWORD=$env:DB_PASSWORD" -e POSTGRES_DB=todo -p 127.0.0.1:5433:5432 -v todo-db-data:/var/lib/postgresql/data -d postgres:16
```

If `todo-db` already exists, start it with `docker start todo-db`.

## Start the backend

In a terminal:

```powershell
cd E:\Techpreneur\ReactJS\todo-api
npm install
$env:PORT = '3001'
npm run start:dev
```

The API is available at `http://localhost:3001/api/todos`. NestJS connects to PostgreSQL at port `5433`; set `DB_PASSWORD` in the backend terminal to the same local password used when starting Docker.

## Start the frontend

In another terminal:

```powershell
cd E:\Techpreneur\ReactJS\TodoApp_V2
npm install
npm run dev
```

Open the Vite address shown in the terminal. The frontend sends todo CRUD requests to NestJS. CORS allows the local Vite ports 5173–5175.

## Features

- Create, read, edit, and delete todos through the NestJS API.
- Persist task titles, statuses, and priorities in PostgreSQL.
- Edit the username and profile locally.
- Select multiple tasks to delete or change their status.
- Filter by status; search by title.
- Star priority tasks.
- Reorder tasks in the current React session.
- Show task counts and completion progress.

## Checks

```sh
npm run build
npm run lint
```

The main frontend is in `src/App.tsx`; styles are in `src/App.css` and `src/index.css`.
