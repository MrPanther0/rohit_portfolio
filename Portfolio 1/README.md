# ROHIT — Graphic Design Portfolio · "ISSUE N°07"

The portfolio as a printed magazine issue: warm paper, ink typography,
electric blue, crop marks and a barcode. A masthead cover, featured works
as sticky-stacking "cover stories", an editorial index where a live preview
chases your cursor, a serif manifesto, and an inverted ink back cover.
Built-in admin panel — upload work from `/admin` and it appears on the live
site instantly, no code, ever.

**Images and video.** The gallery supports mp4/webm alongside images (max
60 MB). Video tiles auto-play muted while on screen, get a "▶ Motion" badge,
and play with controls in the lightbox. Perfect for AI-generated motion work:
generate on [Higgsfield](https://higgsfield.ai) (or Runway/Pika/etc.),
download, and drag the file into the admin uploader like any image.

## Run it

```bash
npm install
npm start
```

- **Site** → http://localhost:3000
- **Admin** → http://localhost:3000/admin — default password: `rohit123`

> Change the password from **Admin → Password** before sharing the site with anyone.

## Using the admin panel

| Tab | What it does |
| --- | --- |
| **My Works** | Upload artwork (drag & drop), edit, delete, or mark as ★ Featured (featured pieces render as large full-width tiles on the site). |
| **Site Settings** | Your name, role, hero tagline, about statement, email, social links and the stats counters — all text on the site is editable here. |
| **Password** | Change the admin password. |

Every change is saved to `data/*.json` and images go to `public/uploads/`, so the
whole site state lives in those two folders — back them up and you've backed up
everything.

The six pre-loaded works are placeholder artwork so the site never looks empty.
Delete them from the admin as you upload real projects.

## Pitch mode (showing a client)

Everything is designed for the first 10 seconds: preloader counter → typography
reveal → scroll. Scroll slowly; the work grid, about statement and services rows
all animate on scroll. Click any work to open the case lightbox (arrow keys work).

## Deploying

Any Node host works (Render, Railway, a VPS, etc.):

1. Push this folder to the host.
2. `npm install && npm start` (the server listens on `PORT` env var, default 3000).
3. Make sure `data/` and `public/uploads/` are on **persistent storage**, or your
   uploads will disappear on redeploy (on Render: attach a Disk; on a VPS: nothing to do).

## Structure

```
server.js          Express server — API, auth, uploads
data/              works.json, settings.json, config.json (auto-created)
public/            the portfolio site (index.html, css, js, uploads/)
admin-ui/          the admin panel (served at /admin)
```
