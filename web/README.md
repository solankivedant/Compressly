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
```

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
| "Remove originals" opens the system dialog | Marks the file as freed; download the compressed copy yourself |

## Pages

- **Home**: freed till now, ready to free, still to free, a ring for your library, recent files.
- **Compress**: drop files in, pick a preset, tick files, "Compress N files". Live queue with Compressing → Checking quality → Saving, and cancel.
- **Media** → a file: before/after compare (slider or side by side, zoom 2×/4×, videos play in sync, step one frame at a time), all the technical details, downloads.
- **Review**: accept all ready files, or keep the original per file.
- **History**: every job and its outcome.
- **Settings**: preset, photo format, video codec, light/dark theme, tool check, clear library.

## If a video won't play in the compare view

The browser has no HEVC decoder (common in Chrome and Firefox on Windows). Use Edge with the HEVC Video Extension or Safari, or switch the codec to H.264 in Settings and compress again.
