# Local Full-Test + Paid QA matrix

Exercise **all** family-side paths on-device before GCP / Stripe / live EHR marketplace.

## Start the app first

URLs only resolve while Metro web is running:

```bash
npm run web
```

Base: **http://localhost:43127**

In-app board (tap Links — preferred): [http://localhost:43127/qa-links](http://localhost:43127/qa-links)

Also: Home → Developer → **QA links**, or Sandbox → **QA links board**.

## Targets

1. **Phone** — `npm start` → Expo Go QR (or `npm run android` / `ios`)
2. **Desktop web** — `npm run web` → open [http://localhost:43127](http://localhost:43127)
3. **Phone frame** — web shell is already **390×844**; check **430×932** via DevTools device mode on the same origin

## Clickable QA URLs (desktop web)

| Route | URL |
| --- | --- |
| QA links board | [http://localhost:43127/qa-links](http://localhost:43127/qa-links) |
| Home | [http://localhost:43127/](http://localhost:43127/) |
| QA Sandbox | [http://localhost:43127/sandbox](http://localhost:43127/sandbox) |
| EHR ingest simulator | [http://localhost:43127/sandbox/ehrSimulator](http://localhost:43127/sandbox/ehrSimulator) |
| Local LLM sandbox | [http://localhost:43127/sandbox/aiTest](http://localhost:43127/sandbox/aiTest) |
| My Family | [http://localhost:43127/family](http://localhost:43127/family) |
| Family feed (→ res-1) | [http://localhost:43127/family-feed](http://localhost:43127/family-feed) |
| Family feed · Dad LTC | [http://localhost:43127/family-feed/res-1](http://localhost:43127/family-feed/res-1) |
| WALLET_PRO upgrade | [http://localhost:43127/family-feed/upgrade](http://localhost:43127/family-feed/upgrade) |
| Daily digest | [http://localhost:43127/digest/daily](http://localhost:43127/digest/daily) |
| Weekly digest | [http://localhost:43127/digest/weekly](http://localhost:43127/digest/weekly) |
| Dad care hub | [http://localhost:43127/patient/pt-7801](http://localhost:43127/patient/pt-7801) |
| Dad · Profile | [http://localhost:43127/patient/pt-7801/profile](http://localhost:43127/patient/pt-7801/profile) |
| Dad · Appointments | [http://localhost:43127/patient/pt-7801/appointments](http://localhost:43127/patient/pt-7801/appointments) |
| Dad · Vitals | [http://localhost:43127/patient/pt-7801/vitals](http://localhost:43127/patient/pt-7801/vitals) |
| Dad · Events inbox | [http://localhost:43127/patient/pt-7801/events](http://localhost:43127/patient/pt-7801/events) |
| Dad · FOI | [http://localhost:43127/patient/pt-7801/foiWizard](http://localhost:43127/patient/pt-7801/foiWizard) |
| Dad · SBAR | [http://localhost:43127/patient/pt-7801/sbarExport](http://localhost:43127/patient/pt-7801/sbarExport) |
| Dad · 811 | [http://localhost:43127/patient/pt-7801/call811Prep](http://localhost:43127/patient/pt-7801/call811Prep) |

If a link fails with connection refused, restart `npm run web` — the port must be listening.

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

1. [http://localhost:43127/family-feed/upgrade](http://localhost:43127/family-feed/upgrade) → Enable sandbox PRO (persists on web reload)
2. FOI / SBAR reachable; disable PRO → upgrade gate returns
3. Repeat on phone + desktop + 390×844 / 430×932

## Explicitly deferred

- Real Postgres / Montreal / AWS
- Stripe
- Live PointClickCare marketplace OAuth
