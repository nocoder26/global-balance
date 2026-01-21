#!/usr/bin/env node

/**
 * Imports software data from Wikidata SPARQL endpoint
 * Fetches non-US software with websites and populates services.json
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

const SPARQL_QUERY = `
SELECT DISTINCT ?item ?itemLabel ?website ?countryLabel ?countryCode WHERE {
  ?item wdt:P31 wd:Q7397 .        # instance of software
  ?item wdt:P495 ?country .        # has country of origin
  ?item wdt:P856 ?website .        # has official website

  FILTER(?country != wd:Q30)       # NOT United States

  OPTIONAL { ?country wdt:P297 ?countryCode . }  # ISO 3166-1 alpha-2 code

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
LIMIT 50
`;

// Map country to region
function getRegion(country) {
  const regionMap = {
    // Europe
    'Germany': 'Europe', 'France': 'Europe', 'United Kingdom': 'Europe',
    'Switzerland': 'Europe', 'Netherlands': 'Europe', 'Sweden': 'Europe',
    'Norway': 'Europe', 'Finland': 'Europe', 'Denmark': 'Europe',
    'Austria': 'Europe', 'Belgium': 'Europe', 'Spain': 'Europe',
    'Italy': 'Europe', 'Poland': 'Europe', 'Czech Republic': 'Europe',
    'Czechia': 'Europe', 'Ireland': 'Europe', 'Portugal': 'Europe',
    'Estonia': 'Europe', 'Latvia': 'Europe', 'Lithuania': 'Europe',
    'Luxembourg': 'Europe', 'Iceland': 'Europe', 'Romania': 'Europe',
    'Bulgaria': 'Europe', 'Hungary': 'Europe', 'Slovakia': 'Europe',
    'Slovenia': 'Europe', 'Croatia': 'Europe', 'Greece': 'Europe',
    'Malta': 'Europe', 'Cyprus': 'Europe', 'Ukraine': 'Europe',
    'Russia': 'Europe',
    // Asia
    'Japan': 'Asia', 'China': 'Asia', 'South Korea': 'Asia',
    'India': 'Asia', 'Singapore': 'Asia', 'Taiwan': 'Asia',
    'Hong Kong': 'Asia', 'Thailand': 'Asia', 'Vietnam': 'Asia',
    'Indonesia': 'Asia', 'Malaysia': 'Asia', 'Philippines': 'Asia',
    'Israel': 'Middle East',
    // Oceania
    'Australia': 'Oceania', 'New Zealand': 'Oceania',
    // Americas (non-US)
    'Canada': 'North America', 'Mexico': 'North America',
    'Brazil': 'South America', 'Argentina': 'South America',
    'Chile': 'South America', 'Colombia': 'South America',
    // Africa
    'South Africa': 'Africa', 'Nigeria': 'Africa', 'Kenya': 'Africa',
    'Egypt': 'Africa',
  };
  return regionMap[country] || 'Other';
}

// Generate a URL-safe ID from name
function generateId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Group items by a simple category based on patterns (can be enhanced later)
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
  console.log('Fetching data from Wikidata SPARQL endpoint...');

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
  // Group by category
  const categoryMap = new Map();

  for (const item of wikidataItems) {
    const name = item.itemLabel?.value || 'Unknown';
    const website = item.website?.value || '';
    const country = item.countryLabel?.value || 'Unknown';

    // Skip items without proper data
    if (!website || name === 'Unknown') continue;

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
    console.log(`Written to ${outputPath}`);

    // Print summary
    console.log('\nCategories:');
    for (const cat of services) {
      console.log(`  - ${cat.category}: ${cat.innovators.length} innovators`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
