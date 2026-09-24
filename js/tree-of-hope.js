// Tree of Hope — drop-in animated 3D tree (Three.js).
// Usage:
//   <div id="tree" style="height:600px"></div>
//   <script type="module">
//     import { mountTree } from './tree-of-hope.js';
//     mountTree(document.getElementById('tree'));
//   </script>
// Options: background (hex | null for transparent), autoRotate, interactive, seed.
// Returns destroy() to stop and free GPU memory.
// Same three.js URL as js/scene.js and js/sculpture.js, so the page loads one shared copy.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/+esm';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/utils/BufferGeometryUtils.js/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/OrbitControls.js/+esm';

export function mountTree(container, { background = 0x0d2727, autoRotate = true, interactive = true, seed = 11 } = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Viewport width, not container width: in a half-width column the container is always < 768px.
  const low = innerWidth < 768 || (navigator.hardwareConcurrency || 4) <= 4 ||
    (typeof LOW_END !== 'undefined' && LOW_END); // shared check from js/site.js when present

  const renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: background === null });
  const dpr = Math.min(devicePixelRatio, low ? 1.25 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(background ?? 0x000000, background === null ? 0 : 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:' + (interactive ? 'none' : 'auto');
  canvas.setAttribute('aria-hidden', 'true');
  container.append(canvas);

  const scene = new THREE.Scene();
  if (background !== null) scene.fog = new THREE.FogExp2(background, 0.042);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 6, 22);

  scene.add(new THREE.HemisphereLight(0x5f9a8c, 0x0d2727, 1.1));
  const rim = new THREE.DirectionalLight(0xeaae76, 2.2);
  rim.position.set(-4, 10, -8);
  scene.add(rim);
  const glow = new THREE.PointLight(0xeaae76, 30, 14, 1.6);
  glow.position.set(0, 7, 1);
  scene.add(glow);

  // ---- Tree: recursive tapered tubes, deterministic seed ----
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const V = THREE.Vector3;
  const tubes = [], tips = [];
  const TS = low ? 6 : 10, RS = low ? 5 : 7;

  function branch(start, dir, len, radius, depth, isRoot = false) {
    const pts = [start];
    let p = start, d = dir.clone();
    for (let i = 0; i < 3; i++) {
      d.add(new V((rnd() - 0.5) * 0.4, isRoot ? -0.05 : (rnd() - 0.2) * 0.15, (rnd() - 0.5) * 0.4)).normalize();
      p = p.clone().addScaledVector(d, len / 3);
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, TS, radius, RS, false);
    const pos = tube.attributes.position, v = new V();
    for (let i = 0; i <= TS; i++) { // taper each ring toward the curve
      const c = curve.getPointAt(i / TS), f = 1 - (i / TS) * 0.38;
      for (let j = 0; j <= RS; j++) {
        const k = i * (RS + 1) + j;
        v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(f).add(c);
        pos.setXYZ(k, v.x, v.y, v.z);
      }
    }
    tube.deleteAttribute('uv');
    tubes.push(tube);

    const end = pts[3];
    if (depth === 0) { if (!isRoot) tips.push(end); return; }
    if (!isRoot && depth <= 2) tips.push(pts[2]);
    const n = isRoot ? 2 : depth > 4 ? 2 : 2 + (rnd() < 0.55 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rnd() * 1.5;
      const spread = isRoot ? 0.6 : 0.55 + rnd() * 0.35;
      const nd = d.clone().add(new V(Math.cos(a) * spread, isRoot ? -0.15 : 0.25, Math.sin(a) * spread)).normalize();
      branch(end, nd, len * (0.7 + rnd() * 0.12), radius * 0.62, depth - 1, isRoot);
    }
  }
  branch(new V(0, -0.3, 0), new V(0, 1, 0), 3.4, 0.34, low ? 5 : 6);
  for (let r = 0; r < 5; r++) {
    const a = (r / 5) * Math.PI * 2 + rnd();
    branch(new V(0, 0.4, 0), new V(Math.cos(a), -0.35, Math.sin(a)).normalize(), 2.2, 0.2, 2, true);
  }

  const tree = new THREE.Group();
  tree.add(new THREE.Mesh(
    mergeGeometries(tubes),
    new THREE.MeshStandardMaterial({ color: 0x2b4a42, roughness: 0.8, metalness: 0.15, emissive: 0x0b221d }),
  ));
  tubes.forEach(t => t.dispose());

  // ---- Glowing points: leaves/fruit sway, pollen rises ----
  const pointsMat = (rise, colA, colB) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uGrow: { value: 0 }, uPixel: { value: dpr }, uRise: { value: rise },
      uA: { value: new THREE.Color(colA) }, uB: { value: new THREE.Color(colB) },
    },
    vertexShader: `
      uniform float uTime, uGrow, uPixel, uRise;
      attribute float aRand, aSize;
      varying float vMix, vAlpha;
      void main() {
        vec3 p = position;
        float t = uTime * .6 + aRand * 6.2831;
        p.x += sin(t + p.y) * (.05 + uRise * .3);
        p.z += cos(t * .8 + p.x) * (.05 + uRise * .3);
        p.y = mix(p.y + sin(t * 1.3) * .03, mod(p.y + uTime * (.15 + aRand * .25), 14.) - 1., uRise);
        float g = smoothstep(aRand * .6, aRand * .6 + .4, uGrow);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixel * g * (60. / -mv.z);
        vMix = aRand;
        vAlpha = g * (.55 + .45 * sin(t * 2.)) * mix(1., smoothstep(-1., 2., p.y) * smoothstep(13., 9., p.y), uRise);
      }`,
    fragmentShader: `
      uniform vec3 uA, uB;
      varying float vMix, vAlpha;
      void main() {
        float a = smoothstep(.5, 0., length(gl_PointCoord - .5));
        gl_FragColor = vec4(mix(uA, uB, step(.86, vMix)) * 1.5, a * a * vAlpha);
      }`,
  });

  function points(count, place, rise, colA, colB, sizeMin, sizeMax) {
    const pos = new Float32Array(count * 3), rand = new Float32Array(count), size = new Float32Array(count);
    const v = new V();
    for (let i = 0; i < count; i++) {
      place(v, i);
      pos.set([v.x, v.y, v.z], i * 3);
      rand[i] = rnd();
      size[i] = sizeMin + rnd() * (sizeMax - sizeMin) + (rand[i] > 0.86 ? sizeMax : 0); // fruit = bigger
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    return new THREE.Points(g, pointsMat(rise, colA, colB));
  }

  const leaves = points(low ? 3200 : 8000, (v, i) => {
    v.randomDirection().multiplyScalar(0.75 * Math.cbrt(rnd())).add(tips[i % tips.length]);
  }, 0, 0x5fd39a, 0xeaae76, 1.5, 4);
  tree.add(leaves);

  const pollen = points(low ? 350 : 900, v => {
    const a = rnd() * Math.PI * 2, r = 1 + rnd() * 10;
    v.set(Math.cos(a) * r, rnd() * 14, Math.sin(a) * r);
  }, 1, 0xeaae76, 0xffffff, 1, 2.5);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(12, 48),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'varying vec2 vUv; void main(){ float d = length(vUv - .5) * 2.; gl_FragColor = vec4(mix(vec3(.92,.68,.46), vec3(.06,.43,.34), smoothstep(0.,.5,d)), smoothstep(1.,0.,d) * .28); }',
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.3;
  scene.add(ground, tree, pollen);

  // ---- Controls ----
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 6, 0);
  controls.enabled = interactive;
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false; // don't hijack page scrolling
  controls.autoRotate = autoRotate && !reduce;
  controls.autoRotateSpeed = 0.6;
  controls.maxPolarAngle = Math.PI * 0.55;
  // OrbitControls forces touch-action:none on the canvas when constructed, which would block
  // page scrolling on phones. Non-interactive: detach its listeners (restores touch-action:auto);
  // autoRotate still runs through controls.update().
  if (!interactive) controls.disconnect();

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // Only render while on screen.
  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(container);

  const grow = v => { leaves.material.uniforms.uGrow.value = pollen.material.uniforms.uGrow.value = v; tree.scale.setScalar(Math.max(v, 0.001)); };
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    grow(reduce ? 1 : 1 - Math.pow(1 - Math.min(t / 3.2, 1), 3));
    if (!reduce) {
      glow.intensity = 26 + Math.sin(t * 1.3) * 6;
      leaves.material.uniforms.uTime.value = pollen.material.uniforms.uTime.value = t;
    }
    controls.update();
    renderer.render(scene, camera);
  });

  return function destroy() {
    renderer.setAnimationLoop(null);
    ro.disconnect();
    io.disconnect();
    controls.dispose();
    scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
    renderer.dispose();
    canvas.remove();
  };
}
