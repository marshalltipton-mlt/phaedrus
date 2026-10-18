import { memo } from 'react';

/**
 * Putty's dot-matrix clock: a 5×7 dot font on a graphite panel. Glyphs are
 * drawn column by column with one blank column after each; the colon and
 * the space are a single column wide. Everything from `dimFrom` on (the
 * " / total" part) is lit in the dim red, the rest in the bright one.
 */

const GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ':': ['0', '1', '0', '0', '0', '1', '0'],
  ' ': ['0', '0', '0', '0', '0', '0', '0'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
};

const ROWS = 7;

interface Props {
  text: string;
  /** Index into `text` where the dim part starts; omit for all bright. */
  dimFrom?: number;
  /** Dot diameter and gap, in px, at the clock's natural size. */
  dot?: number;
  gap?: number;
  label: string;
  className?: string;
}

function PuttyMatrix({ text, dimFrom, dot = 4, gap = 2, label, className }: Props) {
  const pitch = dot + gap;
  const dots: { x: number; y: number; tone: 'on' | 'dim' | 'off' }[] = [];
  let col = 0;

  [...text].forEach((ch, i) => {
    const glyph = GLYPHS[ch] ?? GLYPHS[' '];
    const width = glyph[0].length;
    for (let c = 0; c <= width; c++) {
      for (let r = 0; r < ROWS; r++) {
        const lit = c < width && glyph[r][c] === '1';
        const tone = !lit ? 'off' : dimFrom !== undefined && i >= dimFrom ? 'dim' : 'on';
        dots.push({ x: col * pitch + dot / 2, y: r * pitch + dot / 2, tone });
      }
      col++;
    }
  });

  // The last column is the blank after the final glyph; it isn't drawn as space.
  const w = (col - 1) * pitch - gap;
  const h = ROWS * pitch - gap;

  return (
    <div className={`pt-matrix${className ? ` ${className}` : ''}`} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ maxWidth: w }} aria-hidden="true">
        {dots.map((d, i) =>
          d.x < w ? <circle key={i} cx={d.x} cy={d.y} r={dot / 2} className={`pt-dot pt-dot-${d.tone}`} /> : null,
        )}
      </svg>
    </div>
  );
}

export default memo(PuttyMatrix);
