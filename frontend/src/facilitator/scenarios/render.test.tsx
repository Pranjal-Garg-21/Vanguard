/** A smoke test: the builder screens draw without errors, for a new scenario and an existing one. */
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ScenarioEditor } from './ScenarioEditor';
import type { ScenarioRow } from './api';
import { toInbox, blankMessage } from './model';

const none = () => undefined;

describe('the scenario builder', () => {
  it('draws a blank scenario with a scam and a real message to start from', () => {
    const html = renderToString(<ScenarioEditor classId="c1" existing={null} onClose={none} onSaved={none} />);
    expect(html).toContain('New scenario');
    expect(html).toContain('Message 1');
    expect(html).toContain('Message 2');
    expect(html).toContain('Mark the words that give it away');
    expect(html).toContain('A fake link must end in');
    expect(html).toContain('Publish to class');
    // Nothing can be published or previewed until it is complete.
    expect(html).toMatch(/Before you can publish/);
  });

  it('draws an existing published scenario', () => {
    const m = { ...blankMessage('scam'), from: 'AX-TEST', body: 'Pay now', explain: 'A scam.', flags: [{ text: 'Pay now', occurrence: 0, kind: 'urgency' as const, why: 'Rushing you.' }] };
    const existing: ScenarioRow = {
      id: 's1', class_id: 'c1', title: 'My scenario', brief: 'Read each one.', concept: 'fake_kyc', language: 'te', status: 'published', version: 3, updated_at: new Date().toISOString(),
      body: toInbox([m, { ...blankMessage('genuine'), from: 'School', body: 'Fees are due on Friday.', explain: 'From your school.' }]),
    };
    const html = renderToString(<ScenarioEditor classId="c1" existing={existing} onClose={none} onSaved={none} />);
    expect(html).toContain('Edit scenario');
    expect(html).toContain('My scenario');
    expect(html).toContain('Save and keep published');
    expect(html).toContain('Pay now');
  });
});
