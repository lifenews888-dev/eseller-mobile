# Seller Dashboard Launch Smoke Checklist

Use this on a real device after the Sarana BFF and Negd rollout are pointed at the intended environment.

Before device testing:

- Run `npm run smoke:seller-dashboard` locally.
- Run `npm run smoke:api:auth` with `ESELLER_API_TOKEN=<seller-jwt>` or login env vars against the intended Sarana environment.
- Run `npm run smoke:p0` before handing the build to testers.

- Login as a seller.
- Seller dashboard renders.
- Earnings renders the old affiliate list and the new read-only seller-network section.
- Profile renders the old profile and seller-network status.
- Offline state renders a Mongolian message.
- Backend 5xx shows a retry/error state with `correlationId` when available.
- Wrong password does not show the session-expired alert.
- Expired token shows exactly one session-expired alert.
- No request goes to Negd directly.
- No request goes to `/api/wallet*` from the seller-network flow.
