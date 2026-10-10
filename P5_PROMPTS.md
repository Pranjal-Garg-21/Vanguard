# P5 Build Prompts

Sequential prompts for building the rest of P5 (Stay Safe, Platform & Facilitator) end to end. Paste them **one at a time, in order**, into a fresh Claude Code session opened in this repo. Finish, review and merge each one before starting the next.

Every prompt starts by pointing the agent at the **Ground rules** (section A), **Learning design** (section B) and **Decisions** (section C) below, so those apply everywhere without being repeated. Edit section C before you start if you want different choices.

| # | Prompt | Builds | Why this order |
|---|---|---|---|
| 1 | Sync engine | Phone → Supabase → dashboard loop | Unblocks real data for everything after; depends on nobody |
| 2 | Accessibility and settings | `useAccessibility`, timers-off, reduce motion, large text, read-aloud, settings screen | Every game after this uses these hooks |
| 3 | Fake phone | Phone shell, apps, script runner, `SingleMessage` | Foundation for all Stay Safe games; P3 needs `SingleMessage` |
| 4 | Judge and Act in-situ verbs | Scam lens, tells, post-mortem replay, tell cards | Shared by UPI Simulator and Scam Inbox |
| 5 | UPI Simulator | UC-SAFE-01, S1 | First complete game |
| 6 | Scam Inbox | UC-SAFE-03 full game + single-message mode | Second game, reuses everything above |
| 7 | Offline app (PWA) | Install, caching, safe updates, offline e2e test | Hardening once real screens exist |
| 8 | Backend summaries and demo data | Aggregate job, seed script, pre/post gain | Makes the dashboard meaningful |
| 9 | Facilitator finishing | Discussion cards, signed session QR, polish | Completes UC-FAC-01 to 03 |
| 10 | Hardening and demo | Real-device pass, privacy and a11y checks, demo script | Last |

---

## A. Ground rules (apply to every prompt)

### Read first
- `TEAM_GUIDE.md`: what exists, platform API, how to add things.
- `REPO_STRUCTURE.md`: folders, ownership, import rules.
- `P5_implementation.md`: the phase this prompt covers.
- `Implementation.md`: the use case named in the prompt (search for its ID, e.g. `UC-SAFE-01`).
- The existing code in the folders you'll touch. Match its style, naming and comment density.

### Code
- TypeScript strict. No `any`, no `@ts-ignore`, no disabled lint rules.
- Rules, scoring, state machines and generators go in a `logic/` folder or `core/`: pure functions, no React, no `@/platform`. Every `logic/` file gets a `*.test.ts` next to it.
- Data access only through `@/platform`. Never import Dexie or Supabase outside `src/platform` and `src/facilitator`.
- Student-visible text goes through `t()` with keys in `frontend/src/content/i18n/en/<namespace>.json`. No hard-coded user-facing strings in components.
- Scenario content (messages, scripts, variants, check questions) lives in JSON under `frontend/src/content/scenarios/safe/`, not in components.
- Small components (under ~150 lines). Split by screen or responsibility, not by "helpers".
- Comments explain *why*, never narrate *what*. No commented-out code, no TODOs without an owner.
- No new dependency unless it clearly saves real work; say why in the summary.
- Every screen handles its real states: loading, empty, error, offline, and (for games) timers-off and reduce-motion.

### Quality bar: what "not AI slop" means here
- **Specific, not generic.** A message from "RAHUL K." about a ₹1,200 cricket bat, not "User X sent a request". Names, places, prices and situations a 16–17-year-old in Hyderabad would recognise.
- **Plain, warm copy.** Short sentences. Talk to the student as "you". No corporate phrasing ("leverage", "seamless"), no hype, no exclamation marks in every line, no emoji used as decoration. One emoji where it carries meaning (a 🔒 on a tell card) is fine.
- **Nothing fake-finished.** No "Coming soon" inside a game you're building, no dead buttons, no lorem ipsum, no placeholder images.
- **Restraint in visuals.** One accent colour, generous spacing, clear hierarchy, 44 px minimum tap targets. No gradients, glows or confetti unless they mean something. Motion only to show cause and effect (money leaving the balance), and none when reduce-motion is on.
- **Believable but generic.** Screens look like a real phone and payment app, but never copy a real brand's name, logo, colours or layout.
- **Every interaction teaches or moves forward.** If a tap doesn't do either, remove it.

