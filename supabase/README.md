# RoyalWin786 Supabase setup

1. Create a Supabase project in the region approved for your users and compliance needs.
2. Open **SQL Editor** and run the migrations in filename order:
   - `migrations/202607210001_initial_schema.sql`
   - `migrations/202607210002_add_profile_email.sql`
   - `migrations/202607210003_complete_lottery_system.sql`
3. Email authentication and the default Magic Link template are enabled by default. Supabase's default email sender is suitable for limited MVP testing; configure custom SMTP before production-scale launch.
4. Create the first admin in **Authentication → Users**, then run this in SQL Editor with the real user UUID:

```sql
update public.profiles set role = 'admin' where id = 'ADMIN_USER_UUID';
```

5. Copy `.env.example` to `.env.local`, add the Project URL and publishable key, then set `REACT_APP_ENABLE_LIVE_BACKEND=true`.
6. For GitHub Pages, add repository Actions secrets named `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_PUBLISHABLE_KEY`, and `REACT_APP_ENABLE_LIVE_BACKEND`.

The third migration adds reward tiers, result publication, atomic settlement, winner credits, cancellation refunds, ticket verification, daily-limit enforcement and admin lottery controls. Result publication, cancellations and point adjustments run only through `security definer` functions that verify the signed-in admin role and write audit events.

Never expose the Supabase service-role or secret key in React, GitHub Pages, or any client bundle. Refunds, KYC, payments, real-money prizes and role assignment must run in a separately trusted backend or Edge Function.
