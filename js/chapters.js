// Programme "chapters": a pinned stage that swaps chapter every 100vh of scroll.
// The sculpture is a stack of thin extruded slices; each chapter changes the slice
// cross-section, twist and colours, re-stacking bottom-to-top with a small glitch jolt.
(async () => {
  const sec = document.getElementById('chapters');
  if (!sec) return;
  const stage = sec.querySelector('.ch-stage');
  const marquee = sec.querySelector('.ch-marquee');
  const track = sec.querySelector('.ch-track');
  const nav = sec.querySelector('.ch-nav');
  const items = [...sec.querySelectorAll('.ch-list li')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  sec.style.height = items.length * 100 + 'vh';

  // Chapter number nav (keyboard-accessible jump to each chapter).
  const jump = i => scrollTo({ top: sec.offsetTop + (i + .5) / items.length * (sec.offsetHeight - innerHeight), behavior: reduce ? 'auto' : 'smooth' });
  const navBtns = items.map((li, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = i + 1;
    b.setAttribute('aria-label', `Chapter ${i + 1}: ${li.querySelector('h3').textContent}`);
    b.addEventListener('click', () => jump(i));
    nav.append(b);
    return b;
  });

  let sculpt = null; // set once WebGL is ready; the stage works without it
  let cur = -1;
  const setChapter = i => {
    cur = i;
    const d = items[i].dataset;
    items.forEach((li, k) => li.classList.toggle('on', k === i));
    navBtns.forEach((b, k) => k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'));
    stage.style.setProperty('--ch-bg', d.bg);
    track.innerHTML = `<span>${d.word}</span>`.repeat(8);
    marquee.classList.remove('swap'); void marquee.offsetWidth; marquee.classList.add('swap');
    sculpt?.go(d);
  };
  const onScroll = () => {
    const r = sec.getBoundingClientRect();
    const p = Math.min(Math.max(-r.top / (r.height - innerHeight), 0), .9999);
    const i = Math.floor(p * items.length);
    if (i !== cur) setChapter(i);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- 3D sculpture ----------
  const canvas = sec.querySelector('.ch-canvas');
  let THREE, renderer;
  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.min.js');
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
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

  // Four original cross-sections: leaf, notched disc, crescent, scalloped wing.
  const S = () => new THREE.Shape();
  const shapes = [
    S().moveTo(0, -1).bezierCurveTo(1.3, -.5, 1.1, .7, 0, 1).bezierCurveTo(-.6, .5, -.7, -.5, 0, -1),
    S().absarc(0, 0, 1, .5, Math.PI * 2 - .2, false).lineTo(.15, .05),
    (() => { const s = S().absarc(0, 0, 1, Math.PI * .15, Math.PI * 1.85, false); s.absarc(.45, 0, .75, Math.PI * 1.7, Math.PI * .3, true); return s; })(),
    S().moveTo(-1, -.4).quadraticCurveTo(-.7, .9, -.3, .3).quadraticCurveTo(0, 1.1, .3, .35).quadraticCurveTo(.7, 1, 1, .1).quadraticCurveTo(.4, -.9, -1, -.4),
  ];
  const geos = shapes.map(s => new THREE.ExtrudeGeometry(s, { depth: .2, bevelEnabled: true, bevelThickness: .04, bevelSize: .05, bevelSegments: 2, curveSegments: 28 }).rotateX(-Math.PI / 2).center());

  const N = 15, GAP = .3;
  const group = new THREE.Group();
  scene.add(group);
  const slices = Array.from({ length: N }, (_, k) => {
    const m = new THREE.Mesh(geos[0], new THREE.MeshStandardMaterial({ roughness: .35, metalness: .05, transparent: true, opacity: .9 }));
    m.position.y = (k - (N - 1) / 2) * GAP;
    m.userData = { h: k / (N - 1), swapAt: 0, next: 0, jolt: 0, color: new THREE.Color(), target: new THREE.Color() };
    group.add(m);
    return m;
  });

  let twist = 2.4, twistTarget = 2.4;
  sculpt = {
    go(d) {
      const now = performance.now(), c1 = new THREE.Color(d.c1), c2 = new THREE.Color(d.c2);
      twistTarget = +d.twist;
      slices.forEach((m, k) => {
        const u = m.userData;
        u.swapAt = now + (reduce ? 0 : k * 45); // restack bottom -> top
        u.next = +d.shape;
        u.target.copy(c1).lerp(c2, u.h);
      });
    },
  };
  sculpt.go(items[cur].dataset);
  slices.forEach(m => { m.userData.color.copy(m.userData.target); m.material.color.copy(m.userData.color); });

  const mouse = { x: 0, y: 0 };
  addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; }, { passive: true });

  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    group.scale.setScalar(w < 700 ? .7 : 1);
    group.position.y = w < 700 ? .5 : .2; // keep clear of the chapter text on phones
  };
  addEventListener('resize', resize);
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
      m.rotation.y = u.h * twist + t * .35 + mouse.x * 1.2;
      m.position.x = Math.sin(u.h * 3 + t * .8) * .25 + u.jolt;
    });
    group.rotation.x = mouse.y * .3;
    renderer.render(scene, camera);
  };

  // Only render while the stage is on screen.
  new IntersectionObserver(([en]) => renderer.setAnimationLoop(en.isIntersecting ? frame : null)).observe(stage);
  frame(performance.now());
})();
