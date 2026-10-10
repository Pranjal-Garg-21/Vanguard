/**
 * First-launch setup: language, accessibility, class code, avatar, picture-PIN.
 * Owner: P5. Placeholder until P5 Phase 1; creates a test profile for now.
 */
import { useNavigate } from 'react-router';
import { createProfile } from '@/platform';

export function SetupScreen() {
  const navigate = useNavigate();

  const createTestProfile = async () => {
    await createProfile({
      displayName: 'Test player',
      avatarId: 'avatar_01',
      pinPictures: ['mango', 'kite', 'bus', 'star'],
      language: 'en',
      a11y: { audio: false, largeText: false, reduceMotion: false, timersOff: false },
      classCode: null,
    });
    navigate('/');
  };

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Setup</h1>
      <p>Language, accessibility, class code, avatar and picture-PIN screens go here.</p>
      <button className="rounded bg-teal-700 px-3 py-2 text-white" onClick={createTestProfile}>
        Create test profile
      </button>
    </main>
  );
}
