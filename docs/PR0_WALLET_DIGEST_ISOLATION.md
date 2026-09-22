# PR0 — Wallet digest slice isolation

The in-flight caregiver digest / effective-vault work stays on the existing layer paths and must not be rewritten by LTC EHR scaffolding:

- `services/caregiverPrompts.ts`
- `services/caregiverAdvice.ts`
- `services/effectiveVault.ts`
- `db/visitGoals.ts` (+ `.web.ts`)
- `services/digestEngine.ts` (consume-only from LTC; no schema fork)
- related `app/digest/*`, `app/index.tsx`, tests

LTC EHR integration lands under `packages/shared/`, `server/`, `services/ehr/`, `data/ehrPlaybooks.ts`, and `app/family-feed/` so digestEngine merge thrash is avoided.
