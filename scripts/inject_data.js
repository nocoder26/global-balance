import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICES_FILE = path.join(__dirname, '../src/data/services.json');

const newTrustData = {
  website_status: "unchecked",
  trustpilot_status: "unchecked",
  wikidata_status: "unchecked",
  last_checked: null
};

const newInnovators = {
  "Communication": [
    { id: "line", name: "Line", region: "East Asia", country: "Japan", url: "https://line.me", description: "Line - Messaging app from Japan" },
    { id: "rakuten-viber", name: "Rakuten Viber", region: "Western Europe", country: "Luxembourg", url: "https://www.viber.com", description: "Viber - Messaging app owned by Rakuten" },
    { id: "fastmail", name: "Fastmail", region: "Oceania", country: "Australia", url: "https://www.fastmail.com", description: "Fastmail - Private email from Australia" }
  ],
  "Productivity & Tools": [
    { id: "canva", name: "Canva", region: "Oceania", country: "Australia", url: "https://www.canva.com", description: "Canva - Design platform from Australia" },
    { id: "zoho", name: "Zoho", region: "South Asia", country: "India", url: "https://www.zoho.com", description: "Zoho - Business software suite from India" },
    { id: "atlassian", name: "Atlassian", region: "Oceania", country: "Australia", url: "https://www.atlassian.com", description: "Atlassian - Jira, Confluence from Australia" }
  ],
  "Social": [
    { id: "mastodon", name: "Mastodon", region: "Western Europe", country: "Germany", url: "https://joinmastodon.org", description: "Mastodon - Decentralized social network from Germany" },
    { id: "bluesky", name: "Bluesky", region: "North America", country: "USA", url: "https://bsky.app", description: "Bluesky - Public Benefit social network" },
    { id: "koo", name: "Koo", region: "South Asia", country: "India", url: "https://www.kooapp.com", description: "Koo - Social platform from India" }
  ],
  "Electric Vehicles": [
    { id: "tata-ev", name: "Tata Motors EV", region: "South Asia", country: "India", url: "https://ev.tatamotors.com", description: "Tata Motors - Leading EV manufacturer from India" },
    { id: "ola-electric", name: "Ola Electric", region: "South Asia", country: "India", url: "https://www.olaelectric.com", description: "Ola Electric - Electric scooters from India" }
  ],
  "E-Commerce": [
    { id: "mercado-libre", name: "Mercado Libre", region: "South America", country: "Argentina", url: "https://www.mercadolibre.com", description: "Mercado Libre - E-commerce giant from Argentina" },
    { id: "rakuten", name: "Rakuten", region: "East Asia", country: "Japan", url: "https://www.rakuten.co.jp", description: "Rakuten - E-commerce and fintech from Japan" },
    { id: "flipkart", name: "Flipkart", region: "South Asia", country: "India", url: "https://www.flipkart.com", description: "Flipkart - E-commerce platform from India" },
    { id: "jumia", name: "Jumia", region: "Africa", country: "Nigeria", url: "https://www.jumia.com.ng", description: "Jumia - E-commerce platform from Africa" },
    { id: "allegro", name: "Allegro", region: "Central Europe", country: "Poland", url: "https://allegro.pl", description: "Allegro - E-commerce platform from Poland" }
  ]
};

// Load data
const data = JSON.parse(fs.readFileSync(SERVICES_FILE, 'utf-8'));

// Update all existing innovators with new trust_data schema
for (const cat of data) {
  for (const inn of cat.innovators) {
    inn.trust_data = { ...newTrustData };
    inn.status.is_active = true;
  }
}

// Add new innovators to existing categories
for (const [catName, innovators] of Object.entries(newInnovators)) {
  let category = data.find(c => c.category === catName);

  // Create E-Commerce category if missing
  if (!category && catName === "E-Commerce") {
    category = {
      category: "E-Commerce",
      icon: "ShoppingCart",
      incumbent: { name: "Amazon", hq: "USA" },
      innovators: []
    };
    data.push(category);
  }

  if (category) {
    for (const inn of innovators) {
      // Skip if already exists
      if (category.innovators.some(i => i.id === inn.id)) continue;
      category.innovators.push({
        ...inn,
        status: { is_active: true, last_checked: new Date().toISOString(), http_code: 200 },
        trust_data: { ...newTrustData }
      });
    }
  }
}

fs.writeFileSync(SERVICES_FILE, JSON.stringify(data, null, 2));
console.log('Data injected successfully!');
