# Seller Dashboard E2E Launch Readiness - PR104

Cross-repo checklist for launching the read-only Seller Dashboard across:

- Sarana-eseller BFF `/api/seller/*`
- eseller-mobile seller dashboard UI
- Negd internal S2S seller adapter dependency

This document must not contain production secrets, credentials, private keys, tokens, or copied env values.

## 1. Architecture Summary

```text
eseller-mobile
  -> Sarana-eseller BFF /api/seller/*
     auth: existing mobile Bearer token

Sarana-eseller BFF
  -> Negd internal seller S2S adapter
     auth: server-only S2S key
```

- Mobile calls Sarana BFF only. It must never call Negd directly.
- Mobile sends the existing Bearer token through the shared API client.
- Sarana validates the mobile user/session and bridges to Negd through internal S2S.
- `ESELLER_S2S_INTEGRATION_KEY` stays server-only in Sarana infrastructure.
- Seller Dashboard launch scope is read-only only.
- No payout, withdraw, wallet mutation, ledger write, seller mutation, commission posting, or commission calculation is included in PR104.

## 2. Required Env Vars

### Sarana Production

- `NEGD_INTERNAL_BASE_URL`
- `ESELLER_S2S_INTEGRATION_KEY`
- `JWT_SECRET`

Checks:

- Values are present in production deployment configuration.
- Values are not logged.
- Values are not exposed to client bundles.
- Missing required Sarana production values return a structured config failure, not fake seller balances.

### Mobile Internal Build

- `EXPO_PUBLIC_API_BASE_URL`, only when the build is not using the default production API base `https://eseller.mn/api`.

Checks:

- Internal build points at the intended Sarana environment.
- No mobile env contains `ESELLER_S2S_INTEGRATION_KEY`.
- No mobile code references Negd internal URLs.

### Feature Flag

- `sellerNetwork.enabled`
- Optional build default: `EXPO_PUBLIC_SELLER_NETWORK_ENABLED`
- Runtime source: Sarana `/api/config/mobile`, if available.

Checks:

- Default is appropriate for the build track.
- Production can disable the seller-network UI without a new mobile binary.
- Flag-off hides the new seller-network dashboard, earnings, and profile sections without breaking old affiliate screens.

## 3. Test Data Prerequisites

Prepare one launch test seller with:

- eSeller mobile login user.
- Matching Negd user.
- Active seller/reseller profile.
- Verified identity link:
  - `provider = ESELLER_MOBILE`
  - `externalUserId = <eSeller user id>`
  - `status/linkStatus = VERIFIED`
- Sample referral data, if available.
- Sample lead summary data, with no phone, email, customer name, or customer note in mobile responses.
- Sample commission dry-run data, if available.
- Sample wallet summary data, if available.

Also prepare negative-path data where feasible:

- Valid eSeller user with no Negd link.
- Valid eSeller user linked to a seller profile that is not active.
- Valid token while Negd upstream is unavailable or forced to 5xx in a safe test environment.

## 4. Endpoint Matrix

Every seller endpoint must preserve the seller BFF envelope:

```json
{
  "ok": true,
  "data": {},
  "correlationId": "...",
  "responseVersion": "seller-dashboard.v1",
  "bff": "sarana-eseller",
  "upstream": "..."
}
```

On structured errors:

```json
{
  "ok": false,
  "error": {
    "code": "...",
    "message": "...",
    "retryable": true
  },
  "correlationId": "...",
  "responseVersion": "seller-dashboard.v1",
  "bff": "sarana-eseller",
  "upstream": "..."
}
```

| Endpoint | No Token | Valid Token + Negd Configured | Envelope Checks | Launch Guardrails |
| --- | --- | --- | --- | --- |
| `/api/seller/me` | 401 | 200 `{ ok:true, data }` | `correlationId`, `responseVersion`, `bff`, `upstream`; no `{ success:true }` | No seller mutation fields/actions |
| `/api/seller/dashboard` | 401 | 200 `{ ok:true, data }` | `correlationId`, `responseVersion`, `bff`, `upstream`; no `{ success:true }` | Composite shape only; no payout/withdraw actions |
| `/api/seller/wallet-summary` | 401 | 200 `{ ok:true, data }` | `correlationId`, `responseVersion`, `bff`, `upstream`; no `{ success:true }` | Read-only summary; no wallet mutation |
| `/api/seller/referral-summary` | 401 | 200 `{ ok:true, data }` | `correlationId`, `responseVersion`, `bff`, `upstream`; no `{ success:true }` | No rotate/create/revoke mutation |
| `/api/seller/lead-summary` | 401 | 200 `{ ok:true, data }` | `correlationId`, `responseVersion`, `bff`, `upstream`; no `{ success:true }` | No phone, email, name, customer note, or lead PII |
| `/api/seller/commission-summary` | 401 | 200 `{ ok:true, data }` | `correlationId`, `responseVersion`, `bff`, `upstream`; no `{ success:true }` | Dry-run/read-only; no posting or payout action |

Required endpoint checks:

