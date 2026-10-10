/**
 * Small line-icon set for the phone and the Stay Safe screens. Plain SVG, no
 * emoji, so the look is the same on every device. Stroke follows the text colour.
 */
const PATHS = {
  message: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z',
  chat: 'M4 5h16v11H9l-5 4V5Z',
  mail: 'M3 6h18v12H3V6Zm0 0 9 7 9-7',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 0V6a2 2 0 0 1 2-2h12M16 14h2',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm5 12 5 5',
  lock: 'M6 11h12v9H6v-9Zm2 0V8a4 4 0 0 1 8 0v3',
  flag: 'M5 21V4m0 0h12l-2 4 2 4H5',
  clock: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 4v4l3 2',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2Zm4 4h4',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Zm-3 9 2.2 2.2L15.5 10',
  alert: 'M12 4 3 20h18L12 4Zm0 6v4m0 3v.01',
  check: 'M5 12.5 10 17.5 19 7',
  x: 'M6 6l12 12M18 6 6 18',
  back: 'M15 5l-7 7 7 7',
  home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z',
  signal: 'M5 18v-3m5 3v-6m5 6V9m5 9V5',
  battery: 'M3 9h15v6H3V9Zm15 2h3v2h-3',
  gift: 'M4 11h16v9H4v-9Zm-1-4h18v4H3V7Zm9 0v13M12 7c-3 0-5-4-2-4 2 0 2 2 2 4Zm0 0c3 0 5-4 2-4-2 0-2 2-2 4Z',
  key: 'M14 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-3 3 9 9m-3-3 2-2m-5-1 2-2',
  user: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-7 16a7 7 0 0 1 14 0',
  eyeOff: 'M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Zm3-6 12 12',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1',
  rupee: 'M7 5h10M7 9h10M7 5c5 0 7 2 6 5-1 3-4 4-6 4l6 6',
  camera: 'M4 8h4l2-3h4l2 3h4v11H4V8Zm8 3a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z',
  qr: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h2v2h-2v-2Zm4 0h2v6h-6v-2h4v-4Z',
  star: 'M12 4l2.5 5.2 5.5.8-4 4 1 5.7-5-2.7-5 2.7 1-5.7-4-4 5.5-.8L12 4Z',
  target: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 3.5a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1Z',
  arrowRight: 'M5 12h14m-5-5 5 5-5 5',
  chevronDown: 'M6 9l6 6 6-6',
  refresh: 'M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'h-5 w-5', label }: { name: IconName; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
