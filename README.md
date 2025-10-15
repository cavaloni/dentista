# Waitlist Gap Filler

A lightweight Next.js + Supabase application that helps dental teams broadcast newly released appointment gaps to a prioritized waitlist, auto‑confirm the first valid “YES”, and surface live activity/monitoring.

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase project (Postgres + Auth) with the SQL migration applied
- Messaging provider credentials
  - **Twilio** (WhatsApp + SMS fallback) _or_
  - **Meta WhatsApp Cloud API**

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

Key variables:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BASE_URL` – public HTTPS origin for webhook signature validation
- `WHATSAPP_PROVIDER` – `twilio` or `meta`
- Provider secrets (Twilio SID/token, Meta phone ID/token, webhook secrets)
- `CRON_SECRET` – bearer token protecting the scheduled job endpoint

## Database Setup

1. Enable the `pgcrypto` and `uuid-ossp` extensions on your Supabase Postgres instance (handled automatically by the migration).
2. Apply the migration in `supabase/migrations/202410111405_init.sql` using the Supabase CLI or SQL editor:

   ```bash
   supabase db push --file supabase/migrations/202410111405_init.sql
   ```

3. The migration creates all tables (`practices`, `waitlist_members`, `slots`, `claims`, `messages`, `webhook_events`), functions (`release_slot`, `attempt_claim`, `expire_open_slots`) and RLS policies. RLS is enforced per `practice_id`.

## Running Locally

```bash
npm install
npm run dev
```

- Visit `http://localhost:3000`
- Request a magic-link login (the first authenticated user auto-provisions a practice)
- Manage waitlist members, release slots, and monitor broadcast activity from the dashboard

### Lint & Tests

```bash
npm run lint        # ESLint
npm run test:e2e    # Playwright (skipped by default until env + fixtures available)
```

## Messaging & Webhooks

### Twilio Setup

1. Configure a Messaging Service or WhatsApp-enabled phone number.
2. Set `WHATSAPP_PROVIDER=twilio`, plus `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`, and `TWILIO_SMS_NUMBER`.
3. Point the Twilio webhook to `POST {BASE_URL}/api/webhooks/whatsapp`.

### Meta WhatsApp Cloud API

1. Set `WHATSAPP_PROVIDER=meta` alongside `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_ID`, `WHATSAPP_WEBHOOK_SECRET`, and `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
2. Configure Meta’s webhook subscription to `{BASE_URL}/api/webhooks/whatsapp`; the GET verification handler returns the challenge when the verify token matches.

Inbound messages call `processInboundMessage`, which:

- Logs the webhook payload (`webhook_events`) and inbound message (`messages` table)
- Finds the waitlist member by normalized address and practice
- Attempts to claim the slot atomically (`attempt_claim`) and sends confirmation/taken notices using the configured templates

## Scheduled Jobs

Create a Vercel Cron entry (or Supabase scheduled function) pointing to:

```
POST {BASE_URL}/api/jobs/expire-slots
Authorization: Bearer <CRON_SECRET>
```

This endpoint:

- Marks `slots` with expired claim windows as `expired`
- Expires any pending claims for those slots
- Retries up to 25 failed outbound messages (max 3 attempts per message)

## Deployment

1. Deploy the Next.js app to Vercel (App Router compatible). Set all environment variables in the Vercel dashboard.
2. Provision a Supabase project and apply the SQL migration.
3. Configure messaging webhook(s) to the deployed `BASE_URL`.
4. Add the cron job for `/api/jobs/expire-slots`.
5. Redeploy after each environment change so Edge middleware picks up the new values.

### Happy-Path Walkthrough

1. Add two active waitlist members (priority 10 and 5) with WhatsApp sandbox numbers.
2. Release a slot (e.g., “tomorrow 11:00, 30m”).
3. Observe outbound invites in the Dashboard Activity log.
4. Reply “YES” from the higher-priority number within the window; confirm the slot is marked “booked” and the other recipient receives a taken notice.
5. Allow a slot to pass the claim window to see the “Expired” badge and logs update accordingly.

## Useful Commands

- `npm run dev` – local development server
- `npm run build && npm run start` – production build preview
- `npm run lint` – linting
- `npm run test:e2e` – Playwright smoke tests (requires seeded data)
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
