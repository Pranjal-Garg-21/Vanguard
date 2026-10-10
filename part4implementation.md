# Part 4 Implementation — Investing, Design Kit & Investment Scams

> Owner: **P4**. Branch: `part4`. Sources: `Implementation.md` (§6, §8, §10, §11.4, §12.7, §13.5, §15) and the rebalanced `work_division.md`.
> Where those two disagree, **`work_division.md` wins** (it is newer). Differences are listed in §1.3.

---

## Build status (updated as work lands)

**Where things live now.** P5's scaffold landed, so everything is under `frontend/src/`. The folder names in §7 below are the *original* plan; use this table instead.

| Piece | Location | State |
|---|---|---|
| Assumptions config | `content/assumptions.json`, `core/market/assumptions.ts` | Done |
| Financial math library | `core/market/finance/` | Done, tested |
| Seeded RNG, market engine, 500-futures runner | `core/market/` | Done, tested (20 years × 500 futures ≈ 30 ms) |
| Lesson format, calculator, validator | `games/investing/lessons/logic/` | Done, tested |
| Lesson content (lessons 1–2) | `content/scenarios/invest/{lessons,checks,glossary}/`, `content/i18n/en/invest_*.json` | Lessons 1–2 done; 3–6 next |
| Predict verb | `runtime/verbs/predict/` | Done (slider version; options version comes with lesson 4) |
| `SimBanner` | `ui/SimBanner.tsx` | Done |
| Investing ABC screens | `games/investing/lessons/` (routes `/learn/invest`, `/learn/invest/:lessonId`) | Done, viewed in browser |
| Explore widgets | `games/investing/lessons/widgets/` | `fall_rise`, `simple_vs_compound` done |
| Design kit, `RangeDisplay`, `FanChart`, `AssumptionsDrawer` | `ui/` | Not started |
| Games (Chai Price, Garden, Time Machine, Stock Market, Mutual Fund, Invest-or-Scam) | `games/investing/<game>/` | Not started |

**Lesson format additions (since §13).** Blocks can now be `explore` (a hands-on widget), `steps` (a worked example revealed one line per tap); any block can carry a `visual`; a wrong option that exposes a misconception must carry a `feedbackKey` (names the specific mistake first). The validator enforces: every lesson has an explore block, every analogy has a picture, cards are 45 words or fewer, sentences 22 words or fewer, definitions 15 words or fewer. Strings live one file per lesson: `invest_<lesson>.json`, used as `t('invest_<lesson>.<key>')`.

**To see it:** `cd frontend && npm install && npm run dev`, then open `http://localhost:5173/learn/invest` (also linked from `/dev`).

---

## Contents