### Safety and privacy (never break)
- Everything is simulated. Never ask about, store or analyse a student's real money, family, messages, contacts or experiences.
- No real bank, app, fund, company, telecom or brand names. Use generic ones ("Pay app", "your bank", "AX-BNKUPD").
- Events contain IDs only. No names, no free text.
- Never blame the victim. The message is always "scammers are professionals; here's how to spot them", never "you were careless".

### Finishing every prompt
1. Run in `frontend/`: `npm run typecheck && npm run lint && npm test && npm run build`. All must pass with no new lint warnings.
2. Click through every new screen in the browser at phone width (375 px) and desktop, with timers-off and reduce-motion both on and off.
3. Write a short summary: what changed, the files, decisions you made that weren't specified, what you couldn't verify, and anything I must do by hand (Supabase SQL, deploys, dashboard settings).
4. Update `TEAM_GUIDE.md` (and `REPO_STRUCTURE.md` or `backend/README.md` if relevant) so teammates can use what you built.
5. Commit on a branch named `p5/<topic>` with a plain, descriptive message. **No `Co-Authored-By` line or any AI attribution.** Don't push until I say so.

---

## B. Learning design (apply to every game)

These are what make the games teach, not just quiz.

1. **Act first, explain after.** The student makes a real-feeling decision before any lesson. The explanation lands harder after they've felt the consequence.
2. **Consequence, then cause.** Show what happened (balance drops, account blocked) before showing why. Then point to the exact moment and the exact clue.
3. **Teach the clue, not the answer.** Every scam is broken into **tells** from a small reusable set (urgency, too good to be true, asks for a secret, pretends to be someone, secrecy, odd link, name mismatch, pressure timer). Students learn to spot categories, so they can recognise a scam they've never seen.
4. **Make inspecting the habit.** Clues are hidden until the student looks (long-press a link to see where it really goes, tap a sender to see the real number). The reward is for checking, not guessing.
5. **Real messages exist too.** Every set includes genuine messages, and blocking them counts as a false alarm. The goal is good judgement, not fear.
6. **Short loops.** A single scenario takes 1–3 minutes. A full game is under 8.
7. **Second chances.** After a mistake, the student can replay the moment and choose differently. Mistakes are the best part of the lesson, never a dead end.
8. **Difficulty follows the student.** Tactics a student handles well come back harder (fewer typos, more convincing sender); tactics they miss come back sooner and simpler.
9. **Close with one real-world action.** Every debrief ends with one thing to do in real life ("A PIN is only for paying. If money is taken, call 1930 and your bank straight away.").
10. **Respect the student.** No shaming copy, no scores that feel like grades, no countdown anxiety when timers are off.

---

## C. Decisions baked into these prompts

From the decision log in `P5_implementation.md`. Change any line here before running the prompts and the agent will follow your version.

| ID | Decision | Choice |
|---|---|---|
| D2.2 | What each event logs | One event per choice (`A`) |
| D3.1 | Service worker | Generated by `vite-plugin-pwa` with custom runtime caching |
| D3.3 | Content download | Core pack first, rest in the background (`B`) |
| D4.1 | Phone surfaces | One phone shell + JSON scripts, using LifePath data when available (`C`) |
| D4.2 | Inspecting messages | Scam lens + tell card collection (`C`) |
| D4.3 | Post-mortem | Step-by-step replay of the student's own actions + "try that moment again" (`C`) |
| D4.4 | Realism | Sound and vibration, respecting settings (`B`) |
| D5.1 | UPI flow code | Hand-written state machine, no XState (`B`) |
| D5.2 | UPI replay value | Seeded variants + tactics that escalate by level (`C`) |
| D5.3 | UPI consequences | Loss stays in the LifePath ledger via `effects` (`B`) |
| D6.1 | Messages | Templates with seeded blanks (`B`) |
| D6.2 | Difficulty | Adaptive per tactic (`B`) |
| D6.3 | Engagement | Tell cards + a recurring fictional scam crew across stages (`B + C`) |
| D6.4 | Class hook | Not now |
| D7.3 | Class summaries | Recomputed by a SQL function after each ingest (`A`) |
| D7.4 | Dashboard privacy | Hide cells under 3 students (`B`) |
| D8.1 | Sync | Custom push/pull (`A`) |
| D8.2 | Offline channel | Internet only for now (`A`) |
| D8.3 | Session QR | Signed (`B`) |
| D9.3 | Data to action | Heatmap + ready-to-run discussion cards (`B`) |
| D9.4 | Facilitator offline | Online only (`A`) |

