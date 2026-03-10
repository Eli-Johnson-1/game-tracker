# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Family board game score tracker. Currently supports Gin Rummy (full scoring) and Terraforming Mars (placeholder). Hosted at `gametracker.chuplab.com` via NPM on the homelab Proxmox server.

## Commands

### Backend (`backend/`)
```bash
npm run dev       # Development server with nodemon (hot reload)
npm run start     # Production server
npm run test      # Run all unit tests via node --test
node --test src/services/ginRummyScoring.test.js  # Run a single test file
```

### Frontend (`frontend/`)
```bash
npm run dev       # Vite dev server (proxies /api to localhost:3000)
npm run build     # Production build to dist/
npm run lint      # ESLint
```

### Import script (`backend/`)
```bash
# Dry run — prints what would be imported without writing anything
node src/scripts/importGinHistory.js /path/to/gin.md --dry-run

# Live import — players must already exist in the DB
node src/scripts/importGinHistory.js /path/to/gin.md [--player1=Kylie] [--player2=Eli]
```
The script parses a markdown scoresheet (one table = one game, winner's column gets points) and bulk-inserts games with `imported=1`. Defaults to Kylie/Eli. Players must be registered first; run migrations before the first use.

### Docker (project root)
```bash
docker compose up -d --build    # Build and start all services
docker compose logs backend      # Check backend logs / migration output
docker compose restart           # Restart after config changes
```

### Environment setup
```bash
cp backend/.env.example backend/.env   # Then set JWT_SECRET
```

## Architecture

### Backend (`backend/src/`)

**Request flow:** `routes/` (express-validator + requireAuth middleware) → `controllers/` (DB access + business logic) → `services/` (pure functions)

- `server.js` — entry point; calls `runMigrations()` on startup, registers all routes under `/api`
- `db/database.js` — singleton better-sqlite3 connection with WAL mode + foreign keys; migration runner
- `middleware/auth.js` — JWT Bearer token verification; sets `req.user`
- `middleware/validate.js` — runs express-validator and returns 400 with field errors
- `middleware/errorHandler.js` — catches `AppError` subclasses (`utils/errors.js`) and returns JSON

**Settings** are stored as key-value strings in the `settings` table. `getSettingsMap(db)` in `settingsController.js` is a shared helper that parses them to typed values (boolean/number/string) — call this wherever scoring is performed.

**Gin Rummy scoring** lives entirely in `services/ginRummyScoring.js` as pure functions with no DB access:
- `calculateHandResult(handType, knockerDeadwood, defenderDeadwood, settings)` — handles knock, gin, big_gin; auto-detects undercut when deadwood diff ≤ 0
- `checkEndGame(p1Total, p2Total, settings)` — returns true when either player hits the win threshold
- `calculateEndGameScoring(game, hands, settings)` — computes final scores with line bonuses, game bonus, and shutout bonus

Hand submission (`ginRummyController.submitHand`) runs the entire scoring pipeline—insert hand, update running totals, check end-game, optionally finalize the game—inside a single `db.transaction()`.

### Frontend (`frontend/src/`)

**Provider stack** (outermost → innermost): `BrowserRouter` → `AuthProvider` → `SettingsProvider` → routes

- `api/client.js` — Axios instance; adds Bearer token from localStorage; redirects to `/login` on 401
- `contexts/AuthContext.jsx` — user state + login/register/logout; restores session from localStorage token on mount
- `contexts/SettingsContext.jsx` — fetches and parses settings from `/api/settings` after login; exposes `refetch()` for the settings page
- `hooks/useGinRummyGame.js` — fetches game + hands, handles hand submit response (appends hand to list, triggers end-game state), handles undo (full refetch)

**Gin Rummy UI components** (`components/gin-rummy/`):
- `HandEntryForm` — three-tab form (Knock / Gin / Big Gin); calls `submitHand` and passes response to `onHandSubmitted` callback
- `ScoreTable` — renders all hands with per-player running totals in the footer; handles `hand_type = 'imported'`
- `EndGameSummary` — shown when `game.status === 'complete'`; displays breakdown from the end-game result
- `GamesList` — shows "Historical" in place of a date when `game.imported === 1`

### Database Schema

Three application tables: `users`, `gin_rummy_games`, `gin_rummy_hands`. One config table: `settings`.

Key relationships:
- `gin_rummy_games.player1_id / player2_id / winner_id` → `users.id`
- `gin_rummy_hands.game_id` → `gin_rummy_games.id` (CASCADE DELETE)
- `gin_rummy_hands` stores `player1_running_total` and `player2_running_total` as denormalized cumulative totals to avoid recalculating on every read

`gin_rummy_games.imported = 1` marks historically imported games (no real date; `hand_type = 'imported'` on all their hands). The `started_at` field is set to the import time and should be ignored in the UI when `imported = 1`.

### Adding a new game type

1. Add tables in a new migration file (`backend/src/db/migrations/003_<game>.js`) and register it in `database.js`
2. Add a scoring service in `backend/src/services/`
3. Add routes + controller in `backend/src/routes/` and `backend/src/controllers/`
4. Register the route in `server.js`
5. Add frontend pages in `frontend/src/pages/` and components in `frontend/src/components/<game>/`
6. Add the route in `App.jsx` and update the `GameCard` in `DashboardPage`

### Deployment

Docker Compose on a Proxmox LXC. No ports are exposed to the host — NPM (192.168.20.5) handles TLS termination and proxies to the frontend container, which in turn proxies `/api/*` to the backend container via nginx. The SQLite database lives in the `sqlite-data` named volume at `/app/data/gametracker.db` inside the backend container.

## Gin Rummy Scoring Reference

Default values (all configurable in Settings page):

| Setting | Default | Description |
|---|---|---|
| `gin_bonus` | 20 | Points for going Gin |
| `big_gin_bonus` | 31 | Points for going Big Gin |
| `undercut_bonus` | 10 | Flat bonus when defender undercuts |
| `game_bonus` | 100 | Awarded to winner at game end |
| `line_bonus` | 20 | Per hand won, awarded at game end |
| `shutout_extra_game_bonus` | 100 | Extra bonus if loser won zero hands |
| `gin_rummy_win_threshold` | 100 | Running score that triggers end-game |

Equal deadwood on a knock counts as an undercut (defender wins 10 pts).

## Phase Status

| Phase | Status | Notes |
|---|---|---|
| 1 | ✅ Complete | Project bootstrap, Docker, repo |
| 2 | ✅ Complete | DB migrations, auth backend |
| 3 | ✅ Complete | Auth frontend, ProtectedRoute, Layout |
| 4 | ✅ Complete | Settings backend + frontend |
| 5 | ✅ Complete | Gin Rummy backend + scoring service (16 unit tests) |
| 6 | ✅ Complete | Gin Rummy frontend (HandEntryForm, ScoreTable, EndGameSummary) |
| 7 | ✅ Complete | Dashboard, site leaderboard, Terraforming Mars placeholder |
| 8 | ✅ Complete | Historical import script; 40 games / 250 hands loaded |
| 9 | Pending | Homelab deployment (Proxmox LXC, Docker Compose, NPM, Pi-hole, PBS) |
