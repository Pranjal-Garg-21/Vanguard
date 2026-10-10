# shared

Code used by **both** the frontend and the backend. Keep it plain TypeScript with no dependencies and with `.ts` extensions on imports, so Vite and Deno (Supabase edge functions) can both load it.

| Folder | What | Owner |
|---|---|---|
| `telemetry/` | `GameEvent` format and `validateEvent()` | P5 |
| `sync/` | Ingest request and response shapes | P5 |

Frontend imports it as `@shared/...`. Backend functions import it with a relative path.
