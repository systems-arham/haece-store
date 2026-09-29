# HAECE, Considered Clothing

Premium founder wear. Next.js storefront, Stripe advance payments, Neon Postgres with serialized
(numbered edition) inventory. Admin panel controls products, prices, drop visibility, homepage copy,
and shipping rates.

## Quick start

1. Create a Neon database at neon.tech, copy the connection string.
2. Create the schema and seed the catalog:
   ```
   psql $DATABASE_URL -f db/schema.sql
   psql $DATABASE_URL -f db/seed.sql
   psql $DATABASE_URL -f db/migrations/002-admin-controls.sql
   ```
3. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_BASE_URL`
   - `ADMIN_PASSWORD`, `ADMIN_SECRET` (any long random string)
4. `npm install && npm run dev`

## Stripe webhook

- Local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Copy the `whsec_...` secret into `STRIPE_WEBHOOK_SECRET`.
- On Netlify: add a webhook endpoint in the Stripe dashboard pointing at
  `https://your-domain/api/webhooks/stripe`, event `checkout.session.completed`
  and `checkout.session.expired`.

## Deploy on Netlify

1. Push this folder to a Git repo, import in Netlify (build settings come
   from `netlify.toml`).
2. Add all env vars from `.env.example` in the Netlify dashboard
   (Site settings, Environment variables).
3. The reservation sweeper runs automatically: `netlify/functions/release-reservations.js`
   is scheduled every 10 minutes and calls `/api/cron/release-reservations`
   with `CRON_SECRET`, so abandoned reservations return to stock.
4. After the first deploy, add the Stripe webhook endpoint (above) and set
   `STRIPE_WEBHOOK_SECRET`, then redeploy.

(Deploying on Vercel instead? `vercel.json` keeps the cron working there too.)

## How ordering works

1. Customer checks out: an order is created as `pending_payment` and exact serialized
   units are reserved for 30 minutes.
2. Stripe collects full advance payment. Failed or abandoned payments never create
   a real order; reservations expire back to stock automatically.
3. The webhook marks the order `paid` and flips the reserved units to `sold`.
4. Stock is always the live count of `in_stock` units, never a typed number.

## Admin

Visit `/admin` and sign in with `ADMIN_PASSWORD`. Dashboard, orders (with unit
codes and edition numbers), inventory, products (prices and visibility), content
(hero caption, announcement, Drop 02 visibility), shipping rates, customers.

## Prices (locked 2026-09-28)

Uniform Tee $65, Atlas Vest $110, Onyx Layer $135, Pleated Trouser $150, Founder Coat $195.
Round numbers, one global USD price. Edit in Admin, Products.
