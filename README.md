# Hope Ever Foundation — website

Static site (plain HTML, CSS and JavaScript, no build step) with 3D effects built on Three.js,
which loads from the jsDelivr CDN.

## Run locally

The 3D scripts need a web server; double-clicking the HTML files won't load them.

```bash
python -m http.server 8765
```

Then open http://localhost:8765.

## Deploy (Vercel)

Import this repo in Vercel, choose framework preset **Other**, and leave the build command empty.
`404.html` is served automatically for unknown addresses.

## Settings (top of `js/site.js`)

| Setting | What it does |
|---|---|
| `RAZORPAY_BUTTON_ID` | Razorpay Payment Button ID (`pl_…`): Razorpay Dashboard → Payment Button → Create. Empty = the Donate pop-up shows the enquiry form only. |
| `W3F_KEY` | Web3Forms key; contact and donate form messages go to contact@hopeever.org. |

The footer contact details are in `js/site.js`. The contact page details are in `contact.html`.

## Files

| Path | Contents |
|---|---|
| `index.html` … `contact.html`, `404.html` | Pages |
| `projects/*.html` | Project detail pages (linked from each project card's "Read more") |
| `docs/` | Certificates and policy PDFs |
| `css/site.css` | All styles |
| `js/site.js` | Header, footer, card menu and donate pop-up (added to every page), forms, filters, lightbox, audio |
| `js/scene.js` | Background orbs and particles; the camera follows the scroll |
| `js/sculpture.js` | Sliced 3D sculpture used in page heroes and the home chapters |
| `js/chapters.js` | Home-page programme chapters |
| `js/tree-of-hope.js` | Tree of Hope, the home-page finale; grows when scrolled into view while the background orbs fade out |
| `assets/images/` | Photos and logos |

## Adding a gallery photo

1. Put the image in `assets/images/gallery/`, lowercase with hyphens, ideally no wider than 1600 px.
2. In `gallery.html`, copy an existing `<button class="g-item" …>` line and change `src`, `alt`,
   `data-caption`, and `data-category` (one of the filter values at the top of the page).

## 3D, performance and accessibility

- Low-end phones get lighter 3D (the `LOW_END` check in `js/site.js`).
- If a browser can't run 3D, CSS gradient orbs replace the background scene, and the page heroes
  and chapters still show their text.
- The "reduce motion" system setting turns animations off.

## To do

- Real phone number and Instagram handle (contact page and footer)
- Income Tax 10AB approval order: the PDF is missing on hopeever.org too, so the About page offers
  "Request a copy". Add the file to `docs/` and link it from the certificate card in `about.html`.
