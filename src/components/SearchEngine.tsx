import { useState, useMemo, useEffect } from 'react';
import Fuse from 'fuse.js';
import { format } from 'date-fns';
import {
  Search, CheckCircle2, ExternalLink, Globe, MessageCircle, Briefcase,
  CarFront, Server, Play, Star, X, Database, ShoppingCart
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface TrustData {
  website_status?: string;
  trustpilot_status?: string;
  wikidata_status?: string;
  wikidata_id?: string;
  last_checked?: string;
}

interface Innovator {
  id: string;
  name: string;
  region: string;
  country: string;
  url: string;
  description: string;
  status: { is_active: boolean; last_checked: string | null; http_code: number };
  trust_data?: TrustData;
}

interface Category {
  category: string;
  incumbent: { name: string; hq: string };
  innovators: Innovator[];
}

const iconMap: Record<string, React.ElementType> = {
  'Communication': MessageCircle,
  'Productivity & Tools': Briefcase,
  'Social': Globe,
  'Information & Browsers': Search,
  'Electric Vehicles': CarFront,
  'Cloud Infrastructure': Server,
  'Entertainment': Play,
  'E-Commerce': ShoppingCart,
};

const brandAliases: Record<string, string[]> = {
  'Electric Vehicles': ['tesla', 'ev', 'electric car', 'tata', 'ola'],
  'Cloud Infrastructure': ['aws', 'amazon web services', 'azure', 'gcp'],
  'Entertainment': ['netflix', 'youtube', 'streaming', 'hotstar'],
  'Communication': ['gmail', 'whatsapp', 'messenger', 'line', 'viber'],
  'Productivity & Tools': ['google drive', 'dropbox', 'microsoft', 'zoho', 'canva'],
  'Social': ['facebook', 'twitter', 'instagram', 'mastodon', 'bluesky'],
  'Information & Browsers': ['google', 'chrome', 'bing'],
  'E-Commerce': ['amazon', 'ebay', 'flipkart', 'rakuten', 'mercado'],
};

function getCountryFlag(country: string): string {
  const flagMap: Record<string, string> = {
    'Germany': '🇩🇪', 'France': '🇫🇷', 'United Kingdom': '🇬🇧', 'Switzerland': '🇨🇭',
    'Netherlands': '🇳🇱', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Finland': '🇫🇮',
    'Denmark': '🇩🇰', 'Austria': '🇦🇹', 'Belgium': '🇧🇪', 'Spain': '🇪🇸',
    'Italy': '🇮🇹', 'Poland': '🇵🇱', 'Czech Republic': '🇨🇿', 'Ireland': '🇮🇪',
    'Portugal': '🇵🇹', 'Estonia': '🇪🇪', 'Latvia': '🇱🇻', 'Lithuania': '🇱🇹',
    'Luxembourg': '🇱🇺', 'Iceland': '🇮🇸', 'Romania': '🇷🇴', 'Bulgaria': '🇧🇬',
    'Hungary': '🇭🇺', 'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮', 'Croatia': '🇭🇷',
    'Greece': '🇬🇷', 'Malta': '🇲🇹', 'Cyprus': '🇨🇾', 'Ukraine': '🇺🇦',
    'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'India': '🇮🇳', 'Singapore': '🇸🇬',
    'Taiwan': '🇹🇼', 'Thailand': '🇹🇭', 'Vietnam': '🇻🇳', 'Indonesia': '🇮🇩',
    'Malaysia': '🇲🇾', 'Philippines': '🇵🇭', 'Israel': '🇮🇱',
    'Australia': '🇦🇺', 'New Zealand': '🇳🇿', 'Canada': '🇨🇦', 'Mexico': '🇲🇽',
    'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'Chile': '🇨🇱', 'Colombia': '🇨🇴',
    'South Africa': '🇿🇦', 'Nigeria': '🇳🇬', 'Kenya': '🇰🇪', 'Egypt': '🇪🇬',
    'USA': '🇺🇸',
  };
  return flagMap[country] || '🌍';
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function SearchEngine({ data }: { data: Category[] }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestion, setSuggestion] = useState({ name: '', url: '', category: '', description: '' });

  useEffect(() => {
    const handler = () => setShowSuggestModal(true);
    document.addEventListener('open-suggest-modal', handler);
    return () => document.removeEventListener('open-suggest-modal', handler);
  }, []);

  const activeInnovators = useMemo(() => {
    const all: (Innovator & { categoryName: string; incumbentName: string })[] = [];
    for (const cat of data) {
      for (const inn of cat.innovators) {
        if (inn.status.is_active) {
          all.push({ ...inn, categoryName: cat.category, incumbentName: cat.incumbent.name });
        }
      }
    }
    return all;
  }, [data]);

  const categories = useMemo(() => Array.from(new Set(activeInnovators.map(i => i.categoryName))).sort(), [activeInnovators]);

  const fuse = useMemo(() => new Fuse(activeInnovators, {
    keys: ['name', 'country', 'region', 'description', 'categoryName', 'incumbentName'],
    threshold: 0.4,
  }), [activeInnovators]);

  const matchedCategoryFromBrand = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return null;
    for (const [cat, aliases] of Object.entries(brandAliases)) {
      if (aliases.some(a => q.includes(a) || a.includes(q))) return cat;
    }
    return null;
  }, [query]);

  const results = useMemo(() => {
    let filtered = activeInnovators;
    if (selectedCategory) filtered = filtered.filter(i => i.categoryName === selectedCategory);
    if (query.trim()) {
      if (matchedCategoryFromBrand && !selectedCategory) {
        filtered = activeInnovators.filter(i => i.categoryName === matchedCategoryFromBrand);
      } else {
        const ids = new Set(fuse.search(query).map(r => r.item.id));
        filtered = filtered.filter(i => ids.has(i.id));
      }
    }
    return filtered;
  }, [query, selectedCategory, activeInnovators, fuse, matchedCategoryFromBrand]);

  const getCategoryIcon = (cat: string) => {
    const Icon = iconMap[cat] || Globe;
    return <Icon className="w-3 h-3" />;
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return null; }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[Suggestion] ${suggestion.name}`);
    const body = encodeURIComponent(`Name: ${suggestion.name}\nURL: ${suggestion.url}\nCategory: ${suggestion.category}\nDescription: ${suggestion.description}`);
    window.open(`mailto:suggest@globalbalance.org?subject=${subject}&body=${body}`, '_blank');
    setShowSuggestModal(false);
    setSuggestion({ name: '', url: '', category: '', description: '' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div className="relative mb-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-600 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by service, country, or brand (Tesla, Netflix, AWS...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn("w-full pl-12 pr-4 py-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/50 text-teal-900 placeholder:text-teal-600/60 focus:outline-none focus:ring-2 focus:ring-teal-500/50 shadow-lg text-lg")}
        />
      </div>

      {matchedCategoryFromBrand && !selectedCategory && query && (
        <p className="text-center text-sm text-teal-600 mb-4">
          Showing alternatives to <span className="font-semibold">{query}</span> in {matchedCategoryFromBrand}
        </p>
      )}

      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <button onClick={() => setSelectedCategory(null)} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all", selectedCategory === null ? "bg-teal-700 text-white shadow-md" : "bg-white/60 text-teal-800 hover:bg-white/80 border border-white/50")}>
          All ({activeInnovators.length})
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all", selectedCategory === cat ? "bg-teal-700 text-white shadow-md" : "bg-white/60 text-teal-800 hover:bg-white/80 border border-white/50")}>
            {cat} ({activeInnovators.filter(i => i.categoryName === cat).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map(inn => (
          <a key={inn.id} href={inn.url} target="_blank" rel="noopener noreferrer"
            className={cn("group block p-6 rounded-2xl bg-white/60 backdrop-blur-md border border-white/50 hover:bg-white/80 hover:shadow-xl transition-all duration-300 hover:-translate-y-1")}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getCountryFlag(inn.country)}</span>
                <div>
                  <h3 className="font-semibold text-teal-900 group-hover:text-teal-700">{inn.name}</h3>
                  <p className="text-sm text-teal-600">{inn.country}</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-teal-400 group-hover:text-teal-600" />
            </div>
            <p className="text-teal-800/80 text-sm mb-4 line-clamp-2">{inn.description}</p>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-teal-100/80 text-teal-700 text-xs font-medium">
                {getCategoryIcon(inn.categoryName)} {inn.categoryName}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {inn.trust_data?.website_status === 'active' && (
                <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>
              )}
              {inn.trust_data?.trustpilot_status === 'verified' && (
                <span className="flex items-center gap-1 text-green-600"><Star className="w-3.5 h-3.5 fill-green-500" /> Trustpilot</span>
              )}
              {inn.trust_data?.wikidata_status === 'verified' && (
                <span className="flex items-center gap-1 text-blue-600"><Database className="w-3.5 h-3.5" /> Wikidata</span>
              )}
              {inn.trust_data?.last_checked && (
                <span className="text-gray-400 ml-auto">Checked: {formatDate(inn.trust_data.last_checked)}</span>
              )}
            </div>
          </a>
        ))}
      </div>

      {results.length === 0 && (
        <div className="text-center py-16">
          <Globe className="w-16 h-16 mx-auto text-teal-300 mb-4" />
          <h3 className="text-xl font-semibold text-teal-800 mb-2">No results found</h3>
          <p className="text-teal-600">Try a different search term or category</p>
        </div>
      )}

      <div className="mt-12 text-center text-sm text-teal-600/70">
        Showing {results.length} of {activeInnovators.length} verified alternatives
      </div>

      {showSuggestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-teal-900">Suggest a Service</h2>
              <button onClick={() => setShowSuggestModal(false)} className="text-teal-500 hover:text-teal-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-teal-700 mb-1">Service Name *</label>
                <input type="text" required value={suggestion.name} onChange={e => setSuggestion({ ...suggestion, name: e.target.value })}
                  className="w-full px-3 py-2 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-700 mb-1">URL *</label>
                <input type="url" required value={suggestion.url} onChange={e => setSuggestion({ ...suggestion, url: e.target.value })}
                  className="w-full px-3 py-2 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-700 mb-1">Category</label>
                <select value={suggestion.category} onChange={e => setSuggestion({ ...suggestion, category: e.target.value })}
                  className="w-full px-3 py-2 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-700 mb-1">Description</label>
                <textarea value={suggestion.description} onChange={e => setSuggestion({ ...suggestion, description: e.target.value })}
                  className="w-full px-3 py-2 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" rows={2} />
              </div>
              <button type="submit" className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 font-medium">Submit</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
