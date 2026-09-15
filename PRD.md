# Healthcare App — Product Requirements

## Overview

This Expo/React Native healthcare companion helps adult sandwich-generation caregivers manage Canadian health-record workflows: morning/weekly digests across dependants, one-page physician-ready SBAR visit summaries, multi-generational proxy access, Freedom of Information (FOI) / Access to Information requests, and contextual prep for provincial nurse triage lines (Health811 ON, 811 SK, and peers).

## Module: Multi-Generational Granular Proxy Access

### Goals

- Tiered roles: **Primary POA/Delegate**, **Sibling Care Coordinator**, and **Time-Limited Emergency Pass** (links to existing emergency QR flow).
- Immutable append-only access logging for grant, revoke, permission checks, and age-out events.
- Digital **age-out hand-off** when a dependant reaches consent age (demo default 16): parental `PRIMARY_POA` grants move to `AGED_OUT` without erasing history.
- UI at `app/patient/[id]/proxyAccess.tsx` for grants, invite sibling, permission checks, and hand-off.

### Non-goals (this slice)

- Cloud multi-user sync, real identity verification, or replacing the emergency crypto QR module.

## Module: 1-Page Physician-Ready SBAR Summarizer

### Regulatory Guardrail (Health Canada SaMD Safeguard)

- This service **MUST NOT** provide an automated diagnostic verdict or auto-prescribe treatments.
- Sole purpose: **Educational Context Summarizer** that turns vault history + caregiver notes into a strict one-page SBAR for a 10-minute physician visit.
- **Assessment** is caregiver observations / concerns only — never a clinical verdict or differential.
- **Recommendation** is talking points and documents to bring — never a treatment plan.
- UI and engine output must include an explicit non-diagnostic notice.

### Goals

- Compile Situation / Background / Assessment / Recommendation from patient vault + optional appointment + caregiver debrief text (Whisper stand-in).
- Pull CONFIRMED / PENDING_REVIEW `MedicalEvents` (`VISIT_DEBRIEF`, OCR `LAB_RESULT` / `PRESCRIPTION`) into Background and Assessment via `compileSBAR` (async; injectable for tests).
- Export a printable one-page PDF via `expo-print` and share via `expo-sharing`.
- Wire digest **Export Visit SBAR** and patient-home CTAs to `app/patient/[id]/sbarExport.tsx`.

### Non-goals (this slice)

- SBAR SQLite history or cloud backup (MedicalEvents remain the source of truth for OCR / visit debriefs).

## Module: 811 Call Assistant (Contextual Summarizer)

### Regulatory Guardrail (Health Canada SaMD Safeguard)

- This service **MUST NOT** provide an automated diagnostic verdict or auto-prescribe treatments.
- Sole purpose: **Contextual Summarizer** and **Caregiver Script Assistant** for flustered caregivers during a nurse triage call.
- UI and engine output must include an explicit non-diagnostic notice.

### Goals

- Synthesize patient vault history (age, sex, chronic conditions, active medications, recent events) with caregiver-selected acute symptoms.
- Frame the summary for a typical 811 dispatcher script: the nurse asks; the caregiver answers from vault-backed cue cards (who / what’s happening / history+meds / recent context).
- Produce a short spoken opening, a 4-cue dispatcher cue sheet, historical context markers, and exactly three clarifying questions after the nurse’s script.
- Offer a high-stress teleprompter UI with one-touch `tel:811` calling via `expo-linking`.

### Non-goals

- Acuity scoring, differential diagnosis, medication dosing advice, or disposition decisions.

## Module: Caregiver Digests (Sandwich Generation)

### Goals

- Compile a **Daily Morning Digest** across Aging Parents, Children, and Self: meds due today, appointments within 72 hours (with preparation alerts such as SBAR print reminders), and overdue tasks (FOI pending > 30 days, missing lab uploads).
- Compile a **Weekly Sunday Overview**: 7-day vital trends, medication adherence rates, and upcoming week schedule.
- Schedule local notifications via `expo-notifications`: daily at **07:00**, weekly Sundays at **16:00**, deep-linking to `app/digest/daily` and `app/digest/weekly`.

### UI

- `app/digest/daily.tsx` — section cards per dependant with quick actions: Mark Meds Given, Export Visit SBAR, Review FOI Status.
- `app/digest/weekly.tsx` — trend and schedule overview for Sunday planning.

## Module: Automated FOI / Access to Information Requests

### Goals

- Generate jurisdiction-correct FOI / access request PDFs for **all 13 Canadian provinces and territories**.
- Guide users through a four-step wizard: jurisdiction/facility → scope → proof of authority → preview & dispatch.
- Persist request drafts and dispatched records locally (SQLite) with status `DRAFT` or `DISPATCHED`.

### Jurisdictions & Governing Acts

