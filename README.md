# ChupLab Game Tracker

A family board game score tracker supporting Gin Rummy and Terraforming Mars. Live at [gametracker.chuplab.com](https://gametracker.chuplab.com).

---

## Features

### Gin Rummy
- Hand-by-hand score entry (Knock, Gin, Big Gin) with automatic undercut detection
- Configurable scoring rules (bonuses, thresholds, shutout bonus)
- Running totals, end-game bonus calculation, and per-game breakdown
- Undo last hand, delete game
- Leaderboard with W/L, hands won/lost, points for/against, shutout count

### Terraforming Mars
- Multiplayer and solo modes, with Venus Next expansion support
- Full VP breakdown: TR, greeneries, city-adjacent greeneries, card VPs (supports arithmetic expressions), milestones, awards
- M€ tiebreaker for VP ties
- Historical game import (no date required)
- Leaderboard including guest players
- Board photo analysis via Claude Vision (feature-flagged, disabled by default)

### General
- Microsoft Entra ID (Azure AD) SSO — no passwords stored
- Site-wide leaderboard combining both games
- Mobile-responsive UI
- Admin role for managing any game regardless of participation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router v7 |
| Auth (frontend) | @azure/msal-browser + @azure/msal-react |
| Backend | Node.js, Express 5 |
| Database | SQLite via better-sqlite3 (WAL mode) |
| Auth (backend) | Microsoft Entra ID JWKS validation, JWT (jsonwebtoken) |
| AI | Anthropic Claude Vision (optional, for TM photo analysis) |
| Deployment | Docker Compose, nginx (frontend), Node.js (backend) |

---

## Architecture

```
Browser
  └── nginx (port 80)
        ├── /            → React SPA (static files)
        └── /api/*       → proxy → backend:3000 (Express)
                                        └── SQLite DB (named Docker volume)
```

**Request flow:** Routes → Controllers → Services (pure functions, no DB access)

The backend is not exposed to the host; nginx is the only public entry point. In production, NPM (nginx proxy manager) handles TLS termination upstream.

---

## Local Development

### Prerequisites
- Node.js 20+
- npm

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/Eli-Johnson-1/game-tracker.git
cd game-tracker

# 2. Backend
cd backend
cp .env.example .env        # then fill in JWT_SECRET and Entra credentials
npm install
npm run dev                 # starts on port 3000 with hot reload

# 3. Frontend (in a new terminal)
cd frontend
npm install
npm run dev                 # starts on port 5173, proxies /api to localhost:3000
```

The frontend Vite dev server proxies all `/api/*` requests to `http://localhost:3000`, so no CORS configuration is needed during development.

---

## Environment Variables

Copy `.env.example` to `.env` in the project root (for Docker) or `backend/.env` (for local dev).

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Secret for signing JWT tokens. Use `openssl rand -hex 32`. |
| `ENTRA_TENANT_ID` | Yes | Azure AD tenant ID from your Entra app registration. |
| `ENTRA_CLIENT_ID` | Yes | Azure AD client ID from your Entra app registration. |
| `ANTHROPIC_API_KEY` | No | Enables TM board photo analysis via Claude Vision. |
| `ADMIN_USERNAME` | No | Entra display name of the admin user (can manage all games). |
| `PORT` | No | Backend port. Defaults to `3000`. |
| `DB_PATH` | No | SQLite file path. Defaults to `data/gametracker.db` relative to the backend. |

The frontend also needs its own `.env.local` for the Vite build:

| Variable | Description |
|---|---|
| `VITE_ENTRA_TENANT_ID` | Same as backend `ENTRA_TENANT_ID` |
| `VITE_ENTRA_CLIENT_ID` | Same as backend `ENTRA_CLIENT_ID` |

---

## Docker Deployment

```bash
# Copy and fill in the root .env file
cp .env.example .env

# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f backend

# Restart after config changes
docker compose restart
```

The `sqlite-data` named volume persists the database across container restarts and rebuilds.

---

## Running Tests & Lint

```bash
# Backend — 58 unit tests covering all scoring logic
cd backend && npm run test

# Frontend — ESLint
cd frontend && npm run lint
```

---

## Project Structure

```
game-tracker/
├── backend/
│   ├── src/
│   │   ├── controllers/       # Route handlers (DB access + business logic)
│   │   ├── db/
│   │   │   ├── database.js    # SQLite singleton + migration runner
│   │   │   └── migrations/    # Numbered migration files (001–011)
│   │   ├── middleware/        # auth, validate, errorHandler
│   │   ├── routes/            # Express routers with input validation
│   │   ├── services/          # Pure scoring functions (no DB access) + tests
│   │   ├── scripts/           # importGinHistory.js (one-time data import)
│   │   └── server.js          # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios API clients per resource
│   │   ├── components/
│   │   │   ├── common/        # Layout, Navbar, Modal, Button, etc.
│   │   │   ├── dashboard/     # SiteLeaderboard, GameCard
│   │   │   ├── gin-rummy/     # HandEntryForm, ScoreTable, EndGameSummary, etc.
│   │   │   └── terraforming-mars/ # TmScoringForm, TmScoreBreakdown, etc.
│   │   ├── contexts/          # AuthContext, SettingsContext
│   │   ├── hooks/             # useAuth, useSettings, useGinRummyGame, usePageTitle
│   │   ├── pages/             # Route-level page components
│   │   └── App.jsx            # Router + provider stack
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Gin Rummy Scoring Reference

Default values (all configurable at `/gin-rummy/settings`):

| Setting | Default | Description |
|---|---|---|
| Gin bonus | 20 | Points added to defender's deadwood on a Gin |
| Big Gin bonus | 31 | Same, for Big Gin (11 cards melded) |
| Undercut bonus | 10 | Flat bonus when defender beats or ties the knocker's deadwood |
| Game bonus | 100 | Awarded to the winner at game end |
| Line bonus | 20 | Per hand won, awarded at game end |
| Shutout extra | 100 | Extra bonus if the loser won zero hands |
| Win threshold | 100 | Running score that triggers end-game |

All three end-game bonuses have independent enable/disable toggles. Changing any setting retroactively recalculates all completed game scores.
