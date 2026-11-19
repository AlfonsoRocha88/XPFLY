import { useMemo } from "react";
import { encode } from "uqr";

/**
 * QR drawn as rounded dots with the app's lilac→ice gradient. Finder squares stay solid and dark
 * on a light card, so every phone camera still reads it at a glance.
 */
export function QrCode({ value, size = 200, className }: { value: string; size?: number; className?: string }) {
  const qr = useMemo(() => encode(value, { ecc: "M", border: 0 }), [value]);
  const n = qr.size;
  const isFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);

  const dots: JSX.Element[] = [];
  qr.data.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on && !isFinder(x, y)) dots.push(<rect key={`${x}-${y}`} x={x + 0.1} y={y + 0.1} width={0.8} height={0.8} rx={0.4} />);
    }),
  );
  const finder = (x: number, y: number) => (
    <g key={`f${x}-${y}`}>
      <rect x={x + 0.5} y={y + 0.5} width={6} height={6} rx={1.8} fill="none" stroke="#1b1640" strokeWidth={1} />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.9} fill="#1b1640" />
    </g>
  );

  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} className={className} role="img" aria-label="Código QR de invitación">
      <defs>
        <linearGradient id="qr-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b3fd6" />
          <stop offset="1" stopColor="#2a6fd8" />
        </linearGradient>
      </defs>
      <rect x={-2} y={-2} width={n + 4} height={n + 4} rx={3} fill="#fff" />
      <g fill="url(#qr-g)">{dots}</g>
      {finder(0, 0)}
      {finder(n - 7, 0)}
      {finder(0, n - 7)}
    </svg>
  );
}
