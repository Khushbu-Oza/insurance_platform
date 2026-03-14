# InsureFlow

InsureFlow is a role-based insurance operations platform built with Next.js and Supabase.

It includes:
- Policy administration and quote workflow
- Underwriting queue and approvals
- Claims management
- Billing, payments, and commissions
- Reports and analytics
- Audit logs, notifications, and compliance controls
- Agent and policyholder workspaces

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Supabase (Auth, Postgres, RLS)
- Recharts (dashboard visualizations)
- Vercel (deployment target)

## Project Structure

- `app/` - pages, layouts, and API routes
- `components/` - reusable UI and layout components
- `lib/` - domain logic, auth/roles, Supabase clients, helpers
- `supabase/migrations/` - SQL schema and RLS migrations
- `supabase/seed.ts` - seed script for demo/test data
- `vercel.json` - deployment settings

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment variables

Create `.env.local` using `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

3. Apply database migrations in Supabase SQL Editor in this order:

- `supabase/migrations/001_schema.sql`
- `supabase/migrations/002_policies.sql`
- `supabase/migrations/003_claims.sql`
- `supabase/migrations/004_rls_fix.sql`
- `supabase/migrations/005_super_admin_full_access.sql`
- `supabase/migrations/006_billing.sql`
- `supabase/migrations/007_supporting.sql`

4. Seed demo data

```bash
npm run seed
```

5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

- `npm run dev` - start local development server
- `npm run build` - create production build
- `npm run start` - run production server
- `npm run lint` - run ESLint checks
- `npm run seed` - seed Supabase data

## Roles and Access

Supported role keys:
- `super_admin`
- `carrier_admin`
- `underwriter`
- `claims_adjuster`
- `agent`
- `policyholder`

Route access is enforced in `middleware.ts`, and data permissions are enforced through Supabase RLS policies in migrations.

## Deployment (Vercel)

1. Import this GitHub repository into Vercel.
2. Set the same environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy.

If you use Vercel CLI:

```bash
npx vercel --prod
```

## Notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Do not commit `.env.local`.
- Ensure migrations are applied before running seed or testing role-based actions.
