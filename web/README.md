# Compressly web

A website version of Compressly for checking compression by hand before the phone app's engine is built. It has the same screens as the app (Home, Compress, Media, Settings, plus Review and History).

**Everything happens on the device that opens the site** (phone, tablet or laptop). Nothing is uploaded and no server does any work:

- **Video**: the device's own encoder through the browser (WebCodecs, via [Mediabunny](https://mediabunny.dev)). HEVC when the device can make it at that size, otherwise H.264 at 1.4× the bitrate.
- **Photos**: WebAssembly encoders in the browser (mozjpeg for JPEG, AVIF standing in for HEIC)..
- **Quality check**: SSIM on brightness, on the whole photo or on 6–30 frames spread through a video.
- **Storage**: the library list, settings, measured speeds and thumbnails are kept in the browser's IndexedDB; compressed copies in the browser's private file storage (OPFS). Settings → This device shows how much is used.

The work runs in background workers: one video and up to two photos at a time.

## Run it

```bash
cd compressly/web
npm install
npm run dev          # open http://localhost:3000
```

To use it on a phone, deploy it (e.g. Vercel, root directory `compressly/web`) and open the **https** address. Browsers only allow on-device storage, workers and notifications on `https://` or `localhost`; a plain `http://192.168…` address shows a warning instead.

## Where files come from and go to

| | Phone (Android / iPhone) | Computer (Chrome / Edge) |
| --- | --- | --- |
| Add files | **Choose from your gallery** (the phone's photo picker) | Drop or choose files, or **Open a folder** |
| Save the compressed copy | Share sheet (iPhone: Save to Photos) or Downloads | Downloads |
| Replace the original and delete it | Not possible from a website; the Compressly app does this | Yes, for files added with **Open a folder** ("Replace the original in its folder", can't be undone) |

Files picked from the gallery are not copied into storage (that would use double the space). After a reload they have to be picked again to compress or compare; finished compressed copies stay.

## Background work and notifications

Phones pause web pages that are closed or behind a locked screen, so Compressly keeps the screen on while it works. Notifications (Settings) show progress while you're in another tab or app. On iPhone they need Compressly added to the Home Screen first.

## Time estimates

Each stage has its own measured speed on this device (HEVC / H.264 encode, the quality check, JPEG, AVIF), saved between visits. While a video runs, its live speed updates the countdown and every waiting file within seconds. The one thing it can't foresee is a quality retry (a second encode at +25% bitrate), which roughly doubles that file's time; the countdown adjusts as soon as the retry starts.

## How it follows the app

| Rule (docs/DESIGN.md) | Web version |
| --- | --- |
| Same resolution, frame rate, length, orientation | Kept. Sideways phone videos and EXIF-rotated photos stay upright |
| Video presets §5.1 (High / Balanced / Max) | Same bitrate table, capped at 60% of the source, keyframe every 2 s |
| HEVC, with H.264 ×1.4 as fallback | Same; falls back automatically when the device can't encode HEVC |
| Audio copied; else re-encoded | Same (AAC when it can't be copied) |
| Quality gate: SSIM ≥ 0.97 / 0.95 / 0.92, one retry at +25% | Same; a failed gate shows "Not worth compressing, kept as is" |
| Quality words §5.3 | Same ("Looks identical", "Very close", "Close") |
| Photo "Optimised JPEG" (lossless on phone) | Re-encoded at quality 90 (close, not pixel-identical) |
| Photo "HEIC" | AVIF, because browsers can't show HEIC. Camera details (date, place) are not copied |
| Pro-only presets, 2 GB free limit, ads | Not enforced here; everything is open for testing |

## If a video won't play in the compare view

That browser can't decode HEVC. Use Safari, Edge with the HEVC Video Extension, or Chrome on a device with HEVC hardware; or switch the codec to H.264 in Settings and compress again.
