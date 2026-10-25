import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { livePosition, useSonos } from '../store/useSonos';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { averageColor } from '../lib/color';
import Vinyl from './Vinyl';
import Progress from './Progress';
import Transport from './Transport';
import '../styles/kissa.css';

/* ══════════════════════════════════════════════════════════════════════════
   KISSA

   The counter of a jazz kissa at one in the morning. The sleeve of the record
   that is playing stands on a little acrylic stand (只今演奏中, "now
   playing"), the way the master props it up by the counter; in front of it a
   crystal-rimmed turntable sits on a glass counter that catches glitter and
   the candle. Below: the title, as printed on a card, then the progress and
   the transport.

   The turntable is drawn flat and squashed into an ellipse (an orthographic
   view of the platter), so the record's own rotation — Vinyl's, unchanged —
   reads as a turn in the plane of the counter. The tonearm lives in the same
   squashed plane and follows the song from the lead-in groove to the
   run-out: it moves a fraction of a degree every two seconds.

   Motion, all of it slow, none of it while paused, hidden, or under reduced
   motion:
     · the record turns about once every five seconds (Vinyl), winding up
       and coasting down;
     · the tonearm sets down, lifts on pause, and returns to its rest when
       nothing is loaded, each over about two seconds;
     · a handful of glints on the glass and the crystal light up, very
       rarely, one at a time, and only while music plays;
     · the candle breathes, barely, while music plays.
   ══════════════════════════════════════════════════════════════════════════ */

const SOURCE: Record<string, string> = {
  queue: 'Queue',
  radio: 'Radio',
  linein: 'Line In',
  tv: 'TV',
  airplay: 'AirPlay',
  'spotify-connect': 'Spotify Connect',
};

// ── Tonearm geometry, in units of the platter's diameter ──────────────────
// The platter's centre is (0.5, 0.5); the arm pivots up and to the right of
// it. Rotating the arm clockwise from straight down swings the stylus in
// over the record.
const PIVOT = { x: 1.04, y: 0.05 };
const ARM = 0.74;
const R_OUTER = 0.452; // lead-in groove
const R_INNER = 0.238; // run-out groove
const R_RADIO = 0.38; // a station has no end: the needle sits mid-side

/** The arm angle (degrees clockwise from straight down) that puts the stylus at radius r. */
function armFor(r: number): number {
  let lo = 0;
  let hi = 60;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const a = (mid * Math.PI) / 180;
    const x = PIVOT.x - ARM * Math.sin(a) - 0.5;
    const y = PIVOT.y + ARM * Math.cos(a) - 0.5;
    if (Math.hypot(x, y) > r) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const A_OUTER = armFor(R_OUTER);
const A_INNER = armFor(R_INNER);
const A_RADIO = armFor(R_RADIO);

/** Whether the window is out of sight. */
export function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return hidden;
}

/**
 * How far through the track the needle is, 0–1, refreshed every two seconds
 * while the record plays and the window is in sight, and whenever a fresh
 * snapshot arrives. Paused, it holds.
 */
function useSideProgress(run: boolean): number {
  const receivedAt = useSonos((s) => s.receivedAt);
  const [p, setP] = useState(0);
  useEffect(() => {
    const read = () => {
      const s = useSonos.getState();
      const d = s.state?.durationSecs ?? 0;
      setP(d > 0 ? Math.max(0, Math.min(1, livePosition(s) / d)) : 0);
    };
    read();
    if (!run) return;
    const t = window.setInterval(read, 2000);
    return () => clearInterval(t);
  }, [receivedAt, run]);
  return p;
}

/** The cover's average colour, for the light it throws on the glass. */
function useTint(art: string | undefined): string | null {
  const [tint, setTint] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!art) {
      setTint(null);
      return;
    }
    averageColor(art).then((c) => {
      if (alive) setTint(c);
    });
    return () => {
      alive = false;
    };
  }, [art]);
  return tint;
}

/** Where the glints sit, in the scene's own percentages, and their slow cycles. */
const GLINTS: { x: number; y: number; s: number; d: number; delay: number }[] = [
  { x: 61.5, y: 96.5, s: 1, d: 19, delay: -3 },
  { x: 94.2, y: 77, s: 0.8, d: 23, delay: -13 },
  { x: 33.8, y: 6.5, s: 0.7, d: 29, delay: -21 },
  { x: 12, y: 93, s: 0.75, d: 31, delay: -8 },
  { x: 80.5, y: 64.5, s: 0.65, d: 37, delay: -27 },
  { x: 47, y: 88, s: 0.55, d: 41, delay: -34 },
];

