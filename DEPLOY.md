# Haece Launch Checklist (Netlify)

Everything the store needs to go live. Steps 1 to 4 need your accounts, so
they are yours. Once the site is up, hand the URL to Muse and the full
customer flow gets tested end to end.

## 1. Database on Neon (about 5 minutes)

1. Sign up at neon.tech and create a new project called `haece`.
   Pick the region closest to you.
2. Open the Neon SQL Editor.
3. Paste the entire contents of `db/schema.sql` and run it.
4. Paste the entire contents of `db/seed.sql` and run it.
5. Paste the entire contents of `db/migrations/002-admin-controls.sql` and run it.
   (Adds the discontinued inventory status and the product image store used by /admin.)
6. Copy the connection string (Dashboard, Connection Details).
   It looks like `postgresql://user:password@host/dbname?sslmode=require`.

## 2. Push the code to GitHub (about 3 minutes)

```bash
git remote add origin https://github.com/YOURNAME/haece-store.git
git branch -M main
git push -u origin main
```

Create the empty repo on github.com first (no README, no .gitignore).
Never push `.env` files: `.gitignore` already blocks them.

## 3. Deploy on Netlify (about 5 minutes)

1. On app.netlify.com: Add new site, Import an existing project,
   connect GitHub, pick the repo. Build settings are read
   automatically from `netlify.toml`.
2. Before deploying, go to Site settings, Environment variables,
   and add all of these:

| Variable               | Value                                        |
| ---------------------- | -------------------------------------------- |
| DATABASE_URL           | the Neon connection string from step 1       |
| STRIPE_SECRET_KEY      | `sk_test_...` for now (test mode first)      |
| NEXT_PUBLIC_BASE_URL   | `https://YOUR-SITE.netlify.app`              |
| SITE_URL               | `https://YOUR-SITE.netlify.app`              |
| ADMIN_PASSWORD         | pick something strong                        |
| ADMIN_SECRET           | any long random string                       |
| CRON_SECRET            | any long random string                       |

   Skip `STRIPE_WEBHOOK_SECRET` for now, it comes after the first deploy.
3. Hit Deploy. Note the site URL Netlify gives you and put it
   in `NEXT_PUBLIC_BASE_URL` and `SITE_URL` if it differs.

## 4. Stripe webhook (about 3 minutes)

1. Stripe Dashboard, Developers, Webhooks, Add endpoint.
2. URL: `https://YOUR-SITE.netlify.app/api/webhooks/stripe`
3. Select these events: `checkout.session.completed`, `checkout.session.expired`.
4. Copy the Signing secret into Netlify as `STRIPE_WEBHOOK_SECRET`
   (Site settings, Environment variables), then trigger a redeploy
   (Deploys, Trigger deploy).

## 5. Verify the scheduler

Netlify dashboard, Functions: you should see `release-reservations`
listed with a `*/10 * * * *` schedule. It calls the sweeper API
every 10 minutes so abandoned reservations return to stock.

## 6. Done

- Storefront: `https://YOUR-SITE.netlify.app`
- Admin: `https://YOUR-SITE.netlify.app/admin` (sign in with ADMIN_PASSWORD)

## Test mode first (recommended)

Use Stripe test keys (`sk_test_...`) and test the full flow with card
`4242 4242 4242 4242` before switching the keys to live.
