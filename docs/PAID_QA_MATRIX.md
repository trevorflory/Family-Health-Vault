# Local Full-Test + Paid QA matrix

Exercise **all** family-side paths on-device before GCP / Stripe / live EHR marketplace.

## Targets

1. **Phone** — Expo iOS/Android (device or emulator)
2. **Desktop web** — `npm run web` (port 43127), wide window
3. **Phone frame on desktop** — 390×844 and 430×932 (app web frame is 390×844)

## A. Automated smoke

1. Sandbox → **Run full local path** (seed → appt/vital/profile → EHR simulator → digest/SBAR + WALLET_PRO)
2. Or jest: `ltcEhrIngestion`, `ltcVaultBridge`, `sharedGuardrails`, `effectiveVault`

## B. Manual wallet CRUD

1. Open Dad care hub → **Profile (local)** — save name/conditions/allergies
2. **Prescriptions** — edit meds → Daily digest reflects overrides
3. **Medical Appointments** — add/edit/delete → appears in digest ≤72h when dated soon
4. **Vitals (local)** — add BP → Insights / MedicalEvents
5. **MedicalEvents inbox** — confirm / reject / edit raw text

## C. EHR simulator (QA only — not staff charting)

1. Sandbox → **EHR ingest simulator**
2. Preset **Primary POA clinical** → family feed clinical
3. Preset **Secondary schedule-only** → schedule without meds
4. Preset **Unsubscribe** → feed denies Primary
5. Custom med / vital inject → vault bridge

## D. WALLET_PRO (no Stripe)

1. `/family-feed/upgrade` → Enable sandbox PRO (persists on web reload)
2. FOI / SBAR reachable; disable PRO → upgrade gate returns
3. Repeat on phone + desktop + 390×844 / 430×932

## Explicitly deferred

- Real Postgres / Montreal / AWS
- Stripe
- Live PointClickCare marketplace OAuth