---

## Prompt 1: Sync engine

```text
You're building the sync engine for PaisaPath, P5's Phase 8. Read sections A, B and C of P5_PROMPTS.md and follow them throughout. Then read TEAM_GUIDE.md, P5_implementation.md (Phase 8 and Phase 2), shared/telemetry/event.ts, shared/sync/protocol.ts, backend/supabase/functions/ingest/index.ts and everything in frontend/src/platform/.

Goal: events a student records on their phone reach Supabase automatically when there's internet, and class unlocks come back down, without the student ever waiting or noticing.

Build in frontend/src/platform/sync/ (replace the stub, keep the exported names):

1. Push loop
   - Only profiles with a class code sync. "Play without a class" profiles never upload.
   - Group pending outbox events by profile (one ingest request has one player). Take up to MAX_BATCH_SIZE oldest events, mark them 'sending', POST an IngestRequest to `${VITE_SUPABASE_URL}/functions/v1/ingest` with the `apikey` header set to the publishable key.
   - Mark accepted eids 'sent'. Mark rejected eids with a new 'rejected' status (add it to OutboxStatus) so they're never retried; log them in dev. Put anything else back to 'pending'.
   - Repeat while there's more and the device is online.
   - Events stuck in 'sending' from a crashed run go back to 'pending' at startup.
2. Pull
   - Save the returned unlocks and focus into classCache for that class code.
   - Success → setClassStatus(pid, 'valid'). A 404 "unknown class code" → setClassStatus(pid, 'invalid') and stop syncing that profile until its code changes.
   - Export getClassInfo(code) and a useClassInfo(code) hook so P2 can read unlocks.
3. Triggers: app start, the browser 'online' event, the tab becoming visible, every 15 minutes while open, and 10 seconds after the last logEvent (debounced). Only one sync at a time across tabs (Web Locks API, with a module-level flag as fallback).
4. Retry with backoff after failures: 30 s, 1, 2, 4 … up to 30 min. Reset on success. Never retry while offline.
5. Status: keep useSyncStatus's shape; set 'syncing' during a run, 'error' after a failure (with a short reason for dev), lastSyncAt on success, and an accurate pending count.
6. Housekeeping: when the outbox exceeds 10,000 rows, delete 'sent' rows older than 7 days first.
7. Start sync once from main.tsx (a startSync() in platform), not from individual screens.

Also:
- /dev page: show sync state, pending count, last sync time, last error, and a "Sync now" button.
- The student home badge already reads useSyncStatus; check its wording is accurate for every state.
- Tests: with fetch mocked, cover batching, accepted/rejected/failed handling, backoff timing (fake timers), no-class profiles skipped, invalid class handling, and the stuck-'sending' recovery.

I'll deploy the function myself. At the end, tell me the exact command and how to verify: create a class, join it on the student app, log events on /dev, and see rows in the Supabase events table and the facilitator Insights tab within a minute.
```

---

## Prompt 2: Accessibility, settings and read-aloud