- Unauthenticated request returns 401 for all six endpoints.
- Authenticated request with Negd configured returns 200 for all seller-ready test users.
- Every success response has `ok: true`, `data`, `correlationId`, `responseVersion`, `bff`, and `upstream`.
- No seller endpoint returns `{ success:true }`.
- Production upstream timeout/5xx returns structured error with `correlationId`; it must not silently show fake zero balances unless an explicit production fallback flag is enabled.
- No route introduces payout, withdraw, wallet mutation, ledger write, or commission posting behavior.

## 5. Mobile Smoke

Run on an internal build on a real device.

### Seller Dashboard

- Login as the launch test seller.
- Open seller dashboard.
- Existing seller shell renders.
- New seller-network read-only section renders when `sellerNetwork.enabled = true`.
- Pull-to-refresh does not create mutations.
- `payableMnt` appears disabled/non-clickable.
- No customer lead PII is shown.

### Earnings

- Existing affiliate earnings list still renders.
- New read-only seller-network commission/status section renders when enabled.
- Amounts are server-provided and not calculated client-side.
- No payout/withdraw button or route appears.

### Profile

- Existing affiliate profile remains available.
- Seller-network status card renders when enabled.
- Identity link, seller profile status, KYC status, and finance eligibility are display-only.

### Offline

- Put device offline.
- Seller dashboard shows a Mongolian offline/error message.
- Retry action is visible where applicable.
- No session-expired alert is shown for ordinary offline failures.

### 401

- Wrong password on login does not show the session-expired alert.
- Expired token during authenticated app usage shows exactly one session-expired alert.
- After session expiry, user is sent through the existing auth flow.

### 5xx

- Force or observe a safe backend 5xx/upstream unavailable response.
- UI shows retry/error state.
- `correlationId` is visible when available.
- UI does not show fake production balances unless explicitly allowed by server config.

### Feature Flag Off

- Set `sellerNetwork.enabled = false`.
- Seller dashboard hides the seller-network section.
- Earnings hides the seller-network commission/status cards.
- Profile hides the seller-network status card.
- Existing affiliate seller screens continue to work.

### Device Layout

- Check status bar spacing and safe areas on at least one iOS and one Android device where available.
- Check small-screen layout for card wrapping and clipped text.
- Verify no `RoleSwitcherBar` top production shell regression.

### Network Inspection

- No request goes to Negd directly from mobile.
- No request goes to `/api/wallet*` from the seller-network flow.
- Seller-network requests are GET-only calls to Sarana `/api/seller/*`.

## 6. Launch Gates

Do not launch until all gates are checked:

- TypeScript clean in Sarana-eseller.
- TypeScript clean in eseller-mobile.
- Sarana lint clean.
- Sarana BFF endpoint shape verified for all six seller endpoints.
- Mobile accepts canonical `{ ok:true, data }` seller envelopes.
- Mobile preserves structured seller errors with `code`, `message`, `correlationId`, and `retryable`.
- Mobile no direct Negd request verified.
- Mobile no S2S key verified.
- No payout/withdraw UI or route verified.
- No seller mutations, wallet mutations, ledger writes, or commission posting verified.
- Lead summary verified to contain no customer PII.
- Internal EAS build smoke passed on real device.
- Rollback plan documented and understood by launch operators.

Suggested verification commands:

```bash
# Sarana-eseller
cd nextjs
npx tsc --noEmit
npm run lint
npm run test:smoke

# eseller-mobile
npm run smoke:p0
npm run smoke:seller-dashboard
ESELLER_API_TOKEN=<seller-jwt> npm run smoke:api:auth
```

Suggested mobile guardrail greps:

```bash
rg -n "https?://.*negd|NEGD_INTERNAL|NEGD_.*URL" src app
rg -n "ESELLER_S2S_INTEGRATION_KEY" src app
rg -n "useMutation|post\\(|put\\(|patch\\(|del\\(" src/api/sellerDashboard.ts src/hooks/useSellerDashboard.ts src/features/sellerNetwork app
rg -n -i "withdraw|payout|/api/wallet|/wallet" src/api/sellerDashboard.ts src/hooks/useSellerDashboard.ts src/features/sellerNetwork app
rg -n "phone|email|customerName|customerEmail|customerPhone|customerNote" src/features/sellerNetwork src/api/sellerDashboard.ts
```

Review grep results manually because comments and legacy non-seller screens may produce harmless hits.

## 7. Rollback

Preferred rollback order:

1. Disable `sellerNetwork.enabled` from Sarana remote config.
2. Confirm mobile seller dashboard, earnings, and profile hide the new seller-network sections.
3. Preserve existing auth/session routes and old affiliate seller screens.
4. Revert the mobile PR if the flag is insufficient or a binary issue is found.
5. Revert the Sarana hardening PR if BFF route behavior causes production risk.
6. Unset Negd env only after the mobile UI is safely flag-disabled and operators confirm no active production dependency remains.

Rollback checks:

- Existing login/register/session-expired behavior still works.
- Existing affiliate earnings/profile/dashboard flows still work.
- No mobile binary receives or depends on the S2S key.
- Seller-network disabled state remains stable after app restart and remote-config cache refresh.
