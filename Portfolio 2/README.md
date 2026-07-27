# Portfolio — an interactive exhibition

A dark-luxury portfolio for a graphic designer, built as an immersive experience rather than a
page of thumbnails, with a complete content management system behind it.

```
apps/
  web/   Next.js 14 (App Router) — the public experience + the admin dashboard
  api/   Express + Prisma + PostgreSQL — REST API, auth, media, analytics
nginx/   Reverse proxy, TLS termination, static asset serving
```

---

## Quick start

**Prerequisites:** Node 20.11+ and a PostgreSQL 14+ database.

```bash
npm install
```

Create `apps/api/.env` and `apps/web/.env.local` from [`.env.example`](.env.example). At minimum
the API needs `DATABASE_URL`, `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then create the schema, seed it and start both apps:

```bash
npm run db:push
```

```bash
npm run db:seed
```

```bash
npm run dev
```

- Site — <http://localhost:3000>
- Dashboard — <http://localhost:3000/admin> (credentials from `ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- API — <http://localhost:4000/health>

> **The site runs before the database does.** If the API is unreachable, the front end falls back to
> bundled content (six full case studies with procedurally generated artwork) instead of erroring.
> That makes `npm run dev --workspace apps/web` on its own a valid way to work on the experience.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Both apps, colour-coded output |
| `npm run build` | Production build of API then web |
| `npm run typecheck` | Strict TypeScript across both workspaces |
| `npm run db:migrate` | Create and apply a Prisma migration |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Administrator, settings, taxonomy and six seeded case studies |

---

## The experience

The design goal was that every interaction should read as deliberate.

**Entry.** A canvas of drifting particles converges into the designer's wordmark — glyph coverage is
sampled from an offscreen canvas, so the mark is whatever the name is in Settings. A waveform
resolves beneath it, the counter reaches 100, and a four-panel curtain lifts on a stagger. Shown
once per session; skipped entirely under `prefers-reduced-motion`.

**Hero.** A full-screen WebGL field (React Three Fiber) running domain-warped fBm noise — the folds
are produced by displacing the noise input with a second noise field, which is cheaper and more
organic than stacking octaves. The pointer acts as a light source pushing energy into the field.
Displaced icosahedrons drift in front of it with depth-weighted parallax. Headline type rises out
of hard masks, character by character.

**Scroll.** Lenis drives one RAF loop shared with GSAP. The work gallery pins and scrolls
horizontally; each card tilts in 3D toward the pointer, parallaxes its artwork inside the frame,
and carries a light that tracks the cursor across its surface. The manifesto illuminates word by
word against scroll position. Marquees react to scroll velocity and skew with the drag.

**Pointer.** A two-part cursor: a dot that tracks instantly, and a ring that trails on a spring and
stretches along the direction of travel. It morphs per target — a `VIEW CASE` pill over project
cards, an expand disc over gallery images, a filled disc tinted with the project's accent colour.
Buttons are magnetic, with the label tracking at lower gain so they read as having mass.

**Capabilities.** Skills render as a 3D constellation (Fibonacci sphere, edges between related
disciplines, DOM labels projected onto nodes each frame without re-rendering React).

Everything degrades: reduced motion replaces the constellation with a list, disables the intro,
grain and custom cursor, and stills every parallax. Device tier (cores, memory, pointer type)
scales particle counts, shader octaves and DPR.

---

## Admin dashboard

`/admin` — JWT auth with rotating refresh tokens.

| Area | What it covers |
| --- | --- |
| Dashboard | Traffic, recent projects, latest enquiries, library counts |
| Projects | Full editor: content, media, case study, design, SEO. Draft/publish/archive, feature, duplicate, reorder, Cmd+S, autosave, unsaved-change guard |
| Media | Drag-and-drop upload, folders, search, inline alt-text editing, replace-in-place, bulk delete |
| Collections | Categories, tags, services, testimonials, clients, awards — one config-driven manager |
| Messages | Contact inbox with status workflow, private notes, reply shortcut |
| Analytics | Cookie-free first-party traffic: trend chart, top pages, referrers, devices, events |
| Settings | Identity, story, skills, SEO, theme, password, JSON backup export/import |
| Team | User management with role-based permissions |

**Roles.** `ADMIN` (everything, including deletion, team, backups) → `EDITOR` (create and edit) →
`VIEWER` (read-only). The API enforces this per route; the UI hides what the role cannot do. The
last active administrator cannot be demoted, disabled or deleted.

### Authentication design

