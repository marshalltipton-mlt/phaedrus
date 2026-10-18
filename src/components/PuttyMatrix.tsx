import { memo } from 'react';
import { ROWS, type Column } from '../lib/puttyFont';

/**
 * Putty's dot-matrix display: a fixed number of 5×7-font columns on a
 * graphite panel. It only draws what it is given; PuttyStage decides whether
 * that is the time or a title scrolling through.
 *
 * Lit dots take their colour from the stage's --led-on / --led-dim, which
 * ease between tracks as a whole. The dots themselves never transition, or a
 * scroll would smear.
 */

interface Props {
  cols: Column[];
  /** Dot diameter and gap, in px, at the display's natural size. */
  dot?: number;
  gap?: number;
  /** The bright colon ticks once a second (the last seconds of a track). */
  tick?: boolean;
  /** Seconds into the current second, so the tick lands on the second. */
  tickPhase?: number;
  /** Paused: the whole display slowly dims and brightens. */
  rest?: boolean;
  label: string;
  className?: string;
}

function PuttyMatrix({ cols, dot = 4, gap = 2, tick, tickPhase = 0, rest, label, className }: Props) {
  const pitch = dot + gap;
  const w = cols.length * pitch - gap;
  const h = ROWS * pitch - gap;
  const r = dot / 2;

  return (
    <div className={`pt-matrix${className ? ` ${className}` : ''}`} role="img" aria-label={label}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        style={{ maxWidth: w, ['--pt-tick-phase' as string]: `${-tickPhase}s` }}
        className={rest ? 'is-resting' : undefined}
        aria-hidden="true"
      >
        {cols.map((col, c) =>
          col.bits.map((on, row) => {
            const tone = on ? col.tone : 'off';
            const ticking = tick && on && col.colon && col.tone === 'on';
            return (
              <circle
                key={c * ROWS + row}
                cx={c * pitch + r}
                cy={row * pitch + r}
                r={r}
                className={`pt-dot pt-dot-${tone}${ticking ? ' pt-dot-tick' : ''}`}
              />
            );
          }),
        )}
      </svg>
    </div>
  );
}

export default memo(PuttyMatrix);
