# Paid QA matrix — WALLET_PRO

Full paid app must pass on all three targets before a slice is "done".

## Targets

1. **Phone** — Expo iOS/Android (device or emulator)
2. **Desktop app** — Expo web / desktop host at laptop width (`npm run web:desktop`)
3. **Phone size on desktop** — constrain web to:
   - **390×844** — iPhone 14/15 class
   - **430×932** — Plus / Pro Max class
   - optional **412×915** — large Android

## Steps

1. `npm run qa:paid-matrix` — print checklist
2. Start web: `npm run web` (port 43127)
3. Open `/family-feed/upgrade` → **Enable sandbox WALLET_PRO**
4. Verify FOI / SBAR / documents are reachable (not redirected to upgrade)
5. Open `/family-feed/res-1` as Primary POA — clinical meds/vitals visible when plan is PRO
6. Repeat under browser device mode at 390×844 and 430×932
7. Repeat on a physical/emulator phone

Sandbox entitlement: `enableSandboxWalletPro()` — no Stripe.
