import os from 'node:os';
import QRCode from 'qrcode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Addresses a phone on the same Wi-Fi can open, each with a QR code to scan. */
export async function GET(req: Request) {
  const port = new URL(req.url).port || '3000';
  // Skip virtual adapters (WSL, Hyper-V, VirtualBox, VPNs…) that a phone can't reach.
  const virtual = /vEthernet|WSL|Hyper-V|VirtualBox|VMware|docker|Loopback|Tailscale|ZeroTier|vboxnet|veth|br-/i;
  const ips = Object.entries(os.networkInterfaces())
    .filter(([name]) => !virtual.test(name))
    .flatMap(([, list]) => list ?? [])
    .filter((n) => n.family === 'IPv4' && !n.internal && !n.address.startsWith('169.254.'))
    .map((n) => n.address);
  const urls = [...new Set(ips)].map((ip) => `http://${ip}:${port}`);
  const list = await Promise.all(urls.map(async (url) => ({ url, qr: await QRCode.toString(url, { type: 'svg', margin: 1, width: 180 }) })));
  return Response.json({ urls: list });
}
