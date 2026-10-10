/** Loads a room's saved progress, then plays it. Route: /learn/invest/:lessonId for rooms. */
import { Spinner } from '@/ui';
import { InvestShell } from './InvestShell';
import { RoomPlayer } from './RoomPlayer';
import type { Room } from './logic/types';
import { useSavedProgress } from './useSavedProgress';

export function RoomLoader({ room }: { room: Room }) {
  const { loaded, initial, save } = useSavedProgress(room);
  if (!loaded) {
    return (
      <InvestShell>
        <Spinner />
      </InvestShell>
    );
  }
  return <RoomPlayer room={room} initial={initial} onChange={save} />;
}
