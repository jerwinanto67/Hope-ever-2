# Hope FX: 3D animations for any website

Three effects from the Hope Ever Foundation site, packaged for WordPress, Webflow, Wix, or any plain HTML site:

1. **Card menu:** the page shrinks away and photo cards slide past in 3D (scroll, drag, or use the arrow keys). Picking a card zooms it and opens the page.
2. **Scroll chapters:** a pinned section. Each screen of scrolling switches chapter: the sliced 3D sculpture restacks, a giant word slides behind it, and the colour changes.
3. **Scroll flight:** story cards scroll over a 3D sky while the camera flies past one glowing orb per card.

No build step and nothing to upload. The files are served free by the jsDelivr CDN from this repo:

```
https://cdn.jsdelivr.net/gh/jerwinanto67/Hope-ever-2@fx-v1/kit/hope-fx.min.css
https://cdn.jsdelivr.net/gh/jerwinanto67/Hope-ever-2@fx-v1/kit/hope-fx.min.js
```

See `demo.html` for a working page that uses all three.

---

## Step 1: site-wide code (all pages)

**In the `<head>`:**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/jerwinanto67/Hope-ever-2@fx-v1/kit/hope-fx.min.css">
```

**Before `</body>` (footer code):** edit the brand and the cards.

```html
<script src="https://cdn.jsdelivr.net/gh/jerwinanto67/Hope-ever-2@fx-v1/kit/hope-fx.min.js"></script>
<script>
  HopeFX.menu({
    brand: 'Your Organisation',
    logo: 'https://your-site.com/logo.png',        // optional
    home: '/',
    items: [
      { title: 'Home',    href: '/',        image: 'https://your-site.com/photo-1.jpg', line: 'Start here' },
      { title: 'About',   href: '/about',   image: 'https://your-site.com/photo-2.jpg', line: 'Who we are' },
      { title: 'Contact', href: '/contact', image: 'https://your-site.com/photo-3.jpg', line: 'Get in touch' },
    ],
    cta: { label: 'Donate', href: '/donate' }, // optional button in the menu
  });
</script>
```

**Opening the menu:** if your site already has a menu link, set its URL to `#hfx-menu` (or give any element the class `hfx-open`). If no such link exists, a round ☰ button appears in the top-right corner. Use `button: false` to never show it, or `button: true` to always show it.

## Step 2: page sections (where you want them)

Paste into an HTML embed on the page. The section should be **full width**.

**Scroll chapters:** one `<li>` per chapter.

```html
<section data-hfx="chapters">
  <ol>
    <li data-word="Outreach" data-bg="#cfe9dc" data-c1="#0F6E56" data-c2="#9be3c4" data-shape="leaf" data-twist="2.4">
      <h3>Community Outreach</h3>
      <p>One or two sentences about this chapter.</p>
      <a href="/programs#outreach">Discover</a>
    </li>
    <li data-word="Skills" data-bg="#cdd6ff" data-c1="#3b5bdb" data-c2="#c3ceff" data-shape="crescent" data-twist="3.4">
      <h3>Skill Development</h3>
      <p>…</p>
      <a href="/programs#skills">Discover</a>
    </li>
  </ol>
</section>
```

| Attribute | Meaning |
|---|---|
| `data-word` | Giant sliding word (defaults to the heading) |
| `data-bg` | Background colour for this chapter |
| `data-c1`, `data-c2` | Sculpture colours, bottom → top |
| `data-shape` | `leaf`, `disc`, `crescent` or `wing` |
| `data-twist` | How much the sculpture twists (1–4 looks good) |

**Scroll flight:** one `<article>` per story card; each gets its own orb.

```html
<section data-hfx="flight" data-bg="#04110c">
  <article data-href="/about">
    <span class="hfx-big">2012</span>
    <h3>Where it began</h3>
    <p>One or two sentences.</p>
  </article>
  <article data-color="#6EE7B7">
    <span class="hfx-big">14</span>
    <h3>Districts reached</h3>
    <p>…</p>
  </article>
</section>
```

| Attribute | Meaning |
|---|---|
| `data-bg` (section) | Sky colour (dark colours look best) |
| `data-color` (card) | Colour of that card's orb |
| `data-href` (card) | Clicking the orb opens this link; its label is the card's heading |

---

## Platform guides

### WordPress
1. Install the free plugin **WPCode** (Insert Headers and Footers).
2. **Code Snippets → Header & Footer:** paste Step 1's `<link>` into **Header** and the scripts into **Footer**.
3. For the sections: edit the page, add a **Custom HTML** block, paste Step 2, and set the block to **Full width** alignment if your theme offers it.

WordPress.com (hosted) only allows scripts on the Business plan or higher.

### Webflow
1. **Site settings → Custom code:** paste Step 1's `<link>` in **Head code** and the scripts in **Footer code**.
2. For the sections: drag a **Code Embed** element into a full-width section and paste Step 2.
3. Publish. Custom code needs a paid site plan to go live.

### Wix
1. **Settings → Custom Code → Add Custom Code:** paste Step 1 (both parts), choose **All pages** and **Body – end**. This needs a Premium plan with a connected domain.
2. **The card menu works as-is.** The two scroll sections don't: Wix's "Embed HTML" element runs code in a separate frame, so it can't follow the page's scroll. On Wix, use the menu only, or use Wix Studio with a custom element.

---

## Troubleshooting

- **Section doesn't pin while scrolling:** a parent element has `overflow: hidden`, which breaks pinning. Put the embed in a section without it (in Webflow, check the section's overflow setting).
- **Nothing happens:** check that your plan allows custom code and that the script is in the footer, not the head.
- **Sections added later by the site builder:** run `HopeFX.init()` after they appear.
- **Pin a version:** the `@fx-v1` in the URLs keeps your site on this exact version. Updates won't change it unless you change the tag.

## Built in

- **"Reduce motion":** when the system setting is on, animations stop and the layout stays.
- **Older phones:** get simpler 3D automatically.
- **Efficiency:** the 3D only renders while it's on screen, and three.js loads only when a 3D section or the menu needs it (the menu doesn't use it at all).
- **Theme safety:** all classes are prefixed `hfx-` and reset inside the effects, so your theme's styles don't leak in and the effects don't restyle your theme.
