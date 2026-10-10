/**
 * /gallery: every design kit component in its states, with right-to-left and large-text switches, and a one-line
 * "when to use it" for each. A dev page for the team, so its labels are plain English rather than translated keys.
 * Owner: P4.
 */
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { runFutures } from '@/core/market';
import {
  AssumptionsDrawer,
  AudioButton,
  Badge,
  BottomSheet,
  Button,
  Card,
  CoinStack,
  Dialog,
  FanChart,
  LockedTile,
  Meter,
  Notice,
  Pager,
  ProgressBar,
  RangeDisplay,
  SectionLabel,
  SimBanner,
  Spinner,
  Toast,
} from '@/ui';

const futures = runFutures({ weights: { mixed_basket: 1 }, months: 120, seed: 'gallery', monthly: 1000, runs: 200 });

function Item({ name, use, children }: { name: string; use: string; children: ReactNode }) {
  return (
    <Card className="space-y-3">
      <div>
        <h3 className="font-bold text-ink">{name}</h3>
        <p className="text-sm text-ink-soft">{use}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

export function Gallery() {
  const [rtl, setRtl] = useState(false);
  const [large, setLarge] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [toast, setToast] = useState(false);
  const [meter, setMeter] = useState(60);

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ fontSize: large ? '125%' : undefined }} className="min-h-dvh">
      <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <header className="space-y-3">
          <Link to="/dev" className="text-sm font-bold text-ink-soft hover:text-brand">
            Back to dev home
          </Link>
          <h1 className="text-3xl font-bold">Design kit gallery</h1>
          <p className="max-w-3xl text-ink-soft">Every component, in the states you will meet. Copy usage from here. All of them work at 360 px wide, with large text, and right-to-left.</p>
          <div className="flex flex-wrap gap-3">
            <Switch label="Right-to-left" on={rtl} onChange={setRtl} />
            <Switch label="Large text" on={large} onChange={setLarge} />
          </div>
        </header>

        <SectionLabel>Basics</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <Item name="Button" use="One clear action. Primary for the main step, secondary for the rest, ghost for small links, danger for things that cannot be undone.">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button disabled>Disabled</Button>
            </div>
            <Button size="lg" className="w-full">
              Large, full width
            </Button>
          </Item>
          <Item name="Card, Badge, Notice" use="Card groups one idea. Badge is a tiny label. Notice is a short message with a coloured edge.">
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="good">Good</Badge>
              <Badge tone="info">Info</Badge>
              <Badge tone="bad">Bad</Badge>
            </div>
            <Notice tone="info">Info: something worth knowing.</Notice>
            <Notice tone="warn">Warn: be careful here.</Notice>
            <Notice tone="bad">Bad: this did not work.</Notice>
          </Item>
          <Item name="ProgressBar, Meter, Spinner" use="ProgressBar for steps done. Meter for a value with a name (cash, trust). Spinner while loading.">
            <ProgressBar value={0.4} />
            <Meter label="Emergency fund" value={meter} tone="brand" />
            <Meter label="Cash" value={4000} max={10000} valueText="₹4,000" tone="info" />
            <Meter label="Stress" value={85} tone="bad" />
            <input type="range" min={0} max={100} value={meter} onChange={(e) => setMeter(Number(e.target.value))} className="w-full accent-brand" aria-label="Change the first meter" />
            <Spinner />
          </Item>
          <Item name="CoinStack" use="A quick feel for how much money. One coin per ₹1,000 by default, up to ten.">
            <div className="flex items-end gap-6">
              <CoinStack amount={0} label="₹0" />
              <CoinStack amount={2000} label="₹2,000" />
              <CoinStack amount={7000} label="₹7,000" />
              <CoinStack amount={50000} label="₹50,000" />
            </div>
          </Item>
        </div>

        <SectionLabel>Navigation and flow</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <Item name="Pager" use="Whenever a screen would show many cards. One idea per page, with a line on what to do now.">
            <Pager
              pages={[
                { id: 'a', title: 'First idea', hint: 'Read this, then continue.', content: <Card>One small thing to read.</Card> },
                { id: 'b', title: 'Second idea', hint: 'Pick something to go on.', content: <Card>Another small thing.</Card>, nextDisabled: true },
              ]}
            />
          </Item>
          <Item name="LockedTile" use="Something not open yet. The one-line reason teaches the order of things.">
            <LockedTile title="Mutual Fund Challenge" reason="Learn about funds first. It takes about 14 minutes." action={<Button variant="secondary">Learn first</Button>} />
            <LockedTile title="Investing" reason="You invest from savings, so build your emergency fund first." />
          </Item>
        </div>

        <SectionLabel>Overlays</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <Item name="BottomSheet, Dialog, Toast" use="BottomSheet for extra detail. Dialog to confirm something that cannot be undone. Toast for a short message that goes away.">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setSheet(true)}>
                Open a bottom sheet
              </Button>
              <Button variant="secondary" onClick={() => setDialog(true)}>
                Open a dialog
              </Button>
              <Button variant="secondary" onClick={() => setToast(true)}>
                Show a toast
              </Button>
            </div>
            <BottomSheet open={sheet} onClose={() => setSheet(false)} title="A bottom sheet">
              <p className="text-ink-soft">Extra detail goes here. Escape closes it, and focus stays inside while it is open.</p>
            </BottomSheet>
            <Dialog open={dialog} title="Start over?" body="Your week by week choices will be cleared." confirmLabel="Start over" onConfirm={() => setDialog(false)} onCancel={() => setDialog(false)} />
            {toast && <Toast message="Progress saved." tone="good" onClose={() => setToast(false)} />}
          </Item>
          <Item name="AudioButton" use="Reads a card aloud. Needs a browser voice; it hides itself where there is none.">
            <AudioButton text="A share is a small piece of ownership in a company." />
            <p className="text-sm text-muted">If you see no button, this browser has no voice.</p>
          </Item>
        </div>

        <SectionLabel>Guardrails (every investing screen)</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <Item name="SimBanner" use="On every investing screen. Not dismissable.">
            <SimBanner />
          </Item>
          <Item name="AssumptionsDrawer" use="Next to any projection. Shows the numbers used and what is left out.">
            <AssumptionsDrawer assetIds={['steady_box', 'mixed_basket', 'bumpy_ride']} inflation={{ value: 0.06, onChange: () => undefined }} />
          </Item>
          <Item name="RangeDisplay" use="The only way to show a projected amount: a range, never one number.">
            <RangeDisplay low={futures.summary.p5} median={futures.summary.median} high={futures.summary.p95} />
          </Item>
          <Item name="FanChart" use="Many possible futures at once: a wide band, a middle band, a median and what you put in.">
            <FanChart percentiles={futures.percentiles} invested={futures.invested} inflation={0.06} />
          </Item>
        </div>
      </main>
    </div>
  );
}

function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong px-3 text-sm font-bold text-ink-soft hover:border-brand"
    >
      <span className={`h-4 w-4 rounded-sm border-2 ${on ? 'border-brand bg-brand' : 'border-line-strong'}`} aria-hidden="true" />
      {label}
    </button>
  );
}
