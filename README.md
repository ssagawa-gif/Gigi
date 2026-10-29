# GiGi — web app (patient + doctor)

GiGi is a concierge for women's hormonal health. This is its web app. It runs in any phone or computer browser, with no App Store or Google Play, in **English, Portuguese and Spanish**.

- **Patient:** onboarding and consent, lab report upload (PDF or photo) and results, automatic evaluation against reference ranges, trend charts, comparison between dates, doctor review requests, booking from the doctor's agenda, sharing controls, plans and waitlist, data export and account deletion.
- **Doctor:** review queue with the full case, an editable draft explanation, a recommendation, a weekly agenda (open and remove times), the patients who share data with them, and notifications in the app and by e-mail.

## Quick demo on a computer
Open **`GiGi_demo.html`** by double-clicking it. It is a single file with no installation, running in sample mode with Laura and Dr Marta Puig from the MVP test script. Use the black bar at the top to open the patient app and the doctor console in separate tabs. To rebuild it, run `npm run build:html`; the file appears at `dist-html/index.html`.

## Where the data lives
| Mode | When | Where data is stored |
| --- | --- | --- |
| **Sample mode** | No Supabase keys set (the demo HTML, the preview link, `npm run dev`) | Only in the browser that opened the app (localStorage). Nothing is sent anywhere, and each computer has its own copy. Use **Reset** in the top bar to start again. |
| **Live mode** | Supabase keys set (step 3 below) | A **Supabase** Postgres database in the EU region you choose (Frankfurt or Ireland). Uploaded lab reports go to a private Supabase Storage bucket, inside one folder per user. Row Level Security rules decide who can read each row. |

The source code lives in this repository. No health data is ever stored in the code.

## How results are evaluated
1. The patient types (or checks) each value **exactly as printed on the report**: value, unit and the lab's reference range.
2. **In range:** GiGi shows a plain-language explanation and no doctor is needed.
3. **Out of range, or no range:** the result is flagged and the patient can ask for a review. The doctor gets a request in the queue and an e-mail, reviews it and replies. The patient is notified.
4. GiGi **never diagnoses**. It only says whether a value sits inside the lab's own range.

## How history stays comparable across countries
- Every marker has an international **LOINC** code (for example, ferritin is 2276-4). "Ferritina" from São Paulo and "Ferritin" from London therefore land on the same line of the history.
- Every result is stored **twice**: as printed on the report (for example 60 nmol/L, range 75–250) and converted to one canonical unit per marker (24 ng/mL). Charts and comparisons use the canonical unit. Status uses the original report's own range.
- History belongs to the account, not to a country or a lab, and the patient can export all of it as JSON.
- LOINC codes and conversion factors are in `src/lib/markers.js`. **The clinical lead (Lugein) must review them before launch**, together with the "About this marker" texts, which are marked as sample content.

---

## Setup step by step (all free)

### 1. GitHub (code + website)
1. Push this folder to a GitHub repository. Leave `node_modules`, `dist` and `dist-html` out. Keep the `.github` folder: it publishes the site automatically.
2. Free GitHub accounts can only use GitHub Pages with **public** repositories. A private repository needs GitHub Pro, or another host such as Netlify or Vercel (both free).

### 2. Supabase (database, login, files)
1. Create an account at supabase.com and click **New project**.
2. Under **Region**, choose **Central EU (Frankfurt)** or **West EU (Ireland)**. This is what makes the "Stored in the EU" promise on the consent screen true. Choose a strong database password and keep it safe.
3. Open **SQL Editor → New query**, paste all of `supabase/schema.sql` and click **Run**.
4. In **Authentication → Sign In / Providers → Email**, turn off **Confirm email** while testing. Turn it back on before launch.
5. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.

### 3. Connect the site to Supabase and publish
1. Put the **Project URL** and the **anon / publishable** key in `.env.production` (already done for GiGi's project). Both are public by design: protection comes from the database rules. Never commit the `service_role` / secret key or the database password.
2. (Optional) To use a Tally form for the waitlist, add a repository variable `VITE_WAITLIST_URL` under **Settings → Secrets and variables → Actions → Variables**. Without it, the app uses its own waitlist, saved in the `waitlist` table.
3. In **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**. Every push to `main` then republishes the site at `https://<user>.github.io/<repo>/` (GiGi: https://ssagawa-gif.github.io/Gigi/).
4. In Supabase, under **Authentication → URL Configuration**, set **Site URL** to that address.

The demo file (`npm run build:html`) ignores `.env.production` and always runs in sample mode.

### 4. Onboard doctors
1. The doctor opens `…/#/doctor/login`, creates an account and fills in the profile.
2. Nobody can make themselves a doctor. In Supabase, open **Table Editor → doctors** and set `verified` to **true** for that doctor. Patients will see them from then on.
3. In **Agenda**, the doctor opens free times, and patients book them from the doctor's profile.

### 5. Automatic database updates + e-mails (GitHub Actions)
`.github/workflows/supabase.yml` applies `supabase/schema.sql` and every file in `supabase/updates/` (all safe to re-run). It also deploys the `notify-email` function and sets its secrets. It runs whenever something in `supabase/` changes, or by hand from **Actions → Update Supabase → Run workflow**.

One-time setup, in GitHub under **Settings → Secrets and variables → Actions → Secrets → New repository secret**:
- `SUPABASE_DB_URL`: in Supabase, click **Connect**, choose the **Session pooler** URI and replace `[YOUR-PASSWORD]` with the database password.
- `SUPABASE_ACCESS_TOKEN`: create one under supabase.com → Account → **Access Tokens**.
- `RESEND_API_KEY`: from resend.com → **API Keys**. Without this key, e-mails are skipped.

E-mails sent: a welcome e-mail on sign-up (patients and doctors), a new review request and new booking or cancellation (doctors), and a review answered (patients). All are in EN/PT/ES, matching each user's language. A database trigger calls the function with only the notification id, and the function sends each notification at most once.

Until you verify your own domain in Resend, it only delivers to the Resend account owner's address. Verify GiGi's domain and change `EMAIL_FROM` in the workflow to e-mail real users (done: `GiGi <ola@gigihealth.app>`, domain verified in Resend, region Ireland).

### 6. Run locally (optional)
Install Node.js 20 or later, then run `npm install` and `npm run dev`. For live mode, copy `.env.example` to `.env.local` and fill it in.

---

## Before using real patient data
Use only fictional data in MVP tests. Health data is a special category under GDPR and LGPD. Before going live you need a privacy policy, a DPIA, a data processing agreement with Supabase, and e-mail confirmation turned on. Also note that the Supabase free tier pauses projects after a week of inactivity and has no automatic backups.

## Project structure
```
src/lib/markers.js         marker catalogue, LOINC codes, unit conversions, evaluation rules
src/lib/api.js             picks Supabase (keys set) or sample mode (no keys)
src/lib/supabaseBackend.js live backend
src/lib/demoBackend.js     sample backend (localStorage), with seed.js holding the MVP data
src/i18n/{en,pt,es}.js     every on-screen text, in 3 languages
src/pages/patient/*        patient screens
src/pages/doctor/*         doctor console
supabase/schema.sql        database, privacy rules, triggers
supabase/functions/...     e-mail sender
```
