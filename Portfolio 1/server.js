/* ------------------------------------------------------------------
   Rohit Portfolio — server
   Serves the public site, the /admin panel and a small JSON + uploads
   API so new work published from the admin appears on the site
   instantly without touching code.
------------------------------------------------------------------- */
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const ADMIN_DIR = path.join(__dirname, 'admin-ui');
const WORKS_FILE = path.join(DATA_DIR, 'works.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJSON(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

/* First boot: create admin config with the default password */
let config = readJSON(CONFIG_FILE, null);
if (!config || !config.passwordHash) {
  config = {
    passwordHash: sha256('rohit123'),
    sessionSecret: crypto.randomBytes(32).toString('hex')
  };
  writeJSON(CONFIG_FILE, config);
}

app.use(express.json({ limit: '1mb' }));
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

/* ------------------------------ uploads ------------------------------ */
const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.mp4', '.webm'];
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const base = (path.basename(file.originalname, ext)
      .replace(/[^a-z0-9_-]/gi, '-').slice(0, 40).toLowerCase()) || 'work';
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED.includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only images or videos are allowed (jpg, png, webp, gif, svg, avif, mp4, webm).'), ok);
  }
});

const requireAuth = (req, res, next) => {
  if (req.session && req.session.authed) return next();
  res.status(401).json({ error: 'Not authorised' });
};

function deleteImageFile(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return;
  const full = path.join(PUBLIC_DIR, path.normalize(imagePath).replace(/^[\\/]+/, ''));
  if (full.startsWith(UPLOADS_DIR) && fs.existsSync(full)) {
    try { fs.unlinkSync(full); } catch { /* non-fatal */ }
  }
}

/* -------------------------------- auth -------------------------------- */
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password && sha256(password) === config.passwordHash) {
    req.session.authed = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Wrong password' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  res.json({ authed: !!(req.session && req.session.authed) });
});

app.post('/api/password', requireAuth, (req, res) => {
  const { current, next } = req.body || {};
  if (sha256(current) !== config.passwordHash) {
    return res.status(400).json({ error: 'Current password is wrong' });
  }
  if (!next || String(next).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  config.passwordHash = sha256(next);
  writeJSON(CONFIG_FILE, config);
  res.json({ ok: true });
});

/* -------------------------------- works ------------------------------- */
app.get('/api/works', (req, res) => {
  const works = readJSON(WORKS_FILE, []);
  works.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(works);
});

app.post('/api/works', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'An image is required' });
  const { title, category, description = '', year = '', featured } = req.body;
  if (!title || !category) {
    deleteImageFile('/uploads/' + req.file.filename);
    return res.status(400).json({ error: 'Title and category are required' });
  }
  const works = readJSON(WORKS_FILE, []);
  const work = {
    id: crypto.randomUUID(),
    title: String(title).slice(0, 120),
    category: String(category).slice(0, 60),
    description: String(description).slice(0, 1000),
    year: String(year).slice(0, 10),
    featured: featured === 'true' || featured === true,
    image: '/uploads/' + req.file.filename,
    createdAt: new Date().toISOString()
  };
  works.unshift(work);
  writeJSON(WORKS_FILE, works);
  res.status(201).json(work);
});

app.put('/api/works/:id', requireAuth, upload.single('image'), (req, res) => {
  const works = readJSON(WORKS_FILE, []);
  const work = works.find(w => w.id === req.params.id);
  if (!work) {
    if (req.file) deleteImageFile('/uploads/' + req.file.filename);
    return res.status(404).json({ error: 'Work not found' });
  }
  const { title, category, description, year, featured } = req.body;
  if (title !== undefined && title !== '') work.title = String(title).slice(0, 120);
  if (category !== undefined && category !== '') work.category = String(category).slice(0, 60);
  if (description !== undefined) work.description = String(description).slice(0, 1000);
  if (year !== undefined) work.year = String(year).slice(0, 10);
  if (featured !== undefined) work.featured = featured === 'true' || featured === true;
  if (req.file) {
    deleteImageFile(work.image);
    work.image = '/uploads/' + req.file.filename;
  }
  writeJSON(WORKS_FILE, works);
  res.json(work);
});

app.delete('/api/works/:id', requireAuth, (req, res) => {
  let works = readJSON(WORKS_FILE, []);
  const work = works.find(w => w.id === req.params.id);
  if (!work) return res.status(404).json({ error: 'Work not found' });
  deleteImageFile(work.image);
  works = works.filter(w => w.id !== req.params.id);
  writeJSON(WORKS_FILE, works);
  res.json({ ok: true });
});

/* ------------------------------ settings ------------------------------ */
app.get('/api/settings', (req, res) => {
  res.json(readJSON(SETTINGS_FILE, {}));
});

app.put('/api/settings', requireAuth, (req, res) => {
  const current = readJSON(SETTINGS_FILE, {});
  const allowed = ['name', 'role', 'tagline', 'about', 'email', 'phone', 'location',
    'availability', 'instagram', 'behance', 'dribbble', 'linkedin'];
  for (const k of allowed) {
    if (req.body[k] !== undefined) current[k] = String(req.body[k]).slice(0, 2000);
  }
  if (req.body.stats && typeof req.body.stats === 'object') {
    current.stats = current.stats || {};
    for (const k of ['years', 'projects', 'clients']) {
      const n = parseInt(req.body.stats[k], 10);
      if (!isNaN(n)) current.stats[k] = n;
    }
  }
  writeJSON(SETTINGS_FILE, current);
  res.json(current);
});

/* ----------------------------- admin pages ---------------------------- */
app.use('/admin/assets', express.static(path.join(ADMIN_DIR, 'assets')));
app.get('/admin', (req, res) => {
  const page = (req.session && req.session.authed) ? 'index.html' : 'login.html';
  res.sendFile(path.join(ADMIN_DIR, page));
});

/* ----------------------------- public site ---------------------------- */
app.use(express.static(PUBLIC_DIR));

/* upload / validation errors as JSON */
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
  next();
});

app.listen(PORT, () => {
  console.log('\n  ROHIT — portfolio is live');
  console.log(`  Site   →  http://localhost:${PORT}`);
  console.log(`  Admin  →  http://localhost:${PORT}/admin   (default password: rohit123)\n`);
});
