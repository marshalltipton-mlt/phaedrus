import { hashString } from './hash';

/**
 * Putty's five pops, and what each one lights: the clock's bright and dim
 * LEDs and the grille's breath. A track's cover colour is snapped to the
 * nearest pop, so whatever the art, the colour stays on Putty's palette.
 */
export const POPS = {
  tangerine: { base: '#E8794F', on: '#F2643E', dim: '#9A4C34', breath: '#E9A07C' },
  mist: { base: '#90B2C1', on: '#8FC3D9', dim: '#4C6A78', breath: '#A7C6D4' },
  butter: { base: '#EAC35F', on: '#F2C14E', dim: '#8A6E2A', breath: '#EDCB7E' },
  sage: { base: '#8DAA82', on: '#9CC48C', dim: '#566E4E', breath: '#A9C49E' },
  blush: { base: '#E7A8A4', on: '#F29C9C', dim: '#8A5656', breath: '#EBB1AE' },
} as const;

export type Pop = keyof typeof POPS;

const NAMES = Object.keys(POPS) as Pop[];

/** sRGB 0–255 to OKLab (L, a, b). */
function oklab(r: number, g: number, b: number): [number, number, number] {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];

const POP_LAB = NAMES.map((n) => ({ name: n, lab: oklab(...hex(POPS[n].base)) }));

/** A pop picked by a stable hash, for a track with no usable cover colour. */
export function popFor(key: string): Pop {
  return NAMES[hashString(key) % NAMES.length];
}

/**
 * The pop nearest a cover's average colour (an `rgb(r, g, b)` string from
 * averageColor, which leans every colour warm; that lean is taken back out
 * first). Greys have no hue worth following, so they get `fallback`.
 */
export function snapToPop(rgb: string, fallback: Pop): Pop {
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return fallback;
  const [r, g, b] = [Number(m[0]) - 26, Number(m[1]) - 6, Number(m[2]) + 10].map((v) => Math.max(0, Math.min(255, v)));
  const [, A, B] = oklab(r, g, b);
  if (Math.hypot(A, B) < 0.025) return fallback;

  // Nearest by hue: the angle round the a/b plane, so a dark green cover
  // still reads as sage and a pale pink one as blush.
  const angle = Math.atan2(B, A);
  let best = fallback;
  let bestD = Infinity;
  for (const p of POP_LAB) {
    let d = Math.abs(Math.atan2(p.lab[2], p.lab[1]) - angle);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d < bestD) {
      bestD = d;
      best = p.name;
    }
  }
  return best;
}
