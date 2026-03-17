# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Family board game score tracker. Supports Gin Rummy (full scoring) and Terraforming Mars (full scoring with photo analysis). Hosted at `gametracker.chuplab.com` via NPM on the homelab Proxmox server.

## Git Workflow

This project uses **GitHub Flow**: feature branches → PR → merge to `main`.

### Rules (enforced on `main`)
- **Never push directly to `main`** — all changes go through a PR
- **Never force push** — `main` has force push disabled
- **Never delete `main`**
- All work happens on a feature branch: `phase/N-description` for phases, `fix/description` for bugfixes, `feature/description` for standalone features

### Process
1. Branch from `main`: `git checkout -b phase/10-deployment`
2. Commit work on the feature branch
3. Push and open a PR: `gh pr create`
4. Merge via PR (squash or merge commit — be consistent)
5. Delete the feature branch after merge
6. Pull `main` locally: `git checkout main && git pull`

### Before opening a PR
- Run `npm run test` in `backend/` — all tests must pass
- Run `npm run lint` in `frontend/` — no lint errors

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

### Local dev restart (Windows)
```bash
# Kill backend (port 3000) and restart with nodemon
powershell -Command "Stop-Process -Id (netstat -ano | grep ':3000 ' | grep LISTENING | awk '{print $5}') -Force"
cd backend && npm run dev &
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

**Settings** are stored as key-value strings in the `settings` table. `getSettingsMap(db)` in `settingsController.js` is a shared helper that parses them to typed values (boolean/number/string) — call this wherever scoring is performed. **Do not import `settingsController` from within `services/` — pass the settings map as a parameter to avoid circular dependencies.**

**Gin Rummy scoring** lives entirely in `services/ginRummyScoring.js` as pure functions with no DB access:
- `calculateHandResult(handType, knockerDeadwood, defenderDeadwood, settings)` — handles knock, gin, big_gin; auto-detects undercut when deadwood diff ≤ 0
- `checkEndGame(p1Total, p2Total, settings)` — returns true when either player hits the win threshold
- `calculateEndGameScoring(game, hands, settings)` — computes final scores with line bonuses, game bonus, and shutout bonus; all three bonuses are independently gated by their enable toggles

**Retroactive recalculation:** `services/ginRummyRecalc.js` exports `recalculateCompletedGames(db, settings)`. This is called by `settingsController.updateSettings` after every settings save, so all stored final scores stay consistent with current settings. Pass the settings map in — do not let the recalc module import from settingsController.

Hand submission (`ginRummyController.submitHand`) runs the entire scoring pipeline—insert hand, update running totals, check end-game, optionally finalize the game—inside a single `db.transaction()`. The inserted hand is re-fetched with a `JOIN users` so `winner_username` is present in the API response immediately.

### Frontend (`frontend/src/`)

**Provider stack** (outermost → innermost): `BrowserRouter` → `AuthProvider` → `SettingsProvider` → routes

- `api/client.js` — Axios instance; adds Bearer token from localStorage; redirects to `/login` on 401
- `contexts/AuthContext.jsx` — user state + login/register/logout; restores session from localStorage token on mount
- `contexts/SettingsContext.jsx` — fetches and parses settings from `/api/settings` after login; exposes `refetch()` for the settings page
- `hooks/useGinRummyGame.js` — fetches game + hands, handles hand submit response (appends hand to list, triggers end-game state), handles undo (full refetch)

**Routes:**
- `/` — Dashboard
- `/gin-rummy` — game list + leaderboard
- `/gin-rummy/games/:id` — game detail / hand entry
- `/gin-rummy/settings` — scoring settings (wrapped in GinRummyLayout)
- `/terraforming-mars` — TM game list + leaderboard
- `/terraforming-mars/games/:id` — TM game detail / scoring / edit scores
- `/settings` — global settings placeholder (no site-wide settings exist yet)

**Gin Rummy UI components** (`components/gin-rummy/`):
- `HandEntryForm` — three-tab form (Knock / Gin / Big Gin); calls `submitHand` and passes response to `onHandSubmitted` callback
- `ScoreTable` — renders all hands with per-player running totals in the footer; handles `hand_type = 'imported'`; `winner_username` is available immediately on new hands (no reload needed)
- `EndGameSummary` — shown when `game.status === 'complete'`; displays breakdown from the end-game result
- `GamesList` — shows "Historical" in place of a date when `game.imported === 1`; shows final scores for completed games
- `GinLeaderboard` — sortable columns (W, L, HW, HL, Pts, Pts Agst, SO); client-side sort; default sort is wins desc
- `GinRummyLayout` — wraps all Gin Rummy pages; header strip has a ⚙ link to `/gin-rummy/settings`

**Terraforming Mars UI components** (`components/terraforming-mars/`):
- `TerraformingMarsLayout` — Mars-themed header (`#2d1000` bg, `#7c2d12` border, `#f97316` accent)
- `NewTmGameModal` — two-step: pick mode (solo/multiplayer) → configure players; color swatch picker; registered user dropdown or guest name input; creator row locked to logged-in user
- `TmScoringForm` — main score entry form; accepts optional `initialData`/`isEditing` props for edit mode; milestone picker is radio buttons + ColorChip (not a select); city-adjacent tooltip uses Tailwind `group`/`group-hover` (not `title`); photo tab has drag-and-drop + × remove button; calls `updateGame` when `isEditing`, `completeGame` otherwise
- `CardVpInput` — `type="text"` input; regex ALLOWED guard `/^[\d\s+\-*/().]*$/`; mathjs live preview shows evaluated integer or "invalid"
- `TmScoreBreakdown` — score table + winner/solo banner; milestone and award places each on own line with ColorChip; Cards cell shows only integer (no expression)
- `TmGamesList` — list of TM games with status/date/players
- `TmLeaderboard` — TM-specific leaderboard

