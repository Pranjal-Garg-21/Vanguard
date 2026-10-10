import { describe, expect, it } from 'vitest';
import { rooms } from './content';
import {
  checkNumberAnswer,
  emptyQuestionState,
  expectedDisplay,
  parseAnswer,
  parseProgress,
  progressSlot,
  roomQuestions,
  serializeProgress,
  summariseProgress,
  type ProgressMap,
} from './room';

describe('saving progress', () => {
  const room = rooms[0]!;
  const qs = roomQuestions(room);
  const solved = (): ProgressMap => Object.fromEntries(qs.map((q) => [q.id, { ...emptyQuestionState(), solved: true }]));

  it('a new room has nothing done; one answer makes it started; every answer makes it done', () => {
    expect(summariseProgress(room, {}).status).toBe('new');
    expect(summariseProgress(room, { [qs[0]!.id]: { ...emptyQuestionState(), solved: true } }).status).toBe('started');
    const all = summariseProgress(room, solved());
    expect(all.status).toBe('done');
    expect(all.tasksDone).toBe(room.tasks.length);
    expect(all.earned).toBe(all.total);
  });
  it('a hint or a wrong try counts as started, but earns nothing', () => {
    const s = summariseProgress(room, { [qs[0]!.id]: { ...emptyQuestionState(), hintShown: true } });
    expect(s.status).toBe('started');
    expect(s.earned).toBe(0);
  });
  it('a revealed answer completes the task but earns no points', () => {
    const answers: ProgressMap = solved();
    answers[qs[0]!.id] = { ...emptyQuestionState(), revealed: true };
    const s = summariseProgress(room, answers);
    expect(s.status).toBe('done');
    expect(s.earned).toBe(s.total - qs[0]!.points);
  });
  it('survives a save and load round trip', () => {
    const answers: ProgressMap = {
      [qs[0]!.id]: { ...emptyQuestionState(), solved: true, wrong: 2, hintShown: true },
      [qs[1]!.id]: { ...emptyQuestionState(), wrong: 1, wrongOptions: ['b'], lastFeedbackKey: 'x.y' },
    };
    const back = parseProgress(JSON.parse(JSON.stringify(serializeProgress(answers, room))), room);
    expect(back[qs[0]!.id]).toMatchObject({ solved: true, wrong: 2, hintShown: true });
    expect(back[qs[1]!.id]).toMatchObject({ wrong: 1, wrongOptions: ['b'], lastFeedbackKey: 'x.y' });
  });
  it('does not store untouched questions or questions from another room', () => {
    const saved = serializeProgress({ [qs[0]!.id]: emptyQuestionState(), 'not_a_question': { ...emptyQuestionState(), solved: true } }, room);
    expect(saved).toEqual({});
  });
  it('never trusts saved data: junk is dropped and odd values are made safe', () => {
    expect(parseProgress(null, room)).toEqual({});
    expect(parseProgress('hello', room)).toEqual({});
    expect(parseProgress([1, 2], room)).toEqual({});
    const messy = parseProgress(
      { [qs[0]!.id]: { solved: 'yes', wrong: -5, wrongOptions: ['a', 7, null], hintShown: true }, other_room_q: { solved: true }, [qs[1]!.id]: 'oops' },
      room,
    );
    expect(Object.keys(messy)).toEqual([qs[0]!.id]);
    expect(messy[qs[0]!.id]).toMatchObject({ solved: false, wrong: 0, wrongOptions: ['a'], hintShown: true });
  });
  it('each room saves to its own slot', () => {
    expect(progressSlot('lesson_a')).not.toBe(progressSlot('lesson_b'));
  });
});

describe('parseAnswer', () => {
  it('reads plain numbers, rupee signs, commas and percent signs', () => {
    expect(parseAnswer('150')).toBe(150);
    expect(parseAnswer('₹150')).toBe(150);
    expect(parseAnswer(' 150 ')).toBe(150);
    expect(parseAnswer('1,00,000')).toBe(100000);
    expect(parseAnswer('₹2,99,599')).toBe(299599);
    expect(parseAnswer('60%')).toBe(60);
    expect(parseAnswer('60 %')).toBe(60);
    expect(parseAnswer('Rs 150')).toBe(150);
    expect(parseAnswer('Rs. 150')).toBe(150);
  });
  it('reads negatives however they are typed', () => {
    expect(parseAnswer('-50')).toBe(-50);
    expect(parseAnswer('₹-50')).toBe(-50);
    expect(parseAnswer('-₹50')).toBe(-50);
    expect(parseAnswer('−50')).toBe(-50); // typographic minus
    expect(parseAnswer('-20%')).toBe(-20);
  });
  it('reads decimals', () => {
    expect(parseAnswer('12.5')).toBe(12.5);
    expect(parseAnswer('.5')).toBe(0.5);
    expect(parseAnswer('150.')).toBe(150);
  });
  it('rejects things that are not a single number', () => {
    for (const bad of ['', '   ', 'abc', '15 0 0x', '1.2.3', '--5', '5-', 'fifty', '₹', '%']) {
      expect(parseAnswer(bad), `"${bad}"`).toBeNull();
    }
  });
});

describe('checkNumberAnswer', () => {
  it('accepts the right rupee answer in any format', () => {
    for (const typed of ['150', '₹150', '150.0', '150.4']) expect(checkNumberAnswer(typed, 150, 'rupees')).toBe('correct');
  });
  it('percent answers are typed as 60, not 0.6', () => {
    expect(expectedDisplay(0.6, 'percent')).toBeCloseTo(60);
    expect(checkNumberAnswer('60', 0.6, 'percent')).toBe('correct');
    expect(checkNumberAnswer('60%', 0.6, 'percent')).toBe('correct');
    expect(checkNumberAnswer('0.6', 0.6, 'percent')).toBe('wrong');
  });
  it('negative answers work, and the sign matters', () => {
    expect(checkNumberAnswer('-50', -50, 'rupees')).toBe('correct');
    expect(checkNumberAnswer('50', -50, 'rupees')).toBe('wrong');
    expect(checkNumberAnswer('-20', -0.2, 'percent')).toBe('correct');
    expect(checkNumberAnswer('20', -0.2, 'percent')).toBe('wrong');
  });
  it('is wrong outside the tolerance and right inside it', () => {
    expect(checkNumberAnswer('151', 150, 'rupees')).toBe('wrong');
    expect(checkNumberAnswer('150.5', 150, 'rupees')).toBe('correct');
    expect(checkNumberAnswer('152', 150, 'rupees', 2)).toBe('correct');
  });
  it('reports invalid input separately from a wrong answer', () => {
    expect(checkNumberAnswer('banana', 150, 'rupees')).toBe('invalid');
    expect(checkNumberAnswer('', 150, 'rupees')).toBe('invalid');
  });
  it('handles the real room answers (rounding in the lesson, exact in the check)', () => {
    expect(checkNumberAnswer('25', 0.25, 'percent')).toBe('correct'); // 20% fall needs 25%
    expect(checkNumberAnswer('400', 4, 'percent')).toBe('correct'); // 80% fall needs 400%
    expect(checkNumberAnswer('1,00,000', 100000, 'rupees')).toBe('correct');
  });
});
