# Compressly web tester

A local Next.js app to try Compressly's compression settings on a computer and compare the result with the original side by side. It is a test bench only. It is not part of the phone app and nothing here ships.

- **React** (Next.js App Router) for the UI: upload, options, results, and the compare view.
- **Node.js** API routes for the work: **FFmpeg** for video, **sharp** for photos.
- Files are saved to your temp folder (`%TEMP%\compressly-web-tester`) and deleted after an hour. Nothing is sent anywhere else.

## Run it

Needs Node 20+ and FFmpeg on PATH (`winget install Gyan.FFmpeg`), or set `FFMPEG_PATH` and `FFPROBE_PATH`.

```bash
cd compressly/web-tester
npm install
npm run dev        # http://localhost:3000
```

## What it does

**Video:** same resolution and frame rate. Uses the bitrate presets from `docs/DESIGN.md` §5.1 (High / Balanced / Max savings, capped at 60% of the source bitrate). HEVC by default, H.264 at ×1.4 bitrate as the fallback. Measures SSIM with FFmpeg and retries once at +25% bitrate if it falls below the preset's threshold.

**Photo:** same pixel size, no rotation, EXIF kept. JPEG (mozjpeg), WebP or AVIF with a quality slider. SSIM is measured on brightness in 8×8 blocks. The app uses HEIC for Max savings, but browsers can't display HEIC, so AVIF/WebP stand in here.

**Compare:** *Side by side* or *Slider* (drag across one frame), zoom 1× / 2× / 4×. The two videos play in sync, and you can step one frame at a time.

If the HEVC result won't play, the browser has no HEVC decoder (common in Chrome and Firefox on Windows). Edge with the HEVC extension or Safari will play it; otherwise choose H.264 for previewing.

## API

| Route | Purpose |
| --- | --- |
| `POST /api/jobs?preset=&codec=` or `?format=&quality=` | Raw file as the body, `Content-Type` and `x-filename` headers. Returns a job id. |
| `GET /api/jobs/:id` | Status, progress and result (sizes, SSIM, bitrate, verdict). |
| `GET /api/jobs/:id/original` / `output` | Streams the file, supports Range. Add `?download` to save it. |