### Database Schema

**Gin Rummy:** `users`, `gin_rummy_games`, `gin_rummy_hands`. Config: `settings`.

Key Gin Rummy relationships:
- `gin_rummy_games.player1_id / player2_id / winner_id` → `users.id`
- `gin_rummy_hands.game_id` → `gin_rummy_games.id` (CASCADE DELETE)
- `gin_rummy_hands` stores `player1_running_total` and `player2_running_total` as denormalized cumulative totals to avoid recalculating on every read

`gin_rummy_games.imported = 1` marks historically imported games (no real date; `hand_type = 'imported'` on all their hands). The `started_at` field is set to the import time and should be ignored in the UI when `imported = 1`.

**Terraforming Mars:** 5 tables added in migration 005.
- `tm_games` — id, created_by (→ users.id), mode (solo/multiplayer), status (active/complete), generation, solo_terraformed, created_at
- `tm_game_players` — id, game_id (CASCADE), user_id (nullable for guests), player_name, color, tr, greeneries, city_adjacent_greeneries, card_vps, card_vps_expression, milestone_vps, award_vps, total_vps, final_rank
- `tm_game_milestones` — id, game_id (CASCADE), milestone_name, player_id (→ tm_game_players)
- `tm_game_awards` — id, game_id (CASCADE), award_name
- `tm_game_award_places` — id, award_id (CASCADE), player_id (→ tm_game_players), place (1 or 2)

Guest players have `user_id IS NULL` in `tm_game_players`. The site leaderboard handles guests via `UNION ALL` — guests grouped by `player_name`, row_key prefixed `g:` vs `u:` for registered users.

### Migrations

| File | Contents |
|---|---|
| `001_initial.js` | `users`, `gin_rummy_games`, `gin_rummy_hands` tables |
| `002_settings.js` | `settings` table + default scoring values |
| `003_bonus_toggles.js` | Adds `game_bonus_enabled` and `line_bonus_enabled` settings (both default `true`) |
| `004_entra_auth.js` | Adds `entra_oid TEXT UNIQUE` to users; updates Kylie/Eli emails to @chuplab.com |
| `005_terraforming_mars.js` | Adds 5 TM tables (tm_games, tm_game_players, tm_game_milestones, tm_game_awards, tm_game_award_places) |

**Next new migration: `007_<feature>.js`**

### Adding a new game type