```text
You're making PaisaPath's accessibility settings real across the app (P5 owns setup and platform). Read sections A, B and C of P5_PROMPTS.md and follow them throughout. Then read TEAM_GUIDE.md, frontend/src/features/setup/, frontend/src/platform/profiles/ and frontend/src/app/.

Students choose four settings during setup (read aloud, bigger text, less movement, no timers), but nothing uses them yet. Make them work everywhere and give teammates simple hooks.

Build:
1. In platform: useAccessibility() returns the active profile's settings. Also export updateAccessibility(pid, partial) and updateLanguage(pid, language).
2. Bigger text: scale the whole app by setting a CSS variable on <html> (for example the root font size), so Tailwind rem sizes grow together. Check the setup flow, home and player picker don't break at the larger size.
3. Less movement: honour both the profile setting and the OS prefers-reduced-motion. Expose useReducedMotion(). Add a global CSS rule that removes non-essential transitions and animations when either is on.
4. No timers: a useCountdown(seconds, { onExpire }) hook. With timers off it still shows the timer (so students learn that pressure exists) but it never runs out and is visibly paused. Games must use this hook for any timer.
5. Read aloud: a speak(text) function and an <AudioButton textKey="…" /> using the browser's speech synthesis, with the language mapped to the best available voice. It speaks automatically on screen entry when "read aloud" is on, and never overlaps itself. P3 will later swap in recorded audio behind the same API, so keep it in platform/audio with a comment for P3. Add audio buttons to every setup screen title.
6. Settings screen at /settings, reachable from the student home header: language, the four accessibility toggles (same look as setup), "Switch player", and a short "About PaisaPath" line. Changes apply immediately.
7. Right-to-left: when the language is Urdu, set dir="rtl" on <html>. Check the setup flow, home and settings mirror correctly.

Keep the existing setup flow's look; extract shared pieces (the toggle row, the step header) rather than duplicating them. Write tests for useCountdown (timers on and off) and for the settings update functions.
```

---

## Prompt 3: The fake phone

```text
You're building the simulated phone that all Stay Safe games play on (P5 Phase 4, first half). Read sections A, B and C of P5_PROMPTS.md and follow them throughout. Then read TEAM_GUIDE.md, P5_implementation.md (Phase 4), Implementation.md (UC-SAFE-01, UC-SAFE-03, UC-BANK-02) and frontend/src/games/safe/.

Goal: one believable, generic phone that scam scenarios run on as data, so P5's games and P3's fake KYC SMS all share it.

Build in frontend/src/games/safe/phone/:
1. PhoneShell: a phone frame (full screen under 480 px wide, a centred device frame above that), status bar (time, battery, signal), home screen with app icons, back navigation, a notification banner that slides in, and an overlay layer for calls and permission dialogs. The clock shows the simulated time passed in as a prop (LifePath month and day when available, otherwise "today").
2. Apps, each a small component:
   - Messages: SMS list and thread. Sender IDs like "AX-BNKUPD" or a number.
   - Chat: a generic messenger with contact names, photos as initials, "online" and typing indicator.
   - Mail: inbox and message view, with the sender's real address visible only on inspect.
   - Pay: balance, linked bank, scan QR (a simulated camera view, not the real camera), pay screen with PIN pad, collect-request card, success and failure screens, history. Keep the structure ready for Prompt 5.
   - Call: incoming-call screen with caller name or number, accept and decline, optional audio.
   - Browser: a fake page inside a fake address bar, used for phishing pages.
   - PermissionDialog: "Allow <app> to read your contacts?" with Allow / Don't allow.
3. Scenario scripts as data: define a TypeScript type and a JSON format for a phone script (timed steps like "notify", "open app", "incoming call", "show page", plus steps triggered by student actions like "open_link", "enter_pin", "allow_permission"). Each step can carry tells (tell id + which part of the text or screen it points to) and simulated effects (for example money.bank: -1200).
4. Script runner in logic/: a pure reducer (state, action) → state that advances a script with a virtual clock, records every student action with a timestamp for the replay, and reports effects and outcome. The React side drives it with real timers through useCountdown from platform, so tests are deterministic.
5. SingleMessage: one message arriving inside a LifePath month. Props: the message, plus onResult(result) with the chosen response. This is what P3 and P2 will import; document the props in a comment with an example.
6. Feel: notification sound and short vibration (navigator.vibrate) on arrival, both off when audio is off or reduce motion is on.
7. Gallery at /dev/phone: every app in its main states, in LTR and RTL, so teammates can see and reuse them.

Content: write one complete example script (a fake KYC SMS leading to a phishing page that asks for an OTP) in frontend/src/content/scenarios/safe/scripts/. Use generic names only.

Design: it should look like a clean, modern, generic phone, not any real OS or app. Neutral greys, one accent colour per app, system-like fonts, real spacing. It must feel convincing enough that students forget for a moment that it's a game.

Tests: the script runner (timing, action-triggered steps, effects, recorded actions) and the JSON loader (rejects scripts with unknown step types or tells).
```

