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
    { id: "element", name: "Element", region: "Western Europe", country: "United Kingdom", url: "https://element.io", description: "Element - Secure messaging with Matrix protocol" }
  ],
  "Productivity & Tools": [
    { id: "clio", name: "Clio", region: "North America", country: "Canada", url: "https://www.clio.com", description: "Clio - Legal practice management from Canada" },
    { id: "hootsuite", name: "Hootsuite", region: "North America", country: "Canada", url: "https://www.hootsuite.com", description: "Hootsuite - Social media management from Canada" },
    { id: "vidyard", name: "Vidyard", region: "North America", country: "Canada", url: "https://www.vidyard.com", description: "Vidyard - Video hosting platform from Canada" }
  ],
  "E-Commerce": [
    { id: "shopify", name: "Shopify", region: "North America", country: "Canada", url: "https://www.shopify.com", description: "Shopify - E-commerce platform from Canada" }
  ],
  "Cloud Infrastructure": [
    { id: "digitalocean", name: "DigitalOcean", region: "North America", country: "Canada", url: "https://www.digitalocean.com", description: "DigitalOcean - Cloud infrastructure with global presence" }
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
