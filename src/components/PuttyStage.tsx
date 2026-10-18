import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { livePosition, useSonos } from '../store/useSonos';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { BLANK, columns, type Column } from '../lib/puttyFont';
import { averageColor } from '../lib/color';
import { POPS, popFor, snapToPop, type Pop } from '../lib/puttyPop';
import Progress from './Progress';
import Transport from './Transport';
import VolumeKnob from './VolumeKnob';
import Faders from './Faders';
import PuttyMatrix from './PuttyMatrix';
import { Pause, Play } from './Icons';
import '../styles/putty.css';

/* ══════════════════════════════════════════════════════════════════════════
   PUTTY

   Soft hardware: the now-playing module. A top line (room, queue position,
   a sage PLAYING LED), the art on the left with the type beside it and a
   speaker grille under the type, the progress slot, then a tray of keycaps
   with the dot-matrix clock to its right. On a phone the clock shrinks to
   the elapsed time and sits beside a small knob.

   Motion (Zoe's motion study), all of it slow, and none of it while the
   window is hidden or the system asks for reduced motion:
     · the clock's colon is steady, and ticks once a second through the
       last ten seconds of a track;
     · on a new track, TITLE · ARTIST scrolls through the display once,
       a column every 45ms, then the time comes back;
     · paused, the whole display slowly dims and brightens;
     · the grilles breathe: a ripple out from the centre while music
       plays, frozen mid-breath when it pauses.
   ══════════════════════════════════════════════════════════════════════════ */

/** Columns in the desk clock ("mm:ss / mm:ss") and the phone's ("mm:ss"). */
const CLOCK_COLS = 66;
const POCKET_COLS = 26;
const SCROLL_MS = 45;

const SOURCE: Record<string, string> = {
  queue: 'Queue',
  radio: 'Radio',
  linein: 'Line In',
  tv: 'TV',
  airplay: 'AirPlay',
  'spotify-connect': 'Spotify Connect',
};

const two = (n: number) => String(n).padStart(2, '0');

/** 01:00, or 1:02:03 past the hour. */
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
      if (timer === undefined) timer = window.setInterval(read, 250);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        read();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [receivedAt, playing]);

  return secs;
}

/**
 * The playing track's colour, as the custom properties the clock LEDs and the
 * grille's breath read. Taken from the cover (snapped to the nearest Putty
 * pop), or from a hash of the title when there is no cover or no hue in it.
 * The properties are registered (@property in putty.css), so the stage eases
 * the whole display from one colour to the next.
 */
export function useTrackPop(enabled: boolean): CSSProperties | undefined {
  const art = useSonos((s) => s.state?.track?.art);
  const title = useSonos((s) => (s.state?.isRadio ? s.state.stationName : s.state?.track?.title) ?? '');
  const [pop, setPop] = useState<Pop>(() => popFor(title));

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const fallback = popFor(title);
    if (!art) {
      setPop(fallback);
      return;
    }
    averageColor(art).then((c) => {
      if (alive) setPop(c ? snapToPop(c, fallback) : fallback);
    });
    return () => {
      alive = false;
    };
  }, [enabled, art, title]);

  if (!enabled) return undefined;
  const p = POPS[pop];
  return { ['--led-on' as string]: p.on, ['--led-dim' as string]: p.dim, ['--breath' as string]: p.breath };
}

/** Whether the window is out of sight. */
function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return hidden;
}

/**
 * How far a new track's title has scrolled through the display, in columns,
 * or null when the display shows the time. Starts on a track change (not on
 * first paint), holds while paused or hidden, and never runs with reduced
 * motion. It is done once the text has left the widest display.
 */
function useTrackScroll(key: string | undefined, length: number, run: boolean, reduced: boolean): number | null {
  const [offset, setOffset] = useState<number | null>(null);
  const last = useRef(key);

  useEffect(() => {
    if (key === last.current) return;
    last.current = key;
    setOffset(key && !reduced ? 0 : null);
  }, [key, reduced]);

  useEffect(() => {
    if (reduced) setOffset(null);
  }, [reduced]);

  const scrolling = offset !== null;
  useEffect(() => {
    if (!scrolling || !run) return;
    const end = length + CLOCK_COLS;
    const t = window.setInterval(() => {
      setOffset((o) => (o === null || o + 1 >= end ? null : o + 1));
    }, SCROLL_MS);
    return () => clearInterval(t);
  }, [scrolling, run, length]);

  return offset;
}

