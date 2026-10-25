# Kissa: a jazz kissa at one in the morning

Brief from JR: one theme, deeply detailed, built on a photo of a Japanese jazz
café (a *jazz kissa*). The photo is the mood board: a dark Tokyo listening bar
with amber bokeh from the bottle shelves, a CRT glowing flat blue, a wall of
cassettes, black hi-fi separates with ice-blue readouts, a turntable with a
cut-crystal platter on a glittering glass counter, crystal candle holders, and
salmon-pink paper menus. The aim is a real room late at night, not a theme
park.

Files: `src/styles/skin-kissa.css` (tokens, rails, menu card, faceplate,
overlays, phone), `src/styles/kissa.css` (the counter and the VFD),
`src/components/KissaStage.tsx`, `src/components/KissaDeck.tsx`, and
`src/assets/kissa/room.webp`. Everything is scoped to `html[data-skin='kissa']`.

## What each panel is

| Panel | In the room | Details |
| --- | --- | --- |
| Backdrop | The bar behind the counter | The reference photo, cropped to the room band, turned into disc bokeh (highlights convolved with a disk kernel over a heavy blur), darkened and warmed. Under it, a CSS-only room: bottle-shelf bokeh, the cassette wall's glow, the CRT's blue. |
| Rooms rail | The master's cassette wall | Each room is a J-card spine: a brand band in the room's colour with a printed "A", the name written on the label, "C·60" at the end. Tapes come in four stocks (cream, white, kraft, pale pink). Unchosen tapes sit back in the shade; the one you're in is pulled out about 10px and catches the lamp. An out-of-focus wall of more tapes fills the space below. 部屋 (rooms), 全室 (all rooms) for Everywhere. |
| Stage | The counter | The sleeve of the playing record stands on an acrylic stand with a salmon placard reading 只今演奏中 ("now playing"), or 準備中 ("in preparation", the sign on a shop door) when nothing is loaded. In front of it, a crystal turntable on a glass counter. |
| Turntable | The crystal platter | Drawn flat and squashed into an ellipse, so Vinyl's own rotation reads as a turn in the plane of the counter. Faceted rim on top, a cut-crystal side band below, the room's lights fixed on the rim and grooves. The tonearm sits in the same plane on a black armboard, with a cue lever beside the pivot: on its rest when idle, lifted off the groove when paused, and over the groove the song has reached while playing (lead-in to run-out). |
| Counter dressing | Things on the bar | A candle in a cut-crystal cup, a matchbook (Phædrus · 喫茶), static glitter in the glass, the CRT and the cover's colour reflected in it, a cut glass front edge. |
| Title card | The printed card | Room · source · position in silkscreen, the title in Cormorant Garamond, the artist in italic salmon. |
| Faceplate | The separates under the counter | Black anodised panel with corner screws. Knurled black knob with a silver skirt and an amber dot (音量). Channel faders with machined silver caps. A VFD window: dot-matrix track number and clock, deck legends (PLAY, PAUSE, SHUFFLE, REPEAT, TUNER) that light for real, and two 22-segment bar meters with peak hold. |
| Queue | The menu card | Salmon paper with tooth, lit from above. 本日のレコード ("today's records"), items numbered like dishes, dotted leaders out to the duration like prices, the playing record marked in red pencil (▸). At the foot, the house rule of every kissa: 会話はご遠慮ください ("kindly keep conversation low"). |
| Crate | The master's shelf | 愛聴盤 ("records he loves to listen to"). Sleeves on lacquered ledges whose front edge catches the light. |
| Search | The monitor in the corner | Blue-white monospace on near-black with faint scanlines, a `>` prompt. Titles stay in the serif, in a cool white. |
| Settings | A lacquered box on the bar | Dark panel, Cormorant headings, 設定 beside the title, amber for what's on. |
| Status line | A slip passed across the counter | A strip of the menu's paper with an italic line. |
| Phone | Same room, upright | The counter scaled down; the VFD sits on top of the faceplate (legends and scale dropped). The queue page is the menu card full-height. The photo hangs at the top so the CRT sits behind the counter. |

## Palette

| Token | Value | Job |
| --- | --- | --- |
| `--ks-night` | `#070504` | ground |
| `--ks-ink` | `#f3e2d2` | type on the dark |
| `--ks-amber` | `#f0a868` | bokeh, "you are here", lit things |
| `--ks-salmon` | `#eeac94` | artist line, paper |
| `--ks-paper` / `--ks-paper-lit` | `#eab39c` / `#f4c6b1` | the menu card |
| `--ks-paper-ink` | `#43201a` | ink on the paper |
| `--ks-vermilion` | `#c8402a` | red pencil, destructive |
| `--ks-crt` / `--ks-crt-ink` | `#4f6ef0` / `#cfdcff` | the CRT, search |
| `--ks-vfd` | `#a6e9ff` | VFD segments |
| `--ks-jcard` | `#e6dbc9` | cassette J-cards |

Room colours (from `useRoomDots`) become tape brand bands: muted green, amber,
salmon and CRT blue.

## Type

- **Cormorant Garamond** 500, 500 italic, 600 (OFL, `@fontsource/cormorant-garamond`,
  Latin subset only, about 23 KB each as woff2): titles, track and room names,
  the artist line.
- **Archivo** (already bundled), wide (`font-stretch` 112–125%) and tracked:
  silkscreen labels on the hardware.
- **IBM Plex Mono** (already bundled): menu numbers and durations, search.
- **Japanese**: the system's Hiragino Mincho (`'Hiragino Mincho ProN', 'Yu Mincho', serif`).
  Nothing is bundled for it. Japanese is used only for short, correct labels:
  部屋, 全室, 本日のレコード, 愛聴盤, 只今演奏中, 準備中, 音量, 設定, 喫茶,
  会話はご遠慮ください.

## Motion, and how each motion stops

Slow, gentle, restrained. Nothing strobes or snaps.

| Motion | Speed | Stops when |
| --- | --- | --- |
| Record turning (Vinyl) | one turn every ~5 s, winds up over ~2 s, coasts down over ~3 s | paused (coasts to rest and the rAF loop parks); hidden (rAF does not run); reduced motion (still) |
| Tonearm | sets down, lifts, returns to rest over 2.2 s; tracks the song in steps every 2 s | the 2 s timer only runs while playing and visible; reduced motion removes the transitions |
| Cue lever | flips up on pause, down on play, over 0.9 s | a transition only; reduced motion removes it |
| Glints on the glass and crystal | each lights for ~1.5 s once in a 19–41 s cycle | only animate while playing, visible and not reduced motion (`.is-alive`) |
| Candle | glow breathes over 7.5 s, flame sways over 9 s | same as glints |
| VFD meters | ~20 updates a second, 0.18 s attack, 1.1 s release, peak hold 1.4 s | decay to zero after a pause and the loop parks; hidden; not laid out; reduced motion holds a still level |
| VFD clock | ticks twice a second | only while playing and visible |
| Spine pull-out, hovers | 0.7 s / 0.26 s eases | n/a (transitions) |

The base film grain flicker and the drifting light leak are switched off for
this skin; a single static grain frame remains. The LIVE pip for radio is a
steady lamp instead of a breathing one.

## The photo

`src/assets/kissa/room.webp` (about 10 KB, 800×500) is the reference photo,
cropped, blurred into bokeh and graded. Its provenance is unknown, and the repo
is public. It is referenced in exactly one place: `--ks-room` at the top of
`skin-kissa.css`. To replace it, drop in another image at the same path (any
dark, blurred room at 16:10 works). To remove it, delete that line and the
file; the CSS-built room underneath stands in on its own.
