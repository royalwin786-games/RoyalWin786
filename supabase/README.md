# RoyalWin786 Supabase setup

1. Create a Supabase project in the region approved for your users and compliance needs.
2. Open **SQL Editor** and run the migrations in filename order:
   - `migrations/202607210001_initial_schema.sql`
   - `migrations/202607210002_add_profile_email.sql`
   - `migrations/202607210003_complete_lottery_system.sql`
   - `migrations/202607210004_password_otp_auth.sql`
3. In **Authentication → Providers → Email**, keep email/password signup enabled and turn on **Confirm email**.
4. Configure a custom SMTP provider, then open **Authentication → Email Templates → Confirm signup** and use:
   - Subject: `{{ .Token }} is your RoyalWin786 verification code`
   - Body: paste the contents of `templates/confirmation.html`

   The OTP form requires the `{{ .Token }}` variable. A template containing only `{{ .ConfirmationURL }}` sends a link instead of a six-digit code. New free-tier projects using Supabase's default SMTP may not allow template customization, so custom SMTP is required for this OTP-only signup flow.
5. In **Authentication → URL Configuration**, use `https://royalwin786-games.github.io/RoyalWin786/` as the Site URL and an allowed Redirect URL. Password recovery returns to `?recovery=1` on this URL.
6. Deploy the public, rate-limited phone identifier function:

```bash
supabase functions deploy identifier-login --no-verify-jwt
```

   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected into deployed Edge Functions by Supabase. Never add the service-role key to React or GitHub Actions.
7. Create the first admin in **Authentication → Users**, then run this in SQL Editor with the real user UUID:

```sql
update public.profiles set role = 'admin' where id = 'ADMIN_USER_UUID';
```

8. Copy `.env.example` to `.env.local`, add the Project URL and publishable key, then set `REACT_APP_ENABLE_LIVE_BACKEND=true`.
9. For GitHub Pages, add repository Actions secrets named `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_PUBLISHABLE_KEY`, and `REACT_APP_ENABLE_LIVE_BACKEND`.

The third migration adds reward tiers, result publication, atomic settlement, winner credits, cancellation refunds, ticket verification, daily-limit enforcement and admin lottery controls. The fourth migration adds 18+ player details, unique normalized phone aliases and rate limiting for mobile-number login. Result publication, cancellations and point adjustments run only through `security definer` functions that verify the signed-in admin role and write audit events.

Never expose the Supabase service-role or secret key in React, GitHub Pages, or any client bundle. Refunds, KYC, payments, real-money prizes and role assignment must run in a separately trusted backend or Edge Function.
