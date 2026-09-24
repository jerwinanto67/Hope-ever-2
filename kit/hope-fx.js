/*! Hope FX v1: 3D card menu, scroll chapters and scroll flight for any website.
    Plain JavaScript, no build step; three.js loads on demand from jsDelivr.
    Docs: https://github.com/jerwinanto67/Hope-ever-2/tree/main/kit */
(() => {
  'use strict';
  if (window.HopeFX) return; // loaded twice (site-wide code + a page embed)

  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/+esm';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ponytail: coarse "low-end" heuristic; swap for a GPU benchmark if it misfires on real devices.
  const low = !!(navigator.connection?.saveData || navigator.deviceMemory <= 2 ||
    (matchMedia('(pointer: coarse)').matches && (navigator.hardwareConcurrency || 4) <= 4));
  let threeP;
  const loadThree = () => (threeP ||= import(THREE_URL));
  const onReady = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  // Render a three.js loop only while `el` is on screen.
  const whileVisible = (el, renderer, frame) =>
    new IntersectionObserver(([e]) => renderer.setAnimationLoop(e.isIntersecting ? frame : null)).observe(el);

  // ======================================================================
  // 1. Card menu: the page shrinks away, then photo cards slide in 3D.
  //    HopeFX.menu({ brand, logo, home, items: [{ title, href, image, line }], cta: { label, href } })
  //    Opens from the floating button, any link to "#hfx-menu", or any element with class "hfx-open".
  // ======================================================================
  const OPENERS = 'a[href="#hfx-menu"], .hfx-open';

  function samePage(href) {
    const a = new URL(href, location.href);
    const norm = p => p.replace(/index\.html?$/, '').replace(/\/$/, '');
    return a.origin === location.origin && norm(a.pathname) === norm(location.pathname);
  }

  function menu(options) {
    const o = { items: [], brand: '', logo: '', home: '/', cta: null, hint: 'Scroll, drag or use ← →', button: 'auto', ...options };
    onReady(() => buildMenu(o));
  }

  function buildMenu(o) {
    if (document.querySelector('.hfx-menu') || !o.items.length) return;
    const dlg = document.createElement('dialog');
    dlg.className = 'hfx-menu';
    dlg.setAttribute('aria-label', 'Site menu');
    dlg.innerHTML = `
      <div class="hfx-menu-top">
        <a class="hfx-menu-brand" href="${esc(o.home)}">${o.logo ? `<img src="${esc(o.logo)}" alt="">` : ''}<span>${esc(o.brand)}</span></a>
        <form method="dialog"><button class="hfx-menu-close" aria-label="Close menu">&times;</button></form>
      </div>
      <div class="hfx-rail">${o.items.map((it, i) => `
        <a class="hfx-card" href="${esc(it.href)}"${samePage(it.href) ? ' aria-current="page"' : ''}>
          <span class="hfx-poster">${it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy">` : ''}<span class="hfx-num">${String(i + 1).padStart(2, '0')}</span><span class="hfx-title">${esc(it.title)}</span></span>
          <span class="hfx-line">${esc(it.line)}</span>
        </a>`).join('')}
      </div>
      <div class="hfx-menu-bottom"><span>${esc(o.hint)}</span>${o.cta ? `<a class="hfx-cta" href="${esc(o.cta.href)}">${esc(o.cta.label)}</a>` : ''}</div>`;
    document.body.append(dlg);

    if (o.button === true || (o.button === 'auto' && !document.querySelector(OPENERS))) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hfx-trigger hfx-open';
      b.setAttribute('aria-label', 'Open menu');
      b.setAttribute('aria-haspopup', 'dialog');
      b.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect y="4.75" width="20" height="1.5" fill="currentColor"/><rect y="9.25" width="20" height="1.5" fill="currentColor"/><rect y="13.75" width="20" height="1.5" fill="currentColor"/></svg>';
      document.body.append(b);
    }

    const rail = dlg.querySelector('.hfx-rail');
    const cards = [...rail.children];
    const start = Math.max(0, cards.findIndex(c => c.hasAttribute('aria-current')));
    let pos = start, target = start, raf = 0, idle = 0, drag = null, moved = false, shrunk = [];
    const gap = () => cards[0].offsetWidth + 28;

    const layout = () => {
      const w = gap();
      cards.forEach((c, i) => {
        const off = i - pos, a = Math.abs(off);
        c.style.transform = `translateX(${off * w}px) translateZ(${-a * 140}px) rotateY(${clamp(-off * 16, -40, 40)}deg) translateY(${Math.min(a, 1) * 18}px)`;
        c.style.opacity = a > 3.2 ? 0 : 1 - Math.max(0, a - 2.2);
        c.style.zIndex = 100 - Math.round(a * 10);
        c.classList.toggle('is-center', a < .5);
        if (a >= .5) c.firstElementChild.style.transform = ''; // drop pointer tilt once off-centre
      });
    };
    const loop = () => {
      cancelAnimationFrame(raf);
      const tick = () => {
        pos += (target - pos) * (reduce ? 1 : .14);
        if (Math.abs(target - pos) < .001) pos = target;
        layout();
        if (pos !== target) raf = requestAnimationFrame(tick);
      };
      tick();
    };
    const go = t => { target = clamp(t, 0, cards.length - 1); loop(); };
    const snap = () => { clearTimeout(idle); idle = setTimeout(() => go(Math.round(target)), 140); };

    // Page shrink: every top-level page element scales toward the viewport centre.
    const pageEls = () => [...document.body.children].filter(el =>
      el !== dlg && !el.classList.contains('hfx-trigger') && !/^(SCRIPT|STYLE|LINK|NOSCRIPT|TEMPLATE)$/.test(el.tagName));
    const open = () => {
      if (dlg.open) return;
      shrunk = reduce ? [] : pageEls();
      shrunk.forEach(el => {
        const r = el.getBoundingClientRect();
        el.dataset.hfxOrigin = el.style.transformOrigin;
        el.style.transformOrigin = `${innerWidth / 2 - r.left}px ${innerHeight / 2 - r.top}px`;
        el.classList.add('hfx-zoomable');
      });
      void document.body.offsetWidth; // commit the transition before shrinking
      shrunk.forEach(el => el.classList.add('hfx-shrink'));
      pos = target = start;
      setTimeout(() => { dlg.showModal(); layout(); cards[start].focus({ preventScroll: true }); }, reduce ? 0 : 380);
    };
    const reset = () => {
      dlg.classList.remove('hfx-leaving');
      cards.forEach(c => c.classList.remove('hfx-go'));
      const els = shrunk;
      shrunk = [];
      els.forEach(el => el.classList.remove('hfx-shrink'));
      setTimeout(() => els.forEach(el => { el.classList.remove('hfx-zoomable'); el.style.transformOrigin = el.dataset.hfxOrigin || ''; }), 500);
    };

    document.addEventListener('click', e => { if (e.target.closest(OPENERS)) { e.preventDefault(); open(); } });
    dlg.addEventListener('close', reset);
    // Back/forward cache can restore the page mid-transition (menu fading, page shrunk): reset directly.
    addEventListener('pageshow', e => { if (e.persisted) { if (dlg.open) dlg.close(); reset(); } });

    dlg.addEventListener('wheel', e => { e.preventDefault(); target = clamp(target + (e.deltaY + e.deltaX) / 420, 0, cards.length - 1); loop(); snap(); }, { passive: false });
    dlg.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      go(Math.round(target) + d);
      cards[Math.round(target)].focus({ preventScroll: true });
    });
    cards.forEach((c, i) => c.addEventListener('focus', () => go(i)));

    rail.addEventListener('pointerdown', e => { drag = { x: e.clientX, t: target }; moved = false; });
    addEventListener('pointermove', e => {
      if (drag) { // drag slides the rail
        const dx = e.clientX - drag.x;
        if (Math.abs(dx) > 6) moved = true;
        target = clamp(drag.t - dx / gap(), 0, cards.length - 1);
        loop();
      } else if (dlg.open && !reduce) { // otherwise the centre card tilts toward the pointer
        const p = rail.querySelector('.is-center .hfx-poster');
        if (p) p.style.transform = `rotateY(${(e.clientX / innerWidth - .5) * 16}deg) rotateX(${-(e.clientY / innerHeight - .5) * 12}deg)`;
      }
    }, { passive: true });
    const endDrag = () => { if (drag) { drag = null; go(Math.round(target)); } };
    addEventListener('pointerup', endDrag);
    addEventListener('pointercancel', endDrag);

    rail.addEventListener('click', e => {
      const card = e.target.closest('.hfx-card');
      if (!card) return;
      e.preventDefault();
      if (moved) return;
      const i = cards.indexOf(card);
      if (Math.round(pos) !== i) return go(i); // side card: bring it to the centre first
      if (card.hasAttribute('aria-current')) return dlg.close();
      card.classList.add('hfx-go');
      dlg.classList.add('hfx-leaving');
      setTimeout(() => { location.href = card.href; }, reduce ? 0 : 520);
    });
  }

  // ======================================================================
  // Sliced sculpture: a stack of thin extruded slices that twists and re-stacks
  // (bottom to top, with a small glitch jolt) when its shape/colours change.
  // ======================================================================
  const SHAPES = { leaf: 0, disc: 1, crescent: 2, wing: 3 };

  async function makeSculpture(canvas) {
    const THREE = await loadThree();
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !low });
    renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : 1.75));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 50);
    camera.position.set(0, .6, 11);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x886644, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 4, 5);
    const rim = new THREE.DirectionalLight(0xffffff, 1.2);
    rim.position.set(-5, -1, -2);
    scene.add(key, rim);

    const S = () => new THREE.Shape();
    const shapes = [
      S().moveTo(0, -1).bezierCurveTo(1.3, -.5, 1.1, .7, 0, 1).bezierCurveTo(-.6, .5, -.7, -.5, 0, -1),
      S().absarc(0, 0, 1, .5, Math.PI * 2 - .2, false).lineTo(.15, .05),
      (() => { const s = S().absarc(0, 0, 1, Math.PI * .15, Math.PI * 1.85, false); s.absarc(.45, 0, .75, Math.PI * 1.7, Math.PI * .3, true); return s; })(),
      S().moveTo(-1, -.4).quadraticCurveTo(-.7, .9, -.3, .3).quadraticCurveTo(0, 1.1, .3, .35).quadraticCurveTo(.7, 1, 1, .1).quadraticCurveTo(.4, -.9, -1, -.4),
    ];
    const geos = shapes.map(s => new THREE.ExtrudeGeometry(s, { depth: .2, bevelEnabled: true, bevelThickness: .04, bevelSize: .05, bevelSegments: low ? 1 : 2, curveSegments: low ? 10 : 28 }).rotateX(-Math.PI / 2).center());

    const N = 15, GAP = .3;
    const group = new THREE.Group();
    scene.add(group);
    const slices = Array.from({ length: N }, (_, k) => {
      const m = new THREE.Mesh(geos[0], new THREE.MeshStandardMaterial({ roughness: .35, metalness: .05, transparent: true, opacity: .9 }));
      m.userData = { h: k / (N - 1), swapAt: 0, next: 0, jolt: 0, color: new THREE.Color(), target: new THREE.Color() };
      group.add(m);
      return m;
    });

    let twist = 2.4, twistTarget = 2.4;
    const mouse = { x: 0, y: 0 };
    addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; }, { passive: true });
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const small = innerWidth < 700;
      group.scale.setScalar(small ? .7 : 1);
      group.position.y = small ? .5 : .2; // keep clear of the chapter text on phones
    };
    new ResizeObserver(resize).observe(canvas);
    resize();

    const t0 = performance.now();
    const frame = now => {
      const t = reduce ? 0 : (now - t0) / 1000;
      twist += (twistTarget - twist) * .05;
      slices.forEach((m, k) => {
        const u = m.userData;
        if (u.swapAt && now >= u.swapAt) { m.geometry = geos[u.next]; u.swapAt = 0; u.jolt = reduce ? 0 : (k % 2 ? 1 : -1) * .5; }
        u.jolt *= .88;
        u.color.lerp(u.target, .08);
        m.material.color.copy(u.color);
        const s = .75 + Math.sin(u.h * Math.PI) * .55; // swollen middle, tapered ends
        m.scale.set(s, 1, s);
        m.position.y = (k - (N - 1) / 2) * GAP;
        m.rotation.y = u.h * twist + t * .35 + mouse.x * 1.2;
        m.position.x = Math.sin(u.h * 3 + t * .8) * .25 + u.jolt;
      });
      group.rotation.x = mouse.y * .3;
      renderer.render(scene, camera);
    };
    whileVisible(canvas, renderer, frame);

    return {
      // d: { shape, c1, c2, twist }; shape is a name (leaf, disc, crescent, wing) or 0-3.
      go(d, instant = false) {
        const now = performance.now(), c1 = new THREE.Color(d.c1 || '#0F6E56'), c2 = new THREE.Color(d.c2 || '#9be3c4');
        const shape = SHAPES[d.shape] ?? clamp(+d.shape || 0, 0, 3);
        twistTarget = +d.twist || 2.4;
        if (instant) twist = twistTarget;
        slices.forEach((m, k) => {
          const u = m.userData;
          u.swapAt = now + (reduce || instant ? 0 : k * 45);
          u.next = shape;
          u.target.copy(c1).lerp(c2, u.h);
          if (instant) u.color.copy(u.target);
        });
        frame(now);
      },
    };
  }

  // ======================================================================
  // 2. Scroll chapters: a pinned stage; each 100vh of scroll switches chapter,
  //    the sculpture restacks, a giant word slides behind it, the colour changes.
  //    <section data-hfx="chapters"><ol><li data-word data-bg data-c1 data-c2 data-shape data-twist>
  //      <h3>…</h3><p>…</p><a href="…">Discover</a></li>…</ol></section>
  // ======================================================================
  function chapters(sec) {
    if (sec.hfxDone) return;
    const items = [...sec.querySelectorAll(':scope > ol > li, :scope > ul > li')];
    if (!items.length) return;
    sec.hfxDone = true;
    sec.classList.add('hfx-chapters');
    const list = items[0].parentElement;
    list.classList.add('hfx-ch-list');
    items.forEach(li => li.querySelector(':scope > a:last-of-type')?.classList.add('hfx-ch-link'));
    const stage = document.createElement('div');
    stage.className = 'hfx-ch-stage';
    stage.innerHTML = '<div class="hfx-ch-marquee" aria-hidden="true"><div class="hfx-ch-track"></div></div><canvas class="hfx-ch-canvas" aria-hidden="true"></canvas><nav class="hfx-ch-nav" aria-label="Chapters"></nav>';
    sec.prepend(stage);
    stage.insertBefore(list, stage.lastElementChild);
    sec.style.height = items.length * 100 + 'vh';

    const marquee = stage.firstElementChild, track = marquee.firstElementChild, nav = stage.lastElementChild;
    const jump = i => scrollTo({ top: sec.getBoundingClientRect().top + scrollY + (i + .5) / items.length * (sec.offsetHeight - innerHeight), behavior: reduce ? 'auto' : 'smooth' });
    const btns = items.map((li, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = i + 1;
      b.setAttribute('aria-label', `Chapter ${i + 1}: ${li.querySelector('h1,h2,h3,h4')?.textContent.trim() || ''}`);
      b.addEventListener('click', () => jump(i));
      nav.append(b);
      return b;
    });

    let sculpt = null, cur = -1;
    const set = i => {
      cur = i;
      const d = items[i].dataset;
      items.forEach((li, k) => li.classList.toggle('hfx-on', k === i));
      btns.forEach((b, k) => k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'));
      if (d.bg) stage.style.setProperty('--hfx-ch-bg', d.bg);
      track.innerHTML = `<span>${esc(d.word || items[i].querySelector('h1,h2,h3,h4')?.textContent)}</span>`.repeat(8);
      marquee.classList.remove('hfx-swap'); void marquee.offsetWidth; marquee.classList.add('hfx-swap');
      sculpt?.go(d);
    };
    const onScroll = () => {
      const r = sec.getBoundingClientRect();
      const i = Math.floor(clamp(-r.top / (r.height - innerHeight), 0, .9999) * items.length);
      if (i !== cur) set(i);
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const canvas = stage.querySelector('canvas');
    makeSculpture(canvas).then(s => { sculpt = s; s.go(items[cur].dataset, true); }).catch(() => canvas.remove());
  }

  // ======================================================================
  // 3. Scroll flight: story cards scroll over a 3D sky; the camera flies past
  //    one glowing orb per card. Orbs glow on hover and link to data-href.
  //    <section data-hfx="flight" data-bg="#04110c"><article data-color data-href>
  //      <span class="hfx-big">2012</span><h3>…</h3><p>…</p></article>…</section>
  // ======================================================================
  const PALETTE = ['#F2C46D', '#6EE7B7', '#F6D58E', '#2BB58A', '#f7bcd3', '#A7F3D0'];

  function flight(sec) {
    if (sec.hfxDone) return;
    const cards = [...sec.children].filter(el => el.tagName === 'ARTICLE');
    if (!cards.length) return;
    sec.hfxDone = true;
    sec.classList.add('hfx-flight');
    const bg = sec.dataset.bg || '#04110c';
    sec.style.setProperty('--hfx-fl-bg', bg);
    cards.forEach(c => {
      const stop = document.createElement('div');
      stop.className = 'hfx-stop';
      c.classList.add('hfx-fl-card');
      c.replaceWith(stop);
      stop.append(c);
    });
    const stage = document.createElement('div');
    stage.className = 'hfx-fl-stage';
    stage.innerHTML = '<canvas aria-hidden="true"></canvas><div class="hfx-fl-tip" aria-hidden="true"></div>';
    sec.prepend(stage);

    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('hfx-in'); io.unobserve(e.target); } }), { threshold: .2 });
    cards.forEach(c => io.observe(c));

    buildFlight(sec, stage, cards, bg).catch(() => stage.classList.add('hfx-fl-fallback'));
  }

  async function buildFlight(sec, stage, cards, bg) {
    const THREE = await loadThree();
    const canvas = stage.querySelector('canvas'), tip = stage.querySelector('.hfx-fl-tip');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low });
    renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : 1.75));
    renderer.setClearColor(bg);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(bg, .035);
    const camera = new THREE.PerspectiveCamera(55, 1, .1, 100);

    const glowTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(.25, 'rgba(255,255,255,.35)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();

    const vert = `
      uniform float uTime, uSeed;
      varying vec3 vN, vView;
      varying float vNoise;
      float n3(vec3 p) { return sin(p.x * 1.7 + uTime * .6 + uSeed) * sin(p.y * 2.1 + uTime * .5) * sin(p.z * 1.9 + uTime * .7 + uSeed * 2.); }
      void main() {
        float d = n3(position * 1.5) * .12 + n3(position * 3.1 + 4.) * .05;
        vNoise = d;
        vec4 mv = modelViewMatrix * vec4(position + normal * d, 1.);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`;
    const frag = `
      uniform vec3 uA, uB;
      uniform float uHover;
      varying vec3 vN, vView;
      varying float vNoise;
      void main() {
        float fres = pow(1. - max(dot(vN, vView), 0.), 2.2);
        vec3 col = mix(uA, uB, smoothstep(-.15, .15, vNoise));
        col += uB * fres * (1.1 + uHover);
        gl_FragColor = vec4(col, .6 + fres * .4);
      }`;

    // One orb per card, on the opposite side of the screen from its card.
    const seg = low ? 32 : 96, geo = new THREE.SphereGeometry(1, seg, seg);
    const orbs = cards.map((c, i) => {
      const bright = new THREE.Color(c.dataset.color || PALETTE[i % PALETTE.length]);
      const pos = [(i % 2 ? -1 : 1) * (3.4 + (i % 3) * .5), ((i * 37) % 5 - 2) * .45, -i * 7];
      const r = i === 0 ? 1.7 : 1 + ((i * 53) % 4) * .15;
      const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
        vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
        uniforms: { uTime: { value: 0 }, uSeed: { value: i * 1.7 }, uHover: { value: 0 }, uA: { value: bright.clone().multiplyScalar(.35) }, uB: { value: bright } },
      }));
      mesh.position.set(...pos);
      mesh.scale.setScalar(r);
      mesh.userData = { pos, r, hover: 0, label: c.querySelector('h1,h2,h3,h4')?.textContent.trim() || '', href: c.dataset.href || '' };
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: bright, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(r * 5);
      halo.position.copy(mesh.position);
      scene.add(halo, mesh);
      return mesh;
    });

    const depth = cards.length * 7 + 12, N = low ? 500 : 1800, pts = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pts[i * 3] = (Math.random() - .5) * 30;
      pts[i * 3 + 1] = (Math.random() - .5) * 18;
      pts[i * 3 + 2] = 12 - Math.random() * depth;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const seeds = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: .09, map: glowTex, color: 0xF2C46D, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(seeds);

    // Camera waypoints: stand back from each orb, slightly toward the card side.
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const path = new THREE.CatmullRomCurve3([V(0, 0, 10), ...orbs.map(o => V(-o.userData.pos[0] * .2, o.userData.pos[1] * .3, o.userData.pos[2] + 7.5))]);

    let prog = 0, hovered = null;
    const mouse = new THREE.Vector2(), look = new THREE.Vector2(), ray = new THREE.Raycaster();
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = camera.aspect < .8 ? 70 : 55;
      camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(canvas);
    resize();

    // Cards let pointer events through except on the card itself, so the canvas gets hover/click.
    const pick = e => {
      const r = canvas.getBoundingClientRect();
      mouse.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(orbs)[0];
      return hit ? hit.object : null;
    };
    canvas.addEventListener('pointermove', e => {
      hovered = pick(e);
      canvas.style.cursor = hovered?.userData.href ? 'pointer' : '';
      tip.classList.toggle('hfx-show', !!hovered?.userData.label);
      if (hovered) { tip.textContent = hovered.userData.label; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; }
    });
    canvas.addEventListener('pointerleave', () => { hovered = null; tip.classList.remove('hfx-show'); });
    canvas.addEventListener('click', e => { const o = pick(e); if (o?.userData.href) location.href = o.userData.href; });

    const t0 = performance.now();
    const frame = now => {
      const t = reduce ? 0 : (now - t0) / 1000;
      const r = sec.getBoundingClientRect();
      const target = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
      prog += (target - prog) * (reduce ? 1 : .06);
      look.lerp(mouse, .05);
      const p = path.getPointAt(prog);
      camera.position.set(p.x + look.x * .8, p.y + look.y * .5, p.z);
      camera.lookAt(p.x * .3 + look.x * 1.5, p.y * .3 + look.y, p.z - 9);
      orbs.forEach((m, i) => {
        const u = m.material.uniforms, d = m.userData;
        u.uTime.value = t;
        d.hover += ((m === hovered ? 1 : 0) - d.hover) * .1;
        u.uHover.value = d.hover;
        m.position.y = d.pos[1] + Math.sin(t * .5 + i) * .25;
        m.rotation.y = t * .1;
        m.scale.setScalar(d.r * (1 + d.hover * .12));
      });
      seeds.rotation.y = t * .01;
      renderer.render(scene, camera);
    };
    frame(performance.now());
    stage.classList.add('hfx-ready');
    whileVisible(sec, renderer, frame);
  }

  // ======================================================================
  // Auto-start sections marked data-hfx="chapters" / "flight". Call HopeFX.init()
  // again if your site builder inserts them later.
  // ======================================================================
  function init(root = document) {
    root.querySelectorAll('[data-hfx="chapters"]').forEach(chapters);
    root.querySelectorAll('[data-hfx="flight"]').forEach(flight);
  }

  window.HopeFX = { menu, chapters, flight, init };
  onReady(() => init());
})();
