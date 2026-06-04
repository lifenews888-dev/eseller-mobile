# eseller-mobile P0 smoke checklist

Use this before opening a PR or handing a build to testers.

## Static checks

Run the full local P0 suite:

```bash
npm run smoke:p0
```

PowerShell:

```powershell
npm.cmd run smoke:p0
```

GitHub Actions runs the same suite through `.github/workflows/p0-smoke.yml` on
pull requests and pushes to `main`/`master`.

The P0 suite is offline-only. It does not run `smoke:api` and
does not run `smoke:api:auth`; run those live backend checks separately with
the intended Sarana environment and test credentials.

Expanded command list:

```bash
npx tsc --noEmit
npx expo export --platform web --output-dir dist/audit-web
```

or:

```bash
npm run smoke:meta
npm run smoke:config
npm run smoke:api-contract
npm run typecheck
npm run smoke:roles
npm run smoke:herder-cart
npm run smoke:herder-api
npm run smoke:herder-offline
npm run smoke:seller-dashboard
npm run smoke:device-build
npm run smoke:product-quality
npm run smoke:product-surfaces
npm run smoke:route-aliases
npm run smoke:route-links
npm run smoke:hygiene
npm run smoke:web
```

On Windows PowerShell, if `npx` is blocked by execution policy:

```powershell
npm.cmd run smoke:meta
npm.cmd run smoke:config
npm.cmd run smoke:api-contract
.\node_modules\.bin\tsc.cmd --noEmit
npm.cmd run smoke:roles
npm.cmd run smoke:herder-cart
npm.cmd run smoke:herder-api
npm.cmd run smoke:herder-offline
npm.cmd run smoke:seller-dashboard
npm.cmd run smoke:device-build
npm.cmd run smoke:product-quality
npm.cmd run smoke:product-surfaces
npm.cmd run smoke:route-aliases
npm.cmd run smoke:route-links
npm.cmd run smoke:hygiene
.\node_modules\.bin\expo.cmd export --platform web --output-dir dist\audit-web
```

`smoke:hygiene` is non-destructive. It verifies `.gitignore` still covers generated artifacts, and fails when generated artifacts or local logs are staged/tracked, including `.codex-logs/`, `dist/`, `dist-web/`, `dist-android/`, `expo-*.log`, and Hermes `.hbc` bundles. If it fails, review those paths and untrack/remove them intentionally before opening a PR.

`smoke:config` verifies the mobile config contract across `.env.example`, `eas.json`, `src/config/apiBase.ts`, `src/config/flags.ts`, `src/config/remoteFlags.ts`, and `app.config.js`.

`smoke:api-contract` verifies the offline contract for `smoke:api`, including endpoint coverage, auth skip behavior, strict auth mode, tolerated warning statuses, env vars, and checklist examples. It does not call the backend.

`smoke:herder-api` verifies the offline contract for the Malchnaas `HerderAPI` wrapper, including public, herder-admin, coordinator, review, registration, fallback response, and shared type coverage. It does not call the backend.

`smoke:herder-offline` verifies Malchnaas offline guardrails: 24h cache fallback, versioned storage keys, queued listing writes, queue drain semantics, listing-screen retry/discard integration, delivery-window fallback, and 21-aimag constants. It does not call the backend.

`smoke:seller-dashboard` verifies the read-only seller-network dashboard contract: Sarana BFF-only GET routes, no direct Negd URL, no S2S key, no seller wallet action endpoints, no mutation hooks, payload guards, lead PII rejection, disabled payable bucket, feature-flag gating, and launch-checklist coverage. It does not call the backend.

`smoke:device-build` verifies the native device-build contract without uploading anything: app ids, EAS project id, OTA update URL, required assets, internal preview distribution, production API target, and the tester build checklist.

`smoke:route-links` fails when runtime code links to Expo route-group URLs such as `/(tabs)` or `/(owner)`. Use public aliases such as `/store`, `/owner/orders`, `/seller/dashboard`, `/driver/deliveries`, `/herder-admin/orders`, and `/coordinator/dashboard`.

`smoke:route-aliases` fails when public role alias files such as `/owner/...`, `/seller/...`, `/driver/...`, `/herder-admin/...`, or `/coordinator/...` stop re-exporting their protected route-group screens, or when the root stack/buyer shell no longer registers and hides those role groups.

## API contract smoke

Public-only check:

```bash
npm run smoke:api
```

Against another backend:

```bash
ESELLER_API_BASE_URL=https://eseller.mn/api npm run smoke:api
```

Authenticated role checks:

```bash
ESELLER_API_TOKEN=<jwt> npm run smoke:api
```

Authenticated role checks by logging in first:

```bash
ESELLER_LOGIN_IDENTIFIER=<email-or-phone> ESELLER_LOGIN_PASSWORD=<password> npm run smoke:api
```

Strict launch mode fails instead of skipping authenticated checks when no token can be used:

```bash
ESELLER_API_TOKEN=<jwt> npm run smoke:api:auth
ESELLER_SMOKE_REQUIRE_AUTH=1 ESELLER_API_TOKEN=<jwt> npm run smoke:api
ESELLER_SMOKE_REQUIRE_AUTH=1 ESELLER_LOGIN_IDENTIFIER=<email-or-phone> ESELLER_LOGIN_PASSWORD=<password> npm run smoke:api
```

PowerShell equivalents:

```powershell
$env:ESELLER_API_BASE_URL="https://eseller.mn/api"; npm.cmd run smoke:api
$env:ESELLER_API_TOKEN="<jwt>"; npm.cmd run smoke:api
$env:ESELLER_LOGIN_IDENTIFIER="<email-or-phone>"; $env:ESELLER_LOGIN_PASSWORD="<password>"; npm.cmd run smoke:api
$env:ESELLER_API_TOKEN="<jwt>"; npm.cmd run smoke:api:auth
$env:ESELLER_SMOKE_REQUIRE_AUTH="1"; $env:ESELLER_API_TOKEN="<jwt>"; npm.cmd run smoke:api
```

Expected warnings:

- `/config/mobile` can warn with `404` until remote config is deployed.
- Seller-network endpoints can warn with `403`, `404`, or `503` when the token is not linked to a seller profile: `/seller/me`, `/seller/dashboard`, `/seller/wallet-summary`, `/seller/referral-summary`, `/seller/lead-summary`, and `/seller/commission-summary`.
- `/herder/my/products` can warn with `403` or `404` unless the token belongs to an approved herder.
- `/herder/coordinator/stats` can warn with `403` or `404` unless the token belongs to a coordinator/admin.

## Role route matrix

Source of truth: `src/shared/roleAccess.ts`.
`npm run smoke:roles` also verifies legacy Expo route-group `returnTo`
normalization through `src/shared/routeNormalization.ts`.

| Backend role | Expected home | Allowed role surface |
| --- | --- | --- |
| `buyer` | `/` | buyer shell only |
| `seller` / `store` / `owner` | `/owner/dashboard` | owner dashboard |
| `affiliate` | `/seller/dashboard` | seller/referral dashboard |
| `delivery` / `driver` | `/driver/deliveries` | driver dashboard |
| `herder` | `/herder-admin/dashboard` | herder admin dashboard |
| `coordinator` | `/coordinator/dashboard` | coordinator dashboard |
| `admin` / `superadmin` | `/` by default | all role surfaces |

For each role surface:

- Logged-out access redirects to `/login` with `returnTo`.
- Wrong role redirects to `/`.
- Correct role renders the role tab layout without buyer bottom navigation.
