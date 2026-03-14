# Cloud-Native P&C Insurance Core Platform

**Alternative to:** BriteCore — Cloud-native P&C core platform for regional carriers & MGAs  
**Domain:** Fintech | **Category:** P&C Insurance Technology  
**Tech Stack:** Next.js 14 (App Router) + Supabase (Auth + DB) + Vercel  
**Product Name:** **InsureFlow** — *Modern Core Platform for P&C Insurers*

---

## Executive Summary

InsureFlow modernizes legacy insurance operations for regional P&C carriers and MGAs. The platform delivers end-to-end policy lifecycle management, claims processing, billing, agent/policyholder portals, and reporting — all in a single cloud-native SaaS platform. The MVP focuses on personal auto and homeowners insurance on a single-state basis to demonstrate product-market fit.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APP ROUTER                       │
│  /app                                                            │
│  ├── (auth)/          → Login, Signup, Forgot Password          │
│  ├── (admin)/         → Admin dashboard, org management         │
│  ├── (agent)/         → Agent portal                            │
│  ├── (policyholder)/  → Customer self-service portal            │
│  ├── (underwriting)/  → UW queue, risk assessment               │
│  ├── (claims)/        → Claims management workflow              │
│  ├── (billing)/       → Invoices, payments, commissions         │
│  ├── (reports)/       → Reports and analytics dashboards        │
│  └── api/             → Route handlers (REST API endpoints)     │
├─────────────────────────────────────────────────────────────────┤
│                      SUPABASE BACKEND                            │
│  Auth → Row-Level Security → PostgreSQL DB → Realtime           │
└─────────────────────────────────────────────────────────────────┘
```

### User Roles
| Role | Portal | Permissions |
|---|---|---|
| **Super Admin** | Admin | Full platform access, multi-tenant management |
| **Carrier Admin** | Admin | Manage own org, products, users |
| **Underwriter** | Admin | Policy review, approval, rating |
| **Claims Adjuster** | Admin | Claims processing, settlements |
| **Agent** | Agent Portal | Submit quotes, manage policies, view commissions |
| **Policyholder** | Customer Portal | View policies, pay, file claims |

---

## Database Schema (Supabase PostgreSQL)

### Core Tables
- **organizations** — Multi-tenant carrier/MGA entities
- **users** / **profiles** — Supabase Auth + extended profile data
- **policies** — Policy lifecycle (quote → bound → active → expired)
- **policyholders** / **customers** — Insured party details
- **agents** — Agent profiles with NPN, license, commission rates
- **coverages** — Coverage line items per policy
- **endorsements** — Mid-term policy changes

### Claims
- **claims** — Master claims record (FNOL → open → settled → closed)
- **claim_notes** — Adjuster notes and communications
- **claim_payments** — Reserve and settlement payments
- **claim_documents** — Attached evidence files

### Financial
- **invoices** — Premium billing schedule per policy
- **payments** — Payment transactions (premium, claim settlement)
- **commissions** — Agent/broker commission records
- **reinsurance_treaties** — Reinsurance relationships

### Product & Rating
- **products** — Lines of business (personal auto, homeowners, etc.)
- **rating_factors** — Configurable rating algorithm inputs
- **rating_rules** — Underwriting rules and conditions

### Supporting
- **documents** — Centralized document store (policy docs, contracts)
- **notifications** — In-app notification queue
- **audit_logs** — Immutable activity log for compliance
- **workflows** — Configurable process automation
- **compliance_rules** — State/federal regulatory rule set

---

## Development Phases

---

## Phase 1 — Foundation & Authentication

**Goal:** Working Next.js app with Supabase auth, role system, and landing page.

### [NEW] Project Root — `package.json`, `next.config.js`, `.env.local`
- Init Next.js 14 with App Router
- Install: `@supabase/supabase-js`, `@supabase/ssr`, `recharts`, `lucide-react`, `date-fns`

#### [NEW] `app/(auth)/login/page.tsx`
Email/password login with Supabase Auth.

#### [NEW] `app/(auth)/signup/page.tsx`
New user signup with role selection.

#### [NEW] `lib/supabase/client.ts` + `server.ts`
Supabase client helpers (browser + server components + route handlers).

#### [NEW] `middleware.ts`
Auth guard: redirects unauthenticated users. Role-based route protection.

#### [NEW] `app/page.tsx`
Marketing landing page: hero, feature highlights, call-to-action.

#### [NEW] `supabase/migrations/001_schema.sql`
Core schema: organizations, profiles, roles, audit_logs tables + RLS policies.

#### [NEW] `supabase/seed.ts`
Seed script: 2 demo carriers, 10 agents, 50 policyholders, 100+ policies.

---

## Phase 2 — Policy Administration System (PAS)

**Goal:** Full quote-to-bind lifecycle with underwriting workflow and rating.

#### [NEW] `app/(admin)/policies/page.tsx`
Policy list with filters (status, agent, product, date range).

#### [NEW] `app/(admin)/policies/[id]/page.tsx`
Policy detail: info tabs for coverage, endorsements, documents, activity.

#### [NEW] `app/(admin)/policies/new/page.tsx`
New quote wizard: applicant info → coverage selection → rating → bind.

#### [NEW] `app/(admin)/underwriting/page.tsx`
Underwriting queue: pending approval decisions with risk summary.

#### [NEW] `lib/rating/engine.ts`
Rule-based rating engine: calculates premium from rating factors.

#### [NEW] `app/api/policies/route.ts` + `app/api/policies/[id]/route.ts`
CRUD API for policies with status transition validation.

#### [NEW] `supabase/migrations/002_policies.sql`
Policies, coverages, endorsements, products, rating_factors, rating_rules tables.

---

## Phase 3 — Claims Management System

**Goal:** End-to-end claims workflow from FNOL to settlement.

#### [NEW] `app/(admin)/claims/page.tsx`
Claims list: filterable by status, adjuster, policy, date. KPI cards at top.

#### [NEW] `app/(admin)/claims/[id]/page.tsx`
Claim detail: timeline, notes, reserves, documents, payments.

#### [NEW] `app/(admin)/claims/new/page.tsx`
FNOL intake form: linked policy lookup, incident details, coverage selection.

#### [NEW] `app/api/claims/route.ts` + `app/api/claims/[id]/route.ts`
Claims CRUD and workflow transition (open → investigating → settled → closed).

#### [NEW] `supabase/migrations/003_claims.sql`
Claims, claim_notes, claim_payments, claim_documents tables.

---

## Phase 4 — Billing & Financial Engine

**Goal:** Premium billing, invoices, payment tracking, agent commissions.

#### [NEW] `app/(admin)/billing/page.tsx`
Billing dashboard: overdue invoices, payment activity, revenue chart.

#### [NEW] `app/(admin)/billing/invoices/[id]/page.tsx`
Invoice detail with payment history and status.

#### [NEW] `app/(admin)/billing/commissions/page.tsx`
Commission report: earned, paid, pending per agent.

#### [NEW] `lib/billing/scheduler.ts`
Premium billing schedule generator (monthly/quarterly/annual installments).

#### [NEW] `app/api/billing/route.ts` + `app/api/payments/route.ts`
Billing and payment route handlers.

#### [NEW] `supabase/migrations/004_billing.sql`
Invoices, payments, commissions, reinsurance_treaties tables.

---

## Phase 5 — Agent & Policyholder Portals

**Goal:** Self-service portals for agents and customers.

#### [NEW] `app/(agent)/dashboard/page.tsx`
Agent home: active book of business, pending tasks, commission summary.

#### [NEW] `app/(agent)/clients/page.tsx`
Agent client list with policy status and quick-action links.

#### [NEW] `app/(agent)/new-submission/page.tsx`
Agent quote submission workflow.

#### [NEW] `app/(policyholder)/dashboard/page.tsx`
Customer home: policy cards, upcoming payments, open claims.

#### [NEW] `app/(policyholder)/claims/new/page.tsx`
Customer-facing FNOL form.

#### [NEW] `app/(policyholder)/payments/page.tsx`
Payment history and upcoming bill schedule.

---

## Phase 6 — Dashboard, Analytics & Reporting

**Goal:** Executive KPI dashboards and configurable reports.

#### [NEW] `app/(admin)/dashboard/page.tsx`
Executive dashboard: written premium, loss ratio, combined ratio, policy count charts using Recharts.

#### [NEW] `app/(admin)/reports/page.tsx`
Report library: pre-built reports for UW, claims, billing, and agents.

#### [NEW] `app/(admin)/reports/[slug]/page.tsx`
Dynamic report view with date range filters and CSV export.

#### [NEW] `lib/analytics/metrics.ts`
Server-side metric calculations (loss ratio, expense ratio, MRR, etc.).

---

## Phase 7 — Notifications, Audit & Compliance

**Goal:** In-app notifications, audit trail, compliance rules engine.

#### [NEW] `app/(admin)/audit-log/page.tsx`
Immutable audit log viewer with filters by entity, user, action type.

#### [NEW] `app/(admin)/settings/compliance/page.tsx`
Regulatory compliance rules list with enable/disable toggles.

#### [NEW] `lib/notifications/service.ts`
Notification creation helpers called after key events.

#### [NEW] `components/NotificationBell.tsx`
Header bell icon with unread count and dropdown.

#### [NEW] `supabase/migrations/005_supporting.sql`
Notifications, audit_logs, workflows, compliance_rules tables.

---

## Phase 8 — Polish, Seed Data & Deployment

**Goal:** App fully populated on first visit, mobile-responsive, ready for Vercel.

#### [MODIFY] `supabase/seed.ts`
Comprehensive seed:
- 2 carrier organizations
- 10 agents with commission histories
- 50 policyholders (auto + homeowners)
- 100 active policies across lifecycle stages
- 30 claims (various statuses)
- 200 invoices + payments
- Audit log entries, notifications

#### [NEW] `vercel.json`
Vercel deployment config.

#### [NEW] `.env.example`
Template with all required env vars.

---

## UI Design System

- **Color palette:** Deep navy `#0F172A` with electric blue accent `#3B82F6`, emerald green for success states, amber for warnings
- **Typography:** Inter (Google Fonts) — clean, professional
- **Components:** Custom design system: `Button`, `Card`, `Badge`, `Table`, `Modal`, `Sidebar`, `StatCard`
- **Style:** Glassmorphism cards on dark backgrounds, subtle gradients, micro-animations on hover
- **Responsive:** Mobile-first, sidebar collapses to bottom nav on small screens

---

## Verification Plan

### Automated Tests
No pre-existing tests in the repo. A Supabase migration check will be run:
```bash
# Verify DB schema applied correctly
npx supabase db reset --local

# Verify Next.js builds with no errors
npm run build
```

### Browser Smoke Tests (via browser subagent after deployment)
1. **Auth flow:** Sign up → confirm → login → redirected to dashboard
2. **Policy flow:** Create new quote → bind policy → view policy detail
3. **Claims flow:** File FNOL → assign adjuster → settle → close
4. **Billing flow:** View invoices → record payment → view commission
5. **Agent portal:** Login as agent → view book of business → submit quote
6. **Policyholder portal:** Login as customer → view policy → make payment

### Manual Verifications
- Seed data visible on first visit (populated tables, dashboard charts)
- No console errors on core flows
- Mobile view usable (375px viewport)
- All role-based routes properly gated (agent can't access admin pages)
