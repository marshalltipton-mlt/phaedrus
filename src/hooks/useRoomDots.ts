import { useMemo } from 'react';
import { useSonos } from '../store/useSonos';
import { assignRoomDots, type RoomDot } from '../lib/roomDot';

/**
 * The colour dot for every room in the household, settled so that rooms next
 * to each other on the rail, and on the playing group's faders, never match.
 * Look a group up by its coordinator's uuid.
 */
export function useRoomDots(): (uuid: string | undefined) => RoomDot | undefined {
  const groups = useSonos((s) => s.topology?.groups);
  const members = useSonos((s) => s.state?.members);

  const memberKey = members?.map((m) => m.uuid).join(',') ?? '';
  const dots = useMemo(() => {
    const rail = (groups ?? []).map((g) => g.coordinatorUuid);
    const order = (groups ?? []).flatMap((g) => g.members.map((m) => m.uuid));
    const faders = memberKey ? memberKey.split(',') : [];
    return assignRoomDots([...order, ...faders], [rail, faders]);
  }, [groups, memberKey]);

  return (uuid) => (uuid ? dots.get(uuid) : undefined);
}
