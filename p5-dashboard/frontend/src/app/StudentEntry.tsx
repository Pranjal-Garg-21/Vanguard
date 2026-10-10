/**
 * Decides where a student lands: setup on a new phone, the player picker on a
 * shared phone, or home when someone is already signed in.
 */
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { listProfiles, loadActiveProfile } from '@/platform';
import { Spinner } from '@/ui';

export function StudentEntry() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (await loadActiveProfile()) return setTarget('/home');
      setTarget((await listProfiles()).length ? '/who' : '/welcome');
    })();
  }, []);

  return target ? <Navigate to={target} replace /> : <Spinner />;
}
