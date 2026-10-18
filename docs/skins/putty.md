# Putty — a new Phaedrus skin

Design: Zoe. Build: Marshall (+ Claude Code). App: JR's Phaedrus (`pikehouse/phaedrus`).

The reference mockups live on the Claude Design canvas **"Phaedrus · Putty skin"** (6 screens: desktop Now Playing + Queue, desktop Now Playing + Crate, phone Now / Queue / Crate / Rooms). Zoe shares that link separately. When this spec and the canvas disagree, the canvas wins.

---

## 1. The idea in one paragraph

Soft hardware. Pocket-synth-style objects, but gentler: warm putty greys, chunky keycaps, an orange volume knob, a red-orange dot-matrix clock, speaker-grille dots, and fine grain on every surface. Light mode only. Every panel reads as a physical module sitting on a putty desk. One accent (tangerine) for "you are here"; every room carries its own small colour dot.

---

## 2. How it fits JR's skin system

Follow the pattern in `CLAUDE.md` → *Skins*. Nothing outside the skin should change.

1. **Register it** in `src/store/skin.ts`
   - add `'putty'` to the `Skin` type
   - add `{ id: 'putty', label: 'Putty', hint: 'Soft hardware, warm greys, a little grain' }` to `SKINS`
   - add `'putty'` to the allow-list in `recall()`
2. **Stylesheet**: create `src/styles/skin-putty.css`, everything scoped under `[data-skin='putty']`. Import it in `src/main.tsx` next to the other skins.
   - Start the file the way `skin-daylight.css` does: re-point the shared Hi-Fi tokens first (section 4), so anything that only speaks in tokens restyles for free. Then do the work tokens can't.
3. **Fonts**: bundle locally (no Google Fonts at runtime; the release CSP blocks it). Add to `src/styles/fonts.css`:
   ```css
   @import '@fontsource/ibm-plex-mono/400.css';
   @import '@fontsource/ibm-plex-mono/500.css';
   @import '@fontsource/ibm-plex-serif/300-italic.css';
   @import '@fontsource/ibm-plex-serif/400.css';
   @import '@fontsource/dm-sans/500.css';
   ```
   `pnpm add @fontsource/ibm-plex-mono @fontsource/ibm-plex-serif @fontsource/dm-sans`
4. **Grain textures**: save the two SVGs in section 6 as `src/styles/putty/noise-dark.svg` and `noise-light.svg`, referenced with relative `url()` from the stylesheet (Vite bundles them, so they pass the release CSP).
5. **Stage (optional, phase 2)**: the dot-matrix clock and speaker grille are the two pieces CSS alone can't make. Do a CSS-only first pass, then add `src/components/PuttyStage.tsx` and a `skin === 'putty'` branch in `NowPlaying.tsx`, the same way Daylight/Tuner do.
6. **Phone**: below 760px the app renders `MobileShell`. Putty's phone rules go in `skin-putty.css` too (scoped), not in `mobile.css`.

---

## 3. Palette

