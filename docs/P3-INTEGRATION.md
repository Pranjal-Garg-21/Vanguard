# P3 — Everyday Money & Content Pipeline

What is built, how to use it, and what P3 still needs from the rest of the team.
Everything here is integrated into the scaffold: `npm run typecheck && npm run
lint && npm test && npm run build` all pass.

---

## Try it

```bash
cd frontend && npm run dev
```

Open **http://localhost:5173/arcade**.

Four games run end to end. The character picker at the top is temporary — it
exists because persona filtering is the thing most likely to break quietly, and
it is currently the only way to exercise it. Switching from **Ravi (17)** to
**Sana (19)** changes which documents the bank asks for.

## Validate content

```bash
node tools/authoring/validate.mjs            # from the repo root
node tools/authoring/validate.mjs --strict   # warnings fail too
```

Dependency-free plain JavaScript, so it needs no install and runs as its own CI
job. It checks concept and misconception IDs, verb names, effect paths against
§6.1, and that every string key referenced by content or by a `t()` call exists
in English and in every shipped language. It also understands keys built at
runtime (``t(`concept.${id}`)``) and enforces two rules the plan states only in
prose: an ambiguous Triage card must carry an explanation, and a `correctBucket`
must name a declared bucket.

---

## What is built

| | Where | Use case |
|---|---|---|
| Triage | `runtime/verbs/triage` | — |
| Allocate | `runtime/verbs/allocate` | — |
| Commit | `runtime/verbs/commit` | — |
| Rank | `runtime/verbs/rank` | — |
| Document Hunt | `games/everyday/document-hunt` | UC-BANK-01 |
| Swipe Sort | `games/everyday/swipe-sort` | UC-PB-01 |
| Debt Cost Ladder | `games/everyday/debt-ladder` | UC-BR-01 |
| Rescue Mission | `games/everyday/rescue-mission` | UC-SAFE-10 |
| Arcade section | `features/arcade` | — |
| i18n loader | `platform/i18n` | UC-SYS-09, UC-PLAT-04 |
| Validator | `tools/authoring` | — |

Still to come: Bank Counter, Jar Split, Goal Builder, Spending Detective,
Surprise Month.

## The four verbs

Anyone can use any verb (§10.2). All four are **tap-to-move, never drag**: tap
the item, tap the destination. Every target is a native `<button>`, so keyboard
support comes for free and it works on a low-end Android without a drag library.

A verb takes `stepId`, `ctx`, `onComplete` plus its own content props, and calls
`onComplete` exactly once. **A verb never touches GameState.** It reports what
happened; the runtime decides whether to apply it — which is what stops Arcade
play from mutating the LifePath character (§6.4).

```tsx
import { Triage } from '@/runtime/verbs/triage';
import { Allocate } from '@/runtime/verbs/allocate';
import { Commit } from '@/runtime/verbs/commit';
import { Rank } from '@/runtime/verbs/rank';
```

**Triage** — `layout="queue"` shows one card at a time (Swipe Sort);
`layout="board"` shows everything at once and with `bounceWrong` the wrong item
bounces back with a spoken reason (Document Hunt). A card with
`correctBucket: null` is ambiguous and **can never be marked wrong** — §12.6
forbids scoring those. `recontext` re-queues a card once with new information
and possibly a different answer.

**Allocate** — coins at L1–L2, sliders at L3. Attach `bills` to a jar to get the
live overflow check: under-funding names the specific bill that will not be
paid, walking bills cheapest-first.

**Commit** — emits a real `Commitment`, shows what share of income is being
promised, warns above 40% (a warning, not a block: a family contributor may
genuinely need to commit that much) and requires an explicit confirm.

**Rank** — feedback is the ₹ cost of the student's order versus the best one
(§10.2), not a tick. Scoring uses Kendall-tau inversions so a near miss gets
partial credit, and equal-value items are never counted as inverted.

Pure logic lives in each verb's `logic/` folder with its tests, per the team
guide, so it is testable without rendering.

## i18n

The scaffold stub is replaced; **`t(key, vars)` is unchanged**, so every screen
P5 already wrote keeps working, verified by a regression test.