1. Add tables in a new migration file (`backend/src/db/migrations/006_<game>.js`) and register it in `database.js`
2. Add a scoring service in `backend/src/services/`
3. Add routes + controller in `backend/src/routes/` and `backend/src/controllers/`
4. Register the route in `server.js`
5. Add frontend pages in `frontend/src/pages/` and components in `frontend/src/components/<game>/`
6. Add the route in `App.jsx` and update the `GameCard` in `DashboardPage`

### Deployment

Docker Compose on a Proxmox LXC. The frontend container publishes port 80 to the LXC host; NPM (192.168.20.5) handles TLS termination and proxies to the LXC on port 80. The frontend nginx then proxies `/api/*` to the backend container internally. The backend is not exposed to the host. The SQLite database lives in the `sqlite-data` named volume at `/app/data/gametracker.db` inside the backend container.

## Gin Rummy Scoring Reference

Default values (all configurable at `/gin-rummy/settings`):

| Setting | Default | Description |
|---|---|---|
| `gin_bonus` | 20 | Points for going Gin |
| `big_gin_bonus` | 31 | Points for going Big Gin |
| `undercut_bonus` | 10 | Flat bonus when defender undercuts |
| `game_bonus` | 100 | Awarded to winner at game end |
| `game_bonus_enabled` | true | Toggle — disabling removes game bonus from all games |
| `line_bonus` | 20 | Per hand won, awarded at game end |
| `line_bonus_enabled` | true | Toggle — disabling removes line bonus from all games |
| `shutout_extra_game_bonus` | 100 | Extra bonus if loser won zero hands |
| `shutout_enabled` | true | Toggle — disabling removes shutout bonus but still records shutouts |
| `gin_rummy_win_threshold` | 100 | Running score that triggers end-game |

Equal deadwood on a knock counts as an undercut (defender wins 10 pts).

**Important:** The three end-game bonus toggles (`game_bonus_enabled`, `line_bonus_enabled`, `shutout_enabled`) are fully independent. Disabling one does not affect the others. `shutout_enabled` only controls the bonus points — `is_shutout` is always recorded based on whether the loser won zero hands, so the leaderboard SO count is unaffected by the toggle. Changing any setting triggers `recalculateCompletedGames` which retroactively updates all stored final scores.

## Auth Notes

- Username comparisons use `LOWER()` in SQL — login and registration are case-insensitive
- Usernames are stored as-typed (display case is preserved)
- `me()` returns `is_admin: true` when `req.user.username` matches `ADMIN_USERNAME` env var (case-insensitive); stored in `AuthContext` as `user.is_admin`

## Terraforming Mars Scoring Reference

Scoring categories: TR + greeneries (1 VP each) + city-adjacent greeneries (1 VP each) + card VPs (expression evaluated via mathjs) + milestone VPs (5 each, max 3 milestones) + award VPs (5 for 1st, 2 for 2nd).

Competition ranking: ties share same rank, next rank skips (e.g., two tied 1st → both rank 1, next is rank 3).

Photo analysis: multer memory storage → base64 → Claude Vision (claude-sonnet-4-6) → structured JSON. Returns 503 if `ANTHROPIC_API_KEY` not set. Requires `ANTHROPIC_API_KEY` in backend/.env and docker-compose.yml.

Safe expression evaluation: mathjs behind regex guard `/^[\d\s+\-*/().]+$/` — never uses `eval()`. Division by zero detected via `!isFinite(result)`.