1. [Scope, status and what changed](#1-scope-status-and-what-changed)
2. [What I can build now vs what is blocked](#2-what-i-can-build-now-vs-what-is-blocked)
3. [Educational design: the Investing Learning Spine](#3-educational-design-the-investing-learning-spine)
4. [Curriculum: what every student must understand](#4-curriculum-what-every-student-must-understand)
5. [Concept IDs to add to `concepts.json`](#5-concept-ids-to-add-to-conceptsjson)
6. [Where each topic is taught (journey map)](#6-where-each-topic-is-taught-journey-map)
7. [Folder layout](#7-folder-layout)
8. [Financial math library](#8-financial-math-library)
9. [Assumptions config](#9-assumptions-config)
10. [Market simulation engine](#10-market-simulation-engine)
11. [Guardrail components and the Predict verb](#11-guardrail-components-and-the-predict-verb)
12. [Design kit](#12-design-kit)
13. [Lesson system (Investing ABC)](#13-lesson-system-investing-abc)
14. [Games](#14-games)
15. [Content authoring rules and schemas](#15-content-authoring-rules-and-schemas)
16. [Languages, audio, accessibility](#16-languages-audio-accessibility)
17. [Testing](#17-testing)
18. [Build order and effort](#18-build-order-and-effort)
19. [Decisions for me to make](#19-decisions-for-me-to-make)
20. [Dependencies, handoffs and risks](#20-dependencies-handoffs-and-risks)

---

## 1. Scope, status and what changed

### 1.1 What P4 owns

| Area | Deliverable |
|---|---|
| Design kit | `src/design/`: tokens, 11 core components, RTL utilities, icons, gallery page |
| Guardrails | `assumptions.json`, `AssumptionsDrawer`, `RangeDisplay`, `FanChart`, `SimBanner` |
| Verb | `Predict` |
| Engine | Financial math library, seeded market engine, Monte Carlo runner |
| Teaching layer | **Investing ABC**: 14 short lessons plus a glossary feed (new, see §3, §4, §13) |
| LifePath S5 | Chai Price Time Travel, Compounding Garden, Time Machine, plus S5 events and gate items |
| Arcade | Stock Market Simulator, Mutual Fund Challenge, Investing section shell |
| Safety | Investing, Gambling or Scam? sort (UC-SAFE-09) |
| Stretch | Risk & Return Ride, Basket Builder, Where to Park ₹10,000, Property Deal, Gold & Asset, order-book mode, Trading Pit, compounding calculator, Telegram/Celebrity (UC-SAFE-07), Pyramid (UC-SAFE-08) |

### 1.2 Use cases

MVP: UC-INV-01, 02, 04, 07, 08 and UC-SAFE-09.
Stretch: UC-INV-03, 05, 06, 09, 10, 11, UC-TK-02, UC-SAFE-07, UC-SAFE-08.

### 1.3 Differences between the two source documents

| Topic | `Implementation.md` | `work_division.md` (used here) |
|---|---|---|
| Design system | P1 | **P4** (`src/design/`) |
| UC-SAFE-09 Investing, Gambling or Scam? | P5 | **P4** |
| UC-SAFE-07 / 08 (Telegram, Pyramid) | P5 | **P4** stretch |
| Rescue Mission | P5 | P3 (not mine) |
| Learn glossary | P1 | P3 stretch (I only **feed it** investing terms) |
| Future Me | P2 | **P1** (consumes my market engine) |

### 1.4 What is missing from the source documents (this is the main gap I am filling)

The plans list *games*, but the investing topic list I was asked to cover is wider than the games. These topics have **no concept ID and no teaching home** today:

- Bonds and the idea of lending to a company or government
- ETFs (and how they differ from mutual funds)
- Profit, loss and return as a percentage (the plans only imply it)
- Commodities and the commodity exchange (gold is covered only as a game, UC-INV-10)
- Simple interest as a separate formula (only `interest_basics` exists, under S3)
- Real vs nominal return (inflation is taught, but not "your return minus inflation")
- Dividends vs price gain (the two ways a share pays you)
- What an exchange is and how a price is formed
- Debt from the *lender's* side (every bond and deposit is a loan you give)

§4 teaches all of them, §5 proposes the IDs, §13 gives them a home.

---

## 2. What I can build now vs what is blocked

The repo currently has only planning documents. Nothing is scaffolded yet (P5 owns the scaffold).

### 2.1 Can start immediately (no dependency on anyone)

| # | Item | Why it is independent |
|---|---|---|
| 1 | `assumptions.json` and its TypeScript types | Pure data |
| 2 | Financial math library (§8) | Pure functions |
| 3 | Seeded RNG (local, swappable) and market engine (§10) | Pure functions |
| 4 | Monte Carlo runner, fan-chart data builder | Pure functions |
| 5 | Word-list test (no real brand names) and its fixtures | Reads JSON/text only |
| 6 | All teaching content: lessons, glossary entries, check items, news cards, company and fund cards (§15) | Pure content |
| 7 | Local stand-in types for the shared contract (§2.3) | Needed to compile |
| 8 | Component specs and the visual token list | Design, no code |

### 2.2 Can start once a bare Vite + React + Tailwind project exists

Design kit components, `SimBanner`, `RangeDisplay`, `AssumptionsDrawer`, `FanChart` (Recharts), `Predict` UI, and the lesson player. These need only the toolchain, not another person's code. See decision D1 (§19).

### 2.3 Blocked until another owner delivers

| Need | From | Workaround meanwhile |
|---|---|---|
| `GameState`, `Persona`, `MiniGame`, `MiniGameContext`, `MiniGameResult`, `EffectMap` | P2 `types.ts` | Mirror the shapes from `Implementation.md` §6.4 in `src/games/investing/contracts.ts`; delete the file when P2's lands |
| `ModuleRunner` (8-step loop), Choose verb | P2 | Games expose `play(ctx)` and are mounted by a throwaway dev harness |
| Tape events (shocks, market regime) | P2 `buildTape` | Market engine accepts a `ShockSchedule` argument; harness passes a fixed one |
| Shared seeded RNG | P2 | Local `mulberry32` behind an `Rng` interface with the same call shape |
| `Allocate` and `Commit` verbs | P3 | Local minimal slider/stack stubs behind the agreed props |
| `t(key)`, audio hook, `logEvent()`, storage | P3 / P5 | No-op stubs with the final signatures |
| Mastery model | P1 | Games return `conceptDeltas`; they never write mastery themselves |
| Scheduler hook for S5 events | P2 | Events shipped as JSON; registration happens at integration |

### 2.3.1 Rule for stubs

Every stub lives in one folder, `src/games/investing/_stubs/`, so removing them at integration is one delete. No game imports a stub directly; each imports through `src/games/investing/deps.ts`, which re-exports either the stub or the real module.

---

## 3. Educational design: the Investing Learning Spine

The audience is roughly **17–18 years old**, many with no prior exposure, studying on low-end phones, often in a second language. The goal is not that they can recite definitions. It is that they can **explain a term in their own words, do the arithmetic, and spot a bad claim.**

### 3.1 Principles

1. **Concrete before abstract.** Every idea starts with a rupee example from the character's world (chai stall, kirana loan, a cousin's shop, a chit/committee), never a formula first.
2. **Predict, then reveal.** Before showing a result, the student guesses. The gap between guess and reality is the lesson (the Predict verb).
3. **One idea per card.** Each card is readable in under 20 seconds and has audio.
4. **Three depth levels, same content skeleton.**
   - **L1 Feel it:** pictures and stories, no formulas, round numbers.
   - **L2 Count it:** real numbers, a worked example, the student does one calculation.
   - **L3 Prove it:** the formula, Rule of 72, edge cases, "what could go wrong".
5. **Teach the trade-off, never the answer.** No lesson says what to buy. Every comparison ends with "it depends on: time, need for cash, how much risk you can stomach."
6. **Honest about uncertainty.** Ranges, not single numbers. Past examples are fictional. Losses are shown as real possibilities, including permanent ones (a company can fail).
7. **Name the misconception.** Each lesson lists the wrong belief it targets (`guaranteed_returns_exist`, `dip_means_loss`, …) and includes a "Why?" step that detects it.
8. **Vocabulary is earned.** A term appears first in a story, then gets a plain definition, then is used consistently. Underlined terms open a 60-second card.
9. **Never blame, never lecture.** Mistakes happen to the character, not the student.
10. **Spaced return.** A concept that turns green comes back through P1's review queue.

### 3.2 The lesson card (fixed structure, used by all 14 lessons)

| Block | Purpose | Example (Bonds) |
|---|---|---|
| **Hook** (1 line) | Curiosity | "Ravi's uncle lends ₹10,000 to the sweet shop. What does he get back?" |
| **Plain definition** | The term, in simple words | "A bond is a loan you give to a company or government. They promise interest and your money back on a date." |
| **Everyday analogy** | Local, familiar | A neighbour borrowing for a wedding and paying back with a thank-you |
| **Worked example** | Real ₹ numbers | ₹10,000 at 7% for 3 years: ₹700 a year, ₹10,000 back at the end |
| **Predict step** | Guess before reveal | "If the shop closes, what happens to the bond?" |
| **Trade-off** | What you give up | Steadier income, but the lender can fail; money locked until the date |
| **Common mistake** | Misconception | "A bond is always safe." |
| **Check** (2–3 items) | Mastery update | Scenario questions, not recall |
| **Jargon box** | Terms to remember | face value, coupon, maturity, default |

### 3.3 Language and tone rules

- Reading level: roughly Grade 8. Sentences under 15 words. Active voice.
- First use of a term: bold, with the plain meaning in brackets. After that, the term alone.
- Always show the unit: ₹, %, years, months. Indian digit grouping (₹1,00,000) via P3's formatter.
- No jargon stacking ("NAV-adjusted expense ratio drag"). One new term per card.
- Numbers are rounded for L1, exact for L2/L3.
- Every card works with the audio only.

### 3.4 What "taught properly" means (acceptance bar)

A topic is **done** only when all of these are true:

1. It has a lesson with all blocks in §3.2.
2. It appears in at least one game or LifePath event where the student *uses* it.
3. It has 3 or more check items, including at least one that needs a calculation (L2) and one that detects a misconception.
4. Its terms are in the glossary feed.
5. A student who has seen only this lesson can answer its check items at ≥ 70% in a pilot read-through.
6. It passes the word-list test and has an Assumptions drawer entry where a number is shown.

---

## 4. Curriculum: what every student must understand

Fourteen topics, in teaching order. For each: the key ideas, the analogy and worked example, the misconception, how it is practised, and what the student can do afterwards.

> Sample figures are illustrative and fictional. They are stored in `assumptions.json` and `lessons/*.json`, never hard-coded in components.

---

### 4.1 Profit, loss and return

**Ideas:** profit = selling/current value − what you paid; loss is the negative; **return** = profit ÷ amount invested, shown as a percentage so different amounts can be compared. Realised vs paper (unrealised) profit/loss.
**Analogy:** buying 50 samosas for ₹250, selling them for ₹400.
**Worked example:** Bought for ₹1,000, now worth ₹1,150: profit ₹150, return 15%. Now worth ₹900: loss ₹100, return −10%. A −50% loss needs a **+100%** gain to recover.
**Misconception:** `loss_only_if_sold` (partly true for a healthy asset, false if the business fails or you need cash during the dip). Taught with nuance, see 4.7.
**Practice:** return calculator inside every game's portfolio panel; Stock Market debrief.
**Student can:** compute profit, loss and % return, and explain why −50% then +50% is not break-even.

---

### 4.2 Interest: simple and compound

**Ideas:** interest is the price of using money. **Simple** interest is earned only on the original amount. **Compound** interest is earned on the original amount *and* on earlier interest. Time is the strongest lever. Rule of 72 gives doubling time. Nominal vs effective rate (how often interest is added).
**Analogy:** a tree that only grows fruit (simple) vs a tree whose fruit grows new trees (compound).
**Formulas (L3 only):**
- Simple: `I = P × r × t`, `A = P(1 + r·t)`
- Compound: `A = P(1 + r/n)^(n·t)`
- Doubling time ≈ `72 ÷ rate%`
**Worked example:** ₹10,000 at 8% for 10 years. Simple: ₹18,000. Compound (yearly): ₹21,589. The extra ₹3,589 is interest on interest. At 8%, money doubles in about 9 years.
**Misconception:** `simple_vs_compound` ("interest is just a % of what I put in"), `start_early` ("starting a bit later is almost the same").
**Practice:** Compounding Garden (UC-INV-02), What-If calculator (stretch).
**Student can:** calculate both, state which is used by which product, and explain why starting at 18 beats starting at 28 even with the same monthly amount.

---

### 4.3 Inflation and real return

**Ideas:** prices rise over time, so the same rupees buy less. **Real return** = nominal return − inflation (approximately). A savings number going up can still mean you got poorer.
**Analogy:** chai ₹5 → ₹20 across a generation.
**Worked example:** ₹1,000 buys 50 chais at ₹20. At 6% inflation for 10 years chai costs about ₹36, so the same ₹1,000 buys 27 whole cups (27.9 exactly). If the money earned 4% in a safe place, its **real** return is about −2%.
**Misconception:** `money_in_box_is_safe`.
**Practice:** Chai Price Time Travel (UC-INV-01); every projection offers an inflation-adjusted toggle.
**Student can:** say why "safe" is not the same as "keeps its value", and compute a real return.

---

### 4.4 Debt and lending (the lender's side)

**Ideas:** borrowing = using someone's money and paying for it (interest). **Every deposit, bond and fixed deposit is you lending.** Principal, interest rate, tenure, default (borrower fails to pay). Higher rate usually means higher risk of default. P3 teaches the *borrower's* side (Debt Cost Ladder); I teach the *lender's* side and link the two.
**Analogy:** lending ₹2,000 to a friend, getting it back late or never.
**Worked example:** A shop owner asks 10 people for ₹1,000 each and promises ₹1,100 in a year. If the shop does well, each lender earns ₹100 (10%). If it closes, lenders may lose some or all.
**Misconception:** `guaranteed_returns_exist`, `high_rate_is_free_bonus` (a high promised rate is a risk signal).
**Practice:** Bonds lesson, Investing, Gambling or Scam? sort.
**Student can:** recognise that a higher promised rate means a higher chance the promise breaks.

---

### 4.5 Bonds

**Ideas:** a bond is a tradable loan. **Face value** (amount repaid), **coupon** (the yearly interest), **maturity** (end date), **issuer** (government or company), **credit risk** (issuer might not pay), **price vs interest rates** (L3: when new bonds pay more, older bonds are worth less on the market). Government bonds are generally considered lower credit risk than company bonds; neither is "risk-free" (inflation, selling early at a loss).
**Analogy:** the neighbour's wedding loan, but written on paper that can be handed to someone else.
**Worked example:** ₹10,000 bond, 7% coupon, 3 years: ₹700 a year, ₹10,000 at the end, total ₹12,100. If sold after one year when new bonds pay 9%, a buyer pays less than ₹10,000 because the 7% is now less attractive (L3 price table).
**Misconception:** `bonds_are_risk_free`.
**Practice:** Bond lesson with a 3-step simulator (hold to maturity vs sell early vs issuer defaults), Where to Park ₹10,000 (stretch), Time Machine "Steady Box" path.
**Student can:** read "7%, 3 years, ₹10,000" and state what they receive and when, and name two risks.

> Naming rule: bonds in-game are fictional ("Deccan Roads Bond", "City Water Bond"). No real issuer, scheme or product names.

---

### 4.6 Stocks (shares) and exchanges

**Ideas:** a share is a tiny **ownership** slice of a company. Two ways it can pay: **price gain** (capital gain) and **dividend** (a share of profit paid out). Owners are paid *after* lenders. Price moves with news, results, mood and demand. An **exchange** is a regulated marketplace matching buyers and sellers. **IPO**: a company's first sale of shares to the public. **Bid** (highest price a buyer offers) and **ask** (lowest price a seller wants); the gap is the spread; **liquidity** = how easily you can sell without moving the price. **Market cap** (price × number of shares) as a size measure.
**Analogy:** owning 1 of 1,000 equal parts of a chai stall; if profit rises, the part is worth more and may pay a share.
**Worked example:** Chaiwala Ltd has 1,000 shares priced ₹100 (value ₹1,00,000). You buy 10 shares for ₹1,000 (plus a ₹10 fee). The company pays ₹2 per share dividend: ₹20. Price rises to ₹112: your holding is ₹1,120. Profit = (₹1,120 + ₹20) − (₹1,000 + ₹10) = ₹130.
**Misconception:** `one_stock_is_enough`, `stock_price_equals_company_size` (a ₹10 share can be a bigger company than a ₹5,000 one), `cheap_price_means_cheap_value`.
**Practice:** Stock Market Simulator (UC-INV-07). Navigator mode: bid-ask order book.
**Student can:** explain what they own, how they can earn, what moves the price, and why frequent trading costs money.

---

### 4.7 Risk, return and volatility (the dip is not always a loss)

**Ideas:** higher possible return comes with bigger swings and a wider range of outcomes. **Volatility** = how much the value jumps around. A dip is a **paper** loss; it becomes a **realised** loss only if you sell (or the business fails). Money needed soon can't wait out a dip. Behaviour is the hidden risk: panic-selling and FOMO.
**Analogy:** a bus ride on a smooth road vs a mountain road, both going the same direction.
**Worked example:** ₹10,000 in a Bumpy Ride falls 25% to ₹7,500. Seller keeps ₹7,500. Holder who waits might later see ₹9,000, ₹11,000, or still ₹7,000: nobody knows.
**Misconception:** `dip_means_loss`, `volatility_means_bad`, and the opposite trap `it_always_comes_back` (not for a failed company).
**Practice:** Risk & Return Ride (stretch), Stock Market panic moment, Time Machine.
**Student can:** separate "price went down" from "I lost money", and say when waiting is realistic and when it isn't.

---

### 4.8 Diversification

**Ideas:** spreading money across different things lowers the chance that one failure ruins you. It lowers *specific* risk, not *all* risk. Over-diversifying into 40 things you don't understand is not the goal either.
**Analogy:** "don't carry all the eggs in one basket", then test it with data.
**Worked example:** Six mini-businesses, one hit by heavy rain: all-in on the farm loses 40%; split equally across six loses about 7% from that event.
**Misconception:** `one_stock_is_enough`, `diversified_means_no_loss`.
**Practice:** Basket Builder (stretch), Stock Market debrief, Mutual Fund Challenge.
**Student can:** explain what diversification protects against and what it can't.

---

### 4.9 Mutual funds, NAV, SIP, fees

**Ideas:** a **mutual fund** pools many people's money and a manager buys many assets. **NAV** = value of one unit (total value ÷ units). A **SIP** invests a fixed amount regularly; when prices are low you get more units (**rupee cost averaging**). **Fees** (expense ratio) are taken from the fund every year and compound against you. Index-style funds follow a list of companies; active funds try to beat it and usually charge more.
**Analogy:** a thali: small portions of many dishes instead of one big plate of one thing; a mess fee for the cook.
**Worked example:** ₹500/month for 10 years, 10% growth. With 0.5% yearly cost vs 2% yearly cost, the difference after 10 years is roughly ₹8,000 on about ₹1,00,000 (computed in the engine, not hard-coded).
**Misconception:** `sip_guarantees_profit`, `higher_fee_means_better`, `best_fund_exists`.
**Practice:** Mutual Fund Challenge (UC-INV-08).
**Student can:** explain NAV and units, why a SIP buys more units in a dip, and how a 1.5% fee difference compounds.

---

### 4.10 ETFs

**Ideas:** an **ETF** (exchange-traded fund) is a basket of assets that **trades on an exchange like a share** during the day, while a typical mutual fund is bought and sold at one price per day (its NAV). Most ETFs follow an index, so costs are usually low. You still pay a small trading cost and the price can differ slightly from the basket's value. Same risk story as the assets inside.
**Analogy:** a ready-made thali that you can swap with a friend at any time of day.
**Worked example (comparison table):**

| | Mutual fund | ETF |
|---|---|---|
| Bought at | End-of-day NAV | Market price, any time the exchange is open |
| Bought through | Fund company or platform | Exchange (like a share) |
| Typical cost | Varies; active funds higher | Often low for index-style |
| Regular small amounts | Easy (SIP) | Possible but each buy is a trade |

**Misconception:** `etf_means_no_risk`, `etf_is_a_stock_pick`.
**Practice:** a third fictional fund type in Mutual Fund Challenge ("Index Basket ETF"), a one-screen comparison in the debrief, a Triage mini-activity ("fund or ETF?").
**Student can:** name the one real difference (how it is bought and priced) and the one thing that is the same (what is inside decides risk).

---

### 4.11 Commodities, the commodity exchange and gold

**Ideas:** a **commodity** is a basic raw good that is interchangeable (gold, silver, oil, wheat, cotton). Prices come from supply, demand, season, currency and mood. A **commodity exchange** is a regulated marketplace where standardised commodity contracts are traded. Most people don't buy "contracts"; they buy the **physical** thing or a **paper/digital** version. **Futures** (L3 only): an agreement today to buy or sell at a fixed price on a future date, used by producers to lock a price and by traders to bet; leverage makes losses fast.
**Gold specifics:** why people hold it (tradition, a store of value in crises), **no interest or dividend**, price can stay flat or fall for years. Jewellery has **making charges** and **purity** (carats), and a resale deduction. Coins/bars have lower making cost. "Paper or digital gold" is a generic category with its own small costs.
**Analogy:** a farmer selling next season's wheat in advance to fix the price.
**Worked example:** ₹60,000 of jewellery with 12% making charge: ₹7,200 is gone on day one and usually isn't returned on resale. Gold must rise about 12% just for the buyer to break even.
**Misconception:** `gold_has_no_costs`, `gold_always_goes_up`, `commodity_trading_is_easy_money`.
**Practice:** Gold & Asset Challenge (UC-INV-10), Where to Park ₹10,000 (stretch), Trading Pit (price discovery).
**Student can:** say what a commodity is, what an exchange does, why gold pays no income, and what making charges cost.

---

### 4.12 Liquidity and asset comparison

**Ideas:** **liquidity** = how fast and cheaply you can turn something into cash. Cash and savings are liquid; property is not. Every asset trades off **safety, access (liquidity) and growth**; none wins all three. Time horizon decides the right mix (the idea, not the product).
**Worked example:** a "needs ₹50,000 in 3 months" shock in Where to Park; the property share takes months and costs 6% to sell.
**Misconception:** `property_always_profits`, `highest_return_is_best`.
**Practice:** Where to Park (stretch), Property Deal (stretch), Time Machine.
**Student can:** place an asset on the safety / access / growth triangle and match it to a goal's deadline.

---

### 4.13 Time horizon and uncertainty

**Ideas:** the longer you can wait, the more a risky path's range tilts upward, but it never becomes guaranteed. Short-term money should take less risk. **No one can promise a single number**, so honest projections are **ranges** with stated assumptions.
**Worked example (engine-generated):** for 2 years the Bumpy Ride band includes losses; for 20 years the band is wider but its middle is higher.
**Misconception:** `guaranteed_returns_exist`, `past_returns_repeat`.
**Practice:** Time Machine (UC-INV-04), every `FanChart`.
**Student can:** read a fan chart, and say why a 2-year goal and a 20-year goal need different risk.

---

### 4.14 Spotting investment scams and gambling

**Ideas:** investing = ownership/lending with real underlying value and uncertain returns. Gambling = outcome depends on chance with a negative expected result and no underlying value. Scams = fake or promised-certain returns. Red flags: guaranteed return, urgency, "VIP fee", recruiting others, secrecy, celebrity endorsement, unregistered seller. Regulated sellers are registered with a regulator (named generally, e.g. "the market regulator"). A good investment can still lose money; a promise of "no risk, high return" is the warning.
**Misconception:** `guaranteed_returns_exist`, `recruiting_is_normal_income`, `speculation_is_investing`.
**Practice:** Investing, Gambling or Scam? (UC-SAFE-09), Telegram/Celebrity (stretch), Pyramid (stretch).
**Student can:** sort five offers into the right bucket and name the red flag in each.

---

## 5. Concept IDs to add to `concepts.json`

Existing IDs I will reuse are in `Implementation.md` §11.4. The IDs below are **new proposals**; changes to `concepts.json` need P2's review.

| New ID | Concept | Taught in |
|---|---|---|
| `profit_loss` | Profit, loss, return as a percentage | Lesson 1, Stock Market |
| `return_percent` | Comparing returns across different amounts; recovering from a loss | Lesson 1 |
| `interest_simple` | Simple interest | Lesson 2 |
| `interest_compound` | Compound interest, Rule of 72 | Lesson 2 (extends `simple_vs_compound`) |
| `real_return` | Return after inflation | Lesson 3, Chai Price |
| `lending_as_investing` | A deposit or bond is a loan you give | Lesson 4 |
| `default_risk` | The borrower may not pay | Lesson 4, 5 |
| `bonds` | Face value, coupon, maturity | Lesson 5 |
| `bond_price_rates` | Bond prices move opposite to interest rates (L3) | Lesson 5 |
| `dividends` | Profit paid out to owners | Lesson 6 |
| `exchange_basics` | What an exchange is; IPO | Lesson 6 |
| `market_cap` | Company size vs share price | Lesson 6 |
| `etf` | Exchange-traded funds vs mutual funds | Lesson 10 |
| `index_investing` | Following a list of companies | Lesson 9, 10 |
| `commodities` | What a commodity is | Lesson 11 |
| `commodity_exchange` | Standardised contracts, price discovery; futures (L3) | Lesson 11 |
| `paper_vs_realised` | Unrealised vs realised gain or loss | Lesson 1, 7 |

New misconception IDs: `loss_only_if_sold`, `money_in_box_is_safe`, `high_rate_is_free_bonus`, `bonds_are_risk_free`, `stock_price_equals_company_size`, `diversified_means_no_loss`, `sip_guarantees_profit`, `higher_fee_means_better`, `best_fund_exists`, `etf_means_no_risk`, `gold_always_goes_up`, `commodity_trading_is_easy_money`, `highest_return_is_best`, `past_returns_repeat`, `speculation_is_investing`, `it_always_comes_back`.

---

## 6. Where each topic is taught (journey map)

Each topic is met at **three touchpoints**: a short lesson, a game that uses it, and spaced review.

| Topic | Lesson | LifePath S5 | Arcade game | Review |
|---|---|---|---|---|
| 4.1 Profit, loss, return | L1 | Chai Price (value in ₹) | Stock Market portfolio panel | Daily Challenge |
| 4.2 Simple / compound | L2 | Compounding Garden | What-If calculator | Daily Challenge |
| 4.3 Inflation, real return | L3 | **Chai Price** | Where to Park | Daily Challenge |
| 4.4 Debt, lending | L4 | S5 event | Investing, Gambling or Scam? | Daily Challenge |
| 4.5 Bonds | L5 | Time Machine ("Steady Box") | Where to Park | Daily Challenge |
| 4.6 Stocks, exchange | L6 | S5 event | **Stock Market Simulator** | Daily Challenge |
| 4.7 Risk, volatility | L7 | Time Machine | Risk & Return Ride | Daily Challenge |
| 4.8 Diversification | L8 | Time Machine | Basket Builder, Mutual Fund | Daily Challenge |
| 4.9 Mutual funds, SIP | L9 | S5 event | **Mutual Fund Challenge** | Daily Challenge |
| 4.10 ETFs | L10 | — | Mutual Fund Challenge (third fund) | Daily Challenge |
| 4.11 Commodities, gold | L11 | — | Gold & Asset Challenge | Daily Challenge |
| 4.12 Liquidity, comparison | L12 | S5 shock | Where to Park, Property Deal | Daily Challenge |
| 4.13 Horizon, uncertainty | L13 | **Time Machine** | every FanChart | Daily Challenge |
| 4.14 Scams, gambling | L14 | S5 safety event | **Investing, Gambling or Scam?** | Daily Challenge |

### 6.1 Order rules

- Lessons 1–3 (profit, interest, inflation) are the **S5 entry requirement**: Chai Price and Compounding Garden assume them.
- Lessons 4–6 (lending, bonds, stocks) are required before the Stock Market and Mutual Fund games, because both games assume the student knows what a share and a pool are.
- Lessons are always **skippable by test-out**: a 3-question quick check can unlock the game directly.
- A lesson is *offered* before the game starts and *linked* from the debrief. It is never forced twice.

---

## 7. Folder layout

```
src/
  design/                         # design kit (P4)
    tokens.css                    # colour, spacing, type scale (light/dark, large-text)
    components/                   # Card, BigButton, Meter, CoinStack, Dialog, BottomSheet,
                                  # ProgressBar, AudioButton, LockedTile, Badge, Toast
    icons/                        # pillar + meter icons
    rtl.ts                        # logical-property helpers
    gallery/                      # /gallery route
  games/investing/
    deps.ts                       # re-exports real or stub shared modules
    contracts.ts                  # stand-in types until P2's types.ts lands
    _stubs/                       # temporary stubs (delete at integration)
    engine/
      rng.ts                      # Rng interface + mulberry32
      finance/                    # math library (§8)
      market/                     # assets, returns, shocks, regimes (§10)
      montecarlo.ts               # 500-futures runner
      montecarlo.worker.ts        # optional Web Worker wrapper
    guardrails/                   # SimBanner, RangeDisplay, FanChart, AssumptionsDrawer
    verbs/Predict/                # Predict verb
    lessons/                      # LessonPlayer + lesson components
    games/
      chai-price/  compounding-garden/  time-machine/
      stock-market/  mutual-fund/  invest-or-scam/
      (stretch) risk-return/ basket/ park-10k/ property/ gold/ trading-pit/ pyramid/ telegram/
    shell/                        # Investing section page, tiles, lock state
  content/
    assumptions.json
    learn/invest/                 # lesson JSON (en), glossary feed
    scenarios/invest/             # game + event + check-item JSON
tests/investing/                  # unit, property, word-list, performance
```

---

## 8. Financial math library

Pure TypeScript, no UI, no React, fully unit tested. Lives in `src/games/investing/engine/finance/`.

| Function | Purpose |
|---|---|
| `profit(buy, now, extras?)`, `returnPct(buy, now)` | Profit, loss, % return (4.1) |
| `breakevenGain(lossPct)` | Gain needed to recover a loss |
| `simpleInterest(P, rate, years)` | 4.2 |
| `compound(P, rate, years, perYear)` | 4.2 |
| `futureValueMonthly(sip, annualRate, months)` | SIP / recurring deposit |
| `ruleOf72(rate)`, `doublingYears(rate)` | 4.2 |
| `inflate(amount, inflation, years)`, `realValue(amount, inflation, years)`, `realReturn(nominal, inflation)` | 4.3 |
| `couponSchedule(face, couponRate, years, freq)`, `bondValueAtMaturity(...)` | 4.5 |
| `bondPrice(face, coupon, marketRate, yearsLeft)` | 4.5, L3 |
| `dividendIncome(shares, perShare)` | 4.6 |
| `marketCap(price, shares)` | 4.6 |
| `navPerUnit(totalValue, units)`, `unitsBought(amount, nav)` | 4.9 |
| `rupeeCostAveraging(prices[], amountPerMonth)` | 4.9 |
| `feeDrag(P, grossRate, feeRate, years)` | 4.9 |
| `makingChargeBreakeven(chargePct)` | 4.11 |
| `drawdown(series)`, `maxDrawdown(series)` | 4.7 |

### 8.1 Rules

- Money is plain rupee numbers. Values that stand for a real payment (a bond coupon, a trade fee shown to the student) are rounded to paise with `round2`; chained calculations stay unrounded and are rounded only at the display edge. (Changed from the original "paise integers" idea: float error is negligible at student amounts, and `10000 × 0.07 = 700.0000000000001` showed rounding is only needed where a payment is shown.)
- Every function states its compounding convention in its doc comment.
- Every worked example in a lesson is **generated from these functions in a test** (the lesson JSON stores inputs, the test checks the stated outputs). No number in a lesson can silently disagree with the math.

---

## 9. Assumptions config

`src/content/assumptions.json` is the single source of numbers shown by every projection and by the `AssumptionsDrawer`.

### 9.1 Schema

```json
{
  "version": 1,
  "currency": "INR",
  "inflation": { "base": 0.06, "low": 0.04, "high": 0.08, "labelKey": "assume.inflation" },
  "assets": {
    "steady_box":   { "kind": "deposit_like", "meanAnnual": 0.065, "volAnnual": 0.015, "fee": 0.0,   "labelKey": "asset.steady_box" },
    "mixed_basket": { "kind": "diversified",  "meanAnnual": 0.10,  "volAnnual": 0.10,  "fee": 0.005, "labelKey": "asset.mixed_basket" },
    "bumpy_ride":   { "kind": "concentrated", "meanAnnual": 0.13,  "volAnnual": 0.22,  "fee": 0.005, "labelKey": "asset.bumpy_ride" },
    "gold":         { "kind": "commodity",    "meanAnnual": 0.08,  "volAnnual": 0.14,  "fee": 0.0,   "labelKey": "asset.gold" },
    "property":     { "kind": "real_asset",   "meanAnnual": 0.08,  "volAnnual": 0.06,  "fee": 0.0,   "labelKey": "asset.property" }
  },
  "funds": {
    "index_basket":  { "cost": 0.005, "style": "index" },
    "active_growth": { "cost": 0.02,  "style": "active" },
    "sector_focus":  { "cost": 0.015, "style": "sector" },
    "index_etf":     { "cost": 0.004, "style": "etf", "tradingCost": 0.001 }
  },
  "costs": {
    "tradeFee": 0.005,
    "makingCharge": 0.12,
    "propertySellCost": 0.06,
    "propertyUpfront": 0.08
  },
  "disclaimerKey": "banner.simulation"
}
```

All values are **fictional and tunable**. The defaults above are starting points chosen so that the headline lessons land (chai: 50 cups → about 28 at 6% over 10 years). They are not forecasts, and the drawer says so.

### 9.2 Rules

- A student can **change** the key rate in the drawer in the Garden and Time Machine, and see the chart update. This teaches that outputs depend on assumptions.
- Version the file. A saved Time Machine result stores the assumptions version it ran under.
- The drawer shows: rate, volatility, fee, inflation, horizon, and "what this ignores" (tax, real-world surprises).

---

## 10. Market simulation engine

### 10.1 Model (see decision D2)

Recommendation: **a seeded monthly random walk with regime overlays** (calm / boom / crash), plus scripted shocks from the tape.

```
monthlyReturn = drift(asset, regime)
              + vol(asset, regime) × z          // z ~ seeded standard normal
              + shock(asset, month)              // from the tape, 0 if none
price[t+1]    = price[t] × (1 + monthlyReturn)
```

- Seeded with `hash(worldSeed, assetId, runId)`, so every student sharing a class code sees the same market, and a rewind keeps the same luck.
- **Regimes** are drawn once per run from a small Markov chain (e.g. calm→calm 90%, calm→crash 3%, calm→boom 7%). Regimes teach that markets change character.
- **Shocks** are `{ month, assetOrSector, pct, newsKey }` entries supplied by the caller. The engine never reads global state.
- Returns are clamped so no asset goes below 0 and no single month exceeds ±60%.
- A **failure event** (company shuts, price → ~0) is allowed for single fictional companies, to teach that stocks can go to zero. Funds and baskets cannot.

### 10.2 API

```ts
interface Rng { next(): number; normal(): number; fork(label: string): Rng }

type ShockSchedule = { month: number; target: string; pct: number; newsKey: string }[];

simulateAsset(asset, months, rng, shocks): number[]          // price path, index 0 = start
simulatePortfolio(weights, months, rng, shocks): number[]    // monthly value path
runFutures({ weights, months, runs: 500, seed, shocks? }): {
  paths: number[][];
  percentiles: { p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[] };
  summary: { p5: number; median: number; p95: number; lossProbability: number };
}
```

### 10.3 Monte Carlo

- 500 runs × up to 240 months is about 120,000 steps: well under 100 ms on a modern phone. It is fast enough that a Web Worker is optional; ship it **main-thread first**, wrap it in a worker only if the throttled-phone test (§17) fails.
- Output feeds `FanChart` directly (p5–p95 band, p25–p75 band, median line).
- Same inputs and same seed give byte-identical output (tested).

### 10.4 Teaching hooks in the engine

- `runFutures` returns `lossProbability` so the insight card can say "in about 1 of 5 simulated futures you ended below what you put in", in words.
- `compareStrategies` (buy-and-hold vs frequent trading, lump sum vs SIP, low fee vs high fee) runs the **same random path** for both so the difference is caused by the strategy alone.

---

## 11. Guardrail components and the Predict verb

### 11.1 `SimBanner`

Fixed, non-dismissable strip: *"Simulation based on assumptions. Not a prediction or advice."* (key `banner.simulation`). Appears on **every** investing screen and every lesson that shows a projected number. Has audio. Sticks above the fold on a 360×640 screen. A snapshot test fails any investing route that lacks it.

### 11.2 `RangeDisplay`

Props: `{ low, median, high, unit, confidenceKey }`. Renders "between ₹X and ₹Y in most futures" with a small bar and the median marked. It **never renders a single number on its own**; an invariant test checks that `RangeDisplay` is the only way projections are shown.

### 11.3 `FanChart`

Recharts area chart: outer band p5–p95, inner band p25–p75, median line, a dashed "amount you put in" line, optional inflation-adjusted toggle. Accessible: text alternative that reads the three numbers; colour is never the only signal; works at large text and RTL.

### 11.4 `AssumptionsDrawer`

Bottom sheet reading `assumptions.json`. Sections: rates used, inflation, fees, what is ignored. Optional "change this" sliders for the Garden and Time Machine. Opens from a persistent "ⓘ Assumptions" chip.

### 11.5 Predict verb

```ts
<Predict
  question={{ textKey, audioKey }}
  input={ { kind: 'slider', min, max, step, unit } | { kind: 'options', options } }
  reveal={ { actual, range?, explainKey } }
  onDone={(r: { guess, actual, gapPct, ms }) => void}
/>
```

- Lock-in button: the student must commit before the reveal.
- **Guess-vs-reality chart:** two marks on one axis, plus a plain sentence ("You guessed ₹24, the model says ₹36 (range ₹30–₹43)").
- The gap is stored as a choice with `correct` based on whether the guess falls inside the revealed range, so P1's mastery model can use it.
- Never shows "wrong" in red. Over-estimating and under-estimating get equal neutral treatment.

---

## 12. Design kit

Delivered first because everyone depends on it. **Functional first, polish later** (shared final phase).

### 12.1 Tokens

- Colour: neutral base, one accent per pillar (Plan, Save, Invest, Safe), meter colours (cash, peace of mind, trust, goal, safety), red/amber/green mastery. Light and dark. Contrast ≥ 4.5:1 for text (≥ 3:1 for large text), checked in a script.
- Spacing: 4-px scale. Type: base, large-text mode (+25%). Targets ≥ 48 px touch size.
- Layout uses **CSS logical properties** (`margin-inline-start`, `inset-inline`) so Urdu RTL works without separate styles.

### 12.2 Components (all must work at 360×640, large text, RTL, dark)

`Card`, `BigButton`, `Meter`, `CoinStack`, `Dialog`, `BottomSheet`, `ProgressBar`, `AudioButton`, `LockedTile` (with reason line), `Badge`, `Toast`.

### 12.3 Approach

Copy-in, headless-primitive components styled with Tailwind (decision D3), not a heavy UI library, to keep the app shell under 3 MB.

### 12.4 Gallery page

`/gallery` shows every component in every state (default, loading, disabled, locked, error, RTL, large text, dark) so others copy usage instead of asking.

### 12.5 Handoff

Publish a one-page "how to use" table in the gallery and announce the 6 most-used components first (per `Implementation.md` §14.1).

---

## 13. Lesson system (Investing ABC)

### 13.1 What it is

A short, guided set of **14 lessons** (§4) plus a quick check each. It sits in the Investing section as "Learn first" tiles, and each game links to the lessons it needs.

### 13.2 Format

A lesson is a **scenario of kind `lesson`** so it can run in P2's `ModuleRunner` short mode (Play → Result → Concept → Check). Until the runner exists, `LessonPlayer` runs the same JSON standalone.

```json
{
  "id": "lesson_bonds",
  "kind": "lesson",
  "pillar": "invest",
  "concepts": ["bonds", "default_risk", "lending_as_investing"],
  "levels": [1, 2, 3],
  "blocks": [
    { "type": "hook",       "textKey": "lesson.bonds.hook",      "audioKey": "lesson.bonds.hook" },
    { "type": "define",     "textKey": "lesson.bonds.define",    "audioKey": "lesson.bonds.define",
      "terms": ["bond", "face_value", "coupon", "maturity"] },
    { "type": "analogy",    "textKey": "lesson.bonds.analogy",   "audioKey": "lesson.bonds.analogy" },
    { "type": "worked",     "calc": "bondValueAtMaturity", "inputs": { "face": 10000, "coupon": 0.07, "years": 3 },
      "textKey": "lesson.bonds.worked" },
    { "type": "predict",    "questionKey": "lesson.bonds.predict", "reveal": { "calc": "...", "explainKey": "..." } },
    { "type": "tradeoff",   "textKey": "lesson.bonds.tradeoff" },
    { "type": "misconception", "id": "bonds_are_risk_free", "textKey": "lesson.bonds.mistake" }
  ],
  "check": ["q_bonds_01", "q_bonds_02", "q_bonds_03"],
  "glossary": ["bond", "face_value", "coupon", "maturity", "default"]
}
```

### 13.3 Components

`LessonPlayer`, `ConceptCard` (the one-line definition with audio), `WorkedExample` (steps through the numbers one at a time, student taps to advance), `JargonBox`, `MisconceptionCard`, `QuickCheck`.

### 13.4 Glossary feed

Each lesson contributes entries to the Learn glossary (owned by P3/P1): term, one-line definition, a 60-second explainer card, and the lesson link. About 45 investing terms (list in §15.4).

---

## 14. Games

Each game follows the 8-step loop (Hook → Play → Result → Why? → Concept → Try again → Check → Reward), reads the level from `ctx.level`, and returns a `MiniGameResult`. In Arcade and Quick Play mode **no effects touch the LifePath character**.

### 14.1 UC-INV-01 Chai Price Time Travel (MVP)

- **Teaches:** 4.3 inflation, real return; 4.1 value in ₹.
- **Flow:** chai-stall timeline (₹5 → ₹10 → ₹15 → ₹20) → Predict the price in 10 years (slider) → range reveal from the inflation assumption → "₹1,000 in a box: how many cups?" (50 → ~28) → concept card → Assumptions drawer.
- **Levels:** L1 pictures of shrinking cup stack; L2 numbers; L3 real-return formula.
- **Check items:** (a) price after 10 years at a stated rate; (b) real vs nominal return; (c) misconception `money_in_box_is_safe`.
- **Engine:** `inflate`, `realValue`. **LifePath effect:** sets flag `sawInflation`; no money change.

### 14.2 UC-INV-02 Compounding Garden (MVP)

- **Teaches:** 4.2 simple vs compound, `start_early`.
- **Flow:** two gardens side by side → Predict value at year 10 → fast-forward 5/10/20 years → guess-vs-reality chart → "Start at 18 vs 28" twin gardens → rate slider in the drawer.
- **Levels:** L1 trees only; L2 numbers and the gap; L3 Rule of 72 and the formula.
- **Verbs:** Predict, Commit (monthly amount; uses P3's Commit, local stub until then).
- **Check items:** (a) which is larger and why; (b) compute simple interest; (c) start-early scenario; (d) misconception `simple_vs_compound`.

### 14.3 UC-INV-04 Time Machine (MVP, signature screen)

- **Teaches:** 4.13 horizon and uncertainty; 4.7 risk; 4.8 diversification; 4.5 bonds via the Steady Box path.
- **Flow:** choose goal and deadline → Allocate across Steady Box / Mixed Basket / Bumpy Ride → **Run 500 futures** → `FanChart` + `RangeDisplay` → insight card chosen by rule (deadline < 3 years and p5 below the amount put in → "money needed soon should take less risk").
- **Insight rules** are data-driven, in `scenarios/invest/time_machine.rules.json`, so they can be edited without code and **never recommend a specific mix**.
- **Check items:** (a) read a range; (b) match a goal timeline to a risk level (this doubles as the **S5 gate**); (c) `guaranteed_returns_exist`.

### 14.4 UC-INV-07 Stock Market Simulator (MVP)

- **Teaches:** 4.6 stocks and exchanges, 4.1 profit/loss, 4.7 volatility, 4.8 diversification, behaviour gap, trade costs.
- **Setup:** 6 fictional companies (each: name, one-line business, sector, share count, starting price, dividend, a price chart). Virtual ₹10,000. 12 weekly rounds.
- **Round:** news card → prices move (market engine, seeded) → **Buy / Sell / Hold** (Choose) → portfolio panel (holdings, cash, value, gain/loss in ₹ and %, dividend received).
- **Behavioural moments** (scripted by the tape):
  1. Round 4: a "fake social feed" rumour ("everyone's buying Deccan Farms! 🚀"): tests FOMO.
  2. Round 8: a sharp, news-driven drop across the portfolio: tests panic.
  3. Optional: one company fails (price → ~0) to show single-stock risk.
- **Fee:** 0.5% per trade, shown on every order confirmation.
- **Debrief:** (i) what moved each price and which headline it was; (ii) diversification score in words, not a verdict; (iii) trades made and what they cost; (iv) **same-path comparison** with "buy a spread and hold"; (v) what you owned vs what you thought you owned (4.6 recap); (vi) range display for "what might happen next".
- **Navigator level (stretch):** order-book screen with bid/ask, spread, limit orders (4.6 bid/ask).
- **Check items:** (a) profit calculation with a fee and a dividend; (b) what a share is; (c) FOMO scenario; (d) `one_stock_is_enough`.
- **Rules:** fictional tickers (e.g. `CHAI`, `DFRM` are checked against a deny-list of real tickers), seeded so a class sharing a code sees the same market.

### 14.5 UC-INV-08 Mutual Fund Challenge (MVP)

- **Teaches:** 4.9 funds, NAV, SIP, fees; 4.10 ETFs; 4.8 diversification; 4.13 horizon.
- **Flow:** pool animation (many small amounts → one fund holding many companies) → NAV explained as the price of one unit (with the units arithmetic) → pick one of **four fictional funds**: Index Basket (low cost), Active Growth (higher cost), Sector Focus, **Index ETF** (a basket that trades like a share) → **lump sum or SIP** (Commit) and duration → 10 simulated years with dips → units-bought-per-month chart (rupee cost averaging) → **fee drag** comparison → debrief with ranges and drawer.
- **ETF moment:** a single comparison screen contrasting "bought at end-of-day NAV" vs "bought at a market price during the day".
- **Never** shows a "best fund". The debrief says "which suits you depends on time, how much you'll add, and cost."
- **Check items:** (a) units bought at two NAVs; (b) why a SIP buys more units in a dip; (c) 1.5% fee over 10 years; (d) fund vs ETF; (e) `best_fund_exists`.

### 14.6 UC-SAFE-09 Investing, Gambling or Scam? (MVP)

- **Teaches:** 4.14.
- **Flow (Triage, 3 buckets: Investing / Gambling / Scam):** cards such as "Guaranteed 30% a month", "Paid Telegram tips", "Long-term basket with no guarantee", "A betting app", "A hyped coin everyone's talking about" → after each swipe, reveal the **tells** (guarantee, urgency, secrecy, recruiting, no underlying value) → a regulated-vs-red-flag comparison, using generic wording ("registered with the market regulator"), no product names.
- **Ambiguity handled honestly:** "hyped coin" is *speculation*, not a certain scam; the explanation says why.
- **Check items:** (a) identify the red flag; (b) investing vs gambling; (c) `recruiting_is_normal_income`.
- Uses P3's Triage; local stub until then.

### 14.7 Investing section shell (MVP)

- Page with tiles: **Learn first (Investing ABC)**, Chai Price, Compounding Garden, Time Machine, Stock Market, Mutual Fund, Invest-or-Scam, plus locked stretch tiles.
- **Lock state:** locked until S3 is passed or a facilitator override; the `LockedTile` shows a one-line audio reason ("You invest from savings, so build your emergency fund first"), which itself teaches the order.
- "Recommended" tag from P2's scheduler. "Resume" from the runner.

### 14.8 Stretch games (design notes, built last)

| Game | Core teaching | Notes |
|---|---|---|
| Risk & Return Ride (UC-INV-03) | 4.7 | Tape forces a −25% on Bumpy Ride; sell/wait/add choice; checkpoint for rewind |
| Basket Builder (UC-INV-05) | 4.8 | 6 mini-businesses; 10 sector events |
| Where to Park ₹10,000 (UC-INV-06) | 4.5, 4.11, 4.12 | Includes a bond slice; an urgent need tests liquidity |
| Property Deal (UC-INV-09) | 4.12 | Hidden-cost cards; rent vs buy |
| Gold & Asset (UC-INV-10) | 4.11 | Jewellery vs coin vs paper-gold; making charges; commodity-exchange explainer |
| Trading Pit (UC-INV-11) | 4.6, 4.11 | Needs P5's local networking; bots for single player |
| Telegram / Celebrity (UC-SAFE-07), Pyramid (UC-SAFE-08) | 4.14 | Labelled deepfake-style endorsement; Ponzi collapse chart |
| What-If compounding (UC-TK-02) | 4.2, 4.3 | Nothing stored; drawer always open |

---

## 15. Content authoring rules and schemas

### 15.1 Naming rules (hard)

- **No real** companies, funds, banks, apps, brokers, exchanges, indices, tickers, schemes or brands. Use fictional names: *Chaiwala Ltd, Deccan Farms, Hyd Mobile Repairs, Charminar Textiles, Musi Transport, Bhagya Tech*; funds *Index Basket, Active Growth, Sector Focus, Index ETF*; bonds *Deccan Roads Bond, City Water Bond*.
- Generic category terms **are** allowed and used: stock, bond, mutual fund, ETF, SIP, NAV, deposit, commodity, gold, exchange, index, regulator. (See D5 for specific government schemes and regulators.)
- No "best", "top", "must buy", "recommended for you" about any asset.
- No past-performance claims about real assets. Examples use fictional data only.

### 15.2 Word-list test

`tests/investing/wordlist.test.ts` scans `src/content/**`, lesson JSON and component strings against `tests/fixtures/denylist.txt` (real brands, exchanges, indices, tickers, mutual fund houses, broker apps, payment apps) and **fails CI** on any hit, case-insensitive and with simple obfuscation (spaces, punctuation). The denylist is extended whenever a reviewer spots a new name.

### 15.3 Schemas (all validated by P3's content validator)

**Company:** `{ id, nameKey, taglineKey, sector, shares, startPrice, dividendPerShare, volatilityClass, failureRisk }`
**Fund:** `{ id, nameKey, style: index|active|sector|etf, costYearly, holdingsKeys[], descriptionKey }`
**News card:** `{ id, textKey, audioKey, target (company|sector|market), pct, tone: good|bad|noise, teaches?: ConceptId }`
**Check item:** `{ id, concept, level, stemKey, optionsKeys[], correct, misconception?, calc? }`
**Lesson:** see §13.2.

### 15.4 Glossary feed (about 45 terms)

profit, loss, return, paper profit/loss, realised, principal, interest, simple interest, compound interest, rate, tenure, Rule of 72, inflation, real return, nominal, lender, borrower, default, bond, face value, coupon, maturity, issuer, share/stock, dividend, capital gain, exchange, IPO, market cap, bid, ask, spread, liquidity, volatility, diversification, risk, mutual fund, NAV, unit, SIP, rupee cost averaging, expense ratio, index, ETF, commodity, commodity exchange, futures (L3), making charge, purity, regulator, Ponzi, red flag.

Each entry: one-line definition (≤ 15 words), a 60-second card, a lesson link.

### 15.5 Required volume (MVP)

| Content | Count |
|---|---|
| Lessons | 14 |
| Check items (3 per lesson + 3 per game) | ~70 |
| Fictional companies | 6 (+ 6 mini-businesses for Basket Builder) |
| Fictional funds | 4 |
| News cards | 40 (incl. rumours, drops, noise cards that move nothing) |
| S5 gate items | 3 |
| Invest-or-Scam cards | 12 |
| Glossary entries | ~45 |

Each content item is written once in English; P3's pipeline handles Telugu/Hindi/Urdu extraction. I flag finance terms that must **not** be machine-translated without review.

---

## 16. Languages, audio, accessibility

- Every string is a key. No literal text in components (including chart labels, tooltips, banners and the drawer).
- `₹` and Indian grouping via P3's formatter; until then a local one with the same signature.
- **Finance terms in Telugu/Hindi/Urdu:** keep the English term in brackets after the translation for a few core words (e.g. "बॉन्ड (bond)"), because students will meet the English word on every bank and app screen.
- Charts: text alternatives, no colour-only meaning, pattern fills in the bands, keyboard-focusable data points.
- Respect *reduce motion* (garden animations and pool animation fall back to step-through), *timers off*, and *large text*.
- Audio keys exist for every lesson block and every reveal.

---

## 17. Testing

| Area | Tests |
|---|---|
| Math library | Table-driven known values; property tests (compound ≥ simple for t>1; `breakevenGain(-50%) = 100%`; `realValue` inverse of `inflate`) |
| Lesson numbers | Every worked example's stated outputs are re-computed from the library |
| Market engine | Same seed → identical paths; different seeds differ; distribution mean/vol within tolerance of config over many runs; no negative prices; clamped moves |
| Monte Carlo | Percentiles monotonic (p5 ≤ p25 ≤ p50 ≤ p75 ≤ p95); same seed → same output |
| Performance | 500 runs × 240 months completes in < 1 s under a 4× CPU-throttled profile (decision D4 if it fails) |
| Guardrails | Snapshot: every investing route renders `SimBanner`; `RangeDisplay` never shows a lone number; drawer lists every asset used on screen |
| Predict | Lock-in required before reveal; result shape matches `MiniGameResult` |
| Word list | No denylisted term in any content or component file |
| Games | Each plays at L1 and L2 inside the runner harness; emits the expected `conceptDeltas`; effects applied only in `lifepath` mode |
| Design kit | Every component at 360×640, large text, dark, RTL (visual snapshot); contrast script |
| Content | Every string key referenced exists; every concept ID exists in `concepts.json` |

---

## 18. Build order and effort

Effort points follow `work_division.md` (1 point ≈ half a day). MVP total is 14.5.

| Step | Work | Pts | Depends on |
|---|---|---|---|
| 0 | Branch, local stand-ins (`contracts.ts`, `deps.ts`, `_stubs/`) | 0.25 | — |
| 1 | `assumptions.json` + types; Rng; **financial math library + tests** | 1.0 | — |
| 2 | **Teaching content pass 1:** lessons 1–6 (profit, interest, inflation, lending, bonds, stocks) and their checks | 1.5 | — |
| 3 | Design kit + gallery (needs a Vite/Tailwind project, D1) | 1.5 | scaffold |
| 4 | Guardrail components + Predict verb | 2.0 | design kit |
| 5 | **Market engine + Monte Carlo + tests** | 3.0 | step 1 |
| 6 | Lesson system (`LessonPlayer`, worked-example stepper) | 1.0 | design kit |
| 7 | Chai Price + Compounding Garden | 1.5 | 1, 4 |
| 8 | Time Machine | 1.5 | 4, 5 |
| 9 | Stock Market Simulator | 2.0 | 5 |
| 10 | Mutual Fund Challenge (incl. ETF) | 1.5 | 5 |
| 11 | Teaching content pass 2: lessons 7–14, news cards, check items, S5 gate | 1.5 | — |
| 12 | Invest-or-Scam sort | 0.5 | Triage (P3) or stub |
| 13 | Investing shell, lock state, S5 events | 1.0 | P2 hooks or stubs |
| 14 | Word-list test + hardening (RTL, large text, perf) | 0.75 | all |
| | **Total (approx.)** | **~20** | |

> The total is above 14.5 because **the Investing ABC lessons (≈ 3 pts of content and 1 pt of player) are new** relative to the original split. Candidates to rebalance (see D6): move the lesson player to the shared polish phase, share the lesson writing for 4.4 and 4.14 with P5, or build the Mixed/ETF content after the MVP games.

### 18.1 Milestones

- **M0 (immediately):** math library, assumptions, lessons 1–6 content. Needs nothing from anyone.
- **M1:** design kit (first six components announced to the team), guardrails, Predict.
- **M2:** market engine + Time Machine playable in the dev harness.
- **M3:** Chai Price, Compounding Garden, Stock Market, Mutual Fund playable; Investing shell.
- **M4:** inside LifePath S5 through P2's runner; word-list and performance tests green.
- **M5:** stretch games by value: Risk & Return Ride → Where to Park → Gold & Asset → Basket Builder → Property → Pyramid/Telegram → Trading Pit.

---

## 19. Decisions for me to make

Each has a **recommendation** so work is not blocked; confirm or override.

| # | Decision | Options | Recommendation | Blocks |
|---|---|---|---|---|
| D1 | **Scaffold timing**: the repo has no code. | (a) Wait for P5's scaffold; (b) I create a minimal Vite+React+TS+Tailwind+Vitest scaffold on `part4` and drop it when P5's lands; (c) Coordinate: ask P5 to push the bare scaffold first | **(c)**, falling back to **(b)** if not pushed within a day. Pure TS work (math, engine, content) needs only Vitest and starts now | Design kit, guardrail components |
| D2 | Market model (open item #8 in `Implementation.md`) | (a) Seeded random walk; (b) Regime-based; (c) Rescaled historical patterns | **Seeded random walk with regime overlay** (§10). Simple to test and deterministic. Skip (c) to avoid implying real history | Engine, all games |
| D3 | Design kit approach | (a) Headless primitives (e.g. Radix) + Tailwind; (b) hand-built; (c) a full UI library | **(a)** for accessibility (focus, ARIA) with small bundle | Design kit |
| D4 | Monte Carlo location | (a) Main thread; (b) Web Worker; (c) pre-computed tables | **(a) first**, add **(b)** only if the throttled test fails | Time Machine |
| D5 | Naming policy for real *categories* | (a) Generic terms only; (b) allow named government schemes and regulators; (c) allow nothing specific | **(a) plus generic regulator wording** ("the market regulator"), keeping to the brief's "no product names". Some students will ask about specific schemes; a Help/FAQ card could say "ask your facilitator" | Content |
| D6 | **Scope of the teaching layer**: 14 lessons add ~4 points. | (a) Build all 14 lessons as MVP; (b) lessons 1–6 + 13–14 as MVP, rest stretch; (c) fold lessons into game Concept steps only (no standalone lessons) | **(b)**: topics students asked for (bonds, ETFs, commodities, profit/loss, interest) are still all covered, as short cards inside games, with full lessons after MVP | Effort balance |
| D7 | Lesson depth defaults | Levels follow P1's persona maturity (starter→L1, builder→L2, navigator→L3) vs student-chosen | **Persona-driven default, student can switch** | Lesson player |
| D8 | Bonds in the game | (a) Bond as a fourth Time Machine path; (b) bond only in Where to Park and lesson; (c) separate mini-game | **(b)** for MVP, and surface "Steady Box" in Time Machine as "deposit/bond-like" | Time Machine |
| D9 | ETFs in the game | (a) Fourth fund in Mutual Fund Challenge; (b) lesson only | **(a)** | Mutual Fund |
| D10 | Interest-free view (open item #9) | Settings toggle; both framings always; none | **Toggle as written.** When on: relabel interest as "profit-sharing / rent", hide interest-bearing bonds in Where to Park, keep lessons neutral. Needs a decision from the team lead before content freeze | Content wording, bonds |
| D11 | Sample numbers | Realistic ranges vs round teaching numbers | **Round numbers at L1, realistic at L2/L3**, always inside the drawer | Content |
| D12 | Who writes finance content | P4 alone vs a reviewer | **P4 drafts; one reviewer** (facilitator or a finance-literate teammate) signs off. Accuracy matters more than speed | Content |
| D13 | Telegram/Pyramid ownership | Keep with P4 (work_division) vs P5 (Implementation.md) | **Keep with P4 as stretch** per newer split | Stretch |

---

## 20. Dependencies, handoffs and risks

### 20.1 I provide

| To | What | When |
|---|---|---|
| Everyone | Design kit and gallery | M1 (first 6 components early) |
| P1 | Market engine API for Future Me ranges; `RangeDisplay`, `AssumptionsDrawer` | M2 |
| P2 | Game components, S5 events and gate items as JSON, new concept IDs (§5) for review | M3–M4 |
| P3 | `Predict` verb; glossary feed (investing terms) | M1, M3 |
| P5 | Nothing hard; local networking requirements for Trading Pit (stretch) | M5 |

### 20.2 I consume

| From | What | Fallback |
|---|---|---|
| P2 | `types.ts`, runner, Choose, tape, scheduler hook | `contracts.ts`, dev harness, fixed shock schedule |
| P3 | `Allocate`, `Commit`, `Triage`, `t(key)`, formatter, validator | `_stubs/` with agreed props |
| P5 | Scaffold, storage, `logEvent()`, local networking | Minimal scaffold, no-op logger |
| P1 | Persona (maturity → default level), mastery thresholds | Fixed default level L2 |

### 20.3 Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Scope: teaching layer plus 6 MVP games plus the design kit is heavy | Late games | D6 (b); content in parallel with code; design kit minimal first |
| Finance accuracy errors in lessons | Teaches something wrong | Generated numbers from the tested library; reviewer sign-off (D12) |
| A real name slips into content | Breaks the brief's guardrail | Word-list test in CI; reviewer checklist |
| Students read a projection as a promise | Harmful | `SimBanner`, ranges only, drawer, "what this ignores" |
| Jargon overload for 17-year-olds | Students disengage | One new term per card, Grade-8 reading level, L1 default for starters, read-aloud testing |
| Translation of finance terms is inconsistent | Confusion | Glossary of approved translations; English term kept in brackets |
| Performance on low-end phones | Slow fan chart | Main-thread first, measure throttled, worker if needed, reduce runs to 300 as last resort (the "500" is a spec target) |
| Charts hard to use with assistive tech | Excludes students | Text alternatives, patterns, keyboard focus, tested in §17 |
| Shared contracts change under me | Rework | All access via `deps.ts`; contract tests |

### 20.4 Definition of done (per `Implementation.md` §14.6, extended)

A use case is done when it plays inside the module runner, emits correct events, works offline, has all strings keyed, has 2–3 check items, has at least one unit test, **and (for P4)** shows the banner, a range and the drawer, passes the word-list test, and meets the teaching bar in §3.4.

---

## Appendix A: Check-item style guide

- Scenario-first ("Asha buys 10 shares at ₹100 and pays a 0.5% fee…"), not definitions.
- Four options at most; distractors map to named misconceptions.
- L1: concept recognition. L2: one calculation. L3: reasoning with two steps.
- Feedback explains *why*, in two sentences, with audio.
- Never use trick wording, negatives ("which is NOT…") or ambiguous "best".

## Appendix B: Example lesson skeleton (Profit, loss and return)

1. **Hook:** "Asha buys 50 samosas for ₹250 and sells them all for ₹400."
2. **Define:** profit, loss, return (%).
3. **Worked:** ₹150 profit; return = 150 ÷ 250 = 60%. A different day: sells for ₹200: loss ₹50, return −20%.
4. **Predict:** "After a 50% fall, what gain brings you back to even?" (Slider; reveal +100%.)
5. **Trade-off:** a big percentage gain on a small amount can be less rupees than a small % on a large amount; compare in ₹ *and* %.
6. **Mistake:** "−50% then +50% = break-even" (it leaves you 25% down).
7. **Check:** compute a return; identify the larger rupee gain; recovery question.
8. **Jargon box:** profit, loss, return, paper vs realised.
