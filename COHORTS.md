# Managing class dates

The pricing page reads its class list from the Google Sheet **"Voyager Cyber — Website Class Schedule"** in the info@voyagercyber.com Drive. Edit the sheet and the website updates on its own. Google refreshes published sheets about every 5 minutes. You never need to edit the website for a new cohort.

The sheet is published (File → Share → Publish to web, CSV), and its link is set as `SCHEDULE_CSV_URL` in `js/schedule.js`. Keep it published, and don't rename the **Cohort** or **Status** column headers. If the sheet can't be reached, the site shows `cohorts.csv` from this repo instead, which holds an "Early 2027 · Dates coming soon" placeholder.

## Sheet columns

| Column | What to enter |
|---|---|
| Cohort | Name shown on the site, e.g. `Spring 2027`. Optional for Open cohorts, required for Coming Soon ones. |
| Status | `Coming Soon`, `Open` (or `Enrolling Now`), `Sold Out` (or `Full`) or `Hidden`. |
| Start Date | Any of `25Jun2027`, `25 Jun 2027`, `Jun 25, 2027`, `6/25/2027`, `2027-06-25`. |
| End Date | Same format. |
| Enroll By | Last day to enroll. Enrollment closes at 11:59 PM Eastern that day, and the cohort then drops off the site automatically. |
| Schedule | Optional. Defaults to `Wednesdays 7–11 PM ET · Saturdays 9 AM–12 PM ET`. |
| Class ID | Optional but recommended, e.g. `27-001`. Sent to Stripe to identify the class. Without it the start date is used, e.g. `2027-06-25`; two classes with the same start date get `2027-06-25` and `2027-06-25-2` in sheet order, so adding a Class ID is clearer. Never change it after a class has sales. |
| Notes | For you only. Never shown on the site. |

What each status does:

- **Coming Soon**: shows the name with "Dates coming soon" and a "Get notified" link to the waitlist. No dates or payment.
- **Open / Enrolling Now**: shows dates and the enroll-by countdown, and appears in the "Choose Your Cohort" step at checkout. Needs all three dates; if one is missing or unreadable, the row shows as "Dates coming soon" instead.
- **Sold Out**: shows the dates with a "Sold out" badge. Can't be bought.
- **Hidden**: not shown at all.

When no cohort is Open, every buy button changes to "Join the Waitlist".

## Enrollment flow

1. **Date** — on the pricing page (`pricing.html`). Every class is listed; open ones have a **Select this date** button. This is the only way into enrollment.
2. **Option** — on the enrollment page (`enroll.html`): Starter, Professional, Career Accelerator, Workforce Training or Workforce Certification.
3. **Review** — the class and option, each with a Change link, plus the refund and terms notes.
4. **Stripe** is the last step: "Continue to Secure Payment" goes to that option's Stripe Payment Link with `?client_reference_id=cohort_<Class ID>` added. Stripe stores that value on the payment, so each payment shows which class it was for.

"Change date", Back on the option step, and the "1 Date" step marker all return to the class list on the pricing page. If a class closes, or a link points at a class that isn't open, the visitor is sent back to the class list with a notice.

Option names, prices, features and Stripe Payment Links are set in one place: the `TIERS` list in `js/schedule.js`. The exam-voucher add-on still goes straight to Stripe because it isn't tied to a class.

**Before setting a cohort to Open:** the `voyager-cyber-api` webhook assigns every order to the single *active* cohort in D1 and sends that cohort's welcome email. Make the new cohort the active one in D1 and update the welcome email (dates, calendar link), or change the webhook to read `client_reference_id`. Otherwise buyers get booked into, and emailed about, the wrong class.
