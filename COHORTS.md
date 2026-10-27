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
| Class ID | Optional, e.g. `27-001`. Sent to Stripe to identify the class. Without it the start date is used, e.g. `2027-06-25`. Never change it after a class has sales. |
| Notes | For you only. Never shown on the site. |

What each status does:

- **Coming Soon**: shows the name with "Dates coming soon" and a "Get notified" link to the waitlist. No dates or payment.
- **Open / Enrolling Now**: shows dates and the enroll-by countdown, and appears in the "Choose Your Cohort" step at checkout. Needs all three dates; if one is missing or unreadable, the row shows as "Dates coming soon" instead.
- **Sold Out**: shows the dates with a "Sold out" badge. Can't be bought.
- **Hidden**: not shown at all.

When no cohort is Open, every buy button changes to "Join the Waitlist".

## Enrollment flow

1. **Pricing page** (`pricing.html`): visitors see every class. "Select this date" on an open class, or any "Reserve My Seat" / "Enroll My Team" button, opens the enrollment page.
2. **Enrollment page** (`enroll.html`), all on voyagercyber.com:
   1. **Date**: pick an open class.
   2. **Option**: pick Starter, Professional, Career Accelerator, Workforce Training or Workforce Certification.
   3. **Review**: confirm class and option, with the refund and terms notes.
3. **Stripe** is the last step: "Continue to Secure Payment" goes to that option's Stripe Payment Link with `?client_reference_id=cohort_<Class ID>` added. Stripe stores that value on the payment, so each payment shows which class it was for.

Prices, features and Stripe Payment Links for the enrollment page are set in one place: the `TIERS` list in `js/schedule.js`. The cards on the pricing page are plain HTML; if you change a price, update both. The exam-voucher add-on still goes straight to Stripe because it isn't tied to a class.

**Before setting a cohort to Open:** the `voyager-cyber-api` webhook assigns every order to the single *active* cohort in D1 and sends that cohort's welcome email. Make the new cohort the active one in D1 and update the welcome email (dates, calendar link), or change the webhook to read `client_reference_id`. Otherwise buyers get booked into, and emailed about, the wrong class.
