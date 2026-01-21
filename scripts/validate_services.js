#!/usr/bin/env node

/**
 * Validates service URLs and updates their status in services.json
 * Pings each URL with a 5-second timeout and records the result
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TIMEOUT_MS = 5000;
const SERVICES_PATH = join(__dirname, '..', 'src', 'data', 'services.json');

/**
 * Fetch URL with timeout and graceful error handling
 */
async function checkUrl(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD for faster checks
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'GlobalBalanceEngine-Validator/1.0'
      }
    });

    clearTimeout(timeoutId);

    return {
      success: response.ok,
      httpCode: response.status
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Try GET if HEAD fails (some servers don't support HEAD)
    if (error.name !== 'AbortError') {
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), TIMEOUT_MS);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller2.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': 'GlobalBalanceEngine-Validator/1.0'
          }
        });

        clearTimeout(timeoutId2);

        return {
          success: response.ok,
          httpCode: response.status
        };
      } catch (retryError) {
        // Fall through to error handling
      }
    }

    // Determine error type for logging
    let httpCode = 0;
    if (error.name === 'AbortError') {
      httpCode = 408; // Request Timeout
    } else if (error.cause?.code === 'ENOTFOUND') {
      httpCode = 404; // DNS not found
    } else if (error.cause?.code === 'ECONNREFUSED') {
      httpCode = 503; // Connection refused
    } else if (error.message?.includes('certificate') || error.message?.includes('SSL')) {
      httpCode = 495; // SSL Certificate Error (nginx convention)
    }

    return {
      success: false,
      httpCode: httpCode
    };
  }
}

/**
 * Main validation function
 */
async function validateServices() {
  console.log('Loading services.json...');

  // Load data
  const data = JSON.parse(readFileSync(SERVICES_PATH, 'utf-8'));

  // Collect all innovators with their paths for updating
  const innovators = [];
  for (const category of data) {
    for (const innovator of category.innovators) {
      innovators.push(innovator);
    }
  }

  console.log(`Found ${innovators.length} innovators to validate\n`);

  let activeCount = 0;
  let deadCount = 0;
  const now = new Date().toISOString();

  // Process each innovator
  for (let i = 0; i < innovators.length; i++) {
    const innovator = innovators[i];
    const progress = `[${i + 1}/${innovators.length}]`;

    process.stdout.write(`${progress} Checking ${innovator.name}... `);

    const result = await checkUrl(innovator.url);

    // Update status
    innovator.status = {
      is_active: result.success,
      last_checked: now,
      http_code: result.httpCode
    };

    if (result.success) {
      activeCount++;
      console.log(`✓ Active (${result.httpCode})`);
    } else {
      deadCount++;
      console.log(`✗ Dead (${result.httpCode || 'timeout/error'})`);
    }
  }

  // Save updated data
  console.log('\nSaving updated services.json...');
  writeFileSync(SERVICES_PATH, JSON.stringify(data, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log(`Checked ${innovators.length} sites. ${activeCount} Active, ${deadCount} Dead`);
  console.log('='.repeat(50));

  // List dead sites for reference
  if (deadCount > 0) {
    console.log('\nDead/Unreachable sites:');
    for (const innovator of innovators) {
      if (!innovator.status.is_active) {
        console.log(`  - ${innovator.name}: ${innovator.url}`);
      }
    }
  }
}

validateServices().catch(error => {
  console.error('Validation failed:', error.message);
  process.exit(1);
});
