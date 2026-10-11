/**
 * ingest: receives a batch of gameplay events from a student phone. Owner: P5.
 *
 * POST { classCode, player: { pid, displayName }, events: GameEvent[] }
 * → { accepted, rejected, unlocks, focus }
 *
 * Runs with the service role (Supabase injects SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY), so students need no database access.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { validateEvent, type GameEvent } from '../../../../shared/telemetry/event.ts';
import { MAX_BATCH_SIZE, type IngestRequest, type IngestResponse } from '../../../../shared/sync/protocol.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body: IngestRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }

  const { classCode, player, events } = body ?? {};
  if (typeof classCode !== 'string' || !player?.pid || !Array.isArray(events)) {
    return json({ error: 'classCode, player and events are required' }, 400);
  }
  if (events.length > MAX_BATCH_SIZE) return json({ error: `max ${MAX_BATCH_SIZE} events per batch` }, 413);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: cls } = await db
    .from('classes')
    .select('id, focus, consent_confirmed')
    .eq('join_code', classCode.toUpperCase())
    .maybeSingle();
  if (!cls || !cls.consent_confirmed) return json({ error: 'unknown class code' }, 404);

  const now = new Date().toISOString();
  const { error: playerError } = await db.from('players').upsert(
    { pid: player.pid, class_id: cls.id, display_name: String(player.displayName ?? '').slice(0, 40), last_sync: now },
    { onConflict: 'pid' },
  );
  if (playerError) return json({ error: 'could not save player' }, 500);

  const valid: GameEvent[] = [];
  const rejected: IngestResponse['rejected'] = [];
  for (const raw of events) {
    const result = validateEvent(raw);
    if (!result.ok) rejected.push({ eid: String((raw as { eid?: unknown })?.eid ?? ''), errors: result.errors });
    else if (result.event.pid !== player.pid) rejected.push({ eid: result.event.eid, errors: ['pid mismatch'] });
    else valid.push(result.event);
  }

  if (valid.length) {
    const rows = valid.map((e) => ({
      eid: e.eid,
      pid: e.pid,
      class_id: cls.id,
      mode: e.mode,
      activity: e.activity,
      concept: e.concept,
      choice: e.choice,
      correct: e.correct,
      misconception: e.misconception,
      level: e.level,
      life_stage: e.lifeStage,
      stage: e.stage,
      timeline: e.timeline,
      ts: new Date(e.ts * 1000).toISOString(),
      v: e.v,
    }));
    // Duplicates (already-received eids) are ignored, so retries are safe.
    const { error } = await db.from('events').upsert(rows, { onConflict: 'eid', ignoreDuplicates: true });
    if (error) return json({ error: 'could not save events' }, 500);
  }

  const { data: unlocks } = await db.from('unlocks').select('target, from_date').eq('class_id', cls.id);
  const { data: scenarios } = await db
    .from('custom_scenarios')
    .select('id, version, title, brief, concept, language, body')
    .eq('class_id', cls.id)
    .eq('status', 'published');

  const response: IngestResponse = {
    accepted: valid.map((e) => e.eid),
    rejected,
    unlocks: (unlocks ?? []).map((u) => ({ target: u.target, fromDate: u.from_date })),
    focus: cls.focus,
    scenarios: scenarios ?? [],
  };
  return json(response);
});
