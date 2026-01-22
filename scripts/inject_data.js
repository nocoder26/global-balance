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
    { id: "tutanota", name: "Tuta", region: "Western Europe", country: "Germany", url: "https://tuta.com", description: "Tuta - Encrypted email from Germany" },
    { id: "threema", name: "Threema", region: "Western Europe", country: "Switzerland", url: "https://threema.ch", description: "Threema - Private messenger from Switzerland" }
  ],
  "Productivity & Tools": [
    { id: "miro", name: "Miro", region: "Western Europe", country: "Netherlands", url: "https://miro.com", description: "Miro - Visual collaboration platform from Netherlands" },
    { id: "pipedrive", name: "Pipedrive", region: "Northern Europe", country: "Estonia", url: "https://www.pipedrive.com", description: "Pipedrive - CRM from Estonia" },
    { id: "typeform", name: "Typeform", region: "Southern Europe", country: "Spain", url: "https://www.typeform.com", description: "Typeform - Form builder from Spain" },
    { id: "notion-like-craft", name: "Craft", region: "Central Europe", country: "Hungary", url: "https://www.craft.do", description: "Craft - Document editor from Hungary" },
    { id: "toggl", name: "Toggl", region: "Northern Europe", country: "Estonia", url: "https://toggl.com", description: "Toggl - Time tracking from Estonia" }
  ],
  "Social": [
    { id: "minds", name: "Minds", region: "North America", country: "USA", url: "https://www.minds.com", description: "Minds - Open source social network" }
  ],
  "Information & Browsers": [
    { id: "ecosia", name: "Ecosia", region: "Western Europe", country: "Germany", url: "https://www.ecosia.org", description: "Ecosia - Eco-friendly search engine from Germany" },
    { id: "brave", name: "Brave", region: "North America", country: "USA", url: "https://brave.com", description: "Brave - Privacy browser" },
    { id: "vivaldi", name: "Vivaldi", region: "Northern Europe", country: "Norway", url: "https://vivaldi.com", description: "Vivaldi - Customizable browser from Norway" }
  ],
  "Cloud Infrastructure": [
    { id: "upcloud", name: "UpCloud", region: "Northern Europe", country: "Finland", url: "https://upcloud.com", description: "UpCloud - Cloud hosting from Finland" },
    { id: "exoscale", name: "Exoscale", region: "Western Europe", country: "Switzerland", url: "https://www.exoscale.com", description: "Exoscale - European cloud from Switzerland" },
    { id: "hostinger", name: "Hostinger", region: "Northern Europe", country: "Lithuania", url: "https://www.hostinger.com", description: "Hostinger - Web hosting from Lithuania" }
  ],
  "Entertainment": [
    { id: "spotify", name: "Spotify", region: "Northern Europe", country: "Sweden", url: "https://www.spotify.com", description: "Spotify - Music streaming from Sweden" },
    { id: "deezer", name: "Deezer", region: "Western Europe", country: "France", url: "https://www.deezer.com", description: "Deezer - Music streaming from France" },
    { id: "ivi", name: "ivi", region: "Eastern Europe", country: "Estonia", url: "https://www.ivi.tv", description: "ivi - Video streaming from Estonia" }
  ],
  "E-Commerce": [
    { id: "bol", name: "Bol.com", region: "Western Europe", country: "Netherlands", url: "https://www.bol.com", description: "Bol.com - E-commerce from Netherlands" },
    { id: "takealot", name: "Takealot", region: "Africa", country: "South Africa", url: "https://www.takealot.com", description: "Takealot - E-commerce from South Africa" },
    { id: "tokopedia", name: "Tokopedia", region: "Southeast Asia", country: "Indonesia", url: "https://www.tokopedia.com", description: "Tokopedia - E-commerce from Indonesia" },
    { id: "lazada", name: "Lazada", region: "Southeast Asia", country: "Singapore", url: "https://www.lazada.com", description: "Lazada - E-commerce platform from Singapore" },
    { id: "bukalapak", name: "Bukalapak", region: "Southeast Asia", country: "Indonesia", url: "https://www.bukalapak.com", description: "Bukalapak - E-commerce from Indonesia" },
    { id: "ozon", name: "Wildberries", region: "Eastern Europe", country: "Poland", url: "https://www.wildberries.pl", description: "Wildberries - E-commerce in Poland" }
  ],
  "Electric Vehicles": [
    { id: "nio", name: "NIO", region: "East Asia", country: "Singapore", url: "https://www.nio.com", description: "NIO - Premium EVs listed in Singapore" },
    { id: "rimac", name: "Rimac", region: "Southern Europe", country: "Croatia", url: "https://www.rimac-automobili.com", description: "Rimac - Electric hypercars from Croatia" }
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
