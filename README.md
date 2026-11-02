# 🥬 Lettuce Check

*Scan it. Let us check.*

Scan a food barcode with your phone camera and instantly see whether it's **vegan**, **vegetarian** or **gluten-free**: green for yes, red for no (with the ingredients that rule it out), amber for "check the pack".

Product data comes from [Open Food Facts](https://world.openfoodfacts.org), a free, crowd-sourced food database. No accounts, no API keys, nothing stored off the phone.

## Put it online (GitHub Pages)

1. Create a new public repo (e.g. `LettuceCheck`) and upload **everything in this folder**, keeping the `icons` folder.
2. Repo **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, Branch `main`, folder `/ (root)`. Save.
3. After a minute it's live at `https://<your-username>.github.io/LettuceCheck/`.

## Add it to your iPhone home screen

1. Open the link in **Safari** (not Chrome; only Safari can install home-screen apps properly on iPhone).
2. Tap **Share → Add to Home Screen → Add**.
3. Open it from the new icon. It runs full-screen like a normal app.
4. The first scan asks for camera access; tap **Allow**.

## How it works

- **Barcode scanning** uses [zxing-cpp](https://github.com/zxing-cpp/zxing-cpp) (via `barcode-detector`), which copes much better with blur and curved packets. A barcode is only accepted once it's been read the same way twice and its check digit is valid, so half-read numbers don't get through.
- **📸 Photo**: if the live scan struggles, take a still photo instead. The phone's normal camera focuses much better than the live feed.
- **Zoom button (1×/2×)** on phones that support it, so you can hold the phone further back where newer iPhones can focus.
- **Ingredient checking** is done by `rules.js`: a UK-focused list of animal-derived and gluten ingredients, each flagged with a plain-English reason. It ignores things that only *sound* bad (coconut milk, cocoa butter, "bacon flavour", buckwheat, glucose syrup from wheat).
- **Checks**: vegan, vegetarian, gluten-free, dairy-free, egg-free, nut-free, palm oil-free, plus **My list** (your own words to avoid, set in ⚙︎ Settings).
- **Strict mode** (⚙︎ Settings): treats "may contain" warnings as a No. Off by default: vegan/vegetarian ignore them, allergy checks show them as Check.
- **✏️ Something not right?**: correct any verdict for a product. It's saved on the phone and used every time you scan it.
- **★ Favourites**: star products to build a "safe to buy" list alongside Recent.
- **🔦 Torch** in the scanner on phones that allow it (mostly Android).
- **📝 Photo of ingredients label**: for products missing from Open Food Facts, it reads the label on the phone itself with [Tesseract](https://github.com/naptha/tesseract.js) and checks that. You can correct any misread words.

## Files

| File | What it does |
|---|---|
| `index.html` | The app |
| `rules.js` | The vegan / vegetarian / gluten-free rules |
| `manifest.webmanifest` | App name, icon and full-screen settings |
| `sw.js` | Keeps the app on the phone so it opens instantly |
| `lib/barcode-detector.js`, `lib/zxing_reader.wasm` | Barcode scanner |
| `lib/tesseract*`, `lib/worker.min.js`, `lib/lang/` | Label reader (only downloads the first time you use it) |
| `icons/` | Home-screen and app icons |

## Updating

After changing any file, bump `VERSION` in `sw.js` (e.g. `v1` → `v2`) so phones fetch the new version. Closing and reopening the app twice usually picks it up.

## Notes

- Results are only as good as the Open Food Facts entry. Recipes change, so always check the pack, especially for allergies or coeliac disease.
- Product not found? There's a link to add it to Open Food Facts.
- Scanner: barcode-detector / zxing-wasm (MIT). Label reader: tesseract.js (Apache 2.0). Licences are in `lib/`.
