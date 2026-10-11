/**
 * "Scenarios" tab: the facilitator's own scam practice for this class.
 * Write a few messages, mark what gives the scams away, preview as a student,
 * then publish. Students get it at their next sync. Owner: P5.
 */
import { useCallback, useEffect, useState } from 'react';
import { validateCustom } from '@shared/custom/scenario.ts';
import { Badge, Button, Card, Icon, Notice, Spinner } from '@/ui';
import concepts from '@/content/facilitator/concepts.json';
import { timeAgo, type ClassRow } from '../data';
import { conceptName } from '../insights';
import { deleteScenario, listScenarios, setStatus, type ScenarioRow } from './api';
import { ScenarioEditor } from './ScenarioEditor';

export function ScenariosTab({ cls }: { cls: ClassRow }) {
  const [rows, setRows] = useState<ScenarioRow[] | null>(null);
  const [editing, setEditing] = useState<ScenarioRow | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await listScenarios(cls.id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load scenarios.');
      setRows([]);
    }
  }, [cls.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (rows === null) return <Spinner />;

  if (editing) {
    return (
      <ScenarioEditor
        classId={cls.id}
        existing={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await load();
        }}
      />
    );
  }

  const act = async (job: () => Promise<void>) => {
    try {
      await job();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Your own scam practice</h2>
          <p className="text-sm text-ink-soft">Write messages like the ones your students see, mark what gives the scams away, and share them with this class.</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Icon name="plus" className="h-4 w-4" />
          New scenario
        </Button>
      </div>

      <Notice tone="info">
        Published scenarios appear on your students' phones under <strong>From your facilitator</strong> at their next sync. They play offline once downloaded, and the
        answers show up in Insights.
      </Notice>
      {error && <Notice tone="bad">{error}</Notice>}

      {rows.length === 0 && (
        <Card className="space-y-2 py-10 text-center">
          <h3 className="text-lg font-bold">No scenarios yet</h3>
          <p className="text-ink-soft">Start with a scam you have seen in your area, plus one real message so students learn not to block everything.</p>
          <div>
            <Button onClick={() => setEditing('new')}>Create your first scenario</Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{r.title}</h3>
                <p className="text-sm text-muted">
                  {r.body.messages.length} messages · tests {conceptName(r.concept)} · edited {timeAgo(r.updated_at)}
                </p>
              </div>
              <Badge tone={r.status === 'published' ? 'good' : 'neutral'}>{r.status === 'published' ? 'Published' : 'Draft'}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" className="!min-h-9 text-sm" onClick={() => setEditing(r)}>Edit and preview</Button>
              {r.status === 'draft' ? (
                <Button
                  className="!min-h-9 text-sm"
                  onClick={() => {
                    // A draft can be saved half finished, so check it is ready before students see it.
                    const problems = validateCustom({ title: r.title, brief: r.brief, concept: r.concept, body: r.body }, Object.keys(concepts));
                    if (problems.length > 0) return setError(`"${r.title}" is not ready: ${problems[0]} Open it with Edit and preview to fix it.`);
                    void act(() => setStatus(r.id, 'published'));
                  }}
                >
                  Publish to class
                </Button>
              ) : (
                <Button variant="secondary" className="!min-h-9 text-sm" onClick={() => void act(() => setStatus(r.id, 'draft'))}>Unpublish</Button>
              )}
              <Button
                variant="ghost"
                className="!min-h-9 text-sm !text-bad"
                onClick={() => {
                  if (window.confirm(`Delete "${r.title}"? Students will no longer see it.`)) void act(() => deleteScenario(r.id));
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
