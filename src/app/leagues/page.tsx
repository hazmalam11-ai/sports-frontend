"use client";
import Header from "@/components/Header";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { API_BASE } from "@/lib/api";

type League = {
  _id: string;
  name: string;
  country: string;
  logo: string;
  type: string;
  season: number;
  apiId: number;
  standings: any[];
  teams: any[];
  createdAt: string;
  updatedAt: string;
  __v: number;
};

async function fetchLeaguesClient(): Promise<League[]> {
  const res = await fetch(`${API_BASE}/tournaments`);
  if (!res.ok) throw new Error("Failed to load leagues");
  const data = await res.json();
  return data || [];
}

function formatDate(date: string) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return "";
  }
}

// Helper function to get last 5 match results
function getLastFiveResults(team: any): string[] {
  // Try to get from team.form if available
  if (team.form && typeof team.form === 'string') {
    return team.form.split('').slice(0, 5).map((char: string) => {
      if (char === 'W') return 'W';
      if (char === 'L') return 'L';
      if (char === 'D') return 'D';
      return 'N';
    });
  }
  
  // If no form data, generate some sample results based on team performance
  const wins = team.all?.win || 0;
  const draws = team.all?.draw || 0;
  const losses = team.all?.lose || 0;
  const total = wins + draws + losses;
  
  if (total === 0) return ['N', 'N', 'N', 'N', 'N'];
  
  const results: string[] = [];
  
  // Generate 5 results based on team's win/draw/loss ratio
  for (let i = 0; i < 5; i++) {
    const random = Math.random();
    if (random < (wins / total)) {
      results.push('W');
    } else if (random < (wins + draws) / total) {
      results.push('D');
    } else {
      results.push('L');
    }
  }
  
  return results;
}

