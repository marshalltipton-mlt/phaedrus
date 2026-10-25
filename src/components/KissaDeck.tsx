import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { livePosition, useSonos } from '../store/useSonos';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { columns, ROWS, type Column } from '../lib/puttyFont';
import { fromPlayMode } from '../store/playMode';
import { mulberry, trackSeed } from './DeckSignal';

/* ══════════════════════════════════════════════════════════════════════════
   KISSA DECK

   The vacuum-fluorescent window on the front of the cassette deck under the
   counter: a dot-matrix clock, a row of small legends (PLAY, PAUSE, SHUFFLE,
   REPEAT, STEREO) that light the way a real deck's do, and a pair of bar
   meters.

   The meters have no audio to show; like Hi-Fi's VU meters they are driven by
   a signal seeded from the track and scaled by the volume. They rise gently
   and trickle back, write straight to the DOM from one rAF loop (about 20
   updates a second), and park when they have fallen silent after a pause,
   when the window is hidden, or when the deck is not laid out. With reduced
   motion they hold still at the level the music would sit at.
   ══════════════════════════════════════════════════════════════════════════ */

const two = (n: number) => String(n).padStart(2, '0');

function clock(secs: number): string {
  const t = Math.max(0, Math.floor(secs));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

/** Whole seconds of the playhead, ticking only while playing and visible. */
function useElapsed(playing: boolean): number {
  const receivedAt = useSonos((s) => s.receivedAt);
  const [secs, setSecs] = useState(() => Math.floor(livePosition(useSonos.getState())));
  useEffect(() => {
    const read = () => setSecs(Math.floor(livePosition(useSonos.getState())));
    read();
    if (!playing) return;
    let timer: number | undefined;
    const start = () => {
      if (timer === undefined) timer = window.setInterval(read, 500);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const onVis = () => {
      if (document.hidden) stop();
      else {
        read();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [receivedAt, playing]);
  return secs;
}

/** Dot-matrix text: square-ish dots, the unlit ones faintly there, as on a real VFD. */
export const VfdText = memo(function VfdText({
  cols,
  dot = 2.2,
  gap = 0.8,
  className,
}: {
  cols: Column[];
  dot?: number;
  gap?: number;
  className?: string;
}) {
  const pitch = dot + gap;
  const w = Math.max(1, cols.length * pitch - gap);
  const h = ROWS * pitch - gap;
  const lit: string[] = [];
  const dim: string[] = [];
  const off: string[] = [];
  cols.forEach((col, c) =>
    col.bits.forEach((on, r) => {
      const d = `M${(c * pitch).toFixed(2)} ${(r * pitch).toFixed(2)}h${dot}v${dot}h-${dot}z`;
      if (!on) off.push(d);
      else if (col.tone === 'dim') dim.push(d);
      else lit.push(d);
    }),
  );
  return (
    <svg className={`ks-vfd-text${className ? ` ${className}` : ''}`} viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <path className="ks-vfd-off" d={off.join('')} />
      <path className="ks-vfd-dim" d={dim.join('')} />
      <path className="ks-vfd-on" d={lit.join('')} />
    </svg>
  );
});

const SEGMENTS = 22;

export default function KissaDeck({ playing }: { playing: boolean }) {
  const state = useSonos((s) => s.state);
  const elapsed = useElapsed(playing);
  const reduced = useReducedMotion();

  const idle = !state || state.state === 'NO_MEDIA_PRESENT' || !state.track;
  const radio = !!state?.isRadio;
  const duration = state?.durationSecs ?? 0;
  const timed = !radio && duration > 0;
  const now = clock(timed ? Math.min(elapsed, duration) : elapsed);
  const text = idle ? '--:--' : timed ? `${now} / ${clock(duration)}` : now;
  const cols = useMemo(
    () => columns(text, (i) => (timed && !idle && i >= now.length ? 'dim' : 'on')),
    [text, timed, idle, now.length],
  );

  const { shuffle, repeat } = fromPlayMode(state?.playMode ?? 'NORMAL');
  const track = useMemo(() => {
    const n = state?.queueIndex;
    return columns(radio ? 'FM' : n ? two(n) : '--');
  }, [state?.queueIndex, radio]);

  const label = idle ? 'Nothing loaded' : timed ? `Time ${now} of ${clock(duration)}` : `Time ${now}`;

  return (
    <div className={`ks-vfd${playing ? ' is-playing' : ''}`} role="img" aria-label={label}>
      <div className="ks-vfd-glass">
        <div className="ks-vfd-row ks-vfd-legends" aria-hidden="true">
          <span className={playing ? 'is-lit' : ''}>▶ Play</span>
          <span className={!playing && !idle ? 'is-lit' : ''}>❚❚ Pause</span>
          <span className={shuffle ? 'is-lit' : ''}>Shuffle</span>
          <span className={repeat !== 'off' ? 'is-lit' : ''}>{repeat === 'one' ? 'Repeat 1' : 'Repeat'}</span>
          <span className={radio && !idle ? 'is-lit' : ''}>Tuner</span>
        </div>
        <div className="ks-vfd-row ks-vfd-main">
          <span className="ks-vfd-cap" aria-hidden="true">
            Trk
          </span>
          <VfdText cols={track} className="ks-vfd-track" />
          <VfdText cols={cols} className="ks-vfd-clock" />
        </div>
        <Meters playing={playing && !idle} reduced={reduced} />
      </div>
    </div>
  );
}

// ── Meters ────────────────────────────────────────────────────────────────

const ATTACK = 0.18; // seconds to rise toward the signal
const RELEASE = 1.1; // seconds to trickle back
const PEAK_HOLD = 1.4;
const PEAK_FALL = 0.35; // fraction of the scale per second

function Meters({ playing, reduced }: { playing: boolean; reduced: boolean }) {
  const title = useSonos((s) => (s.state?.isRadio ? s.state.stationName : s.state?.track?.title));
  const artist = useSonos((s) => s.state?.track?.artist);
  const volume = useSonos((s) => s.state?.volume ?? 0);
  const muted = useSonos((s) => !!s.state?.muted);
  const seed = trackSeed(title, artist);

  const root = useRef<HTMLDivElement>(null);
  const play = useRef(playing);
  const gain = useRef(0);
  const wake = useRef<(() => void) | null>(null);

  useEffect(() => {
    gain.current = muted || volume <= 0 ? 0 : 0.35 + 0.65 * Math.sqrt(volume / 100);
    wake.current?.();
  }, [volume, muted]);

  useEffect(() => {
    play.current = playing;
    wake.current?.();
  }, [playing]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const bars = [...el.querySelectorAll<HTMLElement>('.ks-meter-lit')];
    const peaks = [...el.querySelectorAll<HTMLElement>('.ks-meter-peak')];
    const n = bars.length;

    const rnd = mulberry(seed);
    const voice = Array.from({ length: n }, () => ({
      w1: 0.7 + rnd() * 0.6,
      w2: 1.7 + rnd() * 1.1,
      p1: rnd() * Math.PI * 2,
      p2: rnd() * Math.PI * 2,
      lean: 0.94 + rnd() * 0.08,
    }));
    const swellW = 0.08 + rnd() * 0.08;
    const level = new Float32Array(n);
    const peak = new Float32Array(n);
    const held = new Float32Array(n);
    const noise = new Float32Array(n);
    let fade = play.current ? 1 : 0;
    let t = rnd() * 50;
    let raf = 0;
    let last = 0;
    let acc = 0;

    const quant = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * SEGMENTS) / SEGMENTS;

    const paint = () => {
      for (let c = 0; c < n; c++) {
        bars[c].style.clipPath = `inset(0 ${(100 - quant(level[c]) * 100).toFixed(2)}% 0 0)`;
        const pk = quant(peak[c]);
        peaks[c].style.transform = `translateX(${(pk * 100).toFixed(2)}cqw)`;
        peaks[c].style.opacity = pk > 0.02 ? '1' : '0';
      }
    };

    const target = (c: number) => {
      const v = voice[c];
      noise[c] = noise[c] * 0.9 + (Math.random() - 0.5) * 0.12;
      const swell = 0.8 + 0.2 * Math.sin(t * swellW * Math.PI * 2);
      const tone = 0.6 + Math.sin(t * v.w1 + v.p1) * 0.1 + Math.sin(t * v.w2 + v.p2) * 0.06 + noise[c];
      return Math.max(0, tone * swell * v.lean * gain.current * fade);
    };

    const advance = (dt: number) => {
      t += dt;
      fade = play.current ? Math.min(1, fade + dt / 0.8) : Math.max(0, fade - dt / 1.6);
      for (let c = 0; c < n; c++) {
        const goal = target(c);
        const tau = goal > level[c] ? ATTACK : RELEASE;
        level[c] += (goal - level[c]) * (1 - Math.exp(-dt / tau));
        if (level[c] >= peak[c]) {
          peak[c] = level[c];
          held[c] = PEAK_HOLD;
        } else if (held[c] > 0) {
          held[c] -= dt;
        } else {
          peak[c] = Math.max(level[c], peak[c] - PEAK_FALL * dt);
        }
      }
    };

    const settled = () => !play.current && fade === 0 && level.every((v) => v < 0.004) && peak.every((v) => v < 0.004);
    const visible = () => !document.hidden && el.offsetWidth > 0;

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };

    const step = (ts: number) => {
      raf = requestAnimationFrame(step);
      if (!last) {
        last = ts;
        return;
      }
      const dt = Math.min(0.1, (ts - last) / 1000);
      last = ts;
      acc += dt;
      if (acc < 0.05) return; // about twenty updates a second is plenty for a bar
      advance(acc);
      acc = 0;
      paint();
      if (settled() || !visible()) {
        if (settled()) {
          level.fill(0);
          peak.fill(0);
          paint();
        }
        stop();
      }
    };

    const nudge = () => {
      if (raf || !visible()) return;
      raf = requestAnimationFrame(step);
    };

    if (reduced) {
      const still = () => {
        for (let c = 0; c < n; c++) {
          level[c] = play.current ? 0.6 * voice[c].lean * gain.current : 0;
          peak[c] = 0;
        }
        paint();
      };
      wake.current = still;
      still();
      return () => {
        wake.current = null;
      };
    }

    wake.current = nudge;
    const onVis = () => (document.hidden ? stop() : nudge());
    document.addEventListener('visibilitychange', onVis);
    paint();
    nudge();
    return () => {
      stop();
      wake.current = null;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [seed, reduced]);

  return (
    <div className="ks-meters" ref={root} aria-hidden="true">
      {['L', 'R'].map((ch) => (
        <div key={ch} className="ks-meter">
          <span className="ks-meter-ch">{ch}</span>
          <span className="ks-meter-track">
            <i className="ks-meter-lit" />
            <i className="ks-meter-peak" />
          </span>
        </div>
      ))}
      <div className="ks-meter-scale">
        {['-30', '-20', '-10', '-5', '0', '+3'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  );
}
