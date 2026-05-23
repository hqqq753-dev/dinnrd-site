// ── Reveal animations ──────────────────────────────────────────────────
document.querySelectorAll('#hero .reveal, #hero .launch-badge').forEach(el => el.classList.add('visible'));

const revealObs = new IntersectionObserver((entries, obs) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

const featObs = new IntersectionObserver((entries, obs) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const s = e.target;
    const phone = s.querySelector('.phone-enter-left, .phone-enter-right');
    if (phone) phone.classList.add('visible');
    const text = s.querySelector('.feat-text-reveal');
    if (text) text.classList.add('visible');
    const ol = s.querySelector('.overline');
    if (ol) ol.classList.add('visible');
    obs.unobserve(s);
  });
}, { threshold: 0.2 });
document.querySelectorAll('.feat').forEach(s => featObs.observe(s));

// ── Scroll: progress bar + parallax + nav ──────────────────────────────
const progressBar = document.getElementById('scroll-progress');
const nav = document.getElementById('site-nav');

function updateProgress() {
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  if (docH > 0) progressBar.style.transform = `scaleY(${window.scrollY / docH})`;
}

const phoneCols = Array.from(document.querySelectorAll('.feat .phone-col'));
let scrollTicking = false;
function runParallax() {
  if (window.innerWidth < 768) { phoneCols.forEach(c => c.style.transform = ''); return; }
  const vpCenter = window.innerHeight / 2;
  phoneCols.forEach(col => {
    const r = col.getBoundingClientRect();
    const dist = vpCenter - (r.top + r.height / 2);
    const offset = dist * 0.15;
    const isRight = !!col.querySelector('.phone-enter-right');
    col.style.transform = `translateY(${isRight ? -offset : offset}px)`;
  });
}
function onScroll() {
  nav.classList.toggle('scrolled', window.scrollY > 40);
  if (!scrollTicking) {
    requestAnimationFrame(() => { runParallax(); updateProgress(); scrollTicking = false; });
    scrollTicking = true;
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
updateProgress();

// ── Phone tilt on mousemove ─────────────────────────────────────────────
if (window.innerWidth >= 768) {
  document.querySelectorAll('.phone-wrap').forEach(wrap => {
    const phone = wrap.querySelector('.iphone');
    if (!wrap || !phone) return;
    const base = parseFloat(wrap.dataset.baseRotate) || 0;
    const col = wrap.closest('.phone-col') || wrap.parentElement;
    let pending = false, tx = 0, ty = 0;
    col.addEventListener('mousemove', e => {
      const r = col.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      ty = ((e.clientY - r.top)  / r.height - 0.5) * 2;
      if (!pending) {
        pending = true;
        requestAnimationFrame(() => {
          phone.style.transition = 'transform 0.1s ease';
          phone.style.transform  = `rotate(${base}deg) perspective(800px) rotateX(${-ty * 5}deg) rotateY(${tx * 5}deg)`;
          pending = false;
        });
      }
    }, { passive: true });
    col.addEventListener('mouseleave', () => {
      phone.style.transition = 'transform 0.45s ease-out';
      phone.style.transform  = `rotate(${base}deg)`;
    });
  });
}

// ── Scroll cue ─────────────────────────────────────────────────────────
const scrollCue = document.querySelector('.scroll-cue');
if (scrollCue) {
  scrollCue.addEventListener('click', () => {
    document.getElementById('problems').scrollIntoView({ behavior: 'smooth' });
  });
}

// ── Waitlist form submission ────────────────────────────────────────────
const debounce = {};
function submitForm(prefix) {
  const emailEl  = document.getElementById(prefix + '-email');
  const btnEl    = document.getElementById(prefix + '-btn');
  const errEl    = document.getElementById(prefix + '-error');
  const wrapEl   = document.getElementById(prefix + '-wrap');
  const noteEl   = document.getElementById(prefix + '-note');
  const origLabel = btnEl ? btnEl.textContent : '';
  const email    = emailEl ? emailEl.value.trim() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (errEl) errEl.textContent = 'Please enter a valid email.'; return;
  }
  if (errEl) errEl.textContent = '';
  if (debounce[prefix]) return;
  debounce[prefix] = true;
  setTimeout(() => { debounce[prefix] = false; }, 500);
  if (btnEl)   { btnEl.disabled = true; btnEl.textContent = 'Joining…'; }
  if (emailEl) emailEl.disabled = true;
  fetch('/.netlify/functions/subscribe', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        const wrap = document.createElement('div');
        wrap.className = 'form-success-wrap';
        wrap.innerHTML = `
          <p class="form-success-msg">You're on the list. We'll email you the moment TestFlight opens.</p>
          <div class="success-social">
            <a href="https://instagram.com/getdinnrd" target="_blank" rel="noopener" class="success-social-btn instagram">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>
              Follow @getdinnrd
            </a>
            <a href="https://twitter.com/getdinnrd" target="_blank" rel="noopener" class="success-social-btn twitter">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Follow @getdinnrd
            </a>
          </div>`;
        if (wrapEl) wrapEl.replaceWith(wrap);
        if (noteEl) noteEl.style.display = 'none';
      } else {
        if (errEl) errEl.textContent = 'Something went wrong. Please try again.';
        if (btnEl)   { btnEl.disabled = false; btnEl.textContent = origLabel; }
        if (emailEl) emailEl.disabled = false;
      }
    })
    .catch(() => {
      if (errEl) errEl.textContent = 'Something went wrong. Please try again.';
      if (btnEl)   { btnEl.disabled = false; btnEl.textContent = origLabel; }
      if (emailEl) emailEl.disabled = false;
    });
}

