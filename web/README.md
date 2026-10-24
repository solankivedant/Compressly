# Compressly web

A website version of Compressly for checking compression by hand before the phone app's engine is built. It has the same screens as the app (Home, Compress, Media, Settings, plus Review and History), but the "gallery" is whatever photos and videos you add.

- **React + Next.js** for the pages.
- **Node.js** (Next.js API routes) does the work: **FFmpeg** for video, **sharp** for photos.
- Everything stays on this computer. Files and results are kept in `web/.data/` (git-ignored) until you clear the library in Settings.

This folder is also Flutter's web target. `index.html`, `manifest.json`, `favicon.png` and `icons/` belong to Flutter and are left alone; Next.js ignores them.

## Run it

Needs Node 20+ and FFmpeg on PATH (`winget install Gyan.FFmpeg`), or set `FFMPEG_PATH` / `FFPROBE_PATH`.

```bash
cd compressly/web
npm install
npm run dev          # open http://localhost:3000
npm run phone        # same, but also reachable from a phone on your Wi-Fi
```

It must run on a computer. Hosting services (Vercel, Netlify, AWS Lambda) can't run FFmpeg, keep files or work in the background; there the site shows a "Run Compressly on your computer" page instead of failing.

## On your phone

1. Start the site with `npm run phone` (allow Node.js through the Windows firewall for private networks the first time).
2. On the computer, open Settings → **Open on your phone** and scan the QR code with the phone (same Wi-Fi).
3. Compress → **Choose from your gallery** opens the phone's photo picker. Files are copied to the computer; the originals stay in the gallery.
4. Once adding has finished, the phone can be locked: compressing runs on the computer.
5. **Notifications** (Settings): a quiet update as each file finishes and an alert when all are done, even with the page closed. Browsers only allow this on secure addresses, so on Android Chrome turn on `chrome://flags/#unsafely-treat-insecure-origin-as-secure` for the site's address (the Settings card shows the exact steps). On the computer itself (`localhost`) it works directly. Not possible on iPhone for a local site.
6. A website can't replace or delete files in the gallery. On a phone, a ready file offers **Save compressed copy to this phone**; replacing the original and deleting it happens only in the Compressly app.

## Time estimates

Each stage has its own measured speed on this computer (HEVC / H.264 encode, the quality check, JPEG, AVIF), kept in `.data/library.json`. While a video runs, its live speed updates the countdown and every waiting file within seconds. Videos run one at a time and photos two at a time beside them, and the queue plan follows that. The one thing it can't foresee is a quality retry, which roughly doubles that file's time; the countdown adjusts as soon as the retry starts.

## How it follows the app

| Rule (docs/DESIGN.md) | Web version |
| --- | --- |
| Same resolution, frame rate, length, orientation | Kept. Sideways phone videos and EXIF-rotated photos stay upright |
| Video presets §5.1 (High / Balanced / Max) | Same bitrate table, capped at 60% of the source, keyframe every 2 s |
| HEVC, with H.264 ×1.4 as fallback | Both, chosen in Settings → Advanced |
| Audio copied; else AAC 192 kbps | Same |
| Quality gate: SSIM ≥ 0.97 / 0.95 / 0.92, one retry at +25% | Same; a failed gate shows "Not worth compressing, kept as is" |
| Quality words §5.3 | Same ("Looks identical", "Very close", "Close") |
| Photo "Optimised JPEG" (lossless on phone) | Re-encoded at quality 90 (close, not pixel-identical) |
| Photo "HEIC" | AVIF, because browsers can't show HEIC |
| Pro-only presets, 2 GB free limit, ads | Not enforced here; everything is open for testing |
| "Remove originals" opens the system dialog | Marks the file as freed; save or download the compressed copy yourself |

## Pages

- **Home**: freed till now, ready to free, still to free, a ring for your library, recent files.
- **Compress**: drop files in (or pick from the gallery on a phone), pick a preset, tick files, "Compress N files". Live queue with time left per file and for the whole queue, Compressing → Checking quality → Saving, and cancel.
- **Media** → a file: before/after compare (slider or side by side, zoom 2×/4×, videos play in sync, step one frame at a time), all the technical details, downloads.
- **Review**: accept all ready files, or keep the original per file.
- **History**: every job and its outcome.
- **Settings**: open on your phone (QR code), notifications, preset, photo format, video codec, light/dark theme, tool check, clear library.

## If a video won't play in the compare view

The browser has no HEVC decoder (common in Chrome and Firefox on Windows). Use Edge with the HEVC Video Extension or Safari, or switch the codec to H.264 in Settings and compress again.