```ts
import { t, rupees, setLanguage, useT } from '@/platform';

t('setup.steps.progress', { current: 2, total: 5 });  // unchanged
t('verb.allocate.remaining', { amount: 3500 });       // → "₹3,500 left…"
t('verb.commit.n_months', { count: 7 });              // plural
```

- `{amount, rupees}` formats with **Indian digit grouping** — ₹1,25,000.
- **Amount formatting is pinned to `en-IN` in all four languages, deliberately.**
  `ur-IN` groups in thousands and renders 125000 as ₹125,000. Do not "fix" this
  by passing the UI locale through; there is a regression test on it.
- Missing keys fall back to English, then render the key itself — visible rather
  than blank — and report through `setMissingKeyHandler`.
- `setLanguage()` **refuses to switch to a pack that is not on the device**
  (UC-PLAT-04), so nobody lands on a screen of raw key names.
- `useT()` re-renders on language change; no provider, because the linter
  forbids `features/`, `games/` and `runtime/` from importing
  `@/platform/<subfolder>`.

Bundles are `content/i18n/<lang>/<namespace>.json`, one namespace per use case
so translators get one at a time.

---

## What P3 needs from you

### P2 — three things

**1. `EffectMap` is too narrow.** `@/core/types` declares
`Record<string, number>`, but §6.3 shows object payloads —
`"money.debt.add": { amount, lender }` — and boolean flags. Commit and the Debt
Ladder both emit those. P3 uses a local `RichEffectMap` and casts at the
boundary (`runtime/verbs/types.ts`); the reducer has to accept these shapes, and
`EffectMap` should widen to match the spec it cites.

**2. The reducer must support `money.commitments.add`.** Commit emits it,
following the `money.debt.add` convention. Without it, Goal Builder's commitment
silently fails to bind.

**3. `MiniGame.play()` versus a rendered component.** §6.4 declares
`play(ctx): Promise<MiniGameResult>`; §10.1 says the mini-game is "rendered by
the game owner's component", and `games/example` already anticipates a
`<Name>.tsx` the runtime mounts. Every game in the app hits this. P3's games
export a `UiMiniGame` (`games/everyday/shared/game.ts`) carrying a `Component`;
`play()` is implemented so the registry contract holds but rejects with an
instruction rather than pretending to run headlessly. **Decide which form is
canonical before P4 and P5 each invent their own answer.**

Also: `core/random` is still empty, so the verbs use a local seeded RNG at
`runtime/verbs/shared/rng.ts`. Delete it when yours lands.

### P1

`features/arcade/ArcadeRoute.tsx` runs on a sandbox persona with a temporary
picker. Swap it for the real character once `classify()` exists — the TODO is
marked. Persona shape used today: `lifeStage`, `circumstance`,
`moneyPersonality`, `maturity`, `age`.

Two findings from enumerating ten personas against §7.5, both worth deciding
before the classifier is final:

- **The modifiers can produce an impossible starting state.** A school student
  on a ₹800 allowance with ₹350 of needs, plus the "shares household bills"
  modifier of +₹1,000–3,000, starts at about −₹550 a month. The modifiers are
  flat rupee amounts added to incomes that differ by 15×.
- **Most goals do not finish inside the 12-month year.** On §7.5's numbers, 6 of
  10 personas need 18–30 months. §7.5 treats "goal over a year away" as an
  alternate flow in UC-PB-03, but it is the majority case — so the year-1
  milestone path should be the designed path, not a fallback, or most students
  end the year reading it as failure.

### P4

The verbs and games ship plain semantic class hooks (`.triage__card`,
`.rank__ladder`, `.arcade__card`…) rather than Tailwind utilities in the JSX, and
are styled in one `@layer components` block at the bottom of `src/index.css`
using your tokens. Restyling them is that one file, not nine components.

### P5

`content/scenarios/safe/rescue-mission.json` sits in the safe pillar but is
P3's: UC-SAFE-10 moved to P3 because it runs on the Rank verb
(work_division §P3.6). The Help card content is there for the dashboard.

---

## Status

| | |
|---|---|
| MVP use cases | 4 of 9 built |
| Tests | 53 passing (whole repo) |
| Content | 335 English keys, 0 missing references |
| Languages | English complete; te / hi / ur not started |
| CI | typecheck, lint, test, build, content validator |