document.getElementById('hero-btn').addEventListener('click', () => submitForm('hero'));
document.getElementById('mid-btn').addEventListener('click', () => submitForm('mid'));

['hero', 'mid'].forEach(prefix => {
  const el = document.getElementById(prefix + '-email');
  if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') submitForm(prefix); });
});

// ── Stat animation ────────────────────────────────────────────────────
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function flashStatNum(statNum) {
  if (prefersReducedMotion || !statNum) return;
  statNum.classList.remove('flashing');
  void statNum.offsetWidth;
  statNum.classList.add('flashing');
  statNum.addEventListener('animationend', () => statNum.classList.remove('flashing'), { once: true });
}

function countUp(el) {
  if (prefersReducedMotion) return;
  const target = parseInt(el.dataset.target, 10);
  const dur = 1800;
  const t0 = performance.now();
  function step(now) {
    const p = Math.min((now - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target).toLocaleString();
    if (p < 1) { requestAnimationFrame(step); }
    else { flashStatNum(el.closest('.stat-num')); }
  }
  requestAnimationFrame(step);
}

const counterObs = new IntersectionObserver((entries, obs) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const statItems = Array.from(e.target.querySelectorAll('.stats-inner > div'));
    statItems.forEach((item, i) => {
      const sv = item.querySelector('.stat-val[data-target]');
      if (sv) setTimeout(() => countUp(sv), i * 180);
    });
    obs.unobserve(e.target);
  });
}, { threshold: 0.45 });
const statsEl = document.getElementById('stats-strip');
if (statsEl) counterObs.observe(statsEl);

// ── Prob-card hover lift ───────────────────────────────────────────────
document.querySelectorAll('.prob-card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    card.style.transition = 'transform 0.28s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.28s ease';
  });
});

// ── Live waitlist count ────────────────────────────────────────────────
fetch('/.netlify/functions/waitlist-count')
  .then(r => r.json())
  .then(({ count }) => {
    const cap = 500;
    const safeCount = Math.max(0, count || 0);
    if (safeCount < 2) return;
    const pct = Math.min(100, (safeCount / cap) * 100);
    const heroCounter = document.getElementById('hero-spot-counter');
    const heroCount   = document.getElementById('hero-spot-count');
    const heroBar     = document.getElementById('hero-spot-bar');
    if (heroCounter && heroCount && heroBar) {
      heroCount.textContent = safeCount.toLocaleString();
      heroCounter.style.display = 'block';
      requestAnimationFrame(() => { heroBar.style.width = pct + '%'; });
    }
    const midWrap  = document.getElementById('mid-count-wrap');
    const midCount = document.getElementById('mid-count');
    if (midWrap && midCount) {
      midCount.textContent = safeCount.toLocaleString();
      midWrap.style.display = 'block';
    }
  })
  .catch(() => {});

// ── Sign-in modal (Supabase lazy-load) ────────────────────────────────
(function () {
  const navRight = document.getElementById('nav-right');
  const modal    = document.getElementById('signin-modal');
  let prevFocus  = null;

  navRight.innerHTML = '<a href="#mid-cta" class="nav-btn-signup">Join waitlist</a>';

  let _supabase = null;
  let _siteUrl  = null;

  async function loadSupabase() {
    if (_supabase) return;
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    const { supabaseUrl, supabaseAnonKey, siteUrl } = window.DINNRD_CONFIG;
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
    _siteUrl  = siteUrl;
  }

  function showLoggedIn(user) {
    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    navRight.innerHTML = `<span class="nav-user">Hi, ${name}</span><a href="/account" class="nav-account-link">Account</a>`;
  }

  function oauthRedirect() {
    return _siteUrl + '/auth/callback?redirect=' + encodeURIComponent(location.pathname);
  }

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapFocus(e) {
    const els = Array.from(modal.querySelectorAll(FOCUSABLE));
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }

  function openModal() {
    prevFocus = document.activeElement;
    modal.removeAttribute('inert');
    modal.classList.add('open');
    document.getElementById('modal-email').focus();
    modal.addEventListener('keydown', trapFocus);
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.removeEventListener('keydown', trapFocus);
    setTimeout(() => {
      modal.setAttribute('inert', '');
      if (prevFocus) prevFocus.focus();
    }, 200);
  }

  async function handleSignInClick() {
    await loadSupabase();
    try {
      const { data: { session } } = await _supabase.auth.getSession();
      if (session) { showLoggedIn(session.user); return; }
    } catch (_) {}
    openModal();
  }

  const footerSignin = document.getElementById('footer-signin-btn');
  if (footerSignin) footerSignin.addEventListener('click', handleSignInClick);

  document.getElementById('modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  document.getElementById('modal-apple').addEventListener('click', async () => {
    await loadSupabase();
    _supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: oauthRedirect() } });
  });
  document.getElementById('modal-google').addEventListener('click', async () => {
    await loadSupabase();
    _supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: oauthRedirect() } });
  });

  const modalErr = document.getElementById('modal-error');
  document.getElementById('modal-submit').addEventListener('click', async () => {
    await loadSupabase();
    const email    = document.getElementById('modal-email').value.trim();
    const password = document.getElementById('modal-password').value;
    const btn      = document.getElementById('modal-submit');
    modalErr.textContent = '';
    if (!email || !password) { modalErr.textContent = 'Please enter your email and password.'; return; }
    btn.disabled = true; btn.textContent = 'Signing in…';
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) {
      modalErr.textContent = error.message.includes('Invalid login credentials') ? 'Incorrect email or password.' : error.message;
      btn.disabled = false; btn.textContent = 'Sign in'; return;
    }
    closeModal();
    showLoggedIn(data.user);
  });

  document.getElementById('modal-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('modal-submit').click();
  });
})();
