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

## Files

| File | What it does |
|---|---|
| `index.html` | The whole app |
| `manifest.webmanifest` | App name, icon and full-screen settings |
| `sw.js` | Caches the app so it opens instantly |
| `zxing.min.js` | Barcode scanner for iPhone (Safari has no built-in one) |
| `icons/` | Home-screen and app icons |

## Updating

After changing any file, bump `VERSION` in `sw.js` (e.g. `v1` → `v2`) so phones fetch the new version. Closing and reopening the app twice usually picks it up.

## Notes

- Results are only as good as the Open Food Facts entry. Recipes change, so always check the pack, especially for allergies or coeliac disease.
- Product not found? There's a link to add it to Open Food Facts.
- The scanner library is [ZXing](https://github.com/zxing-js/library) (Apache 2.0).
