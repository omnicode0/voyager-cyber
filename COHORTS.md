# Managing class dates

The Schedule page (`schedule.html`) reads its class list from the Google Sheet **"Voyager Cyber — Website Class Schedule"** in the info@voyagercyber.com Drive. Edit the sheet and the website updates on its own. Google refreshes published sheets about every 5 minutes. You never need to edit the website for a new cohort.

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
| Seats | Optional. How many seats the class has (default 15). Checkout stops when they're gone, and the site shows "Only N seats left" under 5. |
| Calendar Link | Optional. A Google Calendar link for the class, included in the welcome email. |
| Class ID | Optional but recommended, e.g. `27-001`. Sent to Stripe to identify the class. Without it the start date is used, e.g. `2027-06-25`; two classes with the same start date get `2027-06-25` and `2027-06-25-2` in sheet order, so adding a Class ID is clearer. Never change it after a class has sales. |
| Notes | For you only. Never shown on the site. |

What each status does:

- **Coming Soon** with Start Date and End Date filled in: shows the dates with "Enrollment not open yet" and a "Get notified when enrollment opens" link to the waitlist. It can't be selected or bought. Enroll By is optional here. Use this for classes you've scheduled but aren't enrolling yet; switch to Open when enrollment starts. It drops off once its start date passes.
- **Coming Soon** without dates: shows the name with "Dates coming soon" and a "Get notified" link.
- **Open / Enrolling Now**: shows dates, the enroll-by countdown and a **Select this date** button (or "Sold out" once its seats are gone). Needs all three dates; if one is missing or unreadable, the row shows as "Dates coming soon" instead.
- **Sold Out**: shows the dates with a "Sold out" badge. Can't be bought.
- **Hidden**: not shown at all.

When no class is open, the list says so and only shows "Get notified" links.

## Enrollment flow

1. **Date** — on the Schedule page (`schedule.html`). Every class is listed; open ones have a **Select this date** button. This is the only way into enrollment.
   The **Pricing** page (`pricing.html`) describes the options; its "Choose a Date" buttons open the Schedule page with that option pre-selected for step 2.
2. **Option** — on the enrollment page (`enroll.html`), which shows the chosen class dates with weekdays: Starter, Professional, Career Accelerator, Workforce Training or Workforce Certification.
3. **Review** — the class and option, each with a Change link, plus the refund and terms notes.
4. **Stripe** is the last step: "Continue to Secure Payment" asks the backend (`voyager-cyber-api`) for a checkout. The backend re-checks the class in the sheet, reserves the seats, and sends the buyer to Stripe. After payment the buyer lands on `enrolled.html`, is enrolled in that exact class, and gets a welcome email with that class's dates, schedule and calendar link.

Team options ask for the number of employees (3 or more) on the review step. When a class has fewer than 3 seats left, team options can't be picked for it. If a class fills up while someone is enrolling, they're sent back to the class list with a "just sold out" notice.

"Change date", Back on the option step, and the "1 Date" step marker all return to the class list on the Schedule page. If a class closes, or a link points at a class that isn't open, the visitor is sent back to the class list with a notice.

Option names, displayed prices and features are in the `TIERS` list in `js/schedule.js`. The amount actually charged comes from each option's Stripe Payment Link (the backend reads it), so if you change a price in Stripe, update the displayed price there too. The exam-voucher add-on still goes straight to Stripe because it isn't tied to a class.

Seat limits and class assignment are handled by the backend. Its setup is in the `voyager-cyber-api` README.
