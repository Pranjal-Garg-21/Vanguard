import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Icon, Spinner } from '@/ui';
import { LANGUAGE_NAMES, supabaseOrThrow, type ClassRow } from './data';
import { Hero, primary, Notice, Panel, Pill } from './theme';

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

  const totalStudents = classes?.reduce((sum, c) => sum + (c.players[0]?.count ?? 0), 0) ?? 0;
  const latest = classes?.[0];

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <Hero title="Create a class" body="Get a join code and a QR for your students. They join once, then play offline.">
          <Link to="new" className={primary}>
            <Icon name="plus" className="h-4 w-4" />
            New class
          </Link>
        </Hero>
        <Hero
          tone="blue"
          title="Your classroom at a glance"
          body={
            classes === null
              ? 'Loading your classes…'
              : `${classes.length} ${classes.length === 1 ? 'class' : 'classes'} · ${totalStudents} ${totalStudents === 1 ? 'student' : 'students'} joined`
          }
        >
          {latest && (
            <Link to={`class/${latest.id}`} className={primary}>
              Open {latest.name}
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          )}
        </Hero>
      </div>

      {error && <Notice tone="bad">{error}</Notice>}

      <Panel icon="school" title="Your classes" subtitle="Open a class to see what it understands, plan sessions and share the join code.">
        {classes === null && <Spinner />}

        {classes?.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-[#d5dbe5] px-6 py-14 text-center">
            <h3 className="text-lg font-bold">No classes yet</h3>
            <p className="mt-1 text-[#5b6577]">Create a class to get a join code and QR for your students.</p>
            <Link to="new" className={`${primary} mt-6`}>
              Create your first class
            </Link>
          </div>
        )}

        {!!classes?.length && (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {classes.map((c) => {
              const students = c.players[0]?.count ?? 0;
              const share = c.expected_size ? Math.min(1, students / c.expected_size) : null;
              return (
                <li key={c.id}>
                  <Link
                    to={`class/${c.id}`}
                    className="group flex h-full flex-col rounded-xl border border-[#e3e8ef] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#1c2538] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold group-hover:text-[#2563eb]">{c.name}</h3>
                        <p className="text-sm text-[#5b6577]">{c.centre ?? 'No centre set'}</p>
                      </div>
                      <span className="rounded-md bg-[#1c2538] px-2.5 py-1 font-mono text-sm font-bold tracking-widest text-white">{c.join_code}</span>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold">
                          {students}
                          {c.expected_size ? ` / ${c.expected_size}` : ''} students
                        </span>
                        {share !== null && <span className="text-[#7a8597]">{Math.round(share * 100)}% joined</span>}
                      </div>
                      {share !== null && (
                        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-[#eef1f6]">
                          <span className="block h-full rounded-full bg-[#2563eb]" style={{ width: `${share * 100}%` }} />
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2 pt-5">
                      <Pill tone="info">{LANGUAGE_NAMES[c.language] ?? c.language}</Pill>
                      {c.focus && <Pill tone="warn">Focus: {c.focus}</Pill>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