/** A window of `width` columns onto text passing through, blank either side. */
function windowOnto(text: Column[], width: number, offset: number): Column[] {
  const out: Column[] = [];
  for (let i = 0; i < width; i++) {
    const at = offset + i - width;
    out.push(at >= 0 && at < text.length ? text[at] : BLANK);
  }
  return out;
}

/** Exactly `width` columns: cut, or padded with blanks. */
function fit(cols: Column[], width: number): Column[] {
  const out = cols.slice(0, width);
  while (out.length < width) out.push(BLANK);
  return out;
}

export default function PuttyStage() {
  const state = useSonos((s) => s.state);
  const group = useSonos((s) => s.group);

  const playing = state?.state === 'PLAYING' || state?.state === 'TRANSITIONING';
  const track = state?.track;
  const idle = !state || state.state === 'NO_MEDIA_PRESENT' || !track;

  const title = state?.isRadio ? (state.stationName ?? track?.title ?? 'Radio') : track?.title;
  const artist = state?.isRadio ? track?.streamContent : track?.artist;
  const album = state?.isRadio
    ? track?.title && track.title !== state.stationName
      ? track.title
      : undefined
    : track?.album;

  const reduced = useReducedMotion();
  const hidden = useHidden();
  const elapsed = useElapsed(!!playing);
  const duration = state?.durationSecs ?? 0;
  const timed = !state?.isRadio && duration > 0;
  const now = clock(timed ? Math.min(elapsed, duration) : elapsed);
  const total = clock(duration);

  // The clock: the time, or a new track's title passing through once.
  const trackKey = idle ? undefined : state?.isRadio ? `radio:${state.stationName ?? title}` : (track?.uri ?? `${title}|${artist}`);
  const scrollText = useMemo(
    () => columns(artist ? `${title ?? ''} · ${artist}` : (title ?? '')),
    [title, artist],
  );
  const offset = useTrackScroll(trackKey, scrollText.length, !!playing && !hidden, reduced);
  const timeCols = useMemo(
    () => columns(timed ? `${now} / ${total}` : now, (i) => (timed && i >= now.length ? 'dim' : 'on')),
    [now, total, timed],
  );
  const pocketScrolling = offset !== null && offset < scrollText.length + POCKET_COLS;
  const deskCols = offset !== null ? windowOnto(scrollText, CLOCK_COLS, offset) : fit(timeCols, CLOCK_COLS);
  const pocketCols = pocketScrolling
    ? windowOnto(scrollText, POCKET_COLS, offset)
    : fit(columns(now), POCKET_COLS);

  // The colon ticks with the seconds through a track's last ten.
  const tick = timed && !!playing && offset === null && !reduced && duration - elapsed <= 10;
  const tickPhase = tick ? livePosition(useSonos.getState()) % 1 : 0;
  const rest = !playing && !idle && !reduced;
  const clockLabel = timed ? `Time ${now} of ${total}` : `Time ${now}`;

  const position =
    state?.queueIndex && state.queueLength ? `${two(state.queueIndex)}/${two(state.queueLength)}` : undefined;
  const members = state?.members.length ?? group?.members.length ?? 0;

  return (
    <div className={`putty${playing ? ' is-playing' : ''}${hidden ? ' is-hidden' : ''}`}>
      <header className="pt-top label">
        <span className="pt-top-room">● {group?.name ?? '—'}</span>
        {state && (
          <span>
            {SOURCE[state.source] ?? state.source}
            {position && ` ${position}`}
          </span>
        )}
        <span className="pt-state">
          <i className="pt-led" aria-hidden="true" />
          {playing ? 'Playing' : idle ? 'Idle' : 'Paused'}
        </span>
      </header>

      <div className="pt-head">
        <Art src={track?.art} title={title} />

        <div className="pt-type">
          {idle ? (
            <h1 className="pt-title pt-title-idle">Nothing on</h1>
          ) : (
            <>
              <h1 className="pt-title" title={title}>
                {title}
              </h1>
              {artist && <p className="pt-artist">{artist}</p>}
              {album && <p className="pt-album label">{album}</p>}
            </>
          )}
          <PuttyGrille className="pt-grille-type" cols={34} rows={3} />
        </div>
      </div>

      <Progress />

      <div className="pt-deck">
        <Transport />
        <PuttyMatrix className="pt-clock" cols={deskCols} tick={tick} tickPhase={tickPhase} rest={rest} label={clockLabel} />
      </div>

      {/* On a phone: a small knob, the volume, and the elapsed time alone. */}
      <div className="pt-pocket">
        <VolumeKnob />
        <span className="pt-pocket-vol">
          <span className="label pt-pocket-level">Vol {state?.volume ?? 0}</span>
          <span className="label">{members === 1 ? '1 room' : `${members} rooms`}</span>
        </span>
        <PuttyMatrix
          className="pt-clock pt-clock-sm"
          cols={pocketCols}
          dot={3}
          gap={2}
          tick={tick}
          tickPhase={tickPhase}
          rest={rest}
          label={`Time ${now}`}
        />
      </div>
    </div>
  );
}