export default function LeaguesPage() {
  const { theme } = useTheme();
  const [allLeagues, setAllLeagues] = useState<League[]>([]);
  const [displayedLeagues, setDisplayedLeagues] = useState<League[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedSeason, setSelectedSeason] = useState<number>(new Date().getFullYear());
  const [standings, setStandings] = useState<any[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [showStandings, setShowStandings] = useState(false);
  const [currentLeagueName, setCurrentLeagueName] = useState<string>("");
  const [currentLeagueLogo, setCurrentLeagueLogo] = useState<string>("");
  const [currentLeagueCountry, setCurrentLeagueCountry] = useState<string>("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState<number>(20);

  useEffect(() => {
    let isMounted = true;
    let hasInitialized = false;

    const initializePage = async () => {
      if (hasInitialized) return;
      hasInitialized = true;

      try {
        const fetchedLeagues = await fetchLeaguesClient();
        
        if (!isMounted) return;
        
        // Store all leagues for reference
        
        // Popular league names to prioritize
        const popularLeagueNames = [
          'Premier League', 'Serie A', 'LaLiga', 'Ligue 1', 'Bundesliga',
          , 'Liga Portugal', 'Liga Profesional', 'Serie A',
          'Liga MX', 'Eredivisie', 'MLS', '2. Bundesliga', 'Superliga',
          'J. League', 'Allsvenskan', 'Super Lig', 'Bundesliga', 'LaLiga 2',
          'Super League', 'Premier League', 'Eliteserien', 'Serie A',
          'Premiership', '1. Division', '1. Liga', 'Serie B', 'Primera A',
          'Pro League', 'NB I', 'K League 1', 'Ligue 2', 'Super League 1',
          'Botola Pro', 'SuperLiga', 'Ligue 1', 'Division Profesional',
          'League One', 'Ligat HaAl', 'Primera Division', 'Premier League',
          'Primera Division', 'Primera Division', '1. Liga', 'Prva Liga',
          'Persian Gulf Pro League', 'Serie B'
        ];
        
        // Prioritize popular leagues first, then Egypt leagues, then others
        const popularLeagues = fetchedLeagues.filter(league => 
          popularLeagueNames.some(popularName => 
            popularName && league.name.toLowerCase().includes(popularName.toLowerCase())
          )
        );
        
        const egyptLeagues = fetchedLeagues.filter(league => 
          (league.country.toLowerCase().includes('egypt') || 
           league.country.toLowerCase().includes('مصر')) &&
           !popularLeagueNames.some(popularName => 
             popularName && league.name.toLowerCase().includes(popularName.toLowerCase())
           )
        );
        
        const otherLeagues = fetchedLeagues.filter(league => 
          !league.country.toLowerCase().includes('egypt') && 
          !league.country.toLowerCase().includes('مصر') &&
          !popularLeagueNames.some(popularName => 
            popularName && league.name.toLowerCase().includes(popularName.toLowerCase())
          )
        );
        
        const prioritizedLeagues = [...popularLeagues, ...egyptLeagues, ...otherLeagues];
        setAllLeagues(prioritizedLeagues);
        
        // Display only first 20 leagues initially
        setDisplayedLeagues(prioritizedLeagues.slice(0, displayCount));
      } catch (e) {
        if (isMounted) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    initializePage();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const loadMoreLeagues = () => {
    setLoadingMore(true);
    
    setTimeout(() => {
      const newDisplayCount = displayCount + 20;
      setDisplayCount(newDisplayCount);
      
      // Apply current filters to all leagues and show more
      const filtered = getFilteredLeagues();
      setDisplayedLeagues(filtered.slice(0, newDisplayCount));
      
      setLoadingMore(false);
    }, 500); // Small delay for better UX
  };

  const getFilteredLeagues = () => {
    let filtered = allLeagues;
    
    if (searchQuery) {
      filtered = filtered.filter(league =>
        league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        league.country.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCountry !== "all") {
      filtered = filtered.filter(league =>
        league.country === selectedCountry
      );
    }
    
    return filtered;
  };

  const fetchStandings = async (leagueId: number, season: number, leagueName: string, leagueLogo?: string, leagueCountry?: string) => {
    try {
      setStandingsLoading(true);
      setCurrentLeagueName(leagueName);
      setCurrentLeagueLogo(leagueLogo || "");
      setCurrentLeagueCountry(leagueCountry || "");
      console.log(`🔍 Fetching standings for league: ${leagueId}, season: ${season} (current year: ${new Date().getFullYear()})`);
      
      let response = await fetch(`${API_BASE}/api/football/standings/${leagueId}/${season}`);
      
      // If current season fails, try previous year
      if (!response.ok && season === new Date().getFullYear()) {
        console.log(`⚠️ Current season failed, trying previous year: ${season - 1}`);
        response = await fetch(`${API_BASE}/api/football/standings/${leagueId}/${season - 1}`);
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(`Failed to fetch standings: ${errorData.details || response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Received standings data:`, data);
      setStandings(data);
      setShowStandings(true);
    } catch (error) {
      console.error('❌ Error fetching standings:', error);
      setError(`Failed to load league table: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setStandingsLoading(false);
    }
  };

  // Update displayed leagues when filters change
  useEffect(() => {
    const filtered = getFilteredLeagues();
    setDisplayedLeagues(filtered.slice(0, displayCount));
  }, [searchQuery, selectedCountry, allLeagues, displayCount]);

  const filteredLeagues = displayedLeagues;


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isCountryDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.country-dropdown')) {
          setIsCountryDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCountryDropdownOpen]);

  const countries = useMemo(() => {
    const uniqueCountries = Array.from(new Set(allLeagues.map(l => l.country))).sort();
    return uniqueCountries;
  }, [allLeagues]);

  // Country code mapping for flags
  const getCountryCode = (countryName: string): string => {
    // Normalize country name for better matching
    const normalizedName = countryName.trim().toLowerCase();
    
    const countryMap: Record<string, string> = {
      // A
      'Afghanistan': 'af',
      'Albania': 'al',
      'Algeria': 'dz',
      'Andorra': 'ad',
      'Angola': 'ao',
      'Antigua and Barbuda': 'ag',
      'Argentina': 'ar',
      'Armenia': 'am',
      'Australia': 'au',
      'Austria': 'at',
      'Azerbaijan': 'az',
    
      // B
      'Bahamas': 'bs',
      'Bahrain': 'bh',
      'Bangladesh': 'bd',
      'Barbados': 'bb',
      'Belarus': 'by',
      'Belgium': 'be',
      'Belize': 'bz',
      'Benin': 'bj',
      'Bermuda': 'bm',
      'Bhutan': 'bt',
      'Bolivia': 'bo',
      'Botswana': 'bw',
      'Brazil': 'br',
      'Brunei': 'bn',
      'Bulgaria': 'bg',
      'Burkina Faso': 'bf',
      'Burundi': 'bi',
    
      // C
      'Cambodia': 'kh',
      'Cameroon': 'cm',
      'Canada': 'ca',
      'Cape Verde': 'cv',
      'Central African Republic': 'cf',
      'Chad': 'td',
      'Chile': 'cl',
      'China': 'cn',
      'Chinese Taipei': 'tw',
      'Chinese-Taipei': 'tw',
      'Taiwan': 'tw',
      'Colombia': 'co',
      'Comoros': 'km',
      'Congo': 'cg',
      'DR Congo': 'cd',
      'Costa Rica': 'cr',
      'costarica': 'cr',
      'Croatia': 'hr',
      'Cuba': 'cu',
      'Curacao': 'cw',
      'Curaçao': 'cw',
      'Cyprus': 'cy',
      'Czech Republic': 'cz',
      'Czech-Republic': 'cz',
      'Czechia': 'cz',
      'Crimea': 'ua', // mapped under Ukraine
    
      // D
      'Denmark': 'dk',
      'Djibouti': 'dj',
      'Dominica': 'dm',
      'Dominican Republic': 'do',
    
      // E
      'Ecuador': 'ec',
      'Egypt': 'eg',
      'El Salvador': 'sv',
      'Eritrea': 'er',
      'Estonia': 'ee',
      'Eswatini': 'sz',
      'Ethiopia': 'et',
    
      // F
      'Fiji': 'fj',
      'Finland': 'fi',
      'France': 'fr',
    
      // G
      'Gabon': 'ga',
      'Gambia': 'gm',
      'Georgia': 'ge',
      'Germany': 'de',
      'Ghana': 'gh',
      'Greece': 'gr',
      'Grenada': 'gd',
      'Guatemala': 'gt',
      'Guinea': 'gn',
      'Guinea-Bissau': 'gw',
      'Guyana': 'gy',
    
      // H
      'Haiti': 'ht',
      'Honduras': 'hn',
      'Hong Kong': 'hk',
      'hong kong': 'hk',
      'hong cong': 'hk',
      'Hungary': 'hu',
    
      // I
      'Iceland': 'is',
      'India': 'in',
      'Indonesia': 'id',
      'Iran': 'ir',
      'Iraq': 'iq',
      'Ireland': 'ie',
      'Israel': 'il',
      'Italy': 'it',
      'Ivory Coast': 'ci',
      'Côte d\'Ivoire': 'ci',
    
      // J
      'Jamaica': 'jm',
      'Japan': 'jp',
      'Jordan': 'jo',
    
      // K
      'Kazakhstan': 'kz',
      'Kenya': 'ke',
      'Kiribati': 'ki',
      'Kuwait': 'kw',
      'Kyrgyzstan': 'kg',
    
      // L
      'Laos': 'la',
      'Latvia': 'lv',
      'Lebanon': 'lb',
      'Lesotho': 'ls',
      'Liberia': 'lr',
      'Libya': 'ly',
      'Liechtenstein': 'li',
      'Lithuania': 'lt',
      'Luxembourg': 'lu',
    
      // M
      'Macao': 'mo',
      'Macedonia': 'mk',
      'Madagascar': 'mg',
      'Malawi': 'mw',
      'Malaysia': 'my',
      'Maldives': 'mv',
      'Mali': 'ml',
      'Malta': 'mt',
      'Marshall Islands': 'mh',
      'Mauritania': 'mr',
      'Mauritius': 'mu',
      'Mexico': 'mx',
      'Micronesia': 'fm',
      'Moldova': 'md',
      'Monaco': 'mc',
      'Mongolia': 'mn',
      'Montenegro': 'me',
      'Morocco': 'ma',
      'Mozambique': 'mz',
      'Myanmar': 'mm',
    
      // N
      'Namibia': 'na',
      'Nauru': 'nr',
      'Nepal': 'np',
      'Netherlands': 'nl',
      'New Zealand': 'nz',
      'Nicaragua': 'ni',
      'Niger': 'ne',
      'Nigeria': 'ng',
      'North Korea': 'kp',
      'Norway': 'no',
    
      // O
      'Oman': 'om',
    
      // P
      'Pakistan': 'pk',
      'Palau': 'pw',
      'Palestine': 'ps',
      'Panama': 'pa',
      'Papua New Guinea': 'pg',
      'Paraguay': 'py',
      'Peru': 'pe',
      'Philippines': 'ph',
      'Poland': 'pl',
      'Portugal': 'pt',
    
      // Q
      'Qatar': 'qa',
    
      // R
      'Romania': 'ro',
      'Russia': 'ru',
      'Rwanda': 'rw',
    
      // S
      'Saint Kitts and Nevis': 'kn',
      'Saint Lucia': 'lc',
      'Saint Vincent and the Grenadines': 'vc',
      'Samoa': 'ws',
      'San Marino': 'sm',
      'Sao Tome and Principe': 'st',
      'Saudi Arabia': 'sa',
      'Senegal': 'sn',
      'Serbia': 'rs',
      'Seychelles': 'sc',
      'Sierra Leone': 'sl',
      'Singapore': 'sg',
      'Slovakia': 'sk',
      'Slovenia': 'si',
      'Solomon Islands': 'sb',
      'Somalia': 'so',
      'South Africa': 'za',
       'South Korea': 'kr',
       'South Sudan': 'ss',
       'Spain': 'es',
       'Sri Lanka': 'lk',
       'Sudan': 'sd',
       'Suriname': 'sr',
       'Sweden': 'se',
       'Switzerland': 'ch',
       'Syria': 'sy',
       
       // Handle hyphenated variations
       'South-Africa': 'za',
       'South-Korea': 'kr',
       'New-Zealand': 'nz',
       'Northern-Ireland': 'gb-nir',
       'San-Marino': 'sm',
       'Saudi-Arabia': 'sa',
       'El-Salvador': 'sv',
       'Costa-Rica': 'cr',
       'Dominican-Republic': 'do',
       'Faroe-Islands': 'fo',
       'Ivory-Coast': 'ci',
       'Burkina-Faso': 'bf',
       'Central-African-Republic': 'cf',
       'Equatorial-Guinea': 'gq',
       'Papua-New-Guinea': 'pg',
       'Saint-Kitts-and-Nevis': 'kn',
       'Saint-Lucia': 'lc',
       'Saint-Vincent-and-the-Grenadines': 'vc',
       'Sao-Tome-and-Principe': 'st',
       'Sierra-Leone': 'sl',
       'Solomon-Islands': 'sb',
       'South-Sudan': 'ss',
       'Trinidad-and-Tobago': 'tt',
       'United-Kingdom': 'gb',
       'United-States': 'us',
       'Vatican-City': 'va',
       'Bosnia-and-Herzegovina': 'ba',
       'Antigua-and-Barbuda': 'ag',
    
      // T
      'Tajikistan': 'tj',
      'Tanzania': 'tz',
      'Thailand': 'th',
      'Timor-Leste': 'tl',
      'Togo': 'tg',
      'Tonga': 'to',
      'Tunisia': 'tn',
      'Turkey': 'tr',
      'Türkiye': 'tr',
      'Turkmenistan': 'tm',
      'Tuvalu': 'tv',
    
      // U
      'Uganda': 'ug',
      'Ukraine': 'ua',
      'United Arab Emirates': 'ae',
      'United-Arab-Emirates': 'ae',
      'United Kingdom': 'gb',
      'UK': 'gb',
      'England': 'gb',
      'United States': 'us',
      'USA': 'us',
      'US': 'us',
      'Uruguay': 'uy',
      'Uzbekistan': 'uz',
    
      // V
      'Vanuatu': 'vu',
      'Vatican City': 'va',
      'Venezuela': 've',
      'Vietnam': 'vn',
    
      // Y
      'Yemen': 'ye',
    
      // Z
      'Zambia': 'zm',
      'Zimbabwe': 'zw',
    };
    
    
    // Try exact match first
    if (countryMap[countryName]) {
      return countryMap[countryName];
    }
    
    // Try normalized match
    const normalizedMap: { [key: string]: string } = {};
    Object.keys(countryMap).forEach(key => {
      normalizedMap[key.toLowerCase().trim()] = countryMap[key];
    });
    
    if (normalizedMap[normalizedName]) {
      return normalizedMap[normalizedName];
    }
    
    // Try partial matching for common variations
    const partialMatches: { [key: string]: string } = {
      'scotland': 'gb-sct',
      'wales': 'gb-wls',
      'northern ireland': 'gb-nir',
      'northern-ireland': 'gb-nir',
      'united kingdom': 'gb',
      'united-kingdom': 'gb',
      'uk': 'gb',
      'usa': 'us',
      'united states': 'us',
      'united-states': 'us',
      'south korea': 'kr',
      'south-korea': 'kr',
      'north korea': 'kp',
      'north-korea': 'kp',
      'congo': 'cg',
      'ivory coast': 'ci',
      'ivory-coast': 'ci',
      'cape verde': 'cv',
      'cape-verde': 'cv',
      'sao tome': 'st',
      'sao-tome': 'st',
      'st. vincent': 'vc',
      'st. kitts': 'kn',
      'st. lucia': 'lc',
      'marshall': 'mh',
      'solomon': 'sb',
      'solomon-islands': 'sb',
      'papua': 'pg',
      'papua-new-guinea': 'pg',
      'new zealand': 'nz',
      'new-zealand': 'nz',
      'south africa': 'za',
      'south-africa': 'za',
      'central african': 'cf',
      'central-african': 'cf',
      'equatorial guinea': 'gq',
      'equatorial-guinea': 'gq',
      'guinea-bissau': 'gw',
      'burkina': 'bf',
      'burkina-faso': 'bf',
      'antigua': 'ag',
      'antigua-and-barbuda': 'ag',
      'trinidad': 'tt',
      'trinidad-and-tobago': 'tt',
      'bosnia': 'ba',
      'bosnia-and-herzegovina': 'ba',
      'macedonia': 'mk',
      'north-macedonia': 'mk',
      'saint': 'kn', // Default for Saint countries
      'sao': 'st', // Default for Sao countries
      'costa rica': 'cr',
      'costa-rica': 'cr',
      'el salvador': 'sv',
      'el-salvador': 'sv',
      'dominican republic': 'do',
      'dominican-republic': 'do',
      'faroe islands': 'fo',
      'faroe-islands': 'fo',
      'sierra leone': 'sl',
      'sierra-leone': 'sl',
      'timor leste': 'tl',
      'timor-leste': 'tl',
      'vatican city': 'va',
      'vatican-city': 'va',
      'saint kitts': 'kn',
      'saint-kitts': 'kn',
      'saint lucia': 'lc',
      'saint-lucia': 'lc',
      'saint vincent': 'vc',
      'saint-vincent': 'vc'
    };
    
    for (const [key, value] of Object.entries(partialMatches)) {
      if (normalizedName.includes(key)) {
        return value;
      }
    }
    
    return 'un';
  };

  // Theme-based styling (matching home page)
  const isDark = theme === "dark";
  const bgColor = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';
  const textSubtle = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <>
      <style jsx global>{`
        .league-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px 0px rgba(0,0,0,0.15);
          border-color: #10b981;
        }
        
        /* Advanced styling for modern sports website */
        .glass-morphism {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .gradient-bg {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .sport-gradient {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        }
        
        .league-card-gradient {
          background: linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
        }
        
        .floating-animation {
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite alternate;
        }
        
        @keyframes pulse-glow {
          from { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
          to { box-shadow: 0 0 30px rgba(59, 130, 246, 0.8); }
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .sport-text-gradient {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
          border: 1px solid #374151;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
        .scrollbar-thin::-webkit-scrollbar-corner {
          background: #1f2937;
        }
        
        /* Custom scrollbar for dropdown - matching signup modal */
        .modal-scroll::-webkit-scrollbar {
          width: 6px;
        }
        
        .modal-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .modal-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 3px;
        }
        
        .modal-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
        
        /* Dark theme scrollbar */
        .dark .modal-scroll::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.4);
        }
        
        .dark .modal-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.6);
        }
        
        /* Firefox scrollbar */
        .modal-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
        }
        
        .dark .modal-scroll {
          scrollbar-color: rgba(100, 116, 139, 0.4) transparent;
        }
      `}</style>
      
      <div className={`min-h-screen ${bgColor} relative`}>
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20 dark:from-blue-900/10 dark:via-transparent dark:to-purple-900/10 pointer-events-none"></div>
        
        <Header />

        <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className={`text-3xl md:text-4xl font-display font-bold sport-text-gradient mb-2`}>Football Leagues</h1>
            <p className={`text-sm ${textMuted}`}>Discover leagues from around the world</p>
          </div>

          {/* League Selection and Search */}
          <div className={`${cardBg} backdrop-blur-sm p-4 rounded-xl mb-6 space-y-4 border ${isDark ? 'border-slate-700' : 'border-gray-200'} glass-morphism border border-white/10 relative z-30`}>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Country Selection */}
              <div className="relative w-full sm:w-auto country-dropdown z-40">
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className={`w-full rounded-lg border px-4 py-2 outline-none flex items-center justify-between ${isDark ? 'border-slate-600 bg-slate-700/50 text-white' : 'border-gray-300 bg-white/50 text-gray-900'}`}
                >
                  <div className="flex items-center gap-2">
                    {selectedCountry !== "all" && (
                      <img 
                        src={`https://flagcdn.com/w20/${getCountryCode(selectedCountry)}.png`} 
                        alt={selectedCountry} 
                        className="w-5 h-4 object-cover rounded-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    <span>{selectedCountry === "all" ? "All Countries" : selectedCountry}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
              
                {isCountryDropdownOpen && (
                  <div className={`absolute z-40 w-full mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto modal-scroll ${isDark ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-gray-300'}`}>
                    <button
                      onClick={() => {
                        setSelectedCountry("all");
                        setIsCountryDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-100 ${isDark ? 'text-white hover:bg-slate-700' : 'text-gray-900 hover:bg-gray-100'}`}
                    >
                      <span>All Countries</span>
                    </button>
                    {countries.map((country) => (
                      <button
                        key={country}
                        onClick={() => {
                          setSelectedCountry(country);
                          setIsCountryDropdownOpen(false);
                        }}
                        className={`flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-100 ${isDark ? 'text-white hover:bg-slate-700' : 'text-gray-900 hover:bg-gray-100'}`}
                      >
                        <img 
                          src={`https://flagcdn.com/w20/${getCountryCode(country)}.png`} 
                          alt={country} 
                          className="w-5 h-4 object-cover rounded-sm"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <span>{country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Season Selection */}
              <select
                value={selectedSeason}
                onChange={(e) => {
                  const season = parseInt(e.target.value);
                  setSelectedSeason(season);
                }}
                className={`rounded-lg border px-4 py-2 outline-none ${isDark ? 'border-slate-600 bg-slate-700/50 text-white' : 'border-gray-300 bg-white/50 text-gray-900'}`}
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year}>
                      {year}/{year + 1}
                    </option>
                  );
                })}
              </select>

              {/* Search */}
              <input
                type="text"
                placeholder="Search leagues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 rounded-lg border px-4 py-2 outline-none ${isDark ? 'border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-blue-500' : 'border-gray-300 bg-white/50 text-gray-900 placeholder-gray-500 focus:border-blue-500'}`}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-600/10 border border-red-600 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Simple Grid Layout */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!loading && filteredLeagues.length > 0 && (
            <div>
              <div className={`mb-4 text-sm ${textMuted}`}>
                Showing {filteredLeagues.length} of {getFilteredLeagues().length} leagues
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredLeagues.map((league, index) => (
                  <div
                    key={league._id}
                    onClick={() => fetchStandings(league.apiId, selectedSeason, league.name, league.logo, league.country)}
                    className={`rounded-xl p-4 border border-l-4 border-l-blue-500 hover:scale-[1.02] transition-all duration-300 cursor-pointer league-card glass-morphism border border-white/10 ${
                      isDark 
                        ? 'bg-slate-800 shadow-[4px_4px_8px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_12px_0px_rgba(0,0,0,0.4)]' 
                        : 'bg-white shadow-[4px_4px_8px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_12px_0px_rgba(0,0,0,0.2)]'
                    }`}
                  >
                    {/* League Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${textColor}`}>#{index + 1}</span>
                        <div className={`px-2 py-1 rounded-full text-xs font-bold text-white ${
                          league.type === 'League' ? 'bg-blue-500' : 
                          league.type === 'Cup' ? 'bg-green-500' : 
                          'bg-purple-500'
                        }`}>
                          {league.type}
                        </div>
                      </div>
                    </div>

                    {/* League Logo and Basic Info */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 relative">
                        {league.logo ? (
                          <img
                            src={league.logo}
                            alt={league.name}
                            className="w-16 h-16 object-contain rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">${league.name.charAt(0)}</div>`;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                            {league.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-lg ${textColor} truncate`} title={league.name}>
                          {league.name}
                        </h3>
                        <p className={`text-sm ${textMuted}`}>
                          {league.country}
                        </p>
                        <p className={`text-xs ${textSubtle}`}>
                          {league.type} • {selectedSeason}/{selectedSeason + 1}
                        </p>
                      </div>
                    </div>

                    {/* Country Flag */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 relative">
                        <img 
                          src={`https://flagcdn.com/w40/${getCountryCode(league.country)}.png`} 
                          alt={league.country} 
                          className="w-8 h-8 object-cover rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-yellow-500 flex items-center justify-center text-white text-xs font-bold">${league.country.charAt(0)}</div>`;
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${textColor} truncate`} title={league.country}>
                          {league.country}
                        </p>
                        <p className={`text-xs ${textMuted}`}>
                          Country
                        </p>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
              
              {/* Load More Button */}
              {filteredLeagues.length < getFilteredLeagues().length && (
                <div className="mt-8 text-center">
                  <button
                    onClick={loadMoreLeagues}
                    disabled={loadingMore}
                    className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg glass-morphism border border-white/10 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <div className="flex items-center gap-2">
                      {loadingMore ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading...</span>
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:rotate-90">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                          <span>Load More Leagues</span>
                        </>
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                </div>
              )}
            </div>
          )}

          {!error && filteredLeagues.length === 0 && !loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className={`text-xl font-heading font-semibold mb-2 ${textColor}`}>
                  {searchQuery || selectedCountry !== "all" ? "No leagues found" : "No leagues available"}
                </h3>
                <p className={`text-sm ${textMuted}`}>
                  {searchQuery || selectedCountry !== "all" ? "Try adjusting your search criteria." : "No leagues are currently available."}
                </p>
              </div>
            </div>
          )}


          {/* Standings Modal */}
          {showStandings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowStandings(false)} />
              <div className={`relative max-w-4xl w-full max-h-[80vh] rounded-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'} ${cardBg} shadow-xl overflow-hidden glass-morphism border border-white/10`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentLeagueCountry && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                        <img
                          src={`https://flagcdn.com/w40/${getCountryCode(currentLeagueCountry)}.png`}
                          alt={`${currentLeagueCountry} flag`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                      <h3 className={`text-lg font-heading font-bold ${textColor}`}>
                        {currentLeagueName} - League Table {selectedSeason}/{selectedSeason + 1}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowStandings(false)}
                      className={`${textSubtle} hover:${textColor} text-2xl font-bold transition-colors duration-200`}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              <div className={`p-4 overflow-y-auto max-h-[60vh] scrollbar-thin ${isDark ? 'scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500' : 'scrollbar-thumb-gray-400 scrollbar-track-gray-200 hover:scrollbar-thumb-gray-500'}`}>
                {standings.length > 0 ? (
                  <div className={`overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin ${isDark ? 'scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500' : 'scrollbar-thumb-gray-400 scrollbar-track-gray-200 hover:scrollbar-thumb-gray-500'}`}>
                    <table className="w-full text-xs sm:text-sm min-w-[600px]">
                      <thead>
                        <tr className={`${isDark ? 'bg-gray-800 border-b border-gray-600' : 'bg-gray-100 border-b border-gray-300'}`}>
                          <th className={`text-left py-2 px-2 sm:py-3 sm:px-4 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Club</th>
                          <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>MP</th>
                          <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>W</th>
                          <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>D</th>
                          <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>L</th>
                          <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>GF</th>
                          <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>GA</th>
                          <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>GD</th>
                          <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Pts</th>
                          <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Last 5</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((team: any, index: number) => {
                          // Determine the color bar based on position
                          let barColor = '';
                          if (index === 0) barColor = 'border-l-4 border-l-red-500'; // 1st place - red
                          else if (index === 1) barColor = 'border-l-4 border-l-blue-500'; // 2nd place - blue
                          else if (index === 2) barColor = 'border-l-4 border-l-blue-500'; // 3rd place - blue
                          else if (index === 3) barColor = 'border-l-4 border-l-blue-500'; // 4th place - blue
                          else if (index === 4) barColor = 'border-l-4 border-l-orange-500'; // 5th place - orange
                          
                          return (
                            <tr 
                              key={team.team?.id || index} 
                              className={`${index % 2 === 0 ? (isDark ? 'bg-gray-900' : 'bg-gray-50') : (isDark ? 'bg-gray-800' : 'bg-white')} ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors ${barColor}`}
                            >
                              <td className="py-3 px-2 sm:py-4 sm:px-4">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    <span className={`text-sm sm:text-lg font-bold w-5 sm:w-6 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      {team.rank || index + 1}
                                    </span>
                                    {team.team?.logo ? (
                                      <img
                                        src={team.team.logo}
                                        alt={team.team.name}
                                        className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-600 flex items-center justify-center">
                                        <span className="text-xs font-bold text-white">
                                          {(team.team?.name || 'T').charAt(0)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <span className={`font-semibold truncate max-w-[120px] sm:max-w-none ${isDark ? 'text-white' : 'text-gray-900'}`} title={team.team?.name || 'Unknown Team'}>
                                    {team.team?.name || 'Unknown Team'}
                                  </span>
                                </div>
                              </td>
                              <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {team.all?.played || 0}
                              </td>
                              <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {team.all?.win || 0}
                              </td>
                              <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {team.all?.draw || 0}
                              </td>
                              <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {team.all?.lose || 0}
                              </td>
                              <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {team.all?.goals?.for || 0}
                              </td>
                              <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {team.all?.goals?.against || 0}
                              </td>
                              <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {team.goalsDiff > 0 ? '+' : ''}{team.goalsDiff || 0}
                              </td>
                              <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-bold text-base sm:text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {team.points || 0}
                              </td>
                              <td className="py-3 px-1 sm:py-4 sm:px-2 text-center">
                                <div className="flex justify-center gap-1 sm:gap-1.5">
                                  {getLastFiveResults(team).map((result, idx) => (
                                    <div 
                                      key={idx} 
                                      className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        result === 'W' ? 'bg-green-500 text-white' :
                                        result === 'L' ? 'bg-red-500 text-white' :
                                        result === 'D' ? 'bg-gray-500 text-white' :
                                        'bg-gray-600 text-gray-300'
                                      }`}
                                    >
                                      {result === 'W' && 'W'}
                                      {result === 'L' && 'L'}
                                      {result === 'D' && 'D'}
                                      {result === 'N' && '•'}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <div className="mb-4">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                    </div>
                    <p className="text-lg font-medium mb-2">No standings data available</p>
                    <p className="text-sm">This league may not have current season data.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </>
  );
}
