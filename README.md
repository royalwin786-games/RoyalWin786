# RoyalWin786

Original responsive RoyalWin786 player and admin platform built with React. The interface uses a website-first desktop layout and an app-style mobile layout under one codebase.

## Included flows

- Player-first passwordless email-link login with a separate admin login
- Separate restricted admin credential login
- Responsive player lobby with desktop navigation and mobile app tabs
- RoyalWin Super 7 number picker and demo ticket history
- Royal Roulette secondary demo-points game
- Separate admin draw dashboard and report navigation
- Stock Unsold number-pad workflow
- View Order List workflow
- Original RoyalWin786 premium brand icon

## Run locally

```bash
npm install
npm start
```

## Supabase backend

The repository includes an optional Supabase PostgreSQL backend scaffold with:

- Passwordless email-link and admin password authentication services
- Player/admin profiles and role enforcement
- Draws, lottery tickets, points wallets, immutable ledger entries, responsible-play settings, audit events, and demo roulette history
- Row Level Security policies for player-owned data and admin-only operations
- A transactional `purchase_lottery_ticket` database function

Follow [`supabase/README.md`](supabase/README.md), then copy `.env.example` to `.env.local`. Until `REACT_APP_ENABLE_LIVE_BACKEND=true` and valid Supabase values are configured, the interface stays in clearly labelled frontend demo mode.

Payments, cash withdrawal, KYC, production roulette settlement, result publication, regulatory enforcement, and service-role operations must remain in a trusted backend or Edge Function and require the applicable approvals.
