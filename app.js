/* ══════════════════════════════════════════════════════════
   LUMINOR — app.js  |  Premium Interactions
   ══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ── LOADER ──────────────────────────────────────────────
  const loader = document.getElementById('loader');

  window.addEventListener('load', () => {
    setTimeout(() => loader?.classList.add('off'), 1400);
  });

  // Fallback: esconde o loader mesmo sem evento load
  setTimeout(() => loader?.classList.add('off'), 4000);


  // ── CURSOR PREMIUM ───────────────────────────────────────
  const isTouch = !window.matchMedia('(pointer:fine)').matches;
  if (isTouch) {
    document.body.classList.add('touch');
  } else {
    const cur     = document.getElementById('cur');
    const curRing = document.getElementById('curRing');
    let mouseX = -100, mouseY = -100;
    let ringX  = -100, ringY  = -100;

    window.addEventListener('mousemove', e => {
      mouseX = e.clientX; mouseY = e.clientY;
      if (cur) { cur.style.left = mouseX + 'px'; cur.style.top = mouseY + 'px'; }
    });

    // Anel com lag suave
    function animRing() {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      if (curRing) {
        curRing.style.left = ringX + 'px';
        curRing.style.top  = ringY + 'px';
      }
      requestAnimationFrame(animRing);
    }
    animRing();
  }


  // ── NAV SCROLL ───────────────────────────────────────────
  const nav = document.getElementById('nav');

  const onScroll = () => {
    nav?.classList.toggle('scrolled', window.scrollY > 50);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();


  // ── MOBILE MENU ──────────────────────────────────────────
  const burger  = document.getElementById('navBurger');
  const navMenu = document.getElementById('navMenu');

  if (burger && navMenu) {
    burger.addEventListener('click', () => {
      const open = navMenu.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open.toString());
    });
    navMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navMenu.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
    // Fechar ao clicar fora
    document.addEventListener('click', e => {
      if (!nav?.contains(e.target)) {
        navMenu.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }


  // ── SCROLL REVEAL ────────────────────────────────────────
  const reveals = document.querySelectorAll('.reveal');

  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(el => revealObs.observe(el));


  // ── COUNTERS ─────────────────────────────────────────────
  const counters = document.querySelectorAll('[data-count]');

  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const dur    = 1400; // ms
      const start  = performance.now();

      const tick = (now) => {
        const t    = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
        const val  = Math.round(ease * target);
        el.textContent = val;
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          // Sufixos finais
          if (el.dataset.count === '100') el.textContent = '100';
          else if (target >= 10) el.textContent = target + '+';
          else el.textContent = target;
        }
      };
      requestAnimationFrame(tick);
      counterObs.unobserve(el);
    });
  }, { threshold: 0.4 });

  counters.forEach(c => counterObs.observe(c));


  // ── PARALLAX HERO ────────────────────────────────────────
  const heroMedia = document.querySelector('.hero-media');

  if (heroMedia && !isTouch) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y < window.innerHeight * 1.2) {
            heroMedia.style.transform = `translateY(${y * 0.2}px)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }


  // ── PORTFOLIO FILTERS ────────────────────────────────────
  const filterBtns = document.querySelectorAll('.pf-btn');
  const portCards  = document.querySelectorAll('.port-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Atualiza botões
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const filter = btn.dataset.filter;

      portCards.forEach(card => {
        const cat = card.dataset.cat;
        const show = filter === 'all' || cat === filter;

        if (show) {
          card.classList.remove('hidden');
          card.style.animation = 'fadeUp .4s var(--ease) both';
        } else {
          card.classList.add('hidden');
          card.style.animation = '';
        }
      });
    });
  });


  // ── FOOTER YEAR ──────────────────────────────────────────
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();


  // ── SMOOTH ANCHOR SCROLL ─────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });


  // ── LAZY VIDEO (Intersection) ─────────────────────────────
  const videos = document.querySelectorAll('video[data-src]');
  if (videos.length) {
    const videoObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const v = e.target;
          v.src = v.dataset.src;
          v.load();
          videoObs.unobserve(v);
        }
      });
    });
    videos.forEach(v => videoObs.observe(v));
  }

});
