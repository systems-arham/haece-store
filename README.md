# HAECE, Storefront

Production storefront for HAECE, considered clothing. Next.js 15 storefront with
Stripe advance payments and Neon Postgres. Every sellable piece is a serialized,
numbered edition unit; stock is always the live count of `in_stock` units, never
a typed number.

## Architecture

- **Storefront:** Next.js App Router, server components throughout. Mobile-first;
  every screen size is a release criterion.
- **Payments:** Stripe Checkout (full advance payment). Webhook-driven order
  lifecycle, signature-verified and idempotent.
- **Inventory:** 300 numbered units per variant. Checkout reserves exact units for
  30 minutes; a scheduled sweeper returns abandoned reservations to stock.
- **Admin:** `/admin`, cookie session (HMAC-signed, HttpOnly). Orders, fulfillment,
  reports, inventory, products, private offer codes, content, shipping, customers.

## Repository layout

```
app/                    Storefront and admin pages
app/api/                Route handlers (checkout, webhooks, admin, lookups)
components/             Shared UI
lib/                    db, stripe, auth, copy, formatting
db/schema.sql           Canonical schema for fresh setups
db/seed.sql             Drop 01 catalog seed
db/migrations/         Ordered migrations, run after schema + seed
db/copy-fixes.sql       One-off product copy corrections
netlify/functions/      Scheduled reservation sweeper
netlify.toml            Build, headers, scheduled function
```

## Configuration

All secrets live in the hosting dashboard, never in git. See `.env.example`
for the full list.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `STRIPE_SECRET_KEY` | Stripe API key (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) |
| `NEXT_PUBLIC_BASE_URL` / `SITE_URL` | Canonical store URL |
| `ADMIN_PASSWORD` | Admin panel password |
| `ADMIN_SECRET` | Session signing secret, long random string |
| `CRON_SECRET` | Bearer token for the reservation sweeper |

## Database

Run in order, once per environment:

```
psql $DATABASE_URL -f db/schema.sql
psql $DATABASE_URL -f db/seed.sql
psql $DATABASE_URL -f db/migrations/002-admin-controls.sql
psql $DATABASE_URL -f db/migrations/003-reports-fulfillment.sql
```

`db/copy-fixes.sql` holds product copy corrections; review before running.

## Order lifecycle

1. Checkout creates the order as `pending_payment` and reserves exact serialized
   units for 30 minutes. Unit costs are snapshotted at this point, so later cost
   edits never rewrite historical profit.
2. `checkout.session.completed` marks the order `paid` and flips reserved units
   to `sold`. `checkout.session.expired` releases the reservation.
3. Fulfillment moves paid orders through confirmed, shipped, in transit,
   delivered. Tracking numbers are visible to the client in Find Your Order.
4. Refunds run through Stripe from the order page; units return to stock and the
   order is marked refunded. Deleted orders restock first, then are removed.

## Admin capabilities

Dashboard, orders (pagination, per-row status, print list, CSV export, counter
reset), order detail (tracking, refund, delete with history export), monthly
revenue and profit reports with per-product breakdown, inventory sell-out and
restock per size, product pricing and production costs, photography uploads,
private offer codes (percent-off, Stripe-backed), editable customer-facing copy,
shipping rates, customer list.

## Deployment (Netlify)

Build settings come from `netlify.toml`. Set every variable from `.env.example`
in Site settings, Environment variables. The reservation sweeper
(`netlify/functions/release-reservations.js`) runs every 10 minutes against
`/api/cron/release-reservations` with `CRON_SECRET`.

After the first deploy: create the Stripe webhook endpoint for
`checkout.session.completed` and `checkout.session.expired`, set
`STRIPE_WEBHOOK_SECRET`, redeploy. Local webhook testing:
`stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

## Catalog

Drop 01 (FW26). Pricing is managed in Admin, Products. Sizes M to XL.
Small is never manufactured.
