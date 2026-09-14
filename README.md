# Healthcare App

Expo/React Native companion for Canadian sandwich-generation caregivers: FOI requests, 1-page SBAR visit summaries, 811 prep, digests, OCR / voice debriefs, emergency pass, and proxy access.

## Prerequisites

- **Node.js 20+** (22 LTS is fine) and npm
- Origin CLI in **WSL** on Windows (not PowerShell) — see [Origin CLI docs](https://cursor.com/docs/cli)

Repo: **[tflo/family-health-vault](https://cursor.com/codebase/tflo/family-health-vault)** (Private — change in repo settings if needed).

## Clone on Windows (WSL)

```bash
# Run in WSL (Origin CLI is not available in PowerShell)
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
# If `origin` is not found:
#   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc
origin auth login
origin repo clone tflo/family-health-vault
cd family-health-vault
npm install
npm run web
```

## Run locally (web — recommended)

```bash
npm install
npm run web
```

Open **[http://127.0.0.1:43127](http://127.0.0.1:43127)** in your browser.

Other scripts:

```bash
npm start          # Expo dev server (scan QR with Expo Go, or press `w` for web)
npm test           # Unit / smoke tests
npm run typecheck
npm run web:clear  # Web with Metro cache cleared (use if UI looks stale)
```

Web uses `sessionStorage`-backed DB stubs (`db/*.web.ts`) so Sandbox seed survives navigation. Native iOS/Android use SQLite via `expo-sqlite`.

## Manual test: MedicalEvents → SBAR

1. Home → **QA Sandbox** (or open `/sandbox`).
2. Tap **Seed local SQLite profiles** — confirm success mentions `me_seed_sha_lab_dad` and `me_seed_visit_debrief_dad`.
3. Open **Robert / Dad** → **Export Visit SBAR** (or `/patient/pt-7801/sbarExport`).
4. Visit reason e.g. `Nephrology follow-up — review kidney labs` → **Generate 1-page SBAR**.
5. Expect **Vault sources included** with visit debrief + lab OCR (eGFR), Background/Assessment filled from those events, and the Educational Context Summarizer notice.

## Modules (map)

### QA Local Testing Sandbox

- `utils/mockSeeder.ts` — Dad (78) / Child (4) SQLite seed fixtures
- `utils/sandboxFlows.ts` — digest / SBAR / SK HIPA FOI / 811 one-click runners
- `services/sbarNote.ts` — Dad SBAR HTML + `expo-print` PDF
- `app/sandbox/index.tsx` — QA console for core loops

### Multi-Generational Proxy Access

- `types/proxyAccess.ts` / `data/proxyGrants.ts` — roles, permissions, demo household grants
- `services/proxyAccessEngine.ts` — grant/revoke, permission checks, immutable access log, age-out hand-off
- `app/patient/[id]/proxyAccess.tsx` — manage proxies, invite sibling, age-out, link to Emergency Pass

### Emergency Offline Pass

- `services/emergencyPass.ts` — `generateEmergencyQR()` + wallet-card PDF HTML/`expo-print`
- `services/emergencyCrypto.ts` — AES-256-GCM encrypt/decrypt
- `data/emergencyProfiles.ts` — allergies / meds / contacts for offline export
- `app/patient/[id]/emergencyPass.tsx` — high-contrast QR + printable wallet card

### Local LLM Bridge (Simulator)

- `services/localAIClient.ts` — Ollama client + SaMD system prompt + offline fallback
- `data/mockHealthRecords.ts` — mock Dad health-record context for sandbox prompts
- `app/sandbox/aiTest.tsx` — ask questions against local Ollama / fallback

### Local OCR Document Ingestion

- `types/db.ts` — `MedicalEvents` schema / row types
- `services/ocrParser.ts` — tesseract.js OCR + lab/Rx regex parsers + SQLite save
- `db/medicalEvents.ts` / `db/client.ts` — local persistence
- `app/patient/[id]/uploadDoc.tsx` — camera/library capture, OCR spinner, verification UI

### Post-Visit Voice Debrief

- `services/audioDebrief.ts` — `expo-av` recording + local Whisper/mock transcription + MedicalEvents save
- `services/visitDebriefExtract.ts` — discussion / dosage / action-item extraction
- `app/patient/[id]/voiceDebrief.tsx` — large record button, timer, waveform, editable review

### Caregiver Digests (Sandwich Generation)

- `services/digestEngine.ts` — `compileDailyDigest()` / `compileWeeklyDigest()`
- `services/notificationScheduler.ts` — local pushes at 7:00 AM daily and 4:00 PM Sundays (`expo-notifications`)
- `app/digest/daily.tsx` / `app/digest/weekly.tsx` — deep-link dashboards
- `data/caregiverHousehold.ts` — demo household (Dad 78 Saskatoon, Leo 4 Regina, Self)

### 1-Page SBAR Summarizer

- `services/sbarEngine.ts` — async `compileSBAR()` educational context summarizer; folds MedicalEvents via `summarizeMedicalEvents` (no diagnosis / no prescribing)
- `services/sbarTemplate.ts` / `services/sbarGenerator.ts` — one-page HTML → PDF via `expo-print`
- `app/patient/[id]/sbarExport.tsx` — visit reason, caregiver notes, vault-source list, preview, share PDF
- Digest **Export Visit SBAR** deep-links here with `appointmentId`
- Sandbox seed includes Dad SHA lab OCR + visit debrief MedicalEvents for SBAR demos

### 811 Call Assistant

- `services/triage811Engine.ts` — `generate811Script()` contextual summarizer (no diagnosis / no prescribing)
- `app/patient/[id]/call811Prep.tsx` — symptom checklist, teleprompter script, `tel:811` call button
- `data/patientVault.ts` — multi-generational demo vault profiles

### FOI / Access to Information

- `services/foiGenerator.ts` — `generateFOIPDF()` via `expo-print` with provincial legal templates (ON PHIPA, SK HIPA, AB HIA, BC FIPPA/PIPA)
- `app/patient/[id]/foiWizard.tsx` — 4-step wizard (jurisdiction/facility → scope → authority proof → preview/actions)
- `db/foiRequests.ts` — local SQLite `FOIRequests` table with `DRAFT` / `DISPATCHED` status

See `PRD.md` and `.cursorrules` for product rules.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Clone fails / `origin` missing | Install Origin CLI in WSL and ensure `~/.local/bin` is on PATH (see above). |
| Port in use | `npx expo start --web --port 43128` (or free 43127). |
| Stale UI after pull | `npm run web:clear` |
| SBAR says no MedicalEvents | Seed Sandbox first in the **same browser tab**; web store is per-tab `sessionStorage`. |
| `expo-sqlite` / WASM errors on web | Ensure you are on current `main` (web stubs under `db/*.web.ts`). |
| Only Agent Store docs visible | That sync is notes/media — clone the git repo for `app/`, `services/`, etc. |

Prefer cloning **tflo/family-health-vault**. You can also use **Try Live** on the agent run without cloning.
