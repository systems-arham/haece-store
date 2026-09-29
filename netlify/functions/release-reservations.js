// Runs every 10 minutes. Calls the app's own sweeper API route, which
// releases expired stock reservations back to inventory.
// Needs CRON_SECRET set in the Netlify environment variables.
export default async () => {
  const base = process.env.SITE_URL || process.env.URL;
  if (!base) {
    console.error("release-reservations: SITE_URL or URL is not set");
    return new Response("site URL not configured", { status: 500 });
  }
  const res = await fetch(`${base}/api/cron/release-reservations`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const body = await res.text();
  console.log(`release-reservations: ${res.status} ${body}`);
  return new Response(body, { status: res.status });
};

export const config = {
  schedule: "*/10 * * * *",
};
