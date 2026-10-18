import { pickBy } from './hash';

/**
 * Each room's own colour, for skins that give rooms one (Putty's room dots).
 * Keyed by the room's uuid (a group by its coordinator's), so a room keeps
 * its colour on the rail, on its fader and in the phone's header. Skins
 * that don't use it never see the attribute.
 */
const DOTS = ['sage', 'butter', 'blush', 'mist'] as const;

export type RoomDot = (typeof DOTS)[number];

export function roomDot(uuid: string): RoomDot {
  return pickBy(uuid, DOTS);
}