function Art({ src, title }: { src?: string; title?: string }) {
  const [broken, setBroken] = useState<string | undefined>();
  const show = !!src && broken !== src;
  return (
    <div className="pt-art">
      {show ? (
        <img src={src} alt={title ? `Album art for ${title}` : ''} draggable={false} onError={() => setBroken(src)} />
      ) : (
        <span className="pt-art-blank" aria-hidden="true" />
      )}
    </div>
  );
}

/**
 * A patch of speaker grille: round holes punched in the putty. While music
 * plays it breathes, a slow ripple out from the centre (the phase is the
 * hole's distance from the middle, on an ellipse squashed sideways, so the
 * wave spreads along the patch). Paused, it freezes mid-breath; hidden or
 * with reduced motion, it doesn't animate at all.
 */
export function PuttyGrille({ className, cols, rows }: { className?: string; cols: number; rows: number }) {
  const playing = useSonos((s) => s.state?.state === 'PLAYING' || s.state?.state === 'TRANSITIONING');
  const reduced = useReducedMotion();
  const hidden = useHidden();

  const holes = useMemo(() => {
    const cc = (cols - 1) / 2;
    const cr = (rows - 1) / 2;
    return Array.from({ length: cols * rows }, (_, i) => {
      const d = Math.hypot((i % cols - cc) / 1.6, Math.floor(i / cols) - cr);
      return `${(d * 0.32 - 6).toFixed(2)}s`;
    });
  }, [cols, rows]);

  const motion = !reduced && !hidden;
  return (
    <div
      className={`pt-grille${motion ? ' is-breathing' : ''}${playing ? '' : ' is-held'}${className ? ` ${className}` : ''}`}
      style={{ gridTemplateColumns: `repeat(${cols}, var(--pt-hole))` }}
      aria-hidden="true"
    >
      {holes.map((delay, i) => (
        <i key={i} style={{ animationDelay: delay }} />
      ))}
    </div>
  );
}

/** The phone's queue page: what's playing, small, above the list. Tapping it opens Now. */
export function PuttyMini({ onOpen }: { onOpen: () => void }) {
  const state = useSonos((s) => s.state);
  const toggle = useSonos((s) => s.toggle);
  const playing = state?.state === 'PLAYING' || state?.state === 'TRANSITIONING';
  const track = state?.track;
  const elapsed = useElapsed(!!playing);
  if (!state || !track) return null;

  const title = state.isRadio ? (state.stationName ?? track.title ?? 'Radio') : track.title;
  const artist = state.isRadio ? track.streamContent : track.artist;
  const duration = state.durationSecs ?? 0;
  const pct = !state.isRadio && duration > 0 ? Math.min(1, elapsed / duration) * 100 : 0;

  return (
    <div className="pt-mini">
      <button type="button" className="pt-mini-open" onClick={onOpen} aria-label={`Now playing: ${title ?? ''}`}>
        <Art src={track.art} title={title} />
        <span className="pt-mini-text">
          <span className="pt-mini-title">{title}</span>
          {artist && <span className="pt-mini-artist">{artist}</span>}
          <span className="pt-mini-slot" aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </span>
        </span>
      </button>
      <button
        type="button"
        className="pt-mini-key"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={() => void toggle()}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
    </div>
  );
}

/** The phone's rooms page: the group's volume, a knob and a fader per room. */
export function PuttyVolume() {
  const state = useSonos((s) => s.state);
  if (!state) return null;
  return (
    <section className="pt-volume" aria-label="Group volume">
      <VolumeKnob />
      <Faders />
    </section>
  );
}
