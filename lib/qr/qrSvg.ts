// lib/qr/qrSvg.ts
// QR code as a standalone SVG string (for PDF tickets and sharing), built with
// the `qrcode` encoder that react-native-qrcode-svg already depends on.
type QrModules = Readonly<{ size: number; get: (row: number, col: number) => number | boolean }>;
type QrLib = Readonly<{ create: (value: string, opts?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }) => { modules: QrModules } }>;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const qrcode = require('qrcode') as QrLib;

/** SVG markup of the QR code (black on white, 4-module quiet zone). */
export function qrSvgString(value: string, sizePx = 220): string {
  const { modules } = qrcode.create(value, { errorCorrectionLevel: 'M' });
  const n = modules.size;
  const margin = 4;
  const total = n + margin * 2;
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules.get(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><path d="${d}" fill="#14121F"/></svg>`;
}
