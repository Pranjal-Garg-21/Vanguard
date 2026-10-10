/**
 * Facilitator dashboard: login, classes, plan, insights. Owner: P5.
 * Lazy-loaded at /facilitator so students never download it.
 * Placeholder until P5 Phase 9.
 */
import { isSupabaseConfigured } from '@/platform';

export default function FacilitatorApp() {
  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Facilitator</h1>
      <p>Login, class list, create class, plan and insights screens go here.</p>
      {!isSupabaseConfigured() && (
        <p className="rounded bg-amber-100 p-3">
          Supabase is not configured. Copy <code>frontend/.env.example</code> to <code>frontend/.env.local</code>.
        </p>
      )}
    </main>
  );
}
