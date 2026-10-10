import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Badge, Button, Card, Notice, Spinner } from '@/ui';
import { LANGUAGE_NAMES, supabaseOrThrow, type ClassRow } from './data';

type ClassWithCount = ClassRow & { players: { count: number }[] };

export function ClassList() {
  const [classes, setClasses] = useState<ClassWithCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabaseOrThrow()
      .from('classes')
      .select('id, name, centre, language, join_code, expected_size, focus, created_at, players(count)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setClasses((data as ClassWithCount[] | null) ?? []);
      });
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold">Your classes</h1>
        <Link to="new">
          <Button>＋ New class</Button>
        </Link>
      </div>

      {error && <Notice tone="bad">{error}</Notice>}
      {classes === null && <Spinner />}

      {classes?.length === 0 && (
        <Card className="py-12 text-center">
          <h2 className="mt-3 text-lg font-bold">No classes yet</h2>
          <p className="mt-1 text-ink-soft">Create a class to get a join code and QR for your students.</p>
          <Link to="new" className="mt-5 inline-block">
            <Button>Create your first class</Button>
          </Link>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {classes?.map((c) => {
          const students = c.players[0]?.count ?? 0;
          return (
            <Link key={c.id} to={`class/${c.id}`} className="block">
              <Card className="h-full transition hover:border-brand">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{c.name}</h2>
                    {c.centre && <p className="text-sm text-muted">{c.centre}</p>}
                  </div>
                  <span className="rounded-lg bg-surface-2 px-2 py-1 font-mono text-sm font-bold tracking-wider">{c.join_code}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="info">
                    {students}
                    {c.expected_size ? ` / ${c.expected_size}` : ''} students
                  </Badge>
                  <Badge>{LANGUAGE_NAMES[c.language] ?? c.language}</Badge>
                  {c.focus && <Badge tone="warn">Focus: {c.focus}</Badge>}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
