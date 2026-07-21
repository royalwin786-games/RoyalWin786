# RoyalWin786

Original responsive RoyalWin786 player and admin platform built with React. The interface uses a website-first desktop layout and an app-style mobile layout under one codebase.

## Included flows

- Player registration with full name, email, mobile number, age and password
- Six-digit email OTP verification, email/mobile password login and email password recovery
- Restricted admin credential login with role enforcement
- Responsive player lobby with desktop navigation and mobile app tabs
- RoyalWin Super 7 number picker with transactional ticket purchase
- Official result history, ticket matching, prize settlement and winner points
- Player-owned ticket verification and complete ticket history
- Reward-points wallet ledger and database-enforced daily play limits
- Live admin control centre for draw creation, opening, cancellation/refunds, result publication and player point adjustments
- Atomic draw settlement with an immutable audit trail
- Royal Roulette secondary demo-points game
- Original RoyalWin786 premium brand icon

## Run locally

```bash
npm install
npm start
```

## Supabase backend

The repository includes an optional Supabase PostgreSQL backend scaffold with:

- Player email/password authentication with email OTP confirmation and secure phone-number aliases
- Password recovery links and a separate admin password authentication service
- Player/admin profiles and role enforcement
- Draws, lottery tickets, points wallets, immutable ledger entries, responsible-play settings, audit events, and demo roulette history
- Row Level Security policies for player-owned data and admin-only operations
- Transactional ticket purchase with balance and daily-limit checks
- Admin-only draw lifecycle functions and automatic winner settlement
- Configurable reward tiers and authenticated ticket verification

Follow [`supabase/README.md`](supabase/README.md), then copy `.env.example` to `.env.local`. Until `REACT_APP_ENABLE_LIVE_BACKEND=true` and valid Supabase values are configured, the interface stays in clearly labelled frontend demo mode.

RoyalWin786 currently uses non-cash reward points. Payments, cash withdrawal, KYC, real-money prizes, production roulette settlement, regulatory enforcement, and service-role operations are intentionally not included and require a separately audited, compliant backend.
