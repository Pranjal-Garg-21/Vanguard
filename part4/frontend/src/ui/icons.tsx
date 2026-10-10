/** Small plain icons for the investing screens. Stroke icons that inherit the text colour. Owner: P4. */

type IconProps = { className?: string };

export function CheckIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

const ROTATION = { down: 'rotate-0', up: 'rotate-180', left: 'rotate-90', right: '-rotate-90' } as const;

export function ChevronIcon({ dir = 'down', className = 'h-4 w-4' }: IconProps & { dir?: keyof typeof ROTATION }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} ${ROTATION[dir]}`} aria-hidden="true">
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}
