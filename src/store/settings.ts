import { create } from 'zustand';
import type { PlayAction } from '../api/types';

/** What a tap on a song, album, playlist or station does. */
export type TapAction = Extract<PlayAction, 'replace' | 'next' | 'later'>;

/** Putty's light and Night: follow the system (macOS / iOS appearance), or pin one. */
export type PuttyAppearance = 'auto' | 'light' | 'night';

export interface Settings {
  tapAction: TapAction;
  puttyAppearance: PuttyAppearance;
}

const KEY = 'phaedrus.settings';
const DEFAULTS: Settings = { tapAction: 'replace', puttyAppearance: 'auto' };

function recall(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const v = JSON.parse(raw) as Partial<Settings>;
    const tap = v.tapAction;
    const look = v.puttyAppearance;
    return {
      tapAction: tap === 'next' || tap === 'later' || tap === 'replace' ? tap : DEFAULTS.tapAction,
      puttyAppearance: look === 'light' || look === 'night' ? look : 'auto',
    };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
}

/**
 * Stamp Putty's appearance on <html>: `data-putty-mode` is `light` or `night`
 * when pinned, and absent on auto, where the stylesheet follows
 * prefers-color-scheme. Other skins never read it.
 */
function applyPuttyAppearance(mode: PuttyAppearance) {
  const html = document.documentElement;
  if (mode === 'auto') html.removeAttribute('data-putty-mode');
  else html.setAttribute('data-putty-mode', mode);
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...recall(),
  set(patch) {
    set(patch);
    const { tapAction, puttyAppearance } = { ...get(), ...patch };
    applyPuttyAppearance(puttyAppearance);
    try {
      localStorage.setItem(KEY, JSON.stringify({ tapAction, puttyAppearance }));
    } catch {
      /* private mode: the choice lasts until the window closes */
    }
  },
}));

// Before first paint, like the skin.
applyPuttyAppearance(useSettings.getState().puttyAppearance);

/** Whether the Settings sheet is up. Not persisted: it always starts closed. */
export const useSettingsPanel = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen(open) {
    set({ open });
  },
}));
