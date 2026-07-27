/* ==================================================================
   Studio Admin — works CRUD + site settings
   Everything saved here is served to the live site immediately.
================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));

  let works = [];

  /* ------------------------------ toasts ----------------------------- */
  function toast(msg, isError = false) {
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' error' : '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 3200);
    setTimeout(() => el.remove(), 3700);
  }

  /* ------------------------------- api ------------------------------- */
  async function api(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) { location.href = '/admin'; throw new Error('Session expired'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  }

  /* ------------------------------- tabs ------------------------------ */
  $$('.side-link[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.side-link[data-panel]').forEach((b) => b.classList.toggle('active', b === btn));
      $$('.panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${btn.dataset.panel}`));
    });
  });

  $('#logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    location.href = '/admin';
  });

  /* ---------------------------- works list --------------------------- */
  async function loadWorks() {
    works = await api('/api/works');
    renderWorks();
  }

  function renderWorks() {
    const grid = $('#adminWorksGrid');
    const empty = $('#adminEmpty');
    $('#worksCount').textContent = works.length ? `${works.length} piece${works.length === 1 ? '' : 's'} published.` : '';
    empty.hidden = works.length > 0;
    grid.innerHTML = works.map((w) => `
      <article class="awork" data-id="${esc(w.id)}">
        <div class="awork-thumb">
          ${/\.(mp4|webm)$/i.test(w.image)
            ? `<video src="${esc(w.image)}" muted loop playsinline preload="metadata"></video>`
            : `<img src="${esc(w.image)}" alt="${esc(w.title)}" loading="lazy">`}
          <button class="awork-star${w.featured ? ' on' : ''}" title="Toggle featured">★</button>
        </div>
        <div class="awork-body">
          <h3 class="awork-title">${esc(w.title)}</h3>
          <p class="awork-meta">${esc(w.category)}${w.year ? ` · ${esc(w.year)}` : ''}</p>
          <div class="awork-actions">
            <button class="edit">Edit</button>
            <button class="del">Delete</button>
          </div>
        </div>
      </article>
    `).join('');

    $$('.awork', grid).forEach((card) => {
      const id = card.dataset.id;
      $('.edit', card).addEventListener('click', () => openModal(works.find((w) => w.id === id)));
      $('.del', card).addEventListener('click', () => removeWork(id));
      $('.awork-star', card).addEventListener('click', () => toggleFeatured(id));
    });
  }

  async function toggleFeatured(id) {
    const w = works.find((x) => x.id === id);
    if (!w) return;
    try {
      const fd = new FormData();
      fd.append('featured', String(!w.featured));
      await api(`/api/works/${id}`, { method: 'PUT', body: fd });
      toast(!w.featured ? 'Marked as featured ★' : 'Removed from featured');
      await loadWorks();
    } catch (err) { toast(err.message, true); }
  }

  async function removeWork(id) {
    const w = works.find((x) => x.id === id);
    if (!w) return;
    if (!confirm(`Delete "${w.title}"?\n\nIt will disappear from your live site immediately.`)) return;
    try {
      await api(`/api/works/${id}`, { method: 'DELETE' });
      toast('Work deleted');
      await loadWorks();
    } catch (err) { toast(err.message, true); }
  }

  /* ------------------------- add / edit modal ------------------------ */
  const modal = $('#workModal');
  const workForm = $('#workForm');
  const dropzone = $('#dropzone');
  const fileInput = $('#fileInput');
  const dropPreview = $('#dropPreview');
  const dropPreviewVid = $('#dropPreviewVid');
  const isVideoFile = (name) => /\.(mp4|webm)$/i.test(name || '');
  let editingId = null;
  let pickedFile = null;

  function openModal(work = null) {
    editingId = work ? work.id : null;
    pickedFile = null;
    workForm.reset();
    $('#modalTitle').textContent = work ? 'Edit work' : 'Upload new work';
    $('#workSubmit').textContent = work ? 'Save changes →' : 'Publish to site →';
    if (work) {
      workForm.title.value = work.title;
      workForm.category.value = work.category;
      workForm.year.value = work.year || '';
      workForm.description.value = work.description || '';
      workForm.featured.checked = !!work.featured;
      setPreview(work.image, isVideoFile(work.image));
    } else {
      clearPreview();
    }
    modal.hidden = false;
  }
  function closeModal() { modal.hidden = true; }
  $$('[data-modal-close]').forEach((el) => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  $('#addWorkBtn').addEventListener('click', () => openModal());
  $('#emptyAddBtn').addEventListener('click', () => openModal());

  function setPreview(src, isVid) {
    dropPreview.hidden = true;
    dropPreviewVid.hidden = true;
    dropPreviewVid.pause();
    if (isVid) {
      dropPreviewVid.src = src;
      dropPreviewVid.hidden = false;
      dropPreviewVid.play().catch(() => {});
    } else {
      dropPreviewVid.removeAttribute('src');
      dropPreview.src = src;
      dropPreview.hidden = false;
    }
    dropzone.classList.add('has-image');
    $('#dropHint strong').textContent = 'Click to replace file';
  }
  function clearPreview() {
    dropPreview.src = '';
    dropPreview.hidden = true;
    dropPreviewVid.pause();
    dropPreviewVid.removeAttribute('src');
    dropPreviewVid.hidden = true;
    dropzone.classList.remove('has-image');
    $('#dropHint strong').textContent = 'Drop your artwork or video here';
  }
  function pickFile(file) {
    if (!file) return;
    if (!/\.(jpe?g|png|webp|gif|svg|avif|mp4|webm)$/i.test(file.name)) {
      toast('That file type is not supported', true);
      return;
    }
    if (file.size > 60 * 1024 * 1024) {
      toast('Max file size is 60 MB', true);
      return;
    }
    pickedFile = file;
    setPreview(URL.createObjectURL(file), isVideoFile(file.name));
  }

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => pickFile(fileInput.files[0]));
  ['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.add('drag');
  }));
  ['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag');
  }));
  dropzone.addEventListener('drop', (e) => pickFile(e.dataTransfer.files[0]));

  workForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!editingId && !pickedFile) {
      toast('Add an image first — drop it in the box above', true);
      return;
    }
    const btn = $('#workSubmit');
    btn.disabled = true;
    try {
      const fd = new FormData();
      fd.append('title', workForm.title.value.trim());
      fd.append('category', workForm.category.value.trim());
      fd.append('year', workForm.year.value.trim());
      fd.append('description', workForm.description.value.trim());
      fd.append('featured', String(workForm.featured.checked));
      if (pickedFile) fd.append('image', pickedFile);

      if (editingId) {
        await api(`/api/works/${editingId}`, { method: 'PUT', body: fd });
        toast('Changes saved — live on your site ✓');
      } else {
        await api('/api/works', { method: 'POST', body: fd });
        toast('Published — it\'s live on your site ✓');
      }
      closeModal();
      await loadWorks();
    } catch (err) {
      toast(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  /* ----------------------------- settings ---------------------------- */
  const settingsForm = $('#settingsForm');

  async function loadSettings() {
    const s = await api('/api/settings');
    ['name', 'role', 'availability', 'location', 'tagline', 'about', 'email',
      'instagram', 'behance', 'dribbble', 'linkedin'].forEach((k) => {
      if (settingsForm[k] && s[k] !== undefined) settingsForm[k].value = s[k];
    });
    if (s.stats) {
      settingsForm.stat_years.value = s.stats.years ?? '';
      settingsForm.stat_projects.value = s.stats.projects ?? '';
      settingsForm.stat_clients.value = s.stats.clients ?? '';
    }
  }

  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const body = {};
      ['name', 'role', 'availability', 'location', 'tagline', 'about', 'email',
        'instagram', 'behance', 'dribbble', 'linkedin'].forEach((k) => {
        body[k] = settingsForm[k].value.trim();
      });
      body.stats = {
        years: settingsForm.stat_years.value,
        projects: settingsForm.stat_projects.value,
        clients: settingsForm.stat_clients.value,
      };
      await api('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      toast('Settings saved — live on your site ✓');
    } catch (err) { toast(err.message, true); }
  });

  /* ----------------------------- password ---------------------------- */
  $('#passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.next.value !== f.confirm.value) {
      toast('New passwords do not match', true);
      return;
    }
    try {
      await api('/api/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: f.current.value, next: f.next.value }),
      });
      f.reset();
      toast('Password updated ✓');
    } catch (err) { toast(err.message, true); }
  });

  /* ------------------------------- boot ------------------------------ */
  loadWorks().catch((err) => toast(err.message, true));
  loadSettings().catch(() => {});
})();