---

## Prompt 4: Judge and Act in-situ verbs

```text
You're building P5's two interaction verbs and the clue system every Stay Safe game uses (P5 Phase 4, second half). Read sections A, B and C of P5_PROMPTS.md and follow them throughout. Then read TEAM_GUIDE.md, P5_implementation.md (Phase 4, D4.2, D4.3), frontend/src/core/types/index.ts, frontend/src/games/safe/phone/ and frontend/src/runtime/.

1. Tell catalogue: frontend/src/content/scenarios/safe/tells.json with the reusable clue categories (urgency, too good to be true, asks for a secret, pretends to be someone, secrecy, odd link, name mismatch, pressure timer). Each has an id, an icon, a one-line name, a one-sentence "why scammers do this", and a "what to do instead". Write these carefully: they're the core of what students learn.
2. Scam lens: inside the phone, long-press (or tap an "Inspect" button) on a sender, link, number or field to reveal what's behind it: the real URL behind a short link, the real number behind "Mom", the sender ID behind a bank name. Inspecting a part that is a tell marks it as found. Make it keyboard and screen-reader accessible. Show a one-time hint the first time a student meets it.
3. Judge verb (runtime/verbs/judge/): shows one item (message, call, ad or screen) on the phone. The student inspects, then chooses Legit / Suspicious / Scam (or, in inbox mode, the four responses from UC-SAFE-03). Feedback shows tells found, tells missed, and why. Returns a MiniGameResult: one choice per item, conceptDeltas and misconceptions.
4. Act in-situ verb (runtime/verbs/act-in-situ/): runs a phone script and lets the student act freely (open, reply, pay, allow). Money and data move in the simulation. Then:
   - Post-mortem replay: step through the student's own recorded actions on the phone. At each step where a tell was visible, pause and highlight it with its explanation. Students control the pace (next / back); no auto-play when reduce motion is on.
   - "Try that moment again": from any paused step, restart the script from that point with the state as it was, and let them choose differently. Record both attempts in the result.
   - Effects are returned in MiniGameResult.effects only when ctx.mode is 'lifepath'.
5. Tell cards: the first time a student finds each tell category, they earn its card (stored per profile with setSetting). A small "Your clue cards" screen at /safe/cards shows earned and locked cards. Earning one shows a brief, calm moment, not confetti.

Write a tiny demo game using each verb with the example KYC script from Prompt 3, registered in games/registry.ts and reachable from /dev, so the verbs can be tried end to end before the real games exist.

Tests: tell detection from inspections, Judge scoring (including false alarms on genuine items), the replay step list, try-again state restoration, effects only in lifepath mode, card earning.
```

---

## Prompt 5: UPI Simulator

