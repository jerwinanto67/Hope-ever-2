// Shared sliced sculpture: a stack of thin extruded slices that twist, sway and
// re-stack (bottom to top, with a small glitch jolt) whenever its shape/colours change.
// Used by the home-page chapters (js/chapters.js) and by page heroes (canvas.hero-sculpt).
window.makeSculpture = async (canvas, { mobileY = .5, desktopY = .2 } = {}) => {
  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.min.js');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !LOW_END });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW_END ? 1 : 1.75));
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

  // Four cross-sections: leaf, notched disc, crescent, scalloped wing.
  const S = () => new THREE.Shape();
  const shapes = [
    S().moveTo(0, -1).bezierCurveTo(1.3, -.5, 1.1, .7, 0, 1).bezierCurveTo(-.6, .5, -.7, -.5, 0, -1),
    S().absarc(0, 0, 1, .5, Math.PI * 2 - .2, false).lineTo(.15, .05),
    (() => { const s = S().absarc(0, 0, 1, Math.PI * .15, Math.PI * 1.85, false); s.absarc(.45, 0, .75, Math.PI * 1.7, Math.PI * .3, true); return s; })(),
    S().moveTo(-1, -.4).quadraticCurveTo(-.7, .9, -.3, .3).quadraticCurveTo(0, 1.1, .3, .35).quadraticCurveTo(.7, 1, 1, .1).quadraticCurveTo(.4, -.9, -1, -.4),
  ];
  const geos = shapes.map(s => new THREE.ExtrudeGeometry(s, { depth: .2, bevelEnabled: true, bevelThickness: .04, bevelSize: .05, bevelSegments: LOW_END ? 1 : 2, curveSegments: LOW_END ? 10 : 28 }).rotateX(-Math.PI / 2).center());

  const N = 15, GAP = .3;
  const group = new THREE.Group();
  scene.add(group);
  const slices = Array.from({ length: N }, (_, k) => {
    const m = new THREE.Mesh(geos[0], new THREE.MeshStandardMaterial({ roughness: .35, metalness: .05, transparent: true, opacity: .9 }));
    m.userData = { h: k / (N - 1), swapAt: 0, next: 0, jolt: 0, color: new THREE.Color(), target: new THREE.Color() };
    group.add(m);
    return m;
  });

  let twist = 2.4, twistTarget = 2.4, spread = 0;
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
    group.position.y = small ? mobileY : desktopY;
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
      m.position.y = (k - (N - 1) / 2) * GAP * (1 + spread * 1.6);
      m.rotation.y = u.h * twist * (1 + spread) + t * .35 + mouse.x * 1.2;
      m.position.x = Math.sin(u.h * 3 + t * .8) * (.25 + spread * .8) + u.jolt;
    });
    group.rotation.x = mouse.y * .3;
    renderer.render(scene, camera);
  };
  // Only render while on screen.
  new IntersectionObserver(([en]) => renderer.setAnimationLoop(en.isIntersecting ? frame : null)).observe(canvas);

  return {
    // d: { shape, c1, c2, twist } — strings from data-* attributes are fine.
    go(d, instant = false) {
      const now = performance.now(), c1 = new THREE.Color(d.c1), c2 = new THREE.Color(d.c2);
      twistTarget = +d.twist;
      if (instant) twist = twistTarget;
      slices.forEach((m, k) => {
        const u = m.userData;
        u.swapAt = now + (reduce || instant ? 0 : k * 45); // restack bottom -> top
        u.next = +d.shape;
        u.target.copy(c1).lerp(c2, u.h);
        if (instant) u.color.copy(u.target);
      });
      frame(now);
    },
    // 0 = tight stack, 1 = slices pulled apart (driven by scroll on page heroes).
    setSpread(v) { spread = v; },
  };
};

// Page heroes: <canvas class="hero-sculpt" data-shape data-c1 data-c2 data-twist [data-cycle]>
// data-cycle="shape|c1|c2|twist; ..." rotates through looks every few seconds.
document.querySelectorAll('.hero-sculpt').forEach(async canvas => {
  let s;
  try { s = await makeSculpture(canvas, { mobileY: 0, desktopY: 0 }); } catch { canvas.remove(); return; }
  s.go(canvas.dataset, true);
  const onScroll = () => s.setSpread(Math.min(scrollY / innerHeight, 1));
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const looks = canvas.dataset.cycle?.split(';').map(x => { const [shape, c1, c2, twist] = x.trim().split('|'); return { shape, c1, c2, twist }; });
  if (looks && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let i = 0;
    setInterval(() => { if (!document.hidden) s.go(looks[i = (i + 1) % looks.length]); }, 3200);
  }
});
