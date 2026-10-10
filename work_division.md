# PaisaPath — Work Division (5 People)

| Person | Slice | In one line |
|---|---|---|
| **P1** | Front Door, Progress & Facilitator UI | Everything the student touches before and around the game, the shared design system, and the facilitator's screens |
| **P2** | Life Engine, LifePath & Rewind | The simulation engine, the 12-month sequential life (S0–S6), the module runtime, Quick Play, and Rewind & Parallel Lives |
| **P3** | Everyday Money games | Get Banked, Plan & Budget, Save & Manage and Borrowing games, plus four shared interaction verbs |
| **P4** | Investing Arcade | Market simulation, all investing games, and the guardrail components (ranges, assumptions, disclaimer) |
| **P5** | Stay Safe games & Platform | Simulated phone surfaces, all safety games, offline storage, sync, backend, languages and audio |

Each person owns their slice end to end: logic, UI, content (scenario JSON, check questions, strings) and tests. Shared pieces have one owner but are used by everyone.

---

## P1 — Front Door, Progress & Facilitator UI

### Mission
A student gets from a link to playing their character in under 5 minutes, always knows what to do next, and can see what they've learned. A facilitator can set up and run a class from their phone.

### Owns
`src/design/` · `src/onboarding/` · `src/home/` · `src/progress/` · `src/facilitator/`

### Responsibilities

**1. Design system (build first; everyone depends on it)**
- Tailwind design tokens: colour palette with light and dark variants, spacing scale, type scale with a "large text" mode.
- Core components: `Card`, `BigButton`, `Meter` (cash, peace of mind, trust, goal, safety), `CoinStack`, `Dialog`, `BottomSheet`, `ProgressBar`, `AudioButton`, `LockedTile` (with reason text), `Badge`, `Toast`.
- Right-to-left-safe layout utilities (Urdu), tested on every component.
- Icon set: four pillar icons, meter icons, navigation icons.
- A gallery page showing every component and its states, so others can copy usage.

**2. Setup flow**
- Language picker: four large buttons in each language's own script, with audio.
- Accessibility screen: audio narration, larger text, reduce motion, timers off.
- Class code entry with a large keypad, plus QR scanning.
- Avatar picker (12 illustrated avatars) and picture-PIN (choose 4 of 9 pictures).
- "Play without a class" option that creates a local-only profile.

**3. Character builder (10 questions)**
- Question screens driven by a JSON config (question text keys, options, images, audio keys, filters), one question per screen, picture options, "Skip" or "Surprise me" on each.
- The ten questions describe the *character*, never the student's real family or money:
  1. Who do you want to play as? (school student 17 / college student 19 / first-time earner 21)
  2. Where does your character's money come from? (filtered by Q1)
  3. Who does your character live with, and what do they pay for?
  4. What is your character's big goal this year?
  5. How does your character's family keep its savings?
  6. Your character suddenly gets ₹1,000. What do they do first?
  7. How much have *you* done with money tasks so far? (experience level only, no amounts)
  8. What do you want to get better at first?
  9. How do you like to learn?
  10. A short budgeting scenario (baseline knowledge)
- Character naming (suggested local names or typed) and a character card summarising the life, with "Start this life" and "Change something".

