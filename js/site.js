// Shared chrome (header, footer, donate dialog, audio) + page behaviours.
// Injected from one place so the 7 pages don't each carry a copy of the nav/footer.
const ASSETS = 'https://hopeever.org/assets/images/';
const W3F_KEY = '92aceb5c-0b7c-4af2-94e7-28e64e1dadab'; // Web3Forms public key for contact@hopeever.org (from the original site)

const NAV = [
  ['home', 'index.html', 'Home'],
  ['about', 'about.html', 'About'],
  ['projects', 'projects.html', 'Projects'],
  ['programs', 'programs.html', 'Programs'],
  ['gallery', 'gallery.html', 'Gallery'],
  ['contact', 'contact.html', 'Contact'],
];

// Same fields as the original contact form, so Web3Forms submissions keep their shape.
function formHTML(p, subject) {
  const opts = ['Partnership', 'Volunteer', 'Donation', 'Media', 'General']
    .map(o => `<option${o === subject ? ' selected' : ''}>${o}</option>`).join('');
  return `
  <form class="form w3f" action="https://api.web3forms.com/submit" method="POST">
    <input type="hidden" name="access_key" value="${W3F_KEY}">
    <input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    <label>Full name<input class="field" id="${p}name" name="name" type="text" autocomplete="name" required></label>
    <label>Email<input class="field" id="${p}email" name="email" type="email" autocomplete="email" required></label>
    <label>Phone <span class="muted">(optional)</span><input class="field" id="${p}phone" name="phone" type="tel" autocomplete="tel"></label>
    <label>Subject<select class="field" id="${p}subject" name="subject">${opts}</select></label>
    <label>Message<textarea class="field" id="${p}message" name="message" required></textarea></label>
    <button class="btn btn-solid" type="submit">Send</button>
    <p class="form-feedback" role="status" aria-live="polite"></p>
  </form>`;
}

function injectChrome() {
  const page = document.body.dataset.page;
  const main = document.querySelector('main');

  main.insertAdjacentHTML('beforebegin', `
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="index.html"><img src="${ASSETS}common/circular_logo-removebg-preview.png" alt="" width="42" height="42"><span>Hope Ever<br>Foundation</span></a>
    <nav class="nav" id="nav" aria-label="Main">
      ${NAV.map(([k, h, t]) => `<a href="${h}"${k === page ? ' aria-current="page"' : ''}>${t}</a>`).join('')}
    </nav>
    <div class="head-actions">
      <button class="btn btn-solid" type="button" data-donate>Donate</button>
      <button class="btn menu-btn" type="button" aria-expanded="false" aria-controls="nav" aria-label="Menu">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect y="4.75" width="20" height="1.5" fill="currentColor"/><rect y="9.25" width="20" height="1.5" fill="currentColor"/><rect y="13.75" width="20" height="1.5" fill="currentColor"/></svg>
      </button>
    </div>
  </header>`);

  main.insertAdjacentHTML('afterend', `
  <footer class="site-footer">
    <div class="wrap">
      <p class="footer-motto">Empowering communities with dignity since 2012</p>
      <div class="footer-grid">
        <section>
          <h2>Hope Ever Foundation</h2>
          <p>Empowering marginalized communities through sustainable livelihoods, education, and dignity.</p>
          <p>Reg. No. 63/12 · Registered under the Indian Trust Act, 1882 · 12AA &amp; 80G recognised</p>
        </section>
        <section>
          <h2>Explore</h2>
          ${NAV.map(([, h, t]) => `<a href="${h}">${t}</a>`).join('')}
        </section>
        <section>
          <h2>Contact</h2>
          <p>No. 12, Gandhi Nagar 3rd Street, Adyar, Chennai, Tamil Nadu 600020, India</p>
          <a href="mailto:contact@hopeever.org">contact@hopeever.org</a>
        </section>
        <section>
          <h2>Elsewhere</h2>
          <a href="https://www.facebook.com/p/Hope-Ever-Foundation-100079969281675/" target="_blank" rel="noopener noreferrer">Facebook</a>
          <a href="https://www.justdial.com/Chennai/Hope-Ever-Foundation-Charitable-Trust-Nesapakkam/044PXX44-XX44-240926172728-J3T9_BZDET" target="_blank" rel="noopener noreferrer">Justdial</a>
          <a href="https://worldsearch.co.in/GetBusinessDetail/HOPE-EVER-FOUNDATION" target="_blank" rel="noopener noreferrer">WorldSearch</a>
        </section>
      </div>
      <div class="footer-bottom">
        <span>&copy; ${new Date().getFullYear()} Hope Ever Foundation. All rights reserved.</span>
        <span><a href="https://hopeever.org/docs/terms-and-conditions.pdf" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a> · <a href="https://hopeever.org/docs/privacy-policy.pdf" target="_blank" rel="noopener noreferrer">Privacy Policy</a></span>
      </div>
    </div>
  </footer>

  <button class="btn audio-btn" type="button" aria-pressed="false"><span class="audio-dot"></span>Audio</button>

  <dialog id="donate" aria-labelledby="donate-title">
    <form method="dialog"><button class="btn x" aria-label="Close">&times;</button></form>
    <span class="eyebrow">Support our work</span>
    <h2 id="donate-title" class="h2">Donate to Hope Ever</h2>
    <p class="muted">Hope Ever Foundation is recognised under Sections 12AA and 80G of the Income Tax Act. Send us your details and our team will share bank transfer information and an 80G receipt for your contribution.</p>
    ${formHTML('d-', 'Donation')}
  </dialog>`);
}