```text
You're building the UPI Simulator (UC-SAFE-01, LifePath stage S1), P5's first complete game. Read sections A, B and C of P5_PROMPTS.md and follow them throughout. Then read TEAM_GUIDE.md, P5_implementation.md (Phase 5), Implementation.md (UC-SAFE-01 and Stage S1), frontend/src/games/safe/phone/, frontend/src/runtime/verbs/ and frontend/src/games/example/.

The single idea students must leave with: a PIN is only ever for paying, never for receiving.

Flow (as a hand-written state machine in games/safe/upi-simulator/logic/machine.ts, every transition tested):
1. Hook: the character just opened a bank account; set up the Pay app on their phone.
2. Setup: link the bank account, set a UPI PIN while covering the keypad (a passer-by glances over; covering the keypad is the habit).
3. Task 1, a normal payment: scan the canteen QR, pay ₹50, enter the PIN, balance goes down. Feels routine on purpose.
4. Story: the character lists an old cricket bat for sale. A buyer messages in Chat: friendly, a bit pushy, "sending money now bhai".
5. Task 2, the trap: a collect request "<NAME> is requesting ₹<AMOUNT>" with a 15 s timer (useCountdown, so timers-off pauses it).
   - Enters PIN → balance goes DOWN. Pause on that number before explaining.
   - Declines, or the timer ends → safe outcome.
6. Post-mortem with the Act in-situ replay, pointing at the four tells: "is requesting" means money leaves you; receiving never needs a PIN; the timer is pressure; the name in chat doesn't match the name on the request.
7. Rule card: "You never need a PIN to receive money."
8. Two short follow-ups, each one screen: "scan this QR to receive" (the same trick with a QR), and how refunds for failed payments really work (automatic, no PIN, no calls).
9. Check: 3 quick scenario questions, then a one-line real-world action.

Variety and difficulty:
- Seeded variants (use the seed from MiniGameContext): buyer name, item, amount (₹800–₹2,000), wording. Every variant keeps all four tells.
- Level 1: obvious request with timer. Level 2: friendlier buyer plus a "payment sent" screenshot in chat. Level 3: the "I sent extra by mistake, please return ₹500" refund trick.

Integration:
- Export a MiniGame (id 'upi-simulator', verbs ['act-in-situ'], concepts upi_collect, qr_scam, pin_secrecy, refunds_failed_txn) and register it.
- logEvent for each decision with concept and choice IDs; misconception 'pin_needed_to_receive' when the PIN is entered on a collect request.
- In lifepath mode return effects { 'money.bank': -amount } and a flag fellForCollect so P2's scheduler can bring a variant back later.
- Mark the collect request as a checkpoint for P1's rewind (agree the flag name with P2's types; if not finalised, add an exported constant and note it in the summary).
- Add a /play/upi-simulator route so it can be played standalone until P2's runtime lands.
- Content: scripts and variants in content/scenarios/safe/upi-simulator.json; strings in content/i18n/en/safe.json.

Make it feel like a real afternoon on a phone, not a quiz. The moment the balance drops should be the most memorable beat of the game.
```

---

## Prompt 6: Scam Inbox

```text
You're building the Scam Inbox (UC-SAFE-03): a full Arcade game plus a single-message mode used in every LifePath stage. Read sections A, B and C of P5_PROMPTS.md and follow them throughout. Then read TEAM_GUIDE.md, P5_implementation.md (Phase 6), Implementation.md (UC-SAFE-03, UC-SAFE-04 red-flag categories, Section 8 stage events), and the phone, verbs and tells from earlier prompts.

Goal: students recognise scam messages and respond well, without becoming suspicious of everything.

1. Message templates (content/scenarios/safe/inbox/templates.json): about 16 skeletons with blanks (name, amount, deadline, link style, sender ID), each tagged with channel (SMS, chat, mail), tactic (fake KYC, prize, job, impersonation, loan app, investment), stages, level, its tells (attached to blanks so every variant knows its clues), the correct responses, and an optional "what would have happened" script. At least one genuine template for every four scams (school fee dates, a bank's real balance alert with no link, a friend returning money, a delivery that needs nothing from you). Fill lists live alongside and use local, believable values.
2. Generator in logic/: seeded, produces a message plus its tells. Tests prove every generated scam has at least one tell, every genuine message has none, and the same seed gives the same message.
3. Recurring scam crew: a fictional group (pick a name that isn't a real gang or brand) whose tactics evolve across stages: KYC texts in S1, job offers in S3, loan apps in S4, investment tips in S5. The debrief connects new tricks to ones the student has beaten before ("Same crew, new trick").
4. Full game:
   - A "day" on the phone: 5–8 messages across SMS, chat and mail, spaced from morning to night, with the genuine one at an unpredictable position.
   - For each: Block & report, Ignore, Open / respond, or Ask a trusted adult. The scam lens works on every message.
   - Opening a scam plays its safe "what would have happened" sequence (for example a job scam pays ₹100 first, then asks for a ₹2,000 "deposit").
   - End of day: correct calls, false alarms on genuine messages, clues found, and a debrief listing each message with its tells. No grade-like score.
5. Adaptive difficulty per tactic: track per-profile results by tactic (setSetting). Strong tactics come back at a higher level (fewer typos, more convincing senders); weak ones come back sooner. Swap to P1's mastery model later; keep this behind one function.
6. Single-message mode: export a list of stage messages and a mount function for P2's scheduler (agree the hook shape with P2; if theirs isn't ready, export registerSafetyEvents() from games/safe and document it). At most one per month. Uses SingleMessage from Prompt 3.
7. S1 gate items: 3 short check questions for P2's stage gate, in content.
8. Events: one per message with concept (fake_kyc, prize_scam, job_scam, impersonation, red_flags) and misconception (bank_will_call_for_otp when a KYC link is opened).
9. Register the MiniGame (id 'scam-inbox', verbs ['judge', 'act-in-situ']) and add /play/scam-inbox.

Writing quality matters most here. The scams must read like real Indian scam messages (the rhythm, the odd capitalisation, the urgency), while the genuine messages read like real ones from a school, bank or friend. Mark intentional spelling mistakes in the JSON so translators keep them.
```

