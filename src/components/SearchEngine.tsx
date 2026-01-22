import { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import { formatDistanceToNow } from 'date-fns';
import {
  Search,
  CheckCircle2,
  ExternalLink,
  Globe,
  MessageCircle,
  Briefcase,
  CarFront,
  Server,
  Play,
  Star,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface Status {
  is_active: boolean;
  last_checked: string | null;
  http_code: number;
}

interface TrustData {
  trustpilot_status: 'unchecked' | 'verified' | 'unverified';
}

interface Innovator {
  id: string;
  name: string;
  region: string;
  country: string;
  url: string;
  description: string;
  status: Status;
  trust_data?: TrustData;
}

interface Category {
  category: string;
  icon?: string;
  incumbent: { name: string; hq: string };
  innovators: Innovator[];
}

interface SearchEngineProps {
  data: Category[];
}

const iconMap: Record<string, React.ElementType> = {
  'Communication': MessageCircle,
  'Productivity & Tools': Briefcase,
  'Social': Globe,
  'Information & Browsers': Search,
  'Electric Vehicles': CarFront,
  'Cloud Infrastructure': Server,
  'Entertainment': Play,
};

// Brand/incumbent aliases for search
const brandAliases: Record<string, string[]> = {
  'Electric Vehicles': ['tesla', 'ev', 'electric car'],
  'Cloud Infrastructure': ['aws', 'amazon web services', 'azure', 'gcp', 'google cloud'],
  'Entertainment': ['netflix', 'youtube', 'streaming'],
  'Communication': ['gmail', 'outlook', 'whatsapp', 'messenger'],
  'Productivity & Tools': ['google drive', 'dropbox', 'onedrive', 'microsoft'],
  'Social': ['facebook', 'twitter', 'instagram', 'tiktok'],
  'Information & Browsers': ['google', 'chrome', 'bing'],
};

function getCountryFlag(country: string): string {
  const flagMap: Record<string, string> = {
    'Germany': '🇩🇪', 'France': '🇫🇷', 'United Kingdom': '🇬🇧',
    'Switzerland': '🇨🇭', 'Netherlands': '🇳🇱', 'Sweden': '🇸🇪',
    'Norway': '🇳🇴', 'Finland': '🇫🇮', 'Denmark': '🇩🇰',
    'Austria': '🇦🇹', 'Belgium': '🇧🇪', 'Spain': '🇪🇸',
    'Italy': '🇮🇹', 'Poland': '🇵🇱', 'Czech Republic': '🇨🇿',
    'Czechia': '🇨🇿', 'Ireland': '🇮🇪', 'Portugal': '🇵🇹',
    'Estonia': '🇪🇪', 'Latvia': '🇱🇻', 'Lithuania': '🇱🇹',
    'Luxembourg': '🇱🇺', 'Iceland': '🇮🇸', 'Romania': '🇷🇴',
    'Bulgaria': '🇧🇬', 'Hungary': '🇭🇺', 'Slovakia': '🇸🇰',
    'Slovenia': '🇸🇮', 'Croatia': '🇭🇷', 'Greece': '🇬🇷',
    'Malta': '🇲🇹', 'Cyprus': '🇨🇾', 'Ukraine': '🇺🇦',
    'Russia': '🇷🇺', 'Turkey': '🇹🇷',
    'Japan': '🇯🇵', 'China': '🇨🇳', "People's Republic of China": '🇨🇳',
    'South Korea': '🇰🇷', 'India': '🇮🇳', 'Singapore': '🇸🇬',
    'Taiwan': '🇹🇼', 'Hong Kong': '🇭🇰', 'Thailand': '🇹🇭',
    'Vietnam': '🇻🇳', 'Indonesia': '🇮🇩', 'Malaysia': '🇲🇾',
    'Philippines': '🇵🇭', 'Israel': '🇮🇱', 'Iran': '🇮🇷',
    'Pakistan': '🇵🇰',
    'Australia': '🇦🇺', 'New Zealand': '🇳🇿',
    'Canada': '🇨🇦', 'Mexico': '🇲🇽',
    'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'Chile': '🇨🇱',
    'Colombia': '🇨🇴', 'Rwanda': '🇷🇼',
    'South Africa': '🇿🇦', 'Nigeria': '🇳🇬', 'Kenya': '🇰🇪',
    'Egypt': '🇪🇬', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  };
  return flagMap[country] || '🌍';
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function SearchEngine({ data }: SearchEngineProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestion, setSuggestion] = useState({ name: '', url: '', category: '', description: '' });

  const activeInnovators = useMemo(() => {
    const all: (Innovator & { categoryName: string; incumbentName: string })[] = [];
    for (const category of data) {
      for (const innovator of category.innovators) {
        if (innovator.status.is_active) {
          all.push({ ...innovator, categoryName: category.category, incumbentName: category.incumbent.name });
        }
      }
    }
    return all;
  }, [data]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const inv of activeInnovators) {
      cats.add(inv.categoryName);
    }
    return Array.from(cats).sort();
  }, [activeInnovators]);

  const fuse = useMemo(() => {
    return new Fuse(activeInnovators, {
      keys: ['name', 'country', 'region', 'description', 'categoryName', 'incumbentName'],
      threshold: 0.4,
      includeScore: true,
    });
  }, [activeInnovators]);

  // Check if query matches a brand alias
  const matchedCategoryFromBrand = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return null;
    for (const [category, aliases] of Object.entries(brandAliases)) {
      if (aliases.some(alias => q.includes(alias) || alias.includes(q))) {
        return category;
      }
    }
    return null;
  }, [query]);

  const results = useMemo(() => {
    let filtered = activeInnovators;

    if (selectedCategory) {
      filtered = filtered.filter(inv => inv.categoryName === selectedCategory);
    }

    if (query.trim()) {
      // If brand match found, show that category
      if (matchedCategoryFromBrand && !selectedCategory) {
        filtered = activeInnovators.filter(inv => inv.categoryName === matchedCategoryFromBrand);
      } else {
        const searchResults = fuse.search(query);
        const searchIds = new Set(searchResults.map(r => r.item.id));
        filtered = filtered.filter(inv => searchIds.has(inv.id));
      }
    }

    return filtered;
  }, [query, selectedCategory, activeInnovators, fuse, matchedCategoryFromBrand]);

  const getVerifiedText = (lastChecked: string | null): string => {
    if (!lastChecked) return 'Verified';
    try {
      const date = new Date(lastChecked);
      return `Verified ${formatDistanceToNow(date)} ago`;
    } catch {
      return 'Verified';
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    const IconComponent = iconMap[categoryName] || Globe;
    return <IconComponent className="w-3 h-3" />;
  };

  const handleSuggestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[Suggestion] ${suggestion.name}`);
    const body = encodeURIComponent(`Service Name: ${suggestion.name}\nURL: ${suggestion.url}\nCategory: ${suggestion.category}\nDescription: ${suggestion.description}`);
    window.open(`mailto:suggest@globalbalance.org?subject=${subject}&body=${body}`, '_blank');
    setShowSuggestModal(false);
    setSuggestion({ name: '', url: '', category: '', description: '' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {/* Search Input */}
      <div className="relative mb-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-600 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by service, country, or brand (e.g., Tesla, Netflix, AWS...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            "w-full pl-12 pr-4 py-4 rounded-2xl",
            "bg-white/60 backdrop-blur-md border border-white/50",
            "text-teal-900 placeholder:text-teal-600/60",
            "focus:outline-none focus:ring-2 focus:ring-teal-500/50",
            "shadow-lg shadow-teal-900/5",
            "text-lg"
          )}
        />
      </div>

      {/* Brand match hint */}
      {matchedCategoryFromBrand && !selectedCategory && query && (
        <p className="text-center text-sm text-teal-600 mb-4">
          Showing alternatives to <span className="font-semibold">{query}</span> in {matchedCategoryFromBrand}
        </p>
      )}

      {!matchedCategoryFromBrand && (
        <p className="text-center text-sm text-teal-700/70 mb-6">
          We can make mistakes, so double-check before using any service.
        </p>
      )}

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            selectedCategory === null
              ? "bg-teal-700 text-white shadow-md"
              : "bg-white/60 text-teal-800 hover:bg-white/80 border border-white/50"
          )}
        >
          All ({activeInnovators.length})
        </button>
        {categories.map((cat) => {
          const count = activeInnovators.filter(i => i.categoryName === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                selectedCategory === cat
                  ? "bg-teal-700 text-white shadow-md"
                  : "bg-white/60 text-teal-800 hover:bg-white/80 border border-white/50"
              )}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Suggest Service Button */}
      <div className="text-center mb-8">
        <button
          onClick={() => setShowSuggestModal(true)}
          className="text-sm text-teal-600 hover:text-teal-500 underline"
        >
          Know a service we're missing? Suggest it here
        </button>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((innovator) => (
          <a
            key={innovator.id}
            href={innovator.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group block p-6 rounded-2xl",
              "bg-white/60 backdrop-blur-md border border-white/50",
              "hover:bg-white/80 hover:shadow-xl hover:shadow-teal-900/10",
              "transition-all duration-300",
              "hover:-translate-y-1"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl" role="img" aria-label={innovator.country}>
                  {getCountryFlag(innovator.country)}
                </span>
                <div>
                  <h3 className="font-semibold text-teal-900 group-hover:text-teal-700 transition-colors">
                    {innovator.name}
                  </h3>
                  <p className="text-sm text-teal-600">{innovator.country}</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-teal-400 group-hover:text-teal-600 transition-colors" />
            </div>

            <p className="text-teal-800/80 text-sm mb-4 line-clamp-2">
              {innovator.description}
            </p>

            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-teal-100/80 text-teal-700 text-xs font-medium">
                {getCategoryIcon(innovator.categoryName)}
                {innovator.categoryName}
              </span>
              <span className="text-xs text-teal-600/60">{innovator.region}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>{getVerifiedText(innovator.status.last_checked)}</span>
              </div>
              {innovator.trust_data?.trustpilot_status === 'verified' && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <Star className="w-3.5 h-3.5 fill-green-500 text-green-500" />
                  <span>Verified</span>
                </div>
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

      {/* Suggest Modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-teal-900">Suggest a Service</h2>
              <button onClick={() => setShowSuggestModal(false)} className="text-teal-500 hover:text-teal-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSuggestSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-teal-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={suggestion.name}
                  onChange={(e) => setSuggestion({ ...suggestion, name: e.target.value })}
                  className="w-full px-3 py-2 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., Proton Mail"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-700 mb-1">Website URL *</label>
                <input
                  type="url"
                  required
                  value={suggestion.url}
                  onChange={(e) => setSuggestion({ ...suggestion, url: e.target.value })}
                  className="w-full px-3 py-2 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-700 mb-1">Category</label>
                <select
                  value={suggestion.category}
                  onChange={(e) => setSuggestion({ ...suggestion, category: e.target.value })}
                  className="w-full px-3 py-2 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-700 mb-1">Why recommend this?</label>
                <textarea
                  value={suggestion.description}
                  onChange={(e) => setSuggestion({ ...suggestion, description: e.target.value })}
                  className="w-full px-3 py-2 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows={3}
                  placeholder="Brief description..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                Submit Suggestion
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