function initNav() {
  const header = document.querySelector('.site-header');
  const btn = document.querySelector('.menu-btn');
  const setOpen = open => {
    document.body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open);
  };
  btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
  document.getElementById('nav').addEventListener('click', e => e.target.closest('a') && setOpen(false));
  addEventListener('keydown', e => e.key === 'Escape' && setOpen(false));
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initDonate() {
  const dlg = document.getElementById('donate');
  document.addEventListener('click', e => {
    if (e.target.closest('[data-donate]')) dlg.showModal();
    else if (e.target === dlg) dlg.close(); // click on backdrop
  });
}

// Web3Forms submit for every form.w3f (contact page + donate dialog).
// Unlike the old contact.js, this checks the API's `success` flag instead of always reporting success.
function initForms() {
  document.addEventListener('submit', async e => {
    const form = e.target;
    if (!form.classList.contains('w3f')) return;
    e.preventDefault();
    const out = form.querySelector('.form-feedback');
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    out.className = 'form-feedback';
    out.textContent = 'Sending your message…';
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      out.textContent = 'Thank you! Your message has been sent. We will get back to you soon.';
      out.classList.add('ok');
      form.reset();
    } catch {
      out.textContent = 'Sorry, something went wrong. Please try again or email contact@hopeever.org.';
      out.classList.add('err');
    }
    btn.disabled = false;
  });
}

function initReveal() {
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { threshold: .15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

function initCounters() {
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    const el = en.target, end = +el.dataset.count, suffix = el.dataset.suffix || '', t0 = performance.now();
    const tick = now => {
      const k = Math.min((now - t0) / 1600, 1);
      el.textContent = Math.round(end * (1 - (1 - k) ** 3)).toLocaleString('en-IN') + suffix;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: .4 });
  document.querySelectorAll('[data-count]').forEach(el => io.observe(el));
}

// <div data-filters=".selector"> of <button data-filter="x">: shows only matching items with data-category="x".
function initFilters() {
  document.querySelectorAll('[data-filters]').forEach(group => {
    const items = document.querySelectorAll(group.dataset.filters);
    group.addEventListener('click', e => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      group.querySelectorAll('[data-filter]').forEach(x => x.setAttribute('aria-pressed', x === b));
      items.forEach(it => { it.hidden = b.dataset.filter !== 'all' && it.dataset.category !== b.dataset.filter; });
    });
  });
}

function initLightbox() {
  const dlg = document.getElementById('lightbox');
  if (!dlg) return;
  const img = dlg.querySelector('img'), cap = dlg.querySelector('p');
  let list = [], i = 0;
  const show = () => {
    const src = list[i].querySelector('img');
    img.src = src.src; img.alt = src.alt; cap.textContent = list[i].dataset.caption;
  };
  document.addEventListener('click', e => {
    const item = e.target.closest('.g-item');
    if (item) {
      list = [...document.querySelectorAll('.g-item:not([hidden])')];
      i = list.indexOf(item); show(); dlg.showModal();
    } else if (e.target.closest('[data-step]')) {
      i = (i + +e.target.closest('[data-step]').dataset.step + list.length) % list.length; show();
    } else if (e.target === dlg) dlg.close();
  });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { i = (i + 1) % list.length; show(); }
    if (e.key === 'ArrowLeft') { i = (i - 1 + list.length) % list.length; show(); }
  });
}

// Ambient pad synthesised with Web Audio (no audio file to download). Off until the visitor opts in.
function initAudio() {
  const btn = document.querySelector('.audio-btn');
  let ctx, master;
  btn.addEventListener('click', () => {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 900;
      lp.connect(master).connect(ctx.destination);
      [110, 164.81, 220, 277.18].forEach((hz, n) => { // A major, low and warm
        const osc = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        osc.type = n % 2 ? 'sine' : 'triangle'; osc.frequency.value = hz; osc.detune.value = (n - 1.5) * 6;
        g.gain.value = .06; lfo.frequency.value = .05 + n * .03; lg.gain.value = .04;
        lfo.connect(lg).connect(g.gain); osc.connect(g).connect(lp);
        osc.start(); lfo.start();
      });
    }
    const on = btn.getAttribute('aria-pressed') !== 'true';
    ctx.resume();
    master.gain.setTargetAtTime(on ? .5 : 0, ctx.currentTime, .8);
    btn.setAttribute('aria-pressed', on);
  });
}

injectChrome();
initNav();
initDonate();
initForms();
initReveal();
initCounters();
initFilters();
initLightbox();
initAudio();