- Passwords use **scrypt** from `node:crypto` (N=2¹⁶, r=8, p=1) — memory-hard, OWASP-recommended, and
  no native module to compile. Hashes are stored as `scrypt$N$r$p$salt$hash` so parameters can be
  raised later without invalidating existing accounts.
- Access tokens are short-lived JWTs held **in memory only** — never in `localStorage`, so an XSS
  bug cannot exfiltrate a session.
- Refresh tokens are opaque random strings in an `httpOnly` cookie scoped to `/api/auth`. Only a
  keyed SHA-256 digest is persisted, and every refresh **rotates** the token.
- Sign-in always burns the same CPU whether or not the email exists, so response time cannot be
  used to enumerate accounts.
- Changing a password or disabling an account revokes every outstanding session.
- Rate limits: 8 sign-in attempts per 15 minutes, 5 contact submissions per hour, plus a honeypot
  field on the public form.

---

## API

Public routes are read-only and unauthenticated. Everything under `/api/admin` requires a bearer
token.

```
GET    /api/bootstrap                    Everything the home page needs, one round-trip
GET    /api/projects            ?page&perPage&category&tag&featured&search&sort
GET    /api/projects/:slug
GET    /api/projects/:slug/neighbours    Previous/next for case-study navigation
POST   /api/projects/:slug/view
GET    /api/categories | /api/tags | /api/services | /api/testimonials | /api/clients | /api/awards
GET    /api/settings
POST   /api/contact
POST   /api/analytics/view | /api/analytics/event
GET    /api/seo/sitemap

POST   /api/auth/login | refresh | logout | logout-all | change-password
GET    /api/auth/me | /api/auth/sessions

GET    /api/admin/overview
CRUD   /api/admin/projects  (+ /reorder, /:id/duplicate, /:id/status)
CRUD   /api/admin/media     (+ /upload, /:id/replace, /bulk-delete) and /api/admin/folders
CRUD   /api/admin/{categories,tags,services,testimonials,clients,awards}
GET    /api/admin/analytics/{overview,timeseries,breakdown}
CRUD   /api/admin/contact | /api/admin/users | /api/admin/settings
GET    /api/admin/backup/export     POST /api/admin/backup/import
```

Responses are enveloped: `{ success, data, meta? }` or `{ success: false, error: { code, message, details? } }`.

**Storage** is abstracted behind a driver interface. `local` writes to disk, generates WebP
thumbnails and a 16px blur placeholder via sharp, and re-encodes oversized originals; `cloudinary`
does the same through their API. Switch with `STORAGE_DRIVER` — nothing else changes.

---

## Deployment

```bash
cp .env.example .env      # fill in secrets
docker compose up -d --build
```

Brings up PostgreSQL, Redis, the API (running `prisma migrate deploy` first), the web app, and
Nginx on port 80. Nginx serves uploaded assets straight from the shared volume, caches
`/_next/static` for a year, gzips text responses, and rate-limits `/api/auth` separately from the
rest of the API.

For TLS, drop `fullchain.pem` and `privkey.pem` into `nginx/certs`, uncomment the `:443` server in
`nginx/nginx.conf`, and switch the `:80` server to a redirect.

**Backups.** `docker compose exec postgres pg_dump -U portfolio portfolio > backup.sql` for the
database; the dashboard's JSON export covers content portably. Uploaded files live in the `uploads`
volume — back that up alongside.

---

## Performance & accessibility

- Static generation with a 5-minute revalidate window; one API round-trip per page.
- AVIF/WebP via `next/image`, blur-up placeholders, lazy loading below the fold.
- WebGL and the constellation are `dynamic(..., { ssr: false })` — they never touch first load.
- Animation runs on `transform` and `opacity` only; pointer tracking writes to motion values rather
  than React state, so a hover never triggers a re-render.
- Keyboard navigable throughout, with a skip link, visible focus rings, and a focus trap in the
  lightbox and dialogs. The before/after control is a real `role="slider"` with arrow-key support.
- Semantic landmarks, ARIA labelling on every icon-only control, and `prefers-reduced-motion`
  honoured at CSS and component level.

## Notes

- The seeded case studies generate their own cover artwork with sharp, so a fresh install has no
  binary fixtures and works offline. Replace them from the Media library whenever real work is ready.
- `next/font` fetches Syne, Inter and JetBrains Mono at build time; a first build needs network
  access. Swap them in `src/app/layout.tsx` for self-hosted files if that is a problem.
- Redis is wired into Compose and read from `REDIS_URL`, but nothing depends on it yet — it is there
  for response caching or a distributed refresh-token denylist when traffic warrants it.