---

## Prompt 7: Offline app (PWA)

```text
You're making PaisaPath install like an app and work fully offline (P5 Phase 3). Read sections A, B and C of P5_PROMPTS.md and follow them throughout. Then read TEAM_GUIDE.md, P5_implementation.md (Phase 3), Implementation.md (UC-SYS-01, UC-PLAT-01), frontend/vite.config.ts and frontend/src/main.tsx.

1. Manifest: name, short name, theme and background colours, portrait, standalone, and proper PNG icons (192, 512, maskable) generated from the existing logo into frontend/public/.
2. Caching (vite-plugin-pwa with runtime caching rules):
   - Precache the app shell. Keep it under 3 MB; add a script that fails CI if it isn't.
   - Content and strings: cache-first, versioned.
   - Audio, if any: cache-first, downloaded when a stage is reached.
   - Supabase API and functions: network-only (sync handles retries).
   - The facilitator dashboard stays lazy-loaded and out of the student precache.
3. Install prompt: catch beforeinstallprompt and show our own clear "Add PaisaPath to your home screen" card after the language step and on the home screen until installed or dismissed. On iPhone, show a short picture guide (Share → Add to Home Screen).
4. Safe updates: register with 'prompt'. Add a platform flag setInActivity(true/false) that games set while playing. Show "New version ready, restart when you finish" only when not in an activity, never mid-game.
5. Persistent storage: request navigator.storage.persist() after setup and show a gentle warning on /settings if it was refused or free space is under 50 MB.
6. Offline banner: a small, calm indicator when offline. No modal, no blocking.
7. End-to-end test with Playwright (add it to CI): build, serve, complete setup, go offline, reload, and confirm home, the player picker and one Stay Safe game still work.

In the summary, explain how to test install on a real Android phone over the local network.
```

---

## Prompt 8: Backend summaries and demo data

```text
You're finishing the backend so the facilitator dashboard shows meaningful, private class summaries (P5 Phase 7). Read sections A, B and C of P5_PROMPTS.md and follow them throughout. Then read TEAM_GUIDE.md, backend/README.md, P5_implementation.md (Phase 7 and 9), the migrations, the ingest function and frontend/src/facilitator/tabs/InsightsTab.tsx.

1. New migration (don't edit old ones): a SQL function refresh_class_summary(class_id) that fills class_concept_daily for today. For each student and concept, use their last 5 answers on that concept; under 40% correct is red, 40–70% amber, over 70% green (P1's thresholds; keep them as named constants in one place). Count students per band. Call it from the ingest function after inserting events, only for the affected class.
2. Pre/post gain: a SQL view or function giving, per pillar, the average correct share in precheck vs postcheck events. Map concepts to pillars with a small table seeded in the migration from content/concepts.json (create the mapping if P2 hasn't filled it; note it in the summary).
3. Insights tab: switch the concept section to class_concept_daily (red/amber/green counts per concept, grouped by pillar), keep the raw-events query only for misconceptions, and add the pre → post section. Hide cells with fewer than 3 students. Keep the empty states.
4. Demo data script (backend/scripts/seed-demo.ts, run with npx tsx, using SUPABASE_URL and SUPABASE_SECRET_KEY from backend/.env, never bundled into the frontend): creates or refreshes a "Demo · Grade 11 Batch A" class for a facilitator email I pass in, with 35 fake students (nicknames only), realistic events across S0–S2 over two weeks (most students strong on pin_secrecy, weak on upi_collect, a few repeated misconceptions), then runs the summary refresh. Re-running it replaces the demo data, never anything else.
5. Document in backend/README.md: which new SQL file to run, how to run the seed script, and how to redeploy ingest.

Tests: the band calculation (as a pure TypeScript twin of the SQL logic with the same fixtures), and the seed script's data generator (deterministic with a seed).
```

