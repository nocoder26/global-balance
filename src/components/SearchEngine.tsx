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

// Icon map for categories
const iconMap: Record<string, React.ElementType> = {
  'Communication': MessageCircle,
  'Productivity & Tools': Briefcase,
  'Social': Globe,
  'Information & Browsers': Search,
  'Electric Vehicles': CarFront,
  'Cloud Infrastructure': Server,
  'Entertainment': Play,
};

// Country to flag emoji mapping
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

  // Flatten and filter only active innovators
  const activeInnovators = useMemo(() => {
    const all: (Innovator & { categoryName: string })[] = [];
    for (const category of data) {
      for (const innovator of category.innovators) {
        if (innovator.status.is_active) {
          all.push({ ...innovator, categoryName: category.category });
        }
      }
    }
    return all;
  }, [data]);

  // Get unique categories from active innovators
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const inv of activeInnovators) {
      cats.add(inv.categoryName);
    }
    return Array.from(cats).sort();
  }, [activeInnovators]);

  // Setup Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(activeInnovators, {
      keys: ['name', 'country', 'region', 'description', 'categoryName'],
      threshold: 0.4,
      includeScore: true,
    });
  }, [activeInnovators]);

  // Filter results based on query and category
  const results = useMemo(() => {
    let filtered = activeInnovators;

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(inv => inv.categoryName === selectedCategory);
    }

    // Apply search query
    if (query.trim()) {
      const searchResults = fuse.search(query);
      const searchIds = new Set(searchResults.map(r => r.item.id));
      filtered = filtered.filter(inv => searchIds.has(inv.id));
    }

    return filtered;
  }, [query, selectedCategory, activeInnovators, fuse]);

  // Format relative time
  const getVerifiedText = (lastChecked: string | null): string => {
    if (!lastChecked) return 'Verified';
    try {
      const date = new Date(lastChecked);
      return `Verified active ${formatDistanceToNow(date)} ago`;
    } catch {
      return 'Verified';
    }
  };

  // Get category icon component
  const getCategoryIcon = (categoryName: string) => {
    const IconComponent = iconMap[categoryName] || Globe;
    return <IconComponent className="w-3 h-3" />;
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {/* Search Input */}
      <div className="relative mb-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-600 w-5 h-5" />
        <input
          type="text"
          placeholder="Search for alternatives (e.g., email, browser, storage...)"
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

      {/* Disclaimer */}
      <p className="text-center text-sm text-teal-700/70 mb-6">
        We can make mistakes, including about people, so double-check it.
      </p>

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
            {/* Header */}
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

            {/* Description */}
            <p className="text-teal-800/80 text-sm mb-4 line-clamp-2">
              {innovator.description}
            </p>

            {/* Category Tag */}
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-teal-100/80 text-teal-700 text-xs font-medium">
                {getCategoryIcon(innovator.categoryName)}
                {innovator.categoryName}
              </span>
              <span className="text-xs text-teal-600/60">{innovator.region}</span>
            </div>

            {/* Verification Badges */}
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

      {/* No Results */}
      {results.length === 0 && (
        <div className="text-center py-16">
          <Globe className="w-16 h-16 mx-auto text-teal-300 mb-4" />
          <h3 className="text-xl font-semibold text-teal-800 mb-2">No results found</h3>
          <p className="text-teal-600">
            Try a different search term or category
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="mt-12 text-center text-sm text-teal-600/70">
        Showing {results.length} of {activeInnovators.length} verified alternatives
      </div>
    </div>
  );
}
