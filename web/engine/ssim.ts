// Quality check maths, shared by photos and videos. Runs inside the engine worker.

/** Brightness (luma) of an RGBA picture, one byte per pixel. */
export function luma(rgba: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0, j = 0; j < out.length; i += 4, j++) out[j] = (77 * rgba[i] + 150 * rgba[i + 1] + 29 * rgba[i + 2]) >> 8;
  return out;
}

/** Mean SSIM on brightness, over 8×8 blocks (same method as the server version used). */
export function ssim(a: Uint8Array, b: Uint8Array, w: number, h: number): number {
  const C1 = 6.5025; // (0.01 × 255)²
  const C2 = 58.5225; // (0.03 × 255)²
  const N = 64;
  let sum = 0;
  let blocks = 0;
  for (let y = 0; y + 8 <= h; y += 8) {
    for (let x = 0; x + 8 <= w; x += 8) {
      let ma = 0, mb = 0, aa = 0, bb = 0, ab = 0;
      for (let r = 0; r < 8; r++) {
        const row = (y + r) * w + x;
        for (let c = 0; c < 8; c++) {
          const p = a[row + c];
          const q = b[row + c];
          ma += p; mb += q; aa += p * p; bb += q * q; ab += p * q;
        }
      }
      ma /= N; mb /= N;
      const va = aa / N - ma * ma;
      const vb = bb / N - mb * mb;
      const cov = ab / N - ma * mb;
      sum += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      blocks++;
    }
  }
  return blocks ? sum / blocks : 1;
}