Edit scores: `editGame` controller deletes existing milestones/awards then re-runs same `_writeScores` helper as `completeGame`. Works on games with `status = 'complete'`.

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
| 9 | ✅ Complete | UI & feature polish (see below) |
| 10 | ✅ Complete | Entra ID SSO (merged PR #10 + fix PR #11) |
| TM | ✅ Complete | Full TM scoring merged PR #12 |
| 11 | ✅ Complete | Deployed to LXC 105 (192.168.40.2, VLAN 40); live at https://gametracker.chuplab.com |
| 12 | ✅ Complete | Mobile UI polish, admin control, page titles (merged PR #14) |
| 13 | ✅ Complete | TM UX follow-ups: TR scroll picker, remove card VP +/− buttons (merged PR #16) |
| 14 | ✅ Complete | TM form fixes: CardVpInput +/− buttons restored w/ focus fix, generation default 1, solo TR default 14 (merged PR #17) |

### Phase 9 — UI & Feature Polish (complete, merged PR #8)

- **Delete game** — participants can delete a game via confirmation modal on the game page
- **Case-insensitive auth** — login and registration match usernames case-insensitively
- **Navbar cleanup** — removed logo emoji (🎲 and 🪐); ♠ and trophy emoji remain
- **Gin Rummy settings moved** — scoring settings now live at `/gin-rummy/settings` (⚙ button in layout header); global `/settings` shows a placeholder
- **Enhanced leaderboard** — W, L, HW, HL, Pts, Pts Agst, SO columns; sortable by clicking headers; default sort wins desc
- **Winner column mid-game** — hand winner appears immediately after submission without page reload
- **Scores in game list** — completed games show `p1Score – p2Score` in the game list
- **Bonus toggles** — Game Bonus, Line/Box Bonus, and Shutout Bonus each have an enable toggle in settings; all three are independent; changing settings retroactively recalculates all completed game scores

### Phase 10 — Entra ID SSO (complete, merged PR #10)

- Migration 004: adds `entra_oid TEXT UNIQUE` to users; updates Kylie/Eli emails to @chuplab.com
- Backend: jwks-rsa validates MS token; authController has `entraAuth()` + `me()`; register/login removed
- Frontend: @azure/msal-browser + @azure/msal-react; MsalProvider in main.jsx; signIn() in AuthContext
- Auth timing fix: unified init effect — on mount, if MSAL has cached account → acquireTokenSilent → exchange idToken
- Env vars needed: backend `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`; frontend `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`

### TM Scoring Feature (complete, merged PR #12)

Full Terraforming Mars scoring: multiplayer and solo modes, photo analysis via Claude Vision. 36 new tests (52 total). See TM sections above for component/architecture details. Key changes beyond new files:
- `leaderboardController.js` — rewrote as UNION ALL (registered + guests); outer WHERE (not HAVING) filters 0-game players
- `SiteLeaderboard.jsx` — sortable columns: Wins, GR Wins, TM Wins, Played; shows guests via row_key
- `index.css` — hides number input spinner arrows (keeps numeric keyboard on mobile)
- `DashboardPage.jsx` — TM card no longer marked comingSoon

### Phase 12 — Mobile UI, Admin Control, Page Titles (complete, merged PR #14)

- **Mobile navbar** — "Dashboard" → "Home", "♠ Gin Rummy" → "♠", "Settings" → "⚙" on small screens; reduced nav padding on mobile
- **ScoreTable footer** — two responsive `<tfoot>` rows fix Running Total colspan misalignment when Winner column is hidden on mobile
- **Game page headers** — `flex-col sm:flex-row` stacking on both GR and TM game pages
- **Auto-redirect** — creating a new GR or TM game navigates directly to the game page instead of returning to the list
- **Admin control** — `ADMIN_USERNAME` env var grants a user delete/edit rights on any game regardless of participation; `is_admin` field returned from `/me` endpoint
- **Page titles** — `usePageTitle` hook sets `${title} | ChupLab Game Tracker` per page; game pages use player names dynamically; `frontend/index.html` default changed from "frontend"

**Admin env var:** `ADMIN_USERNAME=Eli Johnson` in `backend/.env` (not committed) and in `docker-compose.yml` backend env section.

### Phase 13 — TM UX Follow-ups (complete, merged PR #16)

- **TR scroll picker** — TR field swapped from plain number input to `SelectInput` (0–100), matching generation/greeneries/city-adjacent UX
- **Card VP input** — removed +/− append buttons; changed `inputMode` to `decimal` so iOS number pad natively includes a `−` key; expressions like `13+2+5` still work on desktop
- Removed now-unused `NumInput` component from `TmScoringForm`

### Phase 14 — TM Form Fixes (complete, merged PR #17)

- **CardVpInput +/− buttons restored** — re-added `+` and `−` append buttons with focus fix: `onMouseDown={e => e.preventDefault()}` prevents blur on desktop; `inputRef.current?.focus()` after append re-opens keyboard on mobile; `inputMode` reverted to `numeric`
- **Generation default** — new games default to generation 1 (was 14)
- **TR default by mode** — `buildPlayerState` takes `mode` arg; solo games default TR to 14, multiplayer to 20 (was always 20)
