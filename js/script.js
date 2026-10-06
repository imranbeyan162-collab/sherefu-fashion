// Sherefu Fashion - Interactive Client Script
// Auto-sliding hero (every 4s), left/right scroll transitions, trilingual engine

document.addEventListener('DOMContentLoaded', () => {
  /* ------------------------------------------------------------------
     1. LANGUAGE (default Afaan Oromoo, remembered in localStorage)
     ------------------------------------------------------------------ */
  let currentLang = localStorage.getItem('sherefu_lang') || 'om';
  const langSelect = document.getElementById('langSelect');
  const mobileLangSelect = document.getElementById('mobileLangSelect');

  const getT = (obj, path) => path.split('.').reduce((p, c) => (p ? p[c] : null), obj);

  function setLanguage(lang) {
    if (!translations[lang]) lang = 'om';
    currentLang = lang;
    localStorage.setItem('sherefu_lang', lang);
    document.documentElement.lang = lang;
    document.body.classList.toggle('lang-am', lang === 'am');
    if (langSelect) langSelect.value = lang;
    if (mobileLangSelect) mobileLangSelect.value = lang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const val = getT(translations[lang], el.getAttribute('data-i18n'));
      if (!val) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = val;
      } else if (el.classList.contains('two-tone')) {
        // Full title in white, last word highlighted
        const words = val.trim().split(/\s+/);
        const last = words.length > 1 ? words.pop() : '';
        el.textContent = '';
        el.append(document.createTextNode(words.join(' ') + (last ? ' ' : '')));
        if (last) {
          const accent = document.createElement('span');
          accent.className = 'red-text';
          accent.textContent = last;
          el.append(accent);
        }
      } else {
        el.textContent = val;
      }
    });
    document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
      const val = getT(translations[lang], 'alt.' + el.getAttribute('data-i18n-alt'));
      if (val) el.setAttribute('alt', val);
    });
  }
  setLanguage(currentLang);
  [langSelect, mobileLangSelect].forEach((s) => s && s.addEventListener('change', (e) => setLanguage(e.target.value)));

  /* ------------------------------------------------------------------
     2. MOBILE DRAWER
     ------------------------------------------------------------------ */
  const drawer = document.getElementById('mobileDrawer');
  document.getElementById('mobileMenuBtn')?.addEventListener('click', () => drawer?.classList.add('open'));
  document.getElementById('mobileDrawerClose')?.addEventListener('click', () => drawer?.classList.remove('open'));
  document.querySelectorAll('.mobile-nav-list a').forEach((a) => a.addEventListener('click', () => drawer?.classList.remove('open')));

  /* ------------------------------------------------------------------
     3. SCROLL PROGRESS BAR
     ------------------------------------------------------------------ */
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  document.body.appendChild(progress);
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------
     4. HERO — HORIZONTAL AUTO SLIDER (slides by itself every 4 seconds)
     ------------------------------------------------------------------ */
  const track = document.querySelector('.hero-track');
  if (track) {
    const realSlides = Array.from(track.querySelectorAll('.hero-slide'));
    const total = realSlides.length;
    const dots = document.querySelectorAll('.indicator-dot');
    const bar = document.querySelector('.hero-progress');
    const heroContent = document.querySelector('.hero-content');
    const INTERVAL = 4000;
    let index = 0;
    let timer = null;
    let busy = false;

    // Blurred background fill for each slide (from its own photo)
    realSlides.forEach((slide) => {
      const img = slide.querySelector('img');
      const bg = slide.querySelector('.slide-bg');
      if (img && bg) bg.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    });

    // Clone first slide at the end for a seamless infinite loop
    const clone = realSlides[0].cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    const allSlides = track.querySelectorAll('.hero-slide');

    function paint() {
      track.style.transform = `translateX(-${index * 100}%)`;
      allSlides.forEach((s, i) => s.classList.toggle('is-active', i === index));
      const real = index % total;
      dots.forEach((d, i) => d.classList.toggle('active', i === real));
      if (bar) {
        bar.classList.remove('run');
        void bar.offsetWidth;
        bar.classList.add('run');
      }
      if (heroContent) {
        heroContent.classList.remove('text-swap');
        void heroContent.offsetWidth;
        heroContent.classList.add('text-swap');
      }
    }

    function goTo(i) {
      if (busy) return;
      busy = true;
      track.classList.remove('no-anim');
      index = i;
      paint();
    }

    track.addEventListener('transitionend', (e) => {
      if (e.target !== track) return;
      busy = false;
      if (index === total) {
        // jumped onto the clone -> snap back to the real first slide silently
        track.classList.add('no-anim');
        index = 0;
        track.style.transform = 'translateX(0)';
        allSlides.forEach((s, i) => s.classList.toggle('is-active', i === 0));
      }
    });

    const next = () => goTo(index + 1);
    const prev = () => {
      if (index === 0) {
        track.classList.add('no-anim');
        index = total;
        track.style.transform = `translateX(-${total * 100}%)`;
        void track.offsetWidth;
      }
      goTo(index - 1);
    };
    const restart = () => { clearInterval(timer); timer = setInterval(next, INTERVAL); };

    track.classList.add('no-anim');
    paint();
    restart();

    dots.forEach((d) => d.addEventListener('click', () => {
      goTo(parseInt(d.dataset.slideIndex, 10));
      restart();
    }));
    document.querySelector('.hero-arrow.next')?.addEventListener('click', () => { next(); restart(); });
    document.querySelector('.hero-arrow.prev')?.addEventListener('click', () => { prev(); restart(); });

    // Touch swipe on phones
    let startX = null;
    track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); restart(); }
      startX = null;
    });

    // Pause when the tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearInterval(timer); else restart();
    });
  }

  /* ------------------------------------------------------------------
     5. SCROLL TRANSITIONS — photos/cards fly in from LEFT or RIGHT
     ------------------------------------------------------------------ */
  // Cards and gallery photos alternate: left, right, left, right...
  document.querySelectorAll('.curation-grid, .store-gallery-masonry').forEach((grid) => {
    Array.from(grid.children).forEach((item, i) => {
      item.classList.remove('reveal-pop', 'reveal-on-scroll');
      item.classList.add(i % 2 === 0 ? 'reveal-left' : 'reveal-right');
      item.style.transitionDelay = `${(i % 4) * 0.12}s`;
    });
  });

  // Every photo frame gets a red curtain that wipes away as it slides in
  document.querySelectorAll('.story-visual-wrap, .gallery-item, .curation-img-wrap').forEach((el) => {
    el.classList.add('wipe');
    const host = el.closest('.reveal-left, .reveal-right');
    if (host && host.classList.contains('reveal-left')) el.classList.add('wipe-from-left');
  });

  const animated = document.querySelectorAll('.reveal-left, .reveal-right, .reveal-pop, .reveal-on-scroll, .reveal-zoom, .wipe');

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        } else if (entry.boundingClientRect.top > 0) {
          // Element is below the viewport again -> reset so it replays when scrolling down
          entry.target.classList.remove('revealed');
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    animated.forEach((el) => io.observe(el));
  } else {
    animated.forEach((el) => el.classList.add('revealed'));
  }

  /* ------------------------------------------------------------------
     6. CONTACT FORM -> WhatsApp
     ------------------------------------------------------------------ */
  document.getElementById('contactForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('contactName')?.value || '';
    const phone = document.getElementById('contactPhone')?.value || '';
    const msg = document.getElementById('contactMsg')?.value || '';
    const text = `Hello Sherefu Fashion,\n\nName: ${name}\nPhone: ${phone}\nMessage: ${msg}`;
    window.open(`https://wa.me/251988097281?text=${encodeURIComponent(text)}`, '_blank');
  });
});