export default function KissaStage() {
  const state = useSonos((s) => s.state);
  const group = useSonos((s) => s.group);

  const playing = state?.state === 'PLAYING' || state?.state === 'TRANSITIONING';
  const track = state?.track;
  const idle = !state || state.state === 'NO_MEDIA_PRESENT' || !track;
  const radio = !!state?.isRadio;

  const title = radio ? (state?.stationName ?? track?.title ?? 'Radio') : track?.title;
  const artist = radio ? track?.streamContent : track?.artist;
  const album = radio ? (track?.title && track.title !== state?.stationName ? track.title : undefined) : track?.album;

  const reduced = useReducedMotion();
  const hidden = useHidden();
  const progress = useSideProgress(!!playing && !hidden);

  const [artBroken, setArtBroken] = useState<string | undefined>();
  const art = track?.art && artBroken !== track.art ? track.art : undefined;
  const tint = useTint(art);

  // The arm: on its rest with nothing loaded; over the groove the song has
  // reached otherwise; lifted off the record while paused.
  const angle = idle ? 0 : radio ? A_RADIO : A_OUTER + (A_INNER - A_OUTER) * progress;
  const lifted = !idle && !playing;

  const position = state?.queueIndex && state.queueLength ? `${state.queueIndex} of ${state.queueLength}` : undefined;

  const style = useMemo(
    () =>
      ({
        '--ks-arm': `${angle.toFixed(3)}deg`,
        ...(tint ? { '--ks-tint': tint } : {}),
      }) as CSSProperties,
    [angle, tint],
  );

  const alive = !!playing && !hidden && !reduced;

  return (
    <div
      className={`kissa${playing ? ' is-playing' : ''}${idle ? ' is-idle' : ''}${lifted ? ' is-lifted' : ''}${alive ? ' is-alive' : ''}`}
      style={style}
    >
      <div className="ks-scene" aria-hidden="true">
        <div className="ks-glass">
          <i className="ks-glass-glitter" />
          <i className="ks-glass-spill" />
          <i className="ks-glass-edge" />
        </div>

        <div className="ks-stand">
          <div className="ks-sleeve">
            {art ? (
              <img src={art} alt="" draggable={false} onError={() => setArtBroken(track?.art)} />
            ) : (
              <span className="ks-sleeve-print">
                <span className="ks-sleeve-mark">Phædrus · 33⅓</span>
                <span className="ks-sleeve-title">{idle ? 'Kissa' : title}</span>
              </span>
            )}
            <i className="ks-sleeve-light" />
          </div>
          <i className="ks-stand-lip" />
          <span className="ks-stand-card">
            <span className="ks-jp">只今演奏中</span>
            <span className="ks-stand-en">Now playing</span>
          </span>
        </div>

        <div className="ks-table">
          <i className="ks-platter-side" />
          <div className="ks-plane">
            <i className="ks-platter-shadow" />
            <i className="ks-platter-top" />
            <div className={`ks-record${idle ? ' is-off' : ''}`}>
              <Vinyl art={art} playing={!!playing} title={title} onArtError={() => setArtBroken(track?.art)} />
            </div>
            <div className="ks-arm-shadow">
              <i />
            </div>
            <div className="ks-arm">
              <i className="ks-arm-weight" />
              <i className="ks-arm-tube" />
              <i className="ks-arm-head" />
            </div>
          </div>
          <i className="ks-pivot" />
          <i className="ks-rest" />
        </div>

        <div className="ks-candle">
          <i className="ks-candle-glow" />
          <i className="ks-candle-flame" />
          <i className="ks-candle-cup" />
        </div>

        <div className="ks-matches">
          <span className="ks-matches-mark">Phædrus</span>
          <span className="ks-matches-jp">喫茶</span>
        </div>

        <div className="ks-glints">
          {GLINTS.map((g, i) => (
            <i
              key={i}
              style={
                {
                  left: `${g.x}%`,
                  top: `${g.y}%`,
                  '--s-g': g.s,
                  animationDuration: `${g.d}s`,
                  animationDelay: `${g.delay}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>

      <div className="ks-card">
        <div className="ks-over">
          <span className="ks-over-room">{group?.name ?? '—'}</span>
          {state && <span>{SOURCE[state.source] ?? state.source}</span>}
          {position && <span className="num">{position}</span>}
        </div>
        {idle ? (
          <h1 className="ks-title is-idle">Nothing on the turntable</h1>
        ) : (
          <>
            <h1 className="ks-title" title={title}>
              {title}
            </h1>
            {artist && <p className="ks-artist">{artist}</p>}
            {album && <p className="ks-album">{album}</p>}
          </>
        )}
      </div>

      <Progress />
      <Transport />
    </div>
  );
}