---

## Prompt 9: Facilitator finishing

```text
You're finishing the facilitator dashboard (UC-FAC-01 to 03; P5 Phase 9). Read sections A, B and C of P5_PROMPTS.md and follow them throughout. Then read TEAM_GUIDE.md, P5_implementation.md (Phase 9, D8.3, D9.3), Implementation.md (UC-FAC-01 to 03) and frontend/src/facilitator/.

1. Discussion cards: content/facilitator/prompts.json grows to one card per misconception in concepts.json (about 15). Each card has an opening question, a short scenario to read aloud, two follow-up questions, the in-app activity to replay together, and one takeaway line. Written for a facilitator with 10 minutes and no preparation. The Insights tab links each top misconception to its card; a card has a clean print layout (one per A4 page).
2. Signed session QR (offline unlocks):
   - A new edge function sign-session (facilitator auth required, checks the class is theirs) signs { classCode, unlocks, focus, expiresAt } with an Ed25519 private key stored as a Supabase secret. Add the public key to frontend/.env.example as VITE_SESSION_PUBLIC_KEY.
   - Plan tab: a "Show session QR" button that displays the signed QR full-screen for projecting, valid for 3 hours.
   - Student app: a "Scan session code" option in /settings that uses the camera (BarcodeDetector where available, a small fallback library otherwise), verifies the signature offline with WebCrypto, rejects expired or wrong-class codes, and applies the unlocks to classCache.
   - Document the key generation and secret commands in backend/README.md.
3. Polish: every facilitator page works one-handed on a phone; the class list shows students joined and last activity; creating a class shows its join code and QR straight away; errors say what to do next.

Tests: signature creation and verification (valid, expired, tampered, wrong class) as pure functions shared by both sides in shared/, and the session payload parsing.
```

---

## Prompt 10: Hardening and demo

```text
You're preparing P5's work for the demo (P5 Phase 10). Read sections A, B and C of P5_PROMPTS.md and follow them throughout. Then read TEAM_GUIDE.md, P5_implementation.md (Phase 10) and everything under frontend/src/games/safe, frontend/src/features/setup, frontend/src/facilitator and frontend/src/platform.

1. Accessibility audit of every P5 screen: keyboard-only use, visible focus, labels for screen readers, 44 px targets, contrast at least 4.5:1, bigger-text mode, reduce motion, timers off, and Urdu right-to-left inside the phone. Fix what fails.
2. Privacy checks as automated tests: a word-list test that fails if any real bank, app, telecom, fund or brand name appears in content or components; a test that every logged event passes validateEvent with no free text.
3. Performance on a low-end profile (Chrome DevTools: 4× CPU slowdown, slow 4G): the app opens in under 3 s, the phone shell animates smoothly or falls back to no animation, and the outbox handles 10,000 events without freezing. Fix the worst offenders.
4. Failure drills, each with an expected behaviour written in TEAM_GUIDE.md: network drops mid-sync, storage full, wrong class code, forgotten PIN, app update mid-game, two tabs open.
5. Demo script in DEMO.md (about 2 minutes), with exact clicks:
   1. Facilitator creates a class and projects the QR.
   2. A student phone scans it, sets up, and goes into airplane mode.
   3. Plays the UPI collect-request trap, falls for it, watches the replay, tries again.
   4. Turns the network on; the badge shows synced.
   5. The facilitator's Insights show pin_needed_to_receive at the top, with its discussion card.
   Include a reset checklist for running it again, and a fallback if the venue Wi-Fi fails (pre-seeded demo class).
6. Update TEAM_GUIDE.md and P5_implementation.md (mark each decision and phase as built, with any changes from the plan).

Finish by listing anything that's still not production-ready, honestly.
```
