import { useEffect, useState } from 'react';
import { livePosition, useSonos } from '../store/useSonos';
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

   Nothing here moves on its own: the clock only ticks while the music
   plays and the window is seen.
   ══════════════════════════════════════════════════════════════════════════ */

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

  const elapsed = useElapsed(!!playing);
  const duration = state?.durationSecs ?? 0;
  const timed = !state?.isRadio && duration > 0;
  const now = clock(timed ? Math.min(elapsed, duration) : elapsed);
  const total = clock(duration);

  const position =
    state?.queueIndex && state.queueLength ? `${two(state.queueIndex)}/${two(state.queueLength)}` : undefined;
  const members = state?.members.length ?? group?.members.length ?? 0;

  return (
    <div className={`putty${playing ? ' is-playing' : ''}`}>
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
          <PuttyGrille className="pt-grille-type" />
        </div>
      </div>

      <Progress />

      <div className="pt-deck">
        <Transport />
        <PuttyMatrix
          className="pt-clock"
          text={timed ? `${now} / ${total}` : now}
          dimFrom={timed ? now.length : undefined}
          label={timed ? `Time ${now} of ${total}` : `Time ${now}`}
        />
      </div>

      {/* On a phone: a small knob, the volume, and the elapsed time alone. */}
      <div className="pt-pocket">
        <VolumeKnob />
        <span className="pt-pocket-vol">
          <span className="label pt-pocket-level">Vol {state?.volume ?? 0}</span>
          <span className="label">{members === 1 ? '1 room' : `${members} rooms`}</span>
        </span>
        <PuttyMatrix className="pt-clock pt-clock-sm" text={now} dot={3} gap={2} label={`Time ${now}`} />
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

/** A patch of speaker grille: round holes punched in the putty. */
export function PuttyGrille({ className }: { className?: string }) {
  return <i className={`pt-grille${className ? ` ${className}` : ''}`} aria-hidden="true" />;
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
