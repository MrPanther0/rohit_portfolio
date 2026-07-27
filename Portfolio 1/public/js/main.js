/* ==================================================================
   ROHIT — Portfolio · "ISSUE N°07" front-end
   Editorial print concept. All content loads from the API
   (published via /admin). Motion degrades gracefully when a CDN
   script fails or the visitor prefers reduced motion.
================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
  const pad2 = (n) => String(n).padStart(2, '0');
  const isVideo = (src) => /\.(mp4|webm)$/i.test(src || '');

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';
  const hasST = hasGsap && typeof window.ScrollTrigger !== 'undefined';
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  const state = { works: [], settings: {}, filter: 'All', visible: [] };

  /* ------------------------- smooth scroll ------------------------- */
  let lenis = null;
  if (typeof window.Lenis !== 'undefined' && !prefersReduced) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    if (hasST) lenis.on('scroll', ScrollTrigger.update);
  }
  const scrollToTarget = (sel) => {
    const el = $(sel);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -50, duration: 1.4 });
    else el.scrollIntoView({ behavior: 'smooth' });
  };
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      e.preventDefault();
      document.body.classList.remove('menu-open');
      scrollToTarget(href);
    });
  });

  /* --------------------------- data load --------------------------- */
  const loadData = Promise.all([
    fetch('/api/works').then((r) => r.json()).catch(() => []),
    fetch('/api/settings').then((r) => r.json()).catch(() => ({})),
  ]).then(([works, settings]) => {
    state.works = Array.isArray(works) ? works : [];
    state.settings = settings || {};
    applySettings();
    buildMasthead();
    buildCoverMinis();
    buildFilters();
    renderStories();
    renderIndex(true);
  });

  function applySettings() {
    const s = state.settings;
    const map = {
      name: s.name, role: s.role, tagline: s.tagline,
      about: s.about, availability: s.availability, location: s.location,
    };
    Object.entries(map).forEach(([key, val]) => {
      if (!val) return;
      $$(`[data-set="${key}"]`).forEach((el) => { el.textContent = val; });
    });
    if (s.name && s.role) document.title = `${s.name} — ${s.role} · Issue N°07`;
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

    if (s.email) {
      $$('[data-mail]').forEach((el) => { el.href = `mailto:${s.email}`; });
      $$('[data-mail-text]').forEach((el) => { el.textContent = s.email; });
      const menuMail = $('.menu-mail');
      if (menuMail) menuMail.textContent = s.email;
    }
    if (s.stats) {
      $$('[data-stat]').forEach((el) => {
        const v = s.stats[el.dataset.stat];
        if (v !== undefined) el.textContent = v;
      });
    }
    const socials = $('#socials');
    if (socials) {
      const links = [
        ['Instagram', s.instagram], ['Behance', s.behance],
        ['Dribbble', s.dribbble], ['LinkedIn', s.linkedin],
      ].filter(([, url]) => url);
      socials.innerHTML = links.map(([label, url]) => {
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        return `<a class="social-link" href="${esc(href)}" target="_blank" rel="noopener">${label} ↗</a>`;
      }).join('');
    }
  }

  /* ----------------------- masthead (cover) ------------------------ */
  function buildMasthead() {
    const masthead = $('#masthead');
    if (!masthead) return;
    const name = (state.settings.name || 'Rohit').toUpperCase();
    masthead.innerHTML = [...name].map((ch) =>
      `<span class="ml">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`
    ).join('') + '<sup class="masthead-r">®</sup>';
  }

  function buildCoverMinis() {
    const wrap = $('#coverMinis');
    if (!wrap) return;
    const picks = state.works.slice(0, 3);
    wrap.innerHTML = picks.map((w, i) => `
      <figure class="mini mini--${i + 1}" data-cap="N°${pad2(i + 1)} — ${esc((w.category || '').slice(0, 18))}" data-depth="${[0.045, 0.08, 0.06][i]}">
        ${isVideo(w.image)
          ? `<video src="${esc(w.image)}" muted loop playsinline preload="metadata"></video>`
          : `<img src="${esc(w.image)}" alt="" loading="eager">`}
      </figure>
    `).join('');
    $$('video', wrap).forEach((v) => { v.muted = true; v.play().catch(() => {}); });

    // gentle parallax against the mouse
    if (!finePointer || prefersReduced) return;
    const cover = $('.cover');
    let tx = 0, ty = 0, cx = 0, cy = 0;
    cover.addEventListener('mousemove', (e) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    });
    const minis = $$('.mini', wrap);
    const loop = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      minis.forEach((m) => {
        const d = parseFloat(m.dataset.depth) * 1000;
        m.style.transform = `translate3d(${-cx * d}px, ${-cy * d}px, 0)`;
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------------------------- filters ---------------------------- */
  function buildFilters() {
    const wrap = $('#filters');
    if (!wrap) return;
    const cats = ['All', ...new Set(state.works.map((w) => w.category).filter(Boolean))];
    wrap.innerHTML = cats.map((c) =>
      `<button class="filter-btn${c === state.filter ? ' active' : ''}" data-filter="${esc(c)}">${esc(c)}</button>`
    ).join('');
    $$('.filter-btn', wrap).forEach((btn) => {
      btn.addEventListener('click', () => {
        state.filter = btn.dataset.filter;
        $$('.filter-btn', wrap).forEach((b) => b.classList.toggle('active', b === btn));
        renderIndex(false);
      });
    });
  }

  /* ------------------------- video observer ------------------------ */
  const videoObserver = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const v = entry.target.querySelector('video');
      if (!v) return;
      if (entry.isIntersecting) {
        v.muted = true; // innerHTML-parsed muted attr doesn't always register for autoplay
        v.play().catch(() => {});
      } else v.pause();
    });
  }, { threshold: 0.2 }) : null;

  /* ------------------------- cover stories ------------------------- */
  function renderStories() {
    const section = $('#stories');
    const stack = $('#storyStack');
    if (!section || !stack) return;
    const featured = state.works.filter((w) => w.featured);
    section.hidden = featured.length === 0;
    if (!featured.length) return;

    stack.innerHTML = featured.map((w, i) => `
      <article class="story" data-id="${esc(w.id)}" data-cursor="READ ↗">
        <div class="story-media">
          ${isVideo(w.image)
            ? `<video src="${esc(w.image)}" muted loop playsinline preload="metadata"></video>`
            : `<img src="${esc(w.image)}" alt="${esc(w.title)}" loading="${i === 0 ? 'eager' : 'lazy'}">`}
        </div>
        <div class="story-scrim"></div>
        ${isVideo(w.image) ? '<span class="motion-badge">Motion</span>' : ''}
        <div class="story-info">
          <h3 class="story-title"><span class="story-no">Cover story N°${pad2(i + 1)}</span>${esc(w.title)}</h3>
          <div class="story-meta">
            <span class="story-chip">${esc(w.category)}</span>
            ${w.year ? `<span class="story-year">${esc(w.year)}</span>` : ''}
          </div>
        </div>
      </article>
    `).join('');

    $$('.story', stack).forEach((card) => {
      card.addEventListener('click', () => openLightbox(card.dataset.id, true));
      if (card.querySelector('video') && videoObserver) videoObserver.observe(card);
    });

    // peel effect: each story shrinks slightly as the next one covers it
    if (hasST && !prefersReduced) {
      const stories = $$('.story', stack);
      stories.forEach((story, i) => {
        const next = stories[i + 1];
        if (!next) return;
        gsap.to(story, {
          scale: 0.94,
          filter: 'brightness(0.75)',
          ease: 'none',
          scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true },
        });
      });
    }
  }

  /* --------------------------- the index --------------------------- */
  const rowObserver = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        rowObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }) : null;

  function renderIndex(initial) {
    const list = $('#indexList');
    const empty = $('#worksEmpty');
    if (!list) return;

    const items = state.filter === 'All'
      ? [...state.works]
      : state.works.filter((w) => w.category === state.filter);
    state.visible = items;

    empty.hidden = items.length > 0;
    list.innerHTML = items.map((w, i) => `
      <div class="index-row" data-id="${esc(w.id)}" data-index="${i}" style="--d:${(i % 4) * 0.07}s">
        ${w.featured ? '<span class="index-star">★ COVER</span>' : ''}
        <span class="index-no">N°${pad2(i + 1)}</span>
        <h3 class="index-title">${esc(w.title)}</h3>
        <img class="index-thumb" src="${isVideo(w.image) ? '' : esc(w.image)}" alt="" loading="lazy" ${isVideo(w.image) ? 'hidden' : ''}>
        <span class="index-cat">${esc(w.category)}${isVideo(w.image) ? ' · ▶' : ''}</span>
        <span class="index-year">${esc(w.year || '—')}</span>
        <span class="index-arrow" aria-hidden="true">↗</span>
      </div>
    `).join('');

    $$('.index-row', list).forEach((row) => {
      row.addEventListener('click', () => openLightbox(row.dataset.id));
      if (rowObserver && !prefersReduced) rowObserver.observe(row);
      else row.classList.add('in');
    });

    bindPreview(list);
    if (hasST) ScrollTrigger.refresh();
  }

  /* ---------------- cursor-following index preview ------------------ */
  const preview = $('#indexPreview');
  const previewImg = $('#previewImg');
  const previewVid = $('#previewVid');
  let pvX = 0, pvY = 0, pvTX = 0, pvTY = 0, pvLoop = false;

  function startPreviewLoop() {
    if (pvLoop) return;
    pvLoop = true;
    const run = () => {
      pvX += (pvTX - pvX) * 0.12;
      pvY += (pvTY - pvY) * 0.12;
      preview.style.transform = `translate3d(${pvX}px, ${pvY}px, 0)`;
      requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }

  function bindPreview(list) {
    if (!preview || !finePointer || prefersReduced) return;
    startPreviewLoop();
    list.addEventListener('mousemove', (e) => {
      pvTX = Math.min(e.clientX + 30, window.innerWidth - preview.offsetWidth - 20);
      pvTY = e.clientY - preview.offsetHeight / 2;
    });
    $$('.index-row', list).forEach((row) => {
      row.addEventListener('mouseenter', () => {
        const w = state.visible[+row.dataset.index];
        if (!w) return;
        if (isVideo(w.image)) {
          previewImg.hidden = true;
          previewVid.src = w.image;
          previewVid.hidden = false;
          previewVid.muted = true;
          previewVid.play().catch(() => {});
        } else {
          previewVid.pause();
          previewVid.hidden = true;
          previewImg.src = w.image;
          previewImg.hidden = false;
        }
        preview.classList.add('on');
      });
    });
    list.addEventListener('mouseleave', () => {
      preview.classList.remove('on');
      previewVid.pause();
    });
  }

  /* ------------------------ case file lightbox --------------------- */
  const lightbox = $('#lightbox');
  let lbIndex = 0;

  function openLightbox(id, fromStories = false) {
    if (fromStories || !state.visible.some((w) => w.id === id)) {
      state.visible = [...state.works];
    }
    lbIndex = state.visible.findIndex((w) => w.id === id);
    if (lbIndex < 0) return;
    fillLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    if (preview) preview.classList.remove('on');
  }
  function fillLightbox() {
    const w = state.visible[lbIndex];
    if (!w) return;
    const img = $('#lightboxImg');
    const vid = $('#lightboxVideo');
    vid.pause();
    if (isVideo(w.image)) {
      img.hidden = true;
      img.removeAttribute('src');
      vid.src = w.image;
      vid.hidden = false;
      vid.muted = true; // muted start keeps autoplay legal; controls allow unmuting
      vid.play().catch(() => {});
    } else {
      vid.hidden = true;
      vid.removeAttribute('src');
      img.src = w.image;
      img.alt = w.title;
      img.hidden = false;
    }
    $('#lightboxNo').textContent = `N°${pad2(lbIndex + 1)}`;
    $('#lightboxTitle').textContent = w.title;
    $('#lightboxCat').textContent = w.category;
    $('#lightboxDesc').textContent = w.description || '';
    $('#lightboxYear').textContent = w.year ? `— ${w.year}` : '';
  }
  function closeLightbox() {
    const vid = $('#lightboxVideo');
    vid.pause();
    vid.removeAttribute('src');
    lightbox.hidden = true;
    document.body.style.overflow = '';
    if (lenis) lenis.start();
  }
  const stepLightbox = (dir) => {
    const n = state.visible.length;
    if (!n) return;
    lbIndex = (lbIndex + dir + n) % n;
    fillLightbox();
  };
  $$('[data-lightbox-close]').forEach((el) => el.addEventListener('click', closeLightbox));
  $('#lightboxPrev').addEventListener('click', () => stepLightbox(-1));
  $('#lightboxNext').addEventListener('click', () => stepLightbox(1));
  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });

  /* --------------------------- preloader --------------------------- */
  const preloader = $('#preloader');
  const countEl = $('#preloaderCount');
  const counterDone = new Promise((resolve) => {
    if (prefersReduced) { countEl.textContent = '100'; return resolve(); }
    const t0 = performance.now();
    const DURATION = 1200;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / DURATION);
      countEl.textContent = Math.round(p * 100);
      if (p < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

  let revealed = false;
  function revealSite() {
    if (revealed) return;
    revealed = true;

    if (hasGsap && !prefersReduced) {
      gsap.set('.masthead .ml, .masthead-r', { yPercent: 120, autoAlpha: 0 });
      gsap.set('.masthead-script', { autoAlpha: 0, y: 26 });
      gsap.set('.cover-topline, .cover-footline, .cover-tagline, .cover-badge, .nav', { autoAlpha: 0, y: 16 });
      gsap.set('.mini', { autoAlpha: 0, scale: 0.75 });
    }
    preloader.classList.add('done');

    if (hasGsap && !prefersReduced) {
      const tl = gsap.timeline({ delay: 0.4, defaults: { ease: 'power4.out' } });
      tl.to('.masthead .ml, .masthead-r', { yPercent: 0, autoAlpha: 1, duration: 1.1, stagger: 0.055 })
        .to('.masthead-script', { autoAlpha: 1, y: 0, duration: 0.9 }, '-=0.55')
        .to('.mini', { autoAlpha: 1, scale: 1, duration: 0.8, stagger: 0.12, ease: 'back.out(1.6)' }, '-=0.6')
        .to('.cover-topline', { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.8')
        .to('.cover-tagline', { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.55')
        .to('.cover-badge', { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.55')
        .to('.cover-footline', { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.55')
        .to('.nav', { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.6');
    }
  }
  Promise.all([loadData, counterDone]).then(revealSite);
  setTimeout(revealSite, 4200); // never trap the visitor

  /* --------------------- scroll-driven animation ------------------- */
  function initScrollFX() {
    if (!hasST || prefersReduced) return;

    $$('.section-head').forEach((el) => {
      gsap.from(el, {
        y: 50, autoAlpha: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });

    // manifesto — serif words soak into the page as you scroll
    const statement = $('#statement');
    if (statement && statement.textContent.trim()) {
      statement.innerHTML = statement.textContent.trim().split(/\s+/)
        .map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
      gsap.set('#statement .w', { opacity: 0.14 });
      gsap.to('#statement .w', {
        opacity: 1, stagger: 0.04, ease: 'none',
        scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 55%', scrub: true },
      });
    }

    $$('.backcover-line').forEach((line, i) => {
      gsap.from(line, {
        yPercent: 115, duration: 1.1, delay: i * 0.08, ease: 'power4.out',
        scrollTrigger: { trigger: '.backcover-title', start: 'top 85%' },
      });
    });

    $$('.toc-row').forEach((row) => {
      gsap.from(row, {
        y: 40, autoAlpha: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: row, start: 'top 90%' },
      });
    });
  }

  /* ------------------------- spec counters ------------------------- */
  function initCounters() {
    const nums = $$('[data-stat]');
    if (!nums.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target;
        const target = parseInt(el.textContent, 10) || 0;
        if (prefersReduced) { el.textContent = target; return; }
        const t0 = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / 1400);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    nums.forEach((el) => io.observe(el));
  }

  /* ------------------------------ nav ------------------------------ */
  const nav = $('#nav');
  const progressBar = $('#progress');
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    }
    nav.classList.toggle('scrolled', y > 60);
    if (y > 400 && y > lastY + 4 && !document.body.classList.contains('menu-open')) {
      nav.classList.add('hidden');
    } else if (y < lastY - 4 || y < 400) {
      nav.classList.remove('hidden');
    }
    lastY = y;
  }, { passive: true });

  $('#navBurger').addEventListener('click', () => {
    document.body.classList.toggle('menu-open');
  });

  /* ------------------------ crosshair cursor ----------------------- */
  if (finePointer && !prefersReduced) {
    document.body.classList.add('has-cursor');
    const cursor = $('.cursor');
    const label = $('.cursor-label');
    let mx = -100, my = -100, cx = -100, cy = -100, lx = -100, ly = -100;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.style.opacity = 1;
    });
    document.addEventListener('mouseleave', () => { cursor.style.opacity = 0; });

    const loop = () => {
      cx += (mx - cx) * 0.25; cy += (my - cy) * 0.25;
      lx += (mx - lx) * 0.16; ly += (my - ly) * 0.16;
      cursor.style.translate = `${cx}px ${cy}px`;
      label.style.translate = `${lx}px ${ly}px`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    document.addEventListener('mouseover', (e) => {
      const tagged = e.target.closest('[data-cursor]');
      const clickable = e.target.closest('a, button, .index-row, .story');
      if (tagged) {
        label.textContent = tagged.dataset.cursor;
        label.classList.add('on');
        cursor.style.opacity = 0;
      } else {
        label.classList.remove('on');
        cursor.style.opacity = 1;
        cursor.classList.toggle('grow', !!clickable);
      }
    });
  }

  /* ------------------------- magnetic buttons ---------------------- */
  if (finePointer && !prefersReduced) {
    $$('.magnetic').forEach((el) => {
      const strength = 16;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * strength;
        const y = ((e.clientY - r.top) / r.height - 0.5) * strength;
        el.style.transition = 'transform .1s';
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform .45s cubic-bezier(.33,1,.68,1)';
        el.style.transform = 'translate(0,0)';
      });
    });
  }

  /* ------------------------------ boot ----------------------------- */
  loadData.then(() => {
    initScrollFX();
    initCounters();
  });
})();
