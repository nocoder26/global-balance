/**
 * Triple-Validation Script: Website + Trustpilot + Wikidata
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICES_FILE = path.join(__dirname, '../src/data/services.json');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const TIMEOUT = 15000;

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch { return null; }
}

async function checkWebsite(url) {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), TIMEOUT);
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': USER_AGENT }, signal: controller.signal, redirect: 'follow' });
    clearTimeout(tid);
    return res.status >= 200 && res.status < 300 ? 'active' : 'inactive';
  } catch { return 'inactive'; }
}

async function checkTrustpilot(domain) {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), TIMEOUT);
    const res = await fetch(`https://www.trustpilot.com/review/${domain}`, { method: 'HEAD', headers: { 'User-Agent': USER_AGENT }, signal: controller.signal, redirect: 'follow' });
    clearTimeout(tid);
    return res.status === 200 ? 'verified' : 'unverified';
  } catch { return 'unverified'; }
}

async function checkWikidata(name) {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), TIMEOUT);
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
    clearTimeout(tid);
    const json = await res.json();
    if (json.search && json.search.length > 0) {
      return { status: 'verified', id: json.search[0].id };
    }
    return { status: 'unverified', id: null };
  } catch { return { status: 'unverified', id: null }; }
}

async function validateAll() {
  console.log('Loading services...');
  const data = JSON.parse(fs.readFileSync(SERVICES_FILE, 'utf-8'));
  let total = 0, validated = 0;

  for (const cat of data) {
    console.log(`\n=== ${cat.category} ===`);
    for (const inn of cat.innovators) {
      total++;
      const domain = extractDomain(inn.url);
      console.log(`  ${inn.name} (${domain || inn.url})`);

      // Website check
      const webStatus = await checkWebsite(inn.url);
      console.log(`    Website: ${webStatus}`);

      // Trustpilot check
      const tpStatus = domain ? await checkTrustpilot(domain) : 'unverified';
      console.log(`    Trustpilot: ${tpStatus}`);

      // Wikidata check
      const wdResult = await checkWikidata(inn.name);
      console.log(`    Wikidata: ${wdResult.status}${wdResult.id ? ` (${wdResult.id})` : ''}`);

      // Update trust_data
      inn.trust_data = {
        website_status: webStatus,
        trustpilot_status: tpStatus,
        wikidata_status: wdResult.status,
        wikidata_id: wdResult.id,
        last_checked: new Date().toISOString()
      };

      inn.status.is_active = webStatus === 'active';
      validated++;

      // Rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  fs.writeFileSync(SERVICES_FILE, JSON.stringify(data, null, 2));
  console.log(`\n✓ Validated ${validated}/${total} services`);
}

validateAll().catch(console.error);
