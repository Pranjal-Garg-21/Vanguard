/** LifePath stages and Arcade sections. Shared by the student dashboard and the facilitator Plan tab. */
export const STAGES = [
  { id: 'S0', name: 'Get Banked', blurb: 'Open an account and keep your documents safe.' },
  { id: 'S1', name: 'Digital Money', blurb: 'Pay with UPI and spot fake requests.' },
  { id: 'S2', name: 'First Money & Plan', blurb: 'Split your first income into jars.' },
  { id: 'S3', name: 'Save & Track', blurb: 'Find where your money leaks.' },
  { id: 'S4', name: 'Big Decisions & Borrowing', blurb: 'Compare loans and the real cost of debt.' },
  { id: 'S5', name: 'Grow Money', blurb: 'Interest, risk and time, with fictional assets.' },
  { id: 'S6', name: 'Protect & Look Ahead', blurb: 'Insurance, scams and long-term plans.' },
] as const;

export const ARCADE_SECTIONS = [
  { id: 'arcade.everyday', name: 'Everyday Money', blurb: 'Needs vs wants, jars, goals and surprise months.', level: 'Easy' },
  { id: 'arcade.safe', name: 'Stay Safe', blurb: 'Spot scams, protect your identity and your accounts.', level: 'Medium' },
  { id: 'arcade.investing', name: 'Investing', blurb: 'Risk, return and diversification with fictional assets.', level: 'Hard' },
] as const;
