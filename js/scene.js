// WebGL backdrop: procedural glowing orbs (one per programme area) + drifting seed particles.
// The camera flies along a spline as the page scrolls and leans toward the mouse.
// No model files: everything is generated, so there is nothing to Draco-compress or lazy-load.
(async () => {
  const root = document.documentElement;
  const canvas = document.getElementById('scene');
  const fallback = () => root.classList.add('no-webgl');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const low = LOW_END; // shared heuristic from site.js
  if (!canvas) return;

  let THREE, renderer;
  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.min.js');
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !low, powerPreference: 'high-performance' });
  } catch { return fallback(); }

  renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : 1.75));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04110c, 0.035);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);

  // Soft round sprite used for orb halos and particles.
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  const vert = /* glsl */`
    uniform float uTime, uSeed;
    varying vec3 vN, vView;
    varying float vNoise;
    float n3(vec3 p) {
      return sin(p.x * 1.7 + uTime * .6 + uSeed) * sin(p.y * 2.1 + uTime * .5) * sin(p.z * 1.9 + uTime * .7 + uSeed * 2.);
    }
    void main() {
      float d = n3(position * 1.5) * .12 + n3(position * 3.1 + 4.) * .05;
      vNoise = d;
      vec4 mv = modelViewMatrix * vec4(position + normal * d, 1.);
      vN = normalize(normalMatrix * normal);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`;
  const frag = /* glsl */`
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

  // One orb per programme area; clicking one opens that section.
  const ORBS = [
    { label: 'About Hope Ever', href: 'about.html', pos: [3.4, 0.4, -1], r: 2.1, a: 0xB5651D, b: 0xF6D58E },
    { label: 'Community Outreach', href: 'programs.html#outreach', pos: [-4.2, 1.6, -8], r: 1.1, a: 0x0F6E56, b: 0x6EE7B7 },
    { label: 'Livelihood Promotion', href: 'programs.html#livelihoods', pos: [4.6, -1.2, -14], r: 1.4, a: 0x0F6E56, b: 0xF2C46D },
    { label: 'Skill Development', href: 'programs.html#skill', pos: [-3.8, -1.8, -20], r: 1.2, a: 0x14532D, b: 0x2BB58A },
    { label: 'Women Empowerment', href: 'programs.html#empowerment', pos: [4.2, 2.2, -26], r: 1.3, a: 0x9A4F12, b: 0xF2C46D },
    { label: 'Research & Planning', href: 'programs.html#research', pos: [-2.4, 0.8, -33], r: 1.0, a: 0x0F6E56, b: 0xA7F3D0 },
  ];
  const seg = low ? 32 : 96;
  const geo = new THREE.SphereGeometry(1, seg, seg);
  const orbs = ORBS.map((o, i) => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uSeed: { value: i * 1.7 }, uHover: { value: 0 }, uA: { value: new THREE.Color(o.a) }, uB: { value: new THREE.Color(o.b) } },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(o.r);
    mesh.position.set(...o.pos);
    mesh.userData = { ...o, hover: 0 };
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: o.b, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(o.r * 5);
    halo.position.copy(mesh.position);
    scene.add(halo, mesh);
    return mesh;
  });

  // Drifting "seeds" / pollen.
  const N = low ? 500 : 1800;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * 30;
    pos[i * 3 + 1] = (Math.random() - .5) * 18;
    pos[i * 3 + 2] = 12 - Math.random() * 58;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const seeds = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: .09, map: glowTex, color: 0xF2C46D, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(seeds);

  // Camera waypoints: each story milestone brings a new orb into view.
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const path = new THREE.CatmullRomCurve3([V(0, 0, 10), V(-1.5, .6, 1), V(2, -.4, -6), V(-1.8, -.6, -12), V(1.8, .8, -18), V(-.8, .4, -25)]);

  let target = 0, prog = 0;
  const mouse = new THREE.Vector2(), look = new THREE.Vector2();
  const onScroll = () => { target = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < .8 ? 70 : 55;
    camera.updateProjectionMatrix();
    onScroll();
  };
  addEventListener('resize', resize);
  addEventListener('scroll', onScroll, { passive: true });
  resize();

  // Hover + click on orbs. The canvas sits under the page, so listen on window and
  // ignore clicks that land on real content (text, cards, controls).
  const ray = new THREE.Raycaster();
  const tip = Object.assign(document.createElement('div'), { className: 'orb-tip' });
  tip.setAttribute('aria-hidden', 'true');
  document.body.append(tip);
  let hovered = null;
  const onContent = el => el.closest('a,button,input,select,textarea,label,summary,dialog,.glass,p,h1,h2,h3,li,header,footer');
  const pick = e => {
    mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = !onContent(e.target) && ray.intersectObjects(orbs)[0];
    return hit ? hit.object : null;
  };
  addEventListener('pointermove', e => {
    hovered = pick(e);
    document.body.style.cursor = hovered ? 'pointer' : '';
    tip.classList.toggle('show', !!hovered);
    if (hovered) { tip.textContent = hovered.userData.label; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; }
  }, { passive: true });
  // Re-pick on click: on touch there's no hover, and the camera may have moved since the last pointermove.
  addEventListener('click', e => { const o = pick(e); if (o) location.href = BASE + o.userData.href; });

  const clock = new THREE.Clock();
  const frame = () => {
    const t = reduce ? 0 : clock.getElapsedTime();
    prog += (target - prog) * (reduce ? 1 : .06);
    look.lerp(mouse, .05);
    const p = path.getPointAt(Math.min(Math.max(prog, 0), 1));
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
    seeds.position.y = Math.sin(t * .2) * .3;
    renderer.render(scene, camera);
  };

  frame();
  canvas.classList.add('ready');
  if (reduce) { // static frame; re-render only when the view changes
    addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true });
    addEventListener('resize', () => requestAnimationFrame(frame));
    return;
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener('visibilitychange', () => renderer.setAnimationLoop(document.hidden ? null : frame));
})();