| Token | Hex | Job |
|---|---|---|
| `--pt-paper` | `#EEEBE4` | page ground (the desk) |
| `--pt-shell` | `#E3DFD6` | module face (mid-stop of module gradient) |
| `--pt-fog` | `#D0CBC1` | recessed trays (behind keycaps / tabs) |
| `--pt-stone` | `#A7A297` | minor knob ticks, inactive room dot |
| `--pt-graphite` | `#3B3A36` | dark display panels, station sleeves |
| `--pt-ink` | `#2A2924` | primary text, fader cap line |
| `--pt-ink-2` | `#67635B` | secondary text / labels (passes 4.5:1 on shell; don't go lighter) |
| `--pt-tangerine` | `#E8794F` | accent: knob, progress fill, current-track number, active room LED |
| `--pt-sage` | `#8DAA82` | "playing" LED; Dining room dot |
| `--pt-butter` | `#EAC35F` | room dot (Kitchen / Patio) |
| `--pt-blush` | `#E7A8A4` | room dot (Living room) |
| `--pt-mist` | `#90B2C1` | room dot (Master bed / Study) |
| `--pt-led` | `#F2643E` | dot-matrix LED (lit); dim LED `#9A4C34`; unlit `rgba(255,255,255,.07)` |

Room colours: assign from the pop set by a stable hash of the room id (like `pickBy` in `Crate.tsx`) so a room keeps its colour everywhere.

---

## 4. Re-point JR's Hi-Fi tokens

```css
[data-skin='putty'] {
  color-scheme: light;

  --bg-deep: #EEEBE4;
  --bg: #EEEBE4;
  --bg-raised: #E3DFD6;
  --walnut: #D0CBC1;
  --walnut-light: #E3DFD6;

  /* "cream" becomes ink: meaning inverts, the presence scale stays */
  --cream: #2A2924;
  --cream-dim: #67635B;
  --cream-faint: #8A857C;
  --cream-ghost: rgba(42, 41, 36, .12);

  /* the lamp becomes tangerine */
  --amber: #E8794F;
  --amber-hot: #F39A73;
  --amber-glow: rgba(232, 121, 79, .22);

  --display: 'IBM Plex Serif', Georgia, serif;
  --face: 'IBM Plex Mono', ui-monospace, monospace;

  --radius: 10px;
  --lift: 0 10px 24px -12px rgba(60,50,35,.35), 0 2px 4px rgba(60,50,35,.10), inset 0 1px 0 rgba(255,255,255,.7);
  --sink: inset 0 2px 4px rgba(60,50,35,.25);
}
```
Keep JR's motion tokens (`--ease`, `--t*`) as they are.

---

## 5. Type: three voices, one job each

| Voice | Font | Where | Desktop | Phone |
|---|---|---|---|---|
| **The track playing now** | IBM Plex Serif **300 italic**, tracking −0.02em, line-height 1.04 | Now Playing title only | 56px | 32px |
| **Things you pick** | DM Sans **500**, tracking 0 | room names, track names in queue/crate lists, phone mini-player title, phone header room chip | rooms 15px · list tracks 15px · crate 14px | rooms 16px · list tracks 15px · mini-player 17px · chip 15px |
| **Everything else** | IBM Plex Mono 400/500 | artists, labels, numbers, durations, tabs, buttons | — | — |

Plex Mono details:
- **Artist on Now Playing**: 400, UPPERCASE, tracking .08em, 17px desktop / 13px phone
- **Artist in lists**: 400, UPPERCASE, tracking .06em, 10.5px, colour `--pt-ink-2`
- **Labels** (ROOMS, QUEUE 04/12, durations, VOL 22, tab labels): 11px (10px on phone), UPPERCASE, tracking .08em, `--pt-ink-2`
- Room names stay sentence case (so they don't blend into the labels).

Space Grotesk, Fraunces and Karla are not used in Putty.

---

## 6. Grain (the signature texture)

Rule: **dark grain on light surfaces, light grain on dark surfaces.** Zoe tuned strength to **0.5** of the original.

```css
[data-skin='putty'] .pt-grain { position: relative; isolation: isolate; }
[data-skin='putty'] .pt-grain::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: url('./putty/noise-dark.svg');
  opacity: .11;                 /* 0.22 × 0.5 */
  mix-blend-mode: multiply;
}
[data-skin='putty'] .pt-grain-dark::after {
  background: url('./putty/noise-light.svg');
  opacity: .08;                 /* 0.16 × 0.5 */
  mix-blend-mode: screen;
}
```
Apply to: the page ground, every module, album art, queue thumbnails, crate sleeves (dark variant on station sleeves and the dot-matrix panel).

`noise-dark.svg`
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.1 -.35"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
```
`noise-light.svg`
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.1 -.35"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
```
Grain is static (no animation), so it's fine under reduced motion.

---

## 7. Surfaces (the physical vocabulary)

| Piece | Recipe |
|---|---|
| **Module** (every panel/rail) | `background: linear-gradient(165deg, #EFEBE4, #E3DFD6 60%, #D9D4CA); border-radius: 14px (16px phone); box-shadow: var(--lift);` + grain |
| **Tray** (recessed well behind keycaps, tab switch, phone tab bar) | `background: #CFCAC0; border-radius: 12px; padding: 6–7px; box-shadow: var(--sink);` |
| **Keycap** | `background: linear-gradient(180deg, #F6F3EE, #E5E1D9); border-radius: 8px; box-shadow: inset 0 1px 0 #fff, 0 3px 0 #BDB7AC, 0 6px 10px -4px rgba(60,50,35,.35);` height 58px desktop / 54px phone |
| **Play/pause key** (wide, 2× flex) | `background: linear-gradient(180deg, #C9C4BA, #B7B1A6); box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 3px 0 #9C968B, 0 6px 10px -4px rgba(60,50,35,.35);` |
| **Raised row** (selected room, current queue track, active tab) | `background: linear-gradient(180deg, #F6F3EE, #E8E4DC); box-shadow: inset 0 1px 0 #fff, 0 3px 0 #C6C0B5, 0 8px 14px -8px rgba(60,50,35,.35); border-radius: 9–10px;` |
| **Slot** (progress + fader track) | 6px tall, `background: #C3BDB2` (faders `#B9B3A8`), `box-shadow: inset 0 1px 2px rgba(40,30,20,.3)`, radius 3px. Progress fill = tangerine. Progress thumb = 16px circle `#FAF8F4` with `0 2px 5px rgba(60,50,35,.4)`. |
| **Fader cap** | 20×28px, radius 5px, `linear-gradient(180deg, #FAF8F4, #E2DDD4)`, `0 4px 8px -2px rgba(60,50,35,.4), inset 0 1px 0 #fff`, a 2px `--pt-ink` line across the middle |
| **Volume knob** | tangerine disc: `radial-gradient(circle at 35% 28%, #F39A73, #E8794F 55%, #D9653C)`, shadow `0 14px 26px -10px rgba(150,70,30,.55), 0 3px 6px rgba(120,60,30,.25), inset 0 2px 1px rgba(255,255,255,.35), inset 0 -3px 6px rgba(120,50,20,.25)`; cream indicator line `#FBEADF`, 4px wide. 11 ticks over 270° (−135° → +135°), every 5th tick longer and darker (`#6F6A62`), others `#A7A297`. Size: 106px disc in a 170px dial (desktop deck), 84px in 132px (phone Rooms), 56px plain (phone Now Playing). |
| **LED dot** | 8–9px circle + `0 0 0 3px` halo of the same colour at 22–25% |
| **Room dot** | 10px circle, `inset 0 -1px 2px rgba(0,0,0,.2)` |
| **Dot-matrix display** | graphite panel `radial-gradient(circle at 30% 20%, #4A4943, #3B3A36 70%)`, `inset 0 2px 6px rgba(0,0,0,.5)`, radius 12px, light grain. 5×7 dot font, 4px dots / 2px gap (3px on phone). Elapsed time lit `--pt-led`, " / total" in dim `#9A4C34`, unlit dots `rgba(255,255,255,.07)`. |
| **Speaker grille** (decorative) | grid of 5px dots, 6px gap, `#ABA59B` with `inset 0 1px 1px rgba(0,0,0,.35)`. Under the track info, and in the volume deck where Hi-Fi has VU meters. |
| **Album art / sleeves** | radius 10px (8px sleeves, 6px thumbs), shadow `0 24px 44px -18px rgba(120,60,30,.55), 0 4px 8px rgba(60,50,35,.15)` + grain. Radio stations: graphite sleeve with call letters in Plex Mono, LED orange. Sleeves with no art: soft two-pop gradient. |

---

## 8. Screen by screen (desktop ≥ 760px)

JR's layout stays: rooms rail 250px · stage · queue/crate rail 330px. Each becomes a module with 16px gaps on the putty ground.

- **Rooms rail**: label ROOMS + small "Arrange" key; rows = room dot + name (DM Sans) + group members as a mono sub-label; selected room = raised row + tangerine LED on the right. "Everywhere" is a full-width keycap at the bottom.
- **Stage module**: top line `● DINING ROOM  QUEUE 04/12` (room name in tangerine) and a sage `PLAYING` LED at right. Art 300px left; title (serif italic), artist (mono caps), album · year label, grille dots underneath. Progress slot full width with mono times (`01:00` / `−03:21`). Bottom row: keycap tray (shuffle · prev · **play/pause** · next · favourite · repeat) + dot-matrix clock to its right.
- **Volume deck** (separate module under the stage): knob · "Rooms in group" faders (dot + name + slot + value) · grille block.
- **Right rail**: Queue/Crate as a two-key switch in a tray + search keycap. Queue rows: mono number (tangerine on current), 38px thumb, track (DM Sans) / artist (mono caps), duration. Current track = raised row. Crate: two-column sleeve grid, title (DM Sans) + kind label (mono).

## 9. Phone (< 760px, `MobileShell`)

- **Header**: room chip (raised, room dot + name + `+2`) · search keycap · settings keycap.
- **Tab bar**: a tray holding four keycap tabs (Now · Queue · Crate · Rooms), icon + 10px mono label; the active tab is the raised keycap.
- **Now**: one module: queue position + playing LED, 250px art, title/artist/album, progress, keycap tray (prev · play/pause · next), then a row with a small knob, VOL label and a mini dot-matrix clock.
- **Queue**: mini-player module (art, title, artist, thin progress, pause key) above the queue module.
- **Crate**: one module, two-column sleeve grid.
- **Rooms**: room list module (+ "Everywhere" keycap), then a volume module with the knob and stacked per-room faders.

---

## 10. Taste rules (from JR's CLAUDE.md, still apply)

Slow, gentle motion; nothing strobes or snaps; loops stop when paused, hidden, or under reduced motion. Putty adds no animation of its own beyond JR's existing transitions. Keycaps can nudge down 2px on press (shadow `0 1px 0` instead of `0 3px 0`) for a physical feel.

## 11. Done means

- `pnpm build` passes with zero TypeScript errors.
- `pnpm dev` (mock data) at 1440×900 and at phone width matches the canvas.
- Switching skins back and forth leaves every other skin untouched.
- A release build still loads the fonts and grain (no Google Fonts, CSP-safe).