**4. Classifier and initial state**
- `classify(answers): Persona` — life stage, circumstance (dependent / part-time earner / family contributor / young entrepreneur / guided saver), money personality (saver / spender / supporter / risk-curious), maturity (starter / builder / navigator) and tags (language, audio, text size, timers, household savings style, focus pillar, content mix).
- `generateInitialState(persona, seed): GameState` — starting cash, monthly income and its regularity, fixed needs, commitments (household share, siblings' costs), goal and goal amount, ±10% seeded variation. Every character starts unbanked so every life begins at Stage S0.
- All starting values in a config file so they can be tuned without code changes.

**5. Pre-check and post-check**
- Two separate pools of 6 scenario questions (1–2 per pillar), never sharing an item.
- Pre-check framed as "let's see where you start", no score shown; sets starting mastery (capped at 0.5).
- Post-check after the year-end review, with a per-pillar growth screen.

**6. Profiles on shared devices**
- Avatar grid → picture-PIN → that student's dashboard.
- Lockout after 3 wrong PINs, "Switch player" button, archiving old profiles.
- Full isolation between profiles in local storage (using P5's storage API).

**7. Home dashboard**
- One screen that fits 360×640 without scrolling: the LifePath card (month, stage, meters, rewind available), Arcade, Quick Play, My Progress, Learn, What-If Lab, Help card.
- Locked tiles show a lock and a one-line audio reason.
- "Recommended" tags from P2's scheduler; "Resume" when an activity was left midway.
- Guided first-visit tour with at most 3 tooltips; sync status badge from P5.

**8. My Progress**
- Mastery rings per pillar made of concept dots (red < 0.4, amber 0.4–0.7, green > 0.7).
- Concept list per pillar with plain-language names.
- "Your weak spots": up to 3 red concepts, each with a Practise button that launches the right activity through P2's runtime.

**9. Badges and certificate**
- Badge unlock animation at the reward step and a badge shelf.
- Badges reward understanding and good process, never simulated money.
- Certificate generated on the device (display name, class, NGO, pillars completed, date), saved as image or PDF, working offline and in all four languages including RTL. Participation version if not all stages are done.

**10. Settings**
- Language, audio narration, auto-play audio, larger text, reduce motion, timers off, interest-free view. Changes apply instantly and are written to the persona tags.

**11. Learn glossary (stretch)**
- Searchable list of 40+ terms (SIP, FD, inflation, UPI, EMI, KYC, NAV…), each with a one-line definition, a 60-second explainer card with audio, and a link to the activity that teaches it. Underlined terms inside scenarios open the card.

**12. Facilitator UI** (P5 builds the API behind it)
- Facilitator login, class list.
- Create class: name, NGO, centre, default language → join code and printable QR; consent checklist reminder.
- Plan screen: the S0–S6 path and Arcade sections; unlock a stage for the class from a date; choose a session focus; generate a session QR for instant offline unlocks.
- Class heatmap: concepts by pillar × red/amber/green counts; "Top 3 misconceptions this week" each with a 10-minute discussion prompt; pre → post gain per pillar; last-sync time per device.
- Stretch: individual student list with stuck flags and PIN reset; printable offline worksheets; CSV/PDF report export; doubts inbox grouped by concept (preset doubt types, no free text).

### Use cases owned
| ID | Name | MVP |
|---|---|---|
| UC-SYS-01 | Install and first launch | ✅ |
| UC-SYS-02 | Build a character (10 questions) | ✅ |
| UC-SYS-03 | Pre-check and post-check | ✅ |
| UC-SYS-04 | Return as a player on a shared device | ✅ |
| UC-SYS-05 | Navigate the home dashboard | ✅ |
| UC-SYS-06 | Mastery map and weak-spot practice | ✅ |
| UC-SYS-07 | Badges and certificate | ✅ |
| UC-SYS-08 | Learn glossary | Stretch |
| UC-SYS-09 | Language, audio and accessibility | ✅ |
| UC-FAC-01 | Create a class and join code | ✅ |
| UC-FAC-02 | Plan sessions and unlock stages | ✅ |
| UC-FAC-03 | Class heatmap and top misconceptions | ✅ |
| UC-FAC-04 | Individual progress and stuck students | Stretch |
| UC-FAC-05 | Print offline worksheets | Stretch |
| UC-FAC-06 | Export a report | Stretch |
| UC-FAC-07 | Answer student doubts | Stretch |

### Provides to others
- Design system components and tokens (everyone).
- `Persona` object and the initial `GameState` (P2).
- The Progress screen as the entry point for weak-spot practice.

### Depends on
- **P2:** `GameState`, mastery values, lock state, "Recommended" flags, the runtime to launch practice.
- **P5:** storage API, i18n hook `t(key)`, audio hook, sync status, facilitator API.

### Content to write
The 10 questions and options, pre/post item pools (12 items), badge list and descriptions, glossary terms, discussion prompts for the top 15 misconceptions, onboarding and dashboard strings.

### Tests
- Unit tests for `classify` and `generateInitialState` over every answer combination.
- Visual checks of every screen at 360×640, with large text, and in Urdu RTL.

### Order of work
1. Design system basics → 2. Setup flow and character builder → 3. Classifier and initial state → 4. Dashboard → 5. Progress and badges → 6. Facilitator create class and heatmap → 7. Pre/post check and certificate → 8. Stretch items.

### Done when
Onboarding works end to end offline; every answer combination produces a valid persona and state; the dashboard and Progress match the engine's state; a facilitator can create a class and see a heatmap built from real synced data.

---

## P2 — Life Engine, LifePath & Rewind

### Mission
One deterministic engine powers every mode. A 12-month life moves in order through stages S0–S6. Students can rewind any key decision and compare lives fairly, under the same luck.

### Owns
`src/engine/` · `src/lifepath/` · `src/rewind/` · `src/runtime/` (module runner + Choose verb) · `src/app/` stores · merging of `src/content/concepts.json`

### Responsibilities

**1. Types and contracts (build first; everyone depends on them)**
- `types.ts`: `GameState` (money, human meters, meta, learn, ledger), `Persona` (agreed with P1), `MiniGame`, `MiniGameContext`, `MiniGameResult`, `EffectMap`, `Snapshot`, `Event`.
- `concepts.json` skeleton with all concept and misconception IDs; P2 merges additions from others.
- A stub `ModuleRunner` so P3, P4 and P5 can mount their games from day one.

**2. Engine reducer**
- `reduce(state, action) → { state, events }`, pure and fully serializable.
- Actions: `START_MONTH`, `APPLY_EFFECTS`, `CHOOSE`, `ALLOCATE`, `COMMIT`, `MINIGAME_RESULT`, `END_MONTH`, `TAKE_DEBT`, `REPAY`, `SET_FLAG`.
- Effect path syntax (`money.savingsJars.emergency: -2000`), `requires` checks that grey out unaffordable options, commitments that deduct every month and "bite" when income drops, a ledger entry with a reason key for every money movement.
- Shortfall handling: when cash goes negative, force a shortfall event (borrow from family, loan app, cut a want).

**3. Seeded randomness and the event tape**
- A small seeded random number generator.
- `buildTape(seed, persona)`: all outside events for 12 months — shocks (cracked screen, medicine, school fee), festivals, scam messages, market regime, whether a friend repays a loan. The tape is what makes rewind fair: the same events arrive in the same months in every timeline.

**4. Stage graph (S0–S6)**
- JSON definitions: S0 Get Banked (month 0), S1 Digital Money (1), S2 First Money & Plan (1–2), S3 Save & Track (3–4), S4 Big Decisions & Borrowing (5–7), S5 Grow Money (8–10), S6 Protect & Look Ahead (11–12).
- Per stage: event pool, gate items, unlock rules, the safety event injected in that stage.
- Gate logic: 2–3 items; fail → practice one level down → retry with new items; after a third fail, unlock with a "Recommended practice" flag.
- Test-out for S0 and S1 (stretch); facilitator overrides that open stages in the Arcade and Quick Play without breaking LifePath order.
- Arcade unlock order: Everyday Money and Stay Safe open from the start; Investing opens after S3.

**5. Scheduler and adaptivity**
- `pickEvents(state, library, tape)`: stage events filtered by persona and `requires`, plus tape events due this month, plus adaptive events; 2–4 events per month, never two of the same pillar in a row; one extra focus-pillar event every other month.
- Adaptivity rules in config, for example: fell for a loan app → debt follow-up next month and Debt Cost Ladder later; collect-request misconception → repeat a variant within 2 months; peace of mind < 30 for two months → a breathing-space event; no emergency fund at S4 → a shock is guaranteed before S5; concept still red after its stage → Daily Challenge item.

**6. Mastery model**
- Update rule `m = m + rate × (target − m)` (0.3 for checks, 0.15 for in-play choices); red/amber/green thresholds.
- Stuck rule: hint with audio after 2 misses, simpler variant after 3.
- Spaced review: green concepts come back as Daily Challenge items after 3, 7 and 14 days.

**7. Module runtime (the 8-step loop)**
- `ModuleRunner` runs every activity through: Hook → Play → Result → Why? → Concept → Try again → Check → Reward.
- Mounts the owner's `MiniGame` in the Play step; renders Why?, Concept, Check and Reward from scenario JSON; short mode (Play, Result, Concept, Check) for Daily Challenge and gate items.
- Autosaves after every step; emits events through P5's `logEvent()`.
- In Arcade and Quick Play mode, game effects never touch the LifePath character; only mastery is shared.

**8. Choose verb**
- 2–4 options with pictures and audio; greyed options with reasons ("₹600 short").

**9. LifePath screens**
- Month intro (calendar page, income arrives, commitments deducted), event sequence, meter animations, month-end statement (income, needs, wants, saved, debt, one line of feedback), stage intro and gate screens.

**10. Branch manager (Rewind)**
- Snapshot before every event marked `checkpoint: true` (6–10 per year).
- Create a branch from a snapshot, keeping the world seed and tape; consequence events depend on that timeline's flags.
- Fast-forward: replay recorded later actions automatically, stopping when an action is no longer possible.
- Branch limit (configurable, default 3); "make this my life"; the original timeline is never overwritten.
- Snapshots stored through P5's storage schema.

**11. Rewind viewer and Parallel Lives**
- Timeline strip with checkpoint icons and labels ("M2 · Bought a phone ₹7,500").
- Side-by-side comparison of 2–3 timelines: cash, bank, jars, debt, investments, goal, peace of mind, trust, safety.
- "What made the difference" card built by rules from the ledger diff (top 3 drivers), a line chart across months, and a trade-off sentence instead of a verdict.

**12. Year-end review and Future Me**
- "Your Year" summary: goal, emergencies handled, scams avoided, debt, where the money went.
- Parallel Lives summary if branches exist.
- Future Me at 25: older avatar shaped by habits (prepared, calm, in debt) with a projected range and P4's Assumptions drawer; never a rich vs poor comparison.
- Hands over to P1's post-check and certificate; "Replay as a different character".

**13. Quick Play and Daily Challenge**
- Scenario map grouped by pillar (24 scenarios + capstone), completion ticks and mastery colours.
- Sandbox character generated from the persona for each scenario; debrief; "take the other branch and compare".
- Daily Challenge (stretch): one due concept, one short item, a streak that never removes progress when missed.

**14. Story content and guards**
- Connective story cards for each month and stage, the capstone, and the static advice-guard card ("We teach how money works, not what to buy").

**15. Class features (stretch)**
- Class leaderboard by concepts mastered (never by money), with an option to hide your name.
- Challenge codes (persona + seed + scenario) shown as a QR, so a classmate can play the same life with the same luck.

### Use cases owned
| ID | Name | MVP |
|---|---|---|
| UC-LIFE-01 | Play a LifePath month | ✅ |
| UC-LIFE-02 | Pass a stage gate | ✅ |
| UC-LIFE-03 | Test out of a stage | Stretch |
| UC-LIFE-04 | Rewind to a key decision | ✅ |
| UC-LIFE-05 | Compare timelines and Parallel Lives | ✅ |
| UC-LIFE-06 | Year-end review and Future Me | ✅ |
| UC-LIFE-07 | Play a Quick Play scenario | ✅ |
| UC-LIFE-08 | Daily Challenge | Stretch |
| UC-LIFE-09 | Resume after an interruption | ✅ |
| UC-LIFE-10 | Ask for investment advice (guard) | ✅ |
| UC-CLASS-01 | Class mastery leaderboard | Stretch |
| UC-CLASS-02 | Challenge a classmate on the same life | Stretch |

### Provides to others
Types, the `MiniGame` contract, `ModuleRunner`, Choose verb, engine store, concept list, scheduler hooks for injecting single events (e.g. P5's scam messages).

### Depends on
- **P1:** `Persona` and initial state; design system.
- **P5:** storage, outbox `logEvent()`, i18n.
- **P3, P4, P5:** the mini-games mounted in each stage.
- **P4:** range display and Assumptions drawer for Future Me.

### Content to write
Stage definitions and gate items, month and stage story cards, the capstone, adaptivity rules, comparison explanation templates, advice-guard card.

### Tests
- Determinism: same seed + same choices → identical serialized state (property-based tests over random choice sequences).
- Branch fairness: tape events occur in the same months in every timeline; the original timeline is unchanged after branching.
- Resume: killing the app at every module step and reopening loses at most the current tap.

### Order of work
1. Types, concept list, stub runner → 2. Reducer and RNG/tape → 3. Module runtime and Choose → 4. LifePath screens with stub games → 5. Stage graph, gates and scheduler → 6. Mastery model → 7. Branch manager and comparison → 8. Year-end review → 9. Quick Play → 10. Stretch items.

### Done when
A full 12-month life plays end to end (stub games at first, real ones as they land); same seed and choices always give the same state; branches keep the same luck; resume works from any step.

---

## P3 — Everyday Money games

### Mission
Take the character from unbanked to budgeting, saving and borrowing wisely, and build the four interaction verbs most other games reuse.

### Owns
`src/games/everyday/` · verbs `Allocate`, `Commit`, `Triage`, `Rank` in `src/runtime/verbs/` · `src/content/scenarios/bank/`, `plan/`, `save/`, `borrow/`

### Responsibilities

**1. Verb components (build early; P4 and P5 use them)**
- **Triage:** swipe cards left/right with tap and keyboard fallbacks; context re-sort support; summary of disagreements.
- **Allocate:** drag coin stacks into jars, with a slider mode; live overflow check when bills exceed a jar; L1 uses ₹50 coins, L3 shows percentages and custom jars.
- **Commit:** amount + duration picker that creates a recurring engine commitment (savings, EMI, SIP).
- **Rank:** drag to order a list; shows the ₹ cost of the student's order vs the best order.
- Each returns choices in the `MiniGameResult` format; each documented with an example scenario.

**2. Get Banked (Stage S0)**
- **Document Hunt:** a room scene with tappable items (Aadhaar, PAN, photo, school ID, a sibling's ID, an electricity bill, a cinema ticket, guardian's ID); drag into a bank folder; wrong items bounce back with a reason; guardian ID required for under-18 characters; branch for a missing document.
- **Bank Counter:** a generic counter (no real bank branding) with a clerk character; three account cards (savings, zero-balance basic, minor account with guardian); a simplified illustrated form with nominee explanation; a welcome kit (passbook, debit card, PIN envelope); PIN setting where a passer-by appears to teach covering the keypad; sets `hasBankAccount`; then hands a fake "KYC incomplete" SMS to P5's Scam Inbox component.

**3. Plan & Budget games**
- **Swipe Sort (needs vs wants):** 30+ persona-specific cards; some return with context ("…and your classes are online"); explanations for disagreements, no hard "wrong" on ambiguous items.
- **Jar Split:** income arrives as coins scaled to the character; Needs / Wants / Future (later Emergency) jars; known bills attached to Needs; overflow warning; month-end statement of what leaked and what survived; special feedback for family contributors whose needs take ~80%.
- **Goal Builder:** predict months to reach the goal, slider for the monthly amount, timeline animation, make the goal specific, saved as a commitment that becomes the 🎯 meter.
- Stretch: **Phone vs Coaching** (opportunity cost, e.g. a ₹1,200 trip = 2.4 months of goal), **Good Month, Lean Month** (irregular income buffer), **Family Market Trip** (unit prices at two shops), **Festival and Peer Pressure** (including what the character says to friends).

**4. Save & Manage games**
- **Spending Detective:** a UPI-style history built from the character's own ledger plus tape items; tag transactions by category; pie chart; convert one leak to a year ("chai = ₹5,280/year"); rank leaks and pick one to cut; 6-month projection. All data simulated.
- **Surprise Month:** a tape shock (screen ₹2,000, medicine ₹1,500, school trip, bike repair); calm path with a buffer and the *Emergency Ready* badge, or options without one (family, loan app hand-off, skip a need, sell something); set an emergency target and add the Emergency jar.
- Stretch: **Pay Yourself First** (two versions of the character side by side), **Where to Keep Your Money** (cash, bank, deposits, post office, committee rated on safety, access, growth; interest-free options first when that view is on), **A Friend Needs ₹2,000** (lending and trust), **The 70%-Off Sale** (impulse vs intent, 48-hour rule), **Insurance Pool** (20 characters sharing risk).

**5. Borrowing games**
- **Debt Cost Ladder:** need ₹2,000 for 3 months; family, moneylender, loan app, buy-now-pay-later; rank by cost; ladder animation of total repaid; missed-payment follow-up for the chosen option.
- Stretch: **Bike: EMI vs Save-and-Buy** (true cost of credit, the credit score as a "trust meter"), **Education Choice** (coaching, college, ITI, job; scholarships vs education loan; shapes later events).

**6. What-If Lab: goal and EMI calculators (stretch)**
- Pre-filled with the character's numbers, freely editable, nothing stored, assumptions always shown.

### Use cases owned
| ID | Name | MVP |
|---|---|---|
| UC-BANK-01 | Document Hunt | ✅ |
| UC-BANK-02 | Bank Counter: open an account | ✅ |
| UC-PB-01 | Needs vs Wants Swipe Sort | ✅ |
| UC-PB-02 | Jar Split | ✅ |
| UC-PB-03 | Goal Builder | ✅ |
| UC-PB-04 | Phone vs Coaching | Stretch |
| UC-PB-05 | Good Month, Lean Month | Stretch |
| UC-PB-06 | Family Market Trip | Stretch |
| UC-PB-07 | Festival and Peer Pressure | Stretch |
| UC-SM-01 | Pay Yourself First | Stretch |
| UC-SM-02 | Spending Detective | ✅ |
| UC-SM-03 | Surprise Month | ✅ |
| UC-SM-04 | Where to Keep Your Money | Stretch |
| UC-SM-05 | A Friend Needs ₹2,000 | Stretch |
| UC-SM-06 | The 70%-Off Sale | Stretch |
| UC-SM-07 | Insurance Pool | Stretch |
| UC-BR-01 | Debt Cost Ladder | ✅ |
| UC-BR-02 | Bike: EMI vs Save-and-Buy | Stretch |
| UC-BR-03 | Education Choice | Stretch |
| UC-TK-01 | What-If Lab: goal and EMI | Stretch |

### Provides to others
The four verb components; the `hasBankAccount` flag; the transaction-list component (reused by P5's UPI history).

### Depends on
- **P2:** runtime, Choose verb, types, engine actions.
- **P1:** design system.
- **P4:** Predict verb (Goal Builder, Pay Yourself First, sale, insurance).
- **P5:** Scam Inbox single-message component (KYC SMS after account opening), i18n.

### Content to write
Scenario JSON for every use case above; 2–3 check items per use case; gate items for S0, S2, S3 and S4; 30+ needs/wants cards; shock events for the tape; festival and place variables.

### Tests
- Verb components return correct result shapes; Allocate never allows money to appear or disappear.
- Each game runs at L1 and L2 inside the module runner.

### Order of work
1. Triage and Allocate → 2. Document Hunt and Bank Counter → 3. Swipe Sort, Jar Split, Goal Builder → 4. Commit and Rank → 5. Spending Detective, Surprise Month → 6. Debt Cost Ladder → 7. Stretch games by stage order.

### Done when
S0, S2 and S3 play end to end inside LifePath with real games; all 8 MVP use cases work at L1 and L2; the four verbs are documented and used by at least one other person's game.

---

## P4 — Investing Arcade

### Mission
Make risk, time, compounding and diversification something students feel, through simulations that are honest about uncertainty and never recommend anything.

### Owns
`src/games/investing/` · `Predict` verb · guardrail components (`AssumptionsDrawer`, `RangeDisplay`, `FanChart`, `SimBanner`) · `src/content/scenarios/invest/` · `src/content/assumptions.json`

### Responsibilities

**1. Guardrail components (build early; P2 and P3 use them)**
- `assumptions.json`: growth rates, volatility, inflation and fees for every fictional asset.
- `AssumptionsDrawer` that shows the assumptions behind any projection.
- `RangeDisplay` ("between ₹X and ₹Y in most futures") and `FanChart` (shaded band + median line, Recharts).
- `SimBanner`: "Simulation based on assumptions. Not a prediction or advice." on every investing screen.

**2. Predict verb**
- Slider or option guess before a reveal; a guess-vs-reality chart where the gap is the lesson.

**3. Market simulation engine**
- Seeded return generator per fictional asset class: Steady Box, Mixed Basket, Bumpy Ride, sector mini-businesses, fictional companies, fictional funds, gold, property.
- Shocks and news events read from P2's tape.
- Monte Carlo runner for 500 futures in a Web Worker (or pre-computed), under 1 second on a low-end phone.
- Pure functions with unit tests; P2 uses it for Future Me ranges.

**4. Stage S5 games (inside LifePath)**
- **Chai Price Time Travel:** chai from ₹5 to ₹20 over time; predict the price in 10 years; range reveal; ₹1,000 in a box buys fewer and fewer cups.
- **Compounding Garden / ₹500 a month for 10 years:** simple vs compound gardens side by side; predict first; fast-forward 5/10/20 years; start at 18 vs 28; L1 visual, L2 numbers, L3 Rule of 72.
- **Time Machine:** choose a goal and deadline, choose a mix of three paths, run 500 futures, fan chart, insight that money needed soon should take less risk.
- Stretch: **Risk & Return Ride** (5 years month by month, a 25% drop and a sell / wait / add-more choice), **Basket Builder** (6 fictional mini-businesses hit by sector events; all-in-one vs spread).

**5. Arcade: Stock Market Simulator**
- 6 fictional companies (logo, one-line business, price chart), virtual ₹10,000, 12 rounds.
- Each round: a news card → prices move → buy, sell or hold; portfolio panel with gain or loss.
- Behavioural moments: a social-media rumour (FOMO) and a sharp drop (panic).
- Small fee per trade; debrief on what moved prices, diversification, trading frequency and its cost, compared with "buy a spread and hold".
- Navigator mode (stretch): an order book with bid and ask prices and limit orders.

**6. Arcade: Mutual Fund Challenge**
- Pool animation (many small amounts into one fund holding many companies); NAV as the price of one unit.
- Three fictional funds (low-cost index-style, higher-cost active, sector).
- Lump sum vs hypothetical monthly SIP; 10 simulated years with dips; rupee cost averaging shown as more units bought when prices are low.
- Fee comparison over time; ranges and Assumptions drawer; never a "best fund".

**7. Arcade stretch games**
- **Where to Park ₹10,000** (Arcade hub): split across cash, a deposit, a fund, gold and a property share; 5 years of events; links to each deeper game.
- **Property Deal Simulator:** three fictional properties; uncover hidden costs (down payment, registration and stamp duty, brokerage, EMI and interest, maintenance, repairs, tax); rent, vacancies and repairs over the years; a sudden cash need tests liquidity; compare with renting and investing the difference.
- **Gold & Asset Challenge:** jewellery vs coins vs a generic "digital or paper gold" category; making charges and purity; resale deductions; comparison with a deposit and a fund under the same events.
- **Trading Pit** (classroom multiplayer, with P5 for local networking): the facilitator's device hosts a market for 2–3 fictional assets with a hidden true value; students post buy/sell prices in rounds; reveal and discussion. Bots for single-player.
- **What-If Lab compounding calculator:** growth curve with range, inflation toggle, Assumptions drawer, nothing stored.

**8. Arcade shell**
- Investing section page with game tiles, lock state (opens after S3 or facilitator override) and "Recommended" tags.

### Use cases owned
| ID | Name | MVP |
|---|---|---|
| UC-INV-01 | Chai Price Time Travel | ✅ |
| UC-INV-02 | Compounding Garden / ₹500 for 10 years | ✅ |
| UC-INV-03 | Risk & Return Ride | Stretch |
| UC-INV-04 | Time Machine (500 futures) | ✅ |
| UC-INV-05 | Basket Builder | Stretch |
| UC-INV-06 | Where to Park ₹10,000 | Stretch |
| UC-INV-07 | Stock Market Simulator | ✅ |
| UC-INV-08 | Mutual Fund Challenge | ✅ |
| UC-INV-09 | Property Deal Simulator | Stretch |
| UC-INV-10 | Gold & Asset Challenge | Stretch |
| UC-INV-11 | Trading Pit | Stretch |
| UC-TK-02 | What-If Lab: compounding | Stretch |

### Provides to others
Guardrail components, Predict verb, market simulation engine.

### Depends on
- **P2:** runtime, types, tape events.
- **P3:** Allocate and Commit verbs.
- **P1:** design system.
- **P5:** local networking for Trading Pit (stretch), i18n.

### Content to write
Fictional company and fund names and descriptions, news cards, property and gold cost cards, check items, S5 gate items, the content of `assumptions.json`.

### Tests
- Market engine: seeded runs are identical; distributions match the configured assumptions.
- Performance: 500 futures under 1 second on a throttled low-end profile.
- Word-list test over all content files: no real company, fund, bank, app or brand names.

### Order of work
1. Guardrail components and Predict → 2. Market engine → 3. Chai Price and Compounding Garden → 4. Time Machine → 5. Stock Market Simulator → 6. Mutual Fund Challenge → 7. Arcade shell → 8. Stretch games.

### Done when
S5 plays inside LifePath; the Stock Market and Mutual Fund games are complete; every investing screen shows the banner, ranges and the Assumptions drawer; the word-list test passes.

---

## P5 — Stay Safe games & Platform

### Mission
Students get scammed safely and learn the patterns behind scams. The whole app installs from a link, runs offline, syncs when it can, and works in four languages.

### Owns
`src/games/safe/` · `Judge` and `ActInSitu` verbs and simulated phone surfaces · `src/platform/` · `tools/authoring/` · `supabase/` · i18n pipeline and `src/content/i18n/` · `src/content/scenarios/safe/`

### Part A — Stay Safe

**1. Simulated phone surfaces (generic designs, no real branding)**
- UPI-style app: link account, set PIN, pay by QR, collect request, transaction history (reusing P3's list component).
- SMS list, chat thread, email view, incoming call screen with audio, app permission dialogs.
- Optional timer overlay that respects "timers off".

**2. Verbs**
- **Judge:** legit / suspicious / scam with tappable "tells" revealed on the artefact.
- **Act in-situ:** actions inside a surface that move simulated money, then a post-mortem with highlighted tells and a slow-motion replay.

**3. MVP games**
- **UPI Simulator (S1):** pay ₹50 by QR; then "RAHUL K. is requesting ₹1,200" for a cricket bat sale, with a 15-second timer; paying lowers the balance and triggers the four-tells post-mortem; rule card "You never need a PIN to receive money"; also QR "scan to receive" and how refunds really work.
- **Scam Inbox:** a day of messages (fake KYC link, lottery with processing fee, like-videos job, "Mom, new number", plus a genuine school message); Block & report / Ignore / Open / Ask a trusted adult; safe "what would have happened" sequences; scoring for correct responses, false alarms and time. Also a single-message mode the scheduler injects into every LifePath stage.
- **Rescue Mission (S6):** the character's friend lost ₹2,000 to a fake job site; order the steps (call 1930, inform the bank, report at cybercrime.gov.in, save evidence, tell a trusted adult, warn others); faster correct order gives a better recovery chance; result saved as the static Help card on the dashboard.

**4. Stretch games**
- **Identity Vault:** sort OTP, PINs, password, Aadhaar photo, PAN, account number, name, school, ID selfie into never / carefully / OK to share; phone privacy cards.
- **Red Flag Hunter:** tap suspicious parts of a message; reveal categories (urgency, too good to be true, asks for secrets, pretends to be someone, secrecy).
- **The Call:** audio call escalating from friendly to threatening, including a fake "digital arrest"; correct path is refuse, hang up, call the official number, tell an adult.
- **Loan App Trap:** "instant loan" ad, permission requests, huge fees, harassment of contacts; debrief on permissions, registered lenders and reporting; sets `fellForLoanApp`.
- **The Telegram Group and Celebrity Says Double It:** fake profit screenshots, a VIP fee, a pump-and-dump on a fictional stock, a labelled deepfake-style endorsement.
- **The Pyramid:** predict, then watch a Ponzi scheme pay early members with later members' money until it collapses.
- **Investing, Gambling or Scam?:** sort guaranteed returns, paid tips, long-term investing, betting apps and a hyped coin; regulated vs red-flag signs, no product names.

**Tone rule:** never blame the victim. No game asks about the student's real experiences.

### Part B — Platform

**5. Project setup (build first)**
- Vite + React + TypeScript + Tailwind; linting, formatting, Vitest; CI that runs tests and the content validator on every pull request.

**6. PWA and installation**
- `vite-plugin-pwa` (Workbox): precached app shell under 3 MB, content packs cached per language, install prompt, safe update handling.

**7. Local storage**
- Dexie schema: `profiles`, `saves`, `snapshots`, `outbox`, `settings`, `contentMeta`.
- Per-profile isolation, storage-quota checks, a simple storage API for others.

**8. Sync**
- `logEvent()` outbox API used by everyone; events follow a fixed schema (pseudonymous player ID, class, activity, concept, choice, correct, misconception, level, stage, timeline, timestamp; no names or free text).
- Batches of up to 200 with idempotent IDs, retry with backoff, compaction into daily summaries when storage is low.
- Pull of class unlocks and content versions in the same sync; sync status indicator for P1's dashboard.
- Stretch: offline transfer from student devices to the facilitator's device (QR export or local hotspot).

**9. Backend**
- Supabase tables: `ngos`, `classes`, `facilitators`, `players` (ID, class, display name only), `events`, `class_concept_daily`, `unlocks`, `doubts`.
- Row-level security so facilitators see only their own classes; facilitator-only login.
- Edge function to aggregate events into the heatmap data; API endpoints for P1's facilitator screens (create class, unlocks, heatmap, misconceptions, student list, export).

**10. Languages**
- String loader `t(key)` with fallbacks, plural rules, ₹ formatting with Indian digit grouping.
- RTL switching for Urdu.
- String extraction from scenario JSON; translation spreadsheet round-trip; English and Telugu complete, Hindi and Urdu for at least S0–S2.
- Language pack download on demand.

**11. Audio**
- One audio file per string key, lazy-loaded; fallback to device text-to-speech where available; audio pack per language.

**12. Content validator and authoring pipeline**
- JSON schema for scenarios; validator checks concept IDs, verbs, effect paths and that every string key exists in every language (MVP).
- Spreadsheet → JSON converter and a preview route for teachers (stretch); optional AI drafting helper used only at authoring time.

**13. Privacy and consent**
- Enforce the event schema (reject free text); facilitator consent checklist text; no device identifiers.

### Use cases owned
| ID | Name | MVP |
|---|---|---|
| UC-SAFE-01 | UPI Simulator: pay vs collect | ✅ |
| UC-SAFE-02 | Identity Vault | Stretch |
| UC-SAFE-03 | Scam Inbox | ✅ |
| UC-SAFE-04 | Red Flag Hunter | Stretch |
| UC-SAFE-05 | The Call | Stretch |
| UC-SAFE-06 | Loan App Trap | Stretch |
| UC-SAFE-07 | The Telegram Group and Celebrity Says Double It | Stretch |
| UC-SAFE-08 | The Pyramid | Stretch |
| UC-SAFE-09 | Investing, Gambling or Scam? | Stretch |
| UC-SAFE-10 | Rescue Mission | ✅ |
| UC-PLAT-01 | Play offline and sync later | ✅ |
| UC-PLAT-02 | Content pack update | Stretch |
| UC-PLAT-03 | Author a new scenario | Stretch |
| UC-PLAT-04 | Download another language | ✅ |
| Backend for UC-FAC-01 to 07 | Facilitator API | ✅ for 01–03 |

### Provides to others
Project scaffold and CI, storage API, `logEvent()`, `t(key)` and audio hooks, facilitator API, phone surface components, Scam Inbox single-message component, local networking for Trading Pit (stretch).

### Depends on
- **P2:** runtime, types, scheduler hook for injecting messages.
- **P1:** design system; facilitator screens that call the API.
- **P3:** transaction-list component, Rank and Triage verbs.

### Content to write
40+ scam and genuine messages with red-flag annotations, call scripts and audio, check items, S1 and S6 gate items, Help card text, translation of all strings into Telugu (and Hindi/Urdu for S0–S2).

### Tests
- End-to-end in airplane mode: play, reconnect, the facilitator heatmap updates within a minute.
- Validator passes on all content in all languages.
- Row-level security: a facilitator can't read another class.
- Every safety game in Urdu RTL and with timers off.

### Order of work
1. Scaffold, CI, Dexie schema, `logEvent()` and `t(key)` stubs → 2. Phone surfaces and Act in-situ → 3. UPI Simulator → 4. Scam Inbox (full and single-message mode) → 5. PWA offline and sync → 6. Backend and facilitator API → 7. Rescue Mission and Judge → 8. Telugu translation and audio → 9. Validator → 10. Stretch games and pipeline.

### Done when
The app installs from a link and runs fully in airplane mode; events sync and appear in the facilitator heatmap; English and Telugu are complete with Urdu RTL working on core screens; UPI Simulator, Scam Inbox and Rescue Mission are complete.

---

## Shared rules for all five

- **Contracts first:** P2's types and runner, P1's design tokens, P5's scaffold and storage/outbox/i18n stubs, P3's Allocate and Triage stubs and P4's guardrail stubs are delivered before any feature work, so everyone can build against mock data.
- **Changes to shared pieces** (`types.ts`, `concepts.json`, verbs, design system) need a review from that piece's owner.
- **Simulated only:** no feature may ask for, store or analyse a student's real money, family finances or real messages.
- **Guardrail:** no real fund, stock, bank, app or brand names; every projection shows a range and its assumptions.
- **Definition of done for any use case:** plays inside the module runner, emits correct events, works offline, all strings keyed for translation, 2–3 check items, at least one unit test for its logic.
- **If a slice falls behind,** its stretch items are the first to move to the "designed, shown in slides" list.
