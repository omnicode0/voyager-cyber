# Managing class dates

The pricing page reads its class list from the Google Sheet **"Voyager Cyber — Website Class Schedule"** in the info@voyagercyber.com Drive. Edit the sheet and the website updates on its own. Google refreshes published sheets about every 5 minutes. You never need to edit the website for a new cohort.

## One-time setup

1. Open the sheet → **File → Share → Publish to web**.
2. Choose the sheet tab (not "Entire document") and **Comma-separated values (.csv)**, then click **Publish**.
3. Copy the link and paste it into `pricing.html` between the quotes on this line:
   `var SCHEDULE_CSV_URL = '';`

Until that's done, or whenever the sheet can't be reached, the site shows `cohorts.csv` from this repo, which holds an "Early 2027 · Dates coming soon" placeholder.

## Sheet columns

| Column | What to enter |
|---|---|
| Cohort | Name shown on the site, e.g. `Spring 2027`. Optional for Open cohorts, required for Coming Soon ones. |
| Status | `Coming Soon`, `Open`, `Sold Out` or `Hidden`. |
| Start Date | e.g. `2/3/2027` or `2027-02-03`. |
| End Date | Same format. |
| Enroll By | Last day to enroll. Enrollment closes at 11:59 PM Eastern that day, and the cohort then drops off the site automatically. |
| Schedule | Optional. Defaults to `Wednesdays 7–11 PM ET · Saturdays 9 AM–12 PM ET`. |
| Notes | For you only. Never shown on the site. |

What each status does:

- **Coming Soon**: shows the name with "Dates coming soon" and a "Get notified" link to the waitlist. No dates or payment.
- **Open**: shows dates and the enroll-by countdown, and appears in the "Choose Your Cohort" step at checkout. Needs all three dates; if one is missing or unreadable, the row shows as "Dates coming soon" instead.
- **Sold Out**: shows the dates with a "Sold out" badge. Can't be bought.
- **Hidden**: not shown at all.

When no cohort is Open, every buy button changes to "Join the Waitlist".

## Checkout

Clicking a buy button opens "Choose Your Cohort", then goes to that tier's Stripe Payment Link with `?client_reference_id=cohort_<start date>` added, e.g. `cohort_2027-02-03`. Stripe stores that value on the Checkout Session, so each payment shows which cohort it was for.

**Before setting a cohort to Open:** the `voyager-cyber-api` webhook assigns every order to the single *active* cohort in D1 and sends that cohort's welcome email. Make the new cohort the active one in D1 and update the welcome email (dates, calendar link), or change the webhook to read `client_reference_id`. Otherwise buyers get booked into, and emailed about, the wrong class.
