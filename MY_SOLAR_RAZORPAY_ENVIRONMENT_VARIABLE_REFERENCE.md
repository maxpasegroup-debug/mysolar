# MY SOLAR SOLUTIONS — Razorpay environment variable reference

This is a names-only reference. No Railway environment values were inspected or copied into this document. Keep every secret in Railway's server-side variable store; never place them in browser code, reports, screenshots, support messages or Git.

| Variable | Purpose | Safe expected configuration |
|---|---|---|
| `RAZORPAY_BILLING_MODE` | Selects provider environment. | `disabled` or unset until approved. Use `test` for test acceptance. `live` only after all go-live gates pass. |
| `RAZORPAY_KEY_ID` | Server-side Razorpay API key ID. | Test mode must use `rzp_test_…`; live mode must use `rzp_live_…`. Never share the corresponding secret. |
| `RAZORPAY_KEY_SECRET` | Server-side API authentication secret. | Required and private. Rotate if disclosed. It is not the webhook signing secret. |
| `RAZORPAY_WEBHOOK_SECRET` | HMAC secret used to verify webhook raw request bytes. | Required, at least 32 characters per current application validation. Generate/configure separately in each Razorpay webhook environment. |
| `RAZORPAY_LIVE_ENABLED` | Additional explicit live-billing safety gate. | Keep unset or `false` until final authorised launch. Application requires exactly `true` for live mode. |
| `NODE_ENV` | Runtime environment safety check. | Production cannot use test billing configuration to unlock production entitlements. |

## Mode rules in code

- Provider defaults to disabled when mode or valid credentials are missing.
- A test mode key must start with `rzp_test_`; it is rejected for production entitlement use when `NODE_ENV=production`.
- A live mode key must start with `rzp_live_` and the explicit live flag must equal `true`.
- Webhook secret and API key secret are separate credentials. Configure separate test/live webhook endpoints and secrets.
- Credentials are only consumed by the server-side adapter in `server/commercial/razorpay.js`.

After approval, verify variable **names and mode consistency** in Railway without pasting secret values into chat or source control. Do not set live mode merely to test the checkout.
