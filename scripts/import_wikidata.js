#!/usr/bin/env node

/**
 * Imports software data from Wikidata SPARQL endpoint
 * Fetches software from liberal democracies (excluding USA) with websites
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

// Liberal democracies (Wikidata IDs) - excluding USA
// Based on Democracy Index, Freedom House ratings, and established democratic institutions
const LIBERAL_DEMOCRACIES = {
  // Western Europe
  'Q183': 'Germany',
  'Q142': 'France',
  'Q145': 'United Kingdom',
  'Q39': 'Switzerland',
  'Q55': 'Netherlands',
  'Q34': 'Sweden',
  'Q20': 'Norway',
  'Q33': 'Finland',
  'Q35': 'Denmark',
  'Q40': 'Austria',
  'Q31': 'Belgium',
  'Q38': 'Italy',
  'Q29': 'Spain',
  'Q45': 'Portugal',
  'Q27': 'Ireland',
  'Q32': 'Luxembourg',
  'Q189': 'Iceland',
  // Central/Eastern Europe (EU democracies)
  'Q213': 'Czech Republic',
  'Q36': 'Poland',
  'Q191': 'Estonia',
  'Q211': 'Latvia',
  'Q37': 'Lithuania',
  'Q214': 'Slovakia',
  'Q215': 'Slovenia',
  'Q224': 'Croatia',
  'Q41': 'Greece',
  'Q233': 'Malta',
  'Q229': 'Cyprus',
  // Asia-Pacific democracies
  'Q17': 'Japan',
  'Q884': 'South Korea',
  'Q865': 'Taiwan',
  'Q408': 'Australia',
  'Q664': 'New Zealand',
  // Americas (non-US)
  'Q16': 'Canada',
  'Q77': 'Uruguay',
  'Q800': 'Costa Rica',
};

// Build SPARQL VALUES clause for liberal democracies
const countryValues = Object.keys(LIBERAL_DEMOCRACIES)
  .map(id => `wd:${id}`)
  .join(' ');

const SPARQL_QUERY = `
SELECT DISTINCT ?item ?itemLabel ?website ?countryLabel ?countryCode WHERE {
  VALUES ?country { ${countryValues} }

  ?item wdt:P31 wd:Q7397 .        # instance of software
  ?item wdt:P495 ?country .        # has country of origin
  ?item wdt:P856 ?website .        # has official website

  OPTIONAL { ?country wdt:P297 ?countryCode . }  # ISO 3166-1 alpha-2 code

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
LIMIT 100
`;

// Map country to region
function getRegion(country) {
  const regionMap = {
    // Western Europe
    'Germany': 'Western Europe', 'France': 'Western Europe',
    'United Kingdom': 'Western Europe', 'Switzerland': 'Western Europe',
    'Netherlands': 'Western Europe', 'Sweden': 'Northern Europe',
    'Norway': 'Northern Europe', 'Finland': 'Northern Europe',
    'Denmark': 'Northern Europe', 'Austria': 'Western Europe',
    'Belgium': 'Western Europe', 'Spain': 'Southern Europe',
    'Italy': 'Southern Europe', 'Portugal': 'Southern Europe',
    'Ireland': 'Western Europe', 'Luxembourg': 'Western Europe',
    'Iceland': 'Northern Europe', 'Greece': 'Southern Europe',
    'Malta': 'Southern Europe', 'Cyprus': 'Southern Europe',
    // Central/Eastern Europe
    'Czech Republic': 'Central Europe', 'Czechia': 'Central Europe',
    'Poland': 'Central Europe', 'Estonia': 'Baltic',
    'Latvia': 'Baltic', 'Lithuania': 'Baltic',
    'Slovakia': 'Central Europe', 'Slovenia': 'Central Europe',
    'Croatia': 'Central Europe',
    // Asia-Pacific
    'Japan': 'East Asia', 'South Korea': 'East Asia',
    'Taiwan': 'East Asia', 'Australia': 'Oceania',
    'New Zealand': 'Oceania',
    // Americas
    'Canada': 'North America', 'Uruguay': 'South America',
    'Costa Rica': 'Central America',
    // Middle East
    'Israel': 'Middle East',
  };
  return regionMap[country] || 'Other';
}

// Liberal democracies whitelist for post-filtering
const ALLOWED_COUNTRIES = new Set(Object.values(LIBERAL_DEMOCRACIES));

// Check if country is a liberal democracy
function isLiberalDemocracy(country) {
  // Direct match
  if (ALLOWED_COUNTRIES.has(country)) return true;

  // Handle variations
  const normalized = country.toLowerCase().trim();
  for (const allowed of ALLOWED_COUNTRIES) {
    if (allowed.toLowerCase() === normalized) return true;
  }

  // Handle "Czechia" vs "Czech Republic"
  if (normalized === 'czechia') return true;

  return false;
}

// Generate a URL-safe ID from name
function generateId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Group items by a simple category based on patterns
function categorizeByName(name) {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('mail') || lowerName.includes('email')) return 'Email';
  if (lowerName.includes('office') || lowerName.includes('document') || lowerName.includes('word')) return 'Office Suite';
  if (lowerName.includes('browser')) return 'Browser';
  if (lowerName.includes('cloud') || lowerName.includes('storage') || lowerName.includes('drive')) return 'Cloud Storage';
  if (lowerName.includes('chat') || lowerName.includes('messenger') || lowerName.includes('message')) return 'Messaging';
  if (lowerName.includes('video') || lowerName.includes('stream')) return 'Video';
  if (lowerName.includes('music') || lowerName.includes('audio')) return 'Music';
  if (lowerName.includes('photo') || lowerName.includes('image')) return 'Photos';
  if (lowerName.includes('map')) return 'Maps';
  if (lowerName.includes('search')) return 'Search';

  return 'Software';
}

async function fetchWikidataItems() {
  console.log('Fetching software from liberal democracies...');
  console.log(`Querying ${Object.keys(LIBERAL_DEMOCRACIES).length} countries\n`);

  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set('query', SPARQL_QUERY);
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/sparql-results+json',
      'User-Agent': 'GlobalBalanceEngine/1.0 (https://github.com/global-balance-engine)'
    }
  });

  if (!response.ok) {
    throw new Error(`Wikidata query failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.results.bindings;
}

function transformToServicesSchema(wikidataItems) {
  const categoryMap = new Map();
  let skippedCount = 0;

  for (const item of wikidataItems) {
    const name = item.itemLabel?.value || 'Unknown';
    const website = item.website?.value || '';
    const country = item.countryLabel?.value || 'Unknown';

    // Skip items without proper data
    if (!website || name === 'Unknown') continue;

    // Skip if name looks like a Wikidata ID (Q followed by numbers)
    if (/^Q\d+$/.test(name)) continue;

    // Double-check: only allow liberal democracies
    if (!isLiberalDemocracy(country)) {
      skippedCount++;
      continue;
    }

    const category = categorizeByName(name);
    const region = getRegion(country);

    const innovator = {
      id: generateId(name),
      name: name,
      region: region,
      country: country,
      url: website,
      description: `${name} - Software from ${country}`,
      status: {
        is_active: false,
        last_checked: null,
        http_code: 0
      }
    };

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category: category,
        incumbent: { name: 'Various', hq: 'USA' },
        innovators: []
      });
    }

    // Avoid duplicate IDs within a category
    const existing = categoryMap.get(category).innovators;
    if (!existing.some(i => i.id === innovator.id)) {
      existing.push(innovator);
    }
  }

  if (skippedCount > 0) {
    console.log(`Skipped ${skippedCount} items from non-liberal democracies`);
  }

  // Convert map to array and sort by category
  return Array.from(categoryMap.values()).sort((a, b) =>
    a.category.localeCompare(b.category)
  );
}

async function main() {
  try {
    const wikidataItems = await fetchWikidataItems();
    console.log(`Fetched ${wikidataItems.length} items from Wikidata`);

    const services = transformToServicesSchema(wikidataItems);
    console.log(`Grouped into ${services.length} categories`);

    // Count total innovators
    const totalInnovators = services.reduce((sum, cat) => sum + cat.innovators.length, 0);
    console.log(`Total innovators: ${totalInnovators}`);

    // Write to services.json
    const outputPath = join(__dirname, '..', 'src', 'data', 'services.json');
    writeFileSync(outputPath, JSON.stringify(services, null, 2));
    console.log(`\nWritten to ${outputPath}`);

    // Print summary by country
    const countryCounts = {};
    for (const cat of services) {
      for (const inv of cat.innovators) {
        countryCounts[inv.country] = (countryCounts[inv.country] || 0) + 1;
      }
    }

    console.log('\nBy Country:');
    const sortedCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
    for (const [country, count] of sortedCountries) {
      console.log(`  ${country}: ${count}`);
    }

    console.log('\nBy Category:');
    for (const cat of services) {
      console.log(`  ${cat.category}: ${cat.innovators.length} innovators`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
