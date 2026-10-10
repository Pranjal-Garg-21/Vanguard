import type { ReactNode } from 'react';

/** Full-height, phone-width page used by the student setup screens. */
export function StudentScreen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-transparent">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
        <div className="flex-1">{children}</div>
        {footer && <div className="pt-6">{footer}</div>}
      </main>
    </div>
  );
}
