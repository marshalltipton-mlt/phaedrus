import { hashString } from './hash';

/**
 * Each room's own colour, for skins that give rooms one (Putty's room dots).
 * Skins that don't use it never see the attribute.
 *
 * A room starts from a colour hashed from its uuid, so it keeps the same one
 * from day to day. Where that would put the same colour on two rooms that sit
 * next to each other — on the rooms rail, or on the faders of the group being
 * played — the later room takes the next colour free of its neighbours.
 */
const DOTS = ['sage', 'butter', 'blush', 'mist'] as const;

export type RoomDot = (typeof DOTS)[number];

/**
 * @param order every room, in the order to settle them (the rail, groups
 *   flattened, coordinator first)
 * @param lists the lists the rooms are shown in; neighbours in any of them
 *   must differ
 */
export function assignRoomDots(order: string[], lists: string[][]): Map<string, RoomDot> {
  const near = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (a === b) return;
    if (!near.has(a)) near.set(a, new Set());
    if (!near.has(b)) near.set(b, new Set());
    near.get(a)!.add(b);
    near.get(b)!.add(a);
  };
  for (const list of lists) for (let i = 1; i < list.length; i++) link(list[i - 1], list[i]);

  const dots = new Map<string, RoomDot>();
  for (const uuid of order) {
    if (dots.has(uuid)) continue;
    const taken = new Set([...(near.get(uuid) ?? [])].map((n) => dots.get(n)).filter(Boolean));
    const start = hashString(uuid) % DOTS.length;
    let pick: RoomDot = DOTS[start];
    for (let k = 0; k < DOTS.length; k++) {
      const d = DOTS[(start + k) % DOTS.length];
      if (!taken.has(d)) {
        pick = d;
        break;
      }
    }
    dots.set(uuid, pick);
  }
  return dots;
}
