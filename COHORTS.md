# Managing cohort dates

The pricing page reads its cohort list from [`cohorts.json`](cohorts.json). To add, change or remove a cohort, edit that one file (the pencil icon on GitHub works). You don't need to touch any HTML.

```json
{
  "cohorts": [
    {
      "start": "2026-11-04",
      "end": "2026-12-05",
      "enrollBy": "2026-10-27T23:59:59-04:00"
    }
  ]
}
```

| Field | Required | What it does |
|---|---|---|
| `start`, `end` | yes | Class dates, `YYYY-MM-DD`. |
| `enrollBy` | yes | Enrollment deadline. The cohort drops off the site automatically after this moment. Use a full timestamp with the Eastern offset (`-04:00` summer, `-05:00` winter), or a plain `YYYY-MM-DD` to mean the end of that day. |
| `id` | no | Sent to Stripe as `client_reference_id=cohort_<id>`. Defaults to `start`. Letters, digits, `-` and `_` only. |
| `label` | no | Short name shown before the dates, e.g. `"Winter"`. |
| `schedule` | no | Meeting times. Defaults to `Wednesdays 7–11 PM ET · Saturdays 9 AM–12 PM ET`. |
| `seatsApi` | no | URL that returns `{ "remaining": <number> }`. The site shows "Only N seats left" under 5 seats and "Sold out" at 0, and it blocks Workforce tiers under 3 seats. |
| `soldOut` | no | `true` marks the cohort sold out without a seat API. |
| `hidden` | no | `true` hides the cohort without deleting it. |
| `checkout` | no | Per-tier Stripe link overrides for this cohort, keyed `starter`, `professional`, `career`, `workforce`, `workforce-cert`. Without it, the standard links on the page are used. |

## How checkout works

1. Visitors see every open cohort above "For Individuals".
2. Clicking any "Reserve My Seat" / "Enroll My Team" button opens a "Choose Your Cohort" step.
3. "Continue to Secure Checkout" goes to that tier's Stripe Payment Link with `?client_reference_id=cohort_<id>` added. That value is stored on the Stripe Checkout Session, so you can see which cohort each purchase was for in the Stripe dashboard and in `checkout.session.completed` webhooks.

When no cohort is open, the buttons switch to "Join the Waitlist".
