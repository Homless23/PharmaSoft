# Frontend (React)

This directory contains the web client for Expense Tracker.

## Environment

Optional `.env` values:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

If not set, the app falls back to `http://localhost:5000/api`.

## Scripts

```bash
npm start      # run dev server at http://localhost:3000
npm run build  # create production build
npm test       # run tests
```

## Notes

- The app expects the backend API to be available before login/data operations.
- Authentication state is persisted in localStorage.
