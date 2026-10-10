/**
 * Facilitator dashboard: login, classes, plan, insights. Owner: P5.
 * Lazy-loaded at /facilitator so students never download it.
 */
import { Route, Routes } from 'react-router';
import { isSupabaseConfigured } from '@/platform';
import { Card, Notice, Spinner } from '@/ui';
import { ClassDetail } from './ClassDetail';
import { ClassList } from './ClassList';
import { CreateClass } from './CreateClass';
import { useFacilitator, useSession } from './data';
import { FacilitatorLayout } from './FacilitatorLayout';
import { LoginScreen } from './LoginScreen';

export default function FacilitatorApp() {
  if (!isSupabaseConfigured()) {
    return (
      <Centered>
        <Notice>
          Supabase is not configured. Copy <code>frontend/.env.example</code> to <code>frontend/.env.local</code>, fill in the
          URL and key, and restart <code>npm run dev</code>.
        </Notice>
      </Centered>
    );
  }
  return <SignedInGate />;
}

function SignedInGate() {
  const session = useSession();
  const { loading, facilitator } = useFacilitator(session?.user.id);

  if (session === undefined) return <Spinner />;
  if (!session) return <LoginScreen />;
  if (loading) return <Spinner />;

  if (!facilitator) {
    return (
      <FacilitatorLayout email={session.user.email}>
        <Card className="space-y-3">
          <h1 className="text-xl font-bold">Your account isn’t set up as a facilitator yet</h1>
          <p className="text-ink-soft">Ask your NGO admin to add you. In the Supabase SQL editor they can run:</p>
          <pre className="overflow-x-auto rounded-xl bg-bg p-3 text-sm text-brand">
            {`insert into facilitators (id, display_name)\nvalues ('${session.user.id}', 'Your name');`}
          </pre>
          <p className="text-sm text-muted">Then refresh this page.</p>
        </Card>
      </FacilitatorLayout>
    );
  }

  return (
    <FacilitatorLayout email={session.user.email} name={facilitator.display_name}>
      <Routes>
        <Route index element={<ClassList />} />
        <Route path="new" element={<CreateClass ngoId={facilitator.ngo_id} />} />
        <Route path="class/:id" element={<ClassDetail />} />
      </Routes>
    </FacilitatorLayout>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">{children}</div>;
}
