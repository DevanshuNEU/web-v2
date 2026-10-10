#!/usr/bin/env node
/**
 * Tell IndexNow (Bing and friends) that every URL in the live sitemap may have
 * changed. Runs from .github/workflows/indexnow.yml after each production
 * deploy; also safe to run by hand: node frontend/scripts/indexnow.mjs
 *
 * Fails loudly when the key file is not live or the API rejects the batch, so
 * a broken setup shows up as a red workflow run instead of silence.
 */

const ORIGIN = process.env.SITE_ORIGIN ?? 'https://www.devanshuchicholikar.com';
const KEY = '21df0414fc3ef7991eb651f5819eee5b'; // must match INDEXNOW_KEY in src/lib/site.ts
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`;

async function main() {
  const keyRes = await fetch(KEY_LOCATION, { cache: 'no-store' });
  const served = (await keyRes.text()).trim();
  if (!keyRes.ok || served !== KEY) {
    throw new Error(`Key file not live at ${KEY_LOCATION} (HTTP ${keyRes.status})`);
  }

  const sitemap = await (await fetch(`${ORIGIN}/sitemap.xml`, { cache: 'no-store' })).text();
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  if (urlList.length === 0) throw new Error('Sitemap has no <loc> entries');

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(ORIGIN).host, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });
  // 200 = accepted, 202 = accepted while the key is being validated.
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`IndexNow rejected the batch: HTTP ${res.status} ${await res.text()}`);
  }
  console.log(`IndexNow: submitted ${urlList.length} URLs (HTTP ${res.status})`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
