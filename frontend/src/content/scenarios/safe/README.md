# Stay Safe scenarios (P5)

| Path | What |
|---|---|
| `*.json` | Static phone scripts, each one a complete scenario (listed by `listScenarios()`) |
| `templates/` | Scripts with `{placeholders}`, turned into seeded variants by `upi-simulator/logic/variants.ts` |
| `pools/` | Message pool for the Scam Inbox and the UPI check questions |

Every script field that shows text is an i18n key in `content/i18n/en/safe.json`. Add a static script here and it appears in `/dev/phone`; the validator test checks every red flag can be found and every text key exists.
