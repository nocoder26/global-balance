/**
 * Trustpilot Legitimacy Verification Script
 *
 * Checks if innovators have Trustpilot profiles by making HEAD requests
 * to https://www.trustpilot.com/review/{domain}
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICES_FILE = path.join(__dirname, '../src/data/services.json');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DEFAULT_TIMEOUT = 10000;
const EV_TIMEOUT = 15000;

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Check Trustpilot profile existence
 */
async function checkTrustpilot(domain, categoryName) {
  const trustpilotUrl = `https://www.trustpilot.com/review/${domain}`;
  const isEV = categoryName === 'Electric Vehicles';
  const timeout = isEV ? EV_TIMEOUT : DEFAULT_TIMEOUT;

  try {
    // First try HEAD request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response = await fetch(trustpilotUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    // For Electric Vehicles, retry with GET if HEAD fails
    if (!response.ok && isEV) {
      console.log(`  Retrying ${domain} with GET request (EV category)...`);
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), timeout);

      response = await fetch(trustpilotUrl, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT },
        signal: getController.signal,
        redirect: 'follow',
      });

      clearTimeout(getTimeoutId);
    }

    return response.status === 200 ? 'verified' : 'unverified';
  } catch (error) {
    console.log(`  Error checking ${domain}: ${error.message}`);
    return 'unverified';
  }
}

/**
 * Process all services and update trust_data
 */
async function verifyAllServices() {
  console.log('Loading services data...');
  const data = JSON.parse(fs.readFileSync(SERVICES_FILE, 'utf-8'));

  let totalChecked = 0;
  let verified = 0;

  for (const category of data) {
    console.log(`\nProcessing category: ${category.category}`);

    for (const innovator of category.innovators) {
      const domain = extractDomain(innovator.url);

      if (!domain) {
        console.log(`  Skipping ${innovator.name}: Invalid URL`);
        innovator.trust_data = { trustpilot_status: 'unverified' };
        continue;
      }

      console.log(`  Checking ${innovator.name} (${domain})...`);
      const status = await checkTrustpilot(domain, category.category);

      innovator.trust_data = { trustpilot_status: status };
      totalChecked++;

      if (status === 'verified') {
        verified++;
        console.log(`    ✓ Verified on Trustpilot`);
      } else {
        console.log(`    ✗ Not found on Trustpilot`);
      }

      // Rate limiting: small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\nSaving updated services data...');
  fs.writeFileSync(SERVICES_FILE, JSON.stringify(data, null, 2));

  console.log(`\nDone! Checked ${totalChecked} services.`);
  console.log(`Verified: ${verified}, Unverified: ${totalChecked - verified}`);
}

// Run the verification
verifyAllServices().catch(console.error);
