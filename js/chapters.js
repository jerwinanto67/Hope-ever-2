// Programme "chapters": a pinned stage that swaps chapter every 100vh of scroll.
// Each chapter changes the sliced sculpture's cross-section, twist and colours.
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

  // ---------- 3D sculpture (shared, js/sculpture.js) ----------
  const canvas = sec.querySelector('.ch-canvas');
  try { sculpt = await makeSculpture(canvas); } catch { canvas.remove(); return; }
  sculpt.go(items[cur].dataset, true);
})();
