# RoyalWin786 Supabase setup

1. Create a Supabase project in the region approved for your users and compliance needs.
2. Open **SQL Editor** and run `migrations/202607210001_initial_schema.sql`.
3. Email authentication and the default Magic Link template are enabled by default. Supabase's default email sender is suitable for limited MVP testing; configure custom SMTP before production-scale launch.
4. Create the first admin in **Authentication → Users**, then run this in SQL Editor with the real user UUID:

```sql
update public.profiles set role = 'admin' where id = 'ADMIN_USER_UUID';
```

5. Copy `.env.example` to `.env.local`, add the Project URL and publishable key, then set `REACT_APP_ENABLE_LIVE_BACKEND=true`.
6. For GitHub Pages, add repository Actions secrets named `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_PUBLISHABLE_KEY`, and `REACT_APP_ENABLE_LIVE_BACKEND`.

Never expose the Supabase service-role or secret key in React, GitHub Pages, or any client bundle. Privileged settlement, refunds, KYC, payments, result publication, and role assignment must run in a trusted backend or Edge Function.
