/**
 * Does the speaker button actually reach the screen, and does it say the right
 * thing? Owner: P3.
 *
 * The engine is tested on its own in platform/audio. What is easy to get wrong
 * here is the wiring: a button that reads a fragment instead of the message, a
 * screen that reads itself aloud to a student who never asked for that, or a
 * message that keeps talking after the student has left it.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { noteUserGesture, resetAudio, setSpeechEngine, useActiveProfile, type SpeechEngine } from '@/platform';
import { PhoneScreen } from './PhoneScreen';
import { createRun, reduce } from './logic/runner';
import { getScenario } from './scenarios';
import { surfaceKeys, surfaceText, surfaceClipKey } from './SurfaceView';
import type { RunState, Scenario } from './logic/types';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** A phone that can speak every language, and remembers what it said. */
function fakePhone() {
  const said: string[] = [];
  const engine: SpeechEngine = {
    voices: () => [{ lang: 'en-IN' }, { lang: 'te-IN' }, { lang: 'hi-IN' }, { lang: 'ur-PK' }],
    speak: async (text) => void said.push(text),
    cancel: () => {},
  };
  setSpeechEngine(engine);
  return said;
}

const signedIn = (audio: boolean) =>
  useActiveProfile.setState({
    profile: {
      pid: 'p1',
      displayName: 'Test',
      avatarId: 'a',
      language: 'en',
      a11y: { audio, largeText: false, reduceMotion: false, timersOff: false },
      classCode: null,
      classStatus: 'none', hasPin: true,
    },
    loaded: true,
  });

const tick = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  resetAudio();
  // The student has tapped something by the time a room is open; the gate on
  // that is tested on its own below.
  noteUserGesture();
  useActiveProfile.setState({ profile: null, loaded: true });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  resetAudio();
});

/** The KYC script, opened on its first message. */
function openedRun(): RunState {
  const script = getScenario('kyc_expiry_01') as Scenario;
  const delivered = reduce(createRun(script, { timersOff: true }), { type: 'tick', ms: 5_000 });
  const first = delivered.inbox[0] as string;
  return reduce(delivered, { type: 'open', surface: first });
}

describe('joining a message back together', () => {
  it('reads the whole message, not the fragment the Scam Lens points at', () => {
    const script = getScenario('kyc_expiry_01') as Scenario;
    const surface = script.steps[0]?.surface;
    expect(surface).toBeDefined();
    const keys = surfaceKeys(surface!);
    expect(keys.length).toBeGreaterThan(1);

    const text = surfaceText(surface!, script.vars);
    // One sentence, not a key, and not the segments jammed together.
    expect(text).not.toMatch(/safe\.[a-z0-9_.]+/i);
    expect(text).not.toMatch(/\s{2,}/);
    expect(text.length).toBeGreaterThan(keys.length * 2);
  });

  it('names one recording per message, from the keys the message shares', () => {
    const script = getScenario('kyc_expiry_01') as Scenario;
    expect(surfaceClipKey(script.steps[0]?.surface as never)).toBe('safe.kyc01.sms');
  });
});

describe('the speaker button on a message', () => {
  it('reads the message aloud when pressed', async () => {
    const said = fakePhone();
    const state = openedRun();
    await act(async () => {
      root.render(<PhoneScreen state={state} dispatch={() => {}} lensOn={false} onToggleLens={() => {}} />);
    });

    const speaker = [...host.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Read this to me');
    expect(speaker, 'no speaker button on an open message').toBeDefined();

    await act(async () => void speaker!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await tick();

    const surface = (getScenario('kyc_expiry_01') as Scenario).steps[0]?.surface;
    expect(said).toEqual([surfaceText(surface!)]);
  });
});

describe('reading a screen without being asked', () => {
  it('stays quiet for a student who did not tick "Read things aloud"', async () => {
    const said = fakePhone();
    signedIn(false);
    await act(async () => {
      root.render(<PhoneScreen state={openedRun()} dispatch={() => {}} lensOn={false} onToggleLens={() => {}} />);
    });
    await tick();
    expect(said).toEqual([]);
  });

  it('reads the message when they did, and stops when they leave the screen', async () => {
    const said = fakePhone();
    signedIn(true);
    const state = openedRun();
    await act(async () => {
      root.render(<PhoneScreen state={state} dispatch={() => {}} lensOn={false} onToggleLens={() => {}} />);
    });
    await tick();
    expect(said).toHaveLength(1);

    // Closing the message must not leave a voice talking over the next screen.
    await act(async () => {
      root.render(<PhoneScreen state={{ ...state, open: null }} dispatch={() => {}} lensOn={false} onToggleLens={() => {}} />);
    });
    await tick();
    expect(said).toHaveLength(1);
  });

  it('waits for the first tap, because browsers refuse to make a sound before one', async () => {
    const said = fakePhone();
    signedIn(true);
    resetAudio(); // a phone nobody has touched yet
    setSpeechEngine({ voices: () => [{ lang: 'en-IN' }], speak: async (text) => void said.push(text), cancel: () => {} });
    await act(async () => {
      root.render(<PhoneScreen state={openedRun()} dispatch={() => {}} lensOn={false} onToggleLens={() => {}} />);
    });
    await tick();
    expect(said).toEqual([]);
  });
});