| Code | Region | Act (template short name) |
|------|--------|---------------------------|
| AB | Alberta | HIA — Health Information Act |
| BC | British Columbia | FIPPA / PIPA |
| MB | Manitoba | PHIA — Personal Health Information Act |
| NB | New Brunswick | PHIPAA — Personal Health Information Privacy and Access Act |
| NL | Newfoundland and Labrador | PHIA / ATIPPA, 2015 |
| NS | Nova Scotia | PHIA — Personal Health Information Act |
| NT | Northwest Territories | Health Information Act / ATIPP |
| NU | Nunavut | ATIPP |
| ON | Ontario | PHIPA — Personal Health Information Protection Act |
| PE | Prince Edward Island | Health Information Act / FOIPP |
| QC | Quebec | LSSSS / AIPDP |
| SK | Saskatchewan | HIPA — Health Information Protection Act |
| YT | Yukon | HIPMA / ATIPP |

Facility mailing templates live in `data/healthAuthorities.ts` (≥1 per jurisdiction). Wizard catalog: `data/foiJurisdictions.ts`.

### Record Scope Options

- Full historical chart
- DICOM medical imaging CDs
- Specialist consult notes
- Lab reports / lab history

### Persistence

Table: `FOIRequests`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| patientId | TEXT | Route patient id |
| jurisdiction | TEXT | AB \| BC \| MB \| NB \| NL \| NS \| NT \| NU \| ON \| PE \| QC \| SK \| YT |
| facilityId | TEXT | Health authority template id |
| payloadJson | TEXT | Serialized `FOIRequestPayload` |
| pdfUri | TEXT | expo-print output URI/base64 |
| status | TEXT | `DRAFT` \| `DISPATCHED` |
| createdAt | TEXT | ISO-8601 |
| updatedAt | TEXT | ISO-8601 |

On generate → save/update as `DRAFT`. On dispatch → set `DISPATCHED`.

### Security defaults

- PHN/HIN values are treated as sensitive; UI and PDF show masked forms (`encryptedPhn` field) unless the user explicitly expands.
- Proof-of-authority attachments are stored as local URIs only (no cloud upload in v1).

### Non-goals (v1)

- Real fax gateway integration
- Remote EHR APIs
- Multi-user cloud sync
- Authentication / accounts

## Module: Local OCR Document Ingestion

### Goals

- Capture prescription bottles, paper lab reports, and portal screenshots via `expo-image-picker` (library + camera).
- Run **on-device** OCR with `tesseract.js` and parse structured fields (labs: name/value/units/reference range; prescriptions: medication/dosage/frequency/prescriber).
- Persist `rawText` + parsed JSON into the local SQLite `MedicalEvents` table (`types/db.ts`).
- Require caregiver verification before marking an event `CONFIRMED`.

### Non-goals

- Cloud OCR / PHI upload
- Automated clinical interpretation of lab values

## Module: Post-Visit Voice Debrief

### Goals

- Record caregiver post-visit audio in-app with `expo-av` (timer + waveform UI).
- Transcribe via local Whisper endpoint (`EXPO_PUBLIC_WHISPER_URL`, default `http://127.0.0.1:8765/transcribe`) with simulator mock fallback.
- Extract discussion summary, dosage changes / new prescriptions, and action items.
- Persist transcript + extracted JSON into `MedicalEvents` with `kind` / `eventType` **`VISIT_DEBRIEF`**.

### Non-goals

- Cloud speech APIs as the primary path
- Automated clinical advice from the debrief

## Module: Local LLM Bridge (Simulator)

### Goals

- Talk to a developer-host **Ollama** server at `http://localhost:11434` (or `http://10.0.2.2:11434` on Android emulator).
- Expose `queryLocalLLM(prompt, context)` for models such as `llama3.2:3b` and `phi3:mini`.
- Enforce a Canadian SaMD system prompt: educational context summarizer only — never prescribe or diagnose.
- Provide `app/sandbox/aiTest.tsx` to ask questions against mock health records.

### Non-goals

- Production cloud LLM routing
- Clinical decision support

## Module: QA Local Testing Sandbox

### Goals

- Seed local SQLite with realistic dummy profiles via `utils/mockSeeder.ts`:
  - **Dad (78)**: Stage 3 CKD, Type 2 Diabetes, 4 active medications, mock Saskatchewan Health Authority lab PDF.
  - **Child (4)**: Vaccine records aligned with the SK provincial schedule.
- Provide `app/sandbox/index.tsx` one-click loops:
  1. Run Daily Digest Generator → verify push alert payload
  2. Synthesize Dad's SBAR Note → 1-page PDF preview
  3. Generate SK HIPA FOI Request → printable legal PDF
  4. Trigger 811 Call Script → flustered-caregiver teleprompter

### Non-goals

- Production telemetry / remote QA farms

## Module: Emergency Offline Pass

### Goals

- Generate a **short-lived AES-256-GCM** encrypted emergency payload (allergies, active medications, emergency contacts, primary caregiver phone) via `generateEmergencyQR(patientId)`.
- Show a high-contrast, large QR code for ER staff scanning (`app/patient/[id]/emergencyPass.tsx`).
- Print a 1-page **Emergency Wallet Card** PDF with the same critical health alerts using `expo-print`.

### Non-goals

- Cloud key escrow
- Replacing official medical ID / MedicAlert programs

