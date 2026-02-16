# Expense Tracker

Expense Tracker is a full-stack personal finance application built with React, Node.js, Express, and MongoDB.

It includes transaction tracking, category budgets, reports, profile management, recurring expense logic, and role-based admin tools.

## Features

- JWT authentication with bcrypt password hashing
- Expense and income entries with category-level tracking
- Budget planning with auto-allocation from income and savings target
- Category management with duplicate cleanup support
- Reports dashboard with filters and export
- Notifications and in-app activity feedback
- Profile update and password update
- Admin login, user management, and login event visibility

## Tech Stack

- Frontend: React, React Router, Recharts, Axios, CSS
- Backend: Node.js, Express, Mongoose, JWT, bcrypt
- Database: MongoDB Atlas (or local MongoDB)

## Project Structure

```text
expense-tracker/
  backend/    # Express API + Mongo models/controllers/routes
  frontend/   # React application
```

## Local Setup

### 1. Clone repository

```bash
git clone https://github.com/Homless23/expense-tracker.git
cd expense-tracker
```

### 2. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3. Environment variables

Create environment files:

- `backend/.env` (see `backend/.env.example`)
- `frontend/.env` (optional, see `frontend/.env.example`)

### 4. Run locally

Backend:

```bash
cd backend
npm start
```

Frontend:

```bash
cd frontend
npm start
```

Frontend runs on `http://localhost:3000`  
Backend runs on `http://localhost:5000`

## API Overview

Base URL: `http://localhost:5000/api`

- Auth: `/auth/*`
- Expenses + analytics: `/v1/*`
- Categories: `/v1/categories*`
- Goals: `/v1/goals*`
- Budgets: `/v1/budgets/auto-allocate`
- Admin: `/admin/*`

## Useful Scripts

Backend:

- `npm start` - start API server
- `npm run cleanup:categories` - remove duplicate category rows per user

Frontend:

- `npm start` - start development server
- `npm run build` - production build

## Notes

- Keep secrets out of source control.
- If you update admin credentials in `.env`, restart backend for changes to apply.

