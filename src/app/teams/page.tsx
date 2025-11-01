"use client";
import Header from "@/components/Header";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE, addToFavorites, removeFromFavorites, checkFavoriteStatus, addPlayerToFavorites, removePlayerFromFavorites, checkPlayerFavoriteStatus } from "@/lib/api";

type League = {
  _id: string;
  name: string;
  country: string;
  logo: string;
  type: string;
  season: number;
  apiId: number;
};

type Team = {
  id: number;
  name: string;
  logo: string;
  country: string;
  founded: number;
  venue: {
    name: string;
    city: string;
    capacity: number;
  };
};

async function fetchLeaguesClient(): Promise<League[]> {
  const res = await fetch(`${API_BASE}/tournaments`);
  if (!res.ok) throw new Error("Failed to load leagues");
  const data = await res.json();
  return data || [];
}

async function fetchTeamsClient(leagueId: number, season: number): Promise<Team[]> {
  const res = await fetch(`${API_BASE}/api/football/teams/${leagueId}/${season}`);
  if (!res.ok) throw new Error("Failed to load teams");
  const data = await res.json();
  return data || [];
}

async function fetchTeamPlayersClient(teamId: number, season: number): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/football/teams/${teamId}/players/${season}`);
  if (!res.ok) throw new Error("Failed to load team players");
  const data = await res.json();
  return data || [];
}

export default function TeamsPage() {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [teamsLoading, setTeamsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(new Date().getFullYear());
  const [isLeagueDropdownOpen, setIsLeagueDropdownOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [favoriteTeams, setFavoriteTeams] = useState<Set<number>>(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState<Set<number>>(new Set());
  const [favoritePlayers, setFavoritePlayers] = useState<Set<number>>(new Set());
  const [favoritePlayersLoading, setFavoritePlayersLoading] = useState<Set<number>>(new Set());

  useEffect(() => {
    let isMounted = true;
    let hasInitialized = false;

    const initializePage = async () => {
      if (hasInitialized) return;
      hasInitialized = true;

      try {
        const fetchedLeagues = await fetchLeaguesClient();
        
        if (!isMounted) return;
        
        // Popular league names to prioritize
        const popularLeagueNames = [
          'Premier League', 'Serie A', 'LaLiga', 'Ligue 1', 'Bundesliga',
          'Liga Portugal', 'Liga Profesional', 'Serie A',
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
        setLeagues(prioritizedLeagues);
        
        // Auto-load Premier League teams when page opens
        const premierLeague = prioritizedLeagues.find(league => 
          league.name.toLowerCase().includes('premier league') && 
          league.country.toLowerCase().includes('england')
        );
        
        if (premierLeague && isMounted) {
          setSelectedLeague(premierLeague);
          fetchTeams(premierLeague, new Date().getFullYear());
        }
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

  const fetchTeams = async (league: League, season: number) => {
    try {
      setTeamsLoading(true);
      setError(null);
      console.log(`🔍 Fetching teams for league: ${league.name}, season: ${season}`);
      
      const fetchedTeams = await fetchTeamsClient(league.apiId, season);
      console.log(`✅ Received ${fetchedTeams.length} teams`);
      setTeams(fetchedTeams);

      // Check favorite status for all teams if user is logged in
      if (user && token) {
        const favoriteStatuses = await Promise.all(
          fetchedTeams.map(async (team) => {
            const isFavorite = await checkTeamFavoriteStatus(team.id);
            return { teamId: team.id, isFavorite };
          })
        );

        const newFavoriteTeams = new Set<number>();
        favoriteStatuses.forEach(({ teamId, isFavorite }) => {
          if (isFavorite) {
            newFavoriteTeams.add(teamId);
          }
        });
        setFavoriteTeams(newFavoriteTeams);
      }
    } catch (error) {
      console.error('❌ Error fetching teams:', error);
      setError(`Failed to load teams: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleTeamClick = async (team: Team) => {
    try {
      setSelectedTeam(team);
      setShowTeamModal(true);
      setPlayersLoading(true);
      setError(null);
      
      console.log(`🔍 Fetching players for team: ${team.name}, season: ${selectedSeason}`);
      const players = await fetchTeamPlayersClient(team.id, selectedSeason);
      console.log(`✅ Received ${players.length} players for ${team.name}`);
      
      // Transform API response to match expected format
      const transformedPlayers = players.map((playerData: any) => {
        const player = playerData.player;
        const stats = playerData.statistics?.[0] || {};
        
        return {
          id: player.id,
          name: player.name,
          age: player.age,
          nationality: player.nationality,
          photo: player.photo,
          position: stats.games?.position || 'Unknown',
          number: stats.games?.number || null,
          team: {
            id: stats.team?.id || team.id,
            name: stats.team?.name || team.name,
            logo: stats.team?.logo || team.logo,
            country: stats.team?.country || team.country
          },
          league: {
            id: stats.league?.id,
            name: stats.league?.name,
            country: stats.league?.country,
            logo: stats.league?.logo
          },
          season: stats.league?.season || selectedSeason,
          stats: {
            appearances: stats.games?.appearences || 0,
            goals: stats.goals?.total || 0,
            assists: stats.goals?.assists || 0,
            yellowCards: stats.cards?.yellow || 0,
            redCards: stats.cards?.red || 0,
            minutes: stats.games?.minutes || 0
          }
        };
      });
      
      setTeamPlayers(transformedPlayers);
      
      // Check favorite status for all players if user is logged in
      if (user && token && transformedPlayers.length > 0) {
        const favoriteStatuses = await Promise.all(
          transformedPlayers.map(async (player: any) => {
            try {
              const response = await checkPlayerFavoriteStatus(player.id, token);
              return { playerId: player.id, isFavorite: response.isFavorite };
            } catch (error) {
              console.error(`Error checking favorite status for player ${player.id}:`, error);
              return { playerId: player.id, isFavorite: false };
            }
          })
        );

        favoriteStatuses.forEach(({ playerId, isFavorite }) => {
          if (isFavorite) {
            setFavoritePlayers(prev => new Set(prev).add(playerId));
          }
        });
      }
    } catch (error) {
      console.error('❌ Error fetching team players:', error);
      setError(`Failed to load team players: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPlayersLoading(false);
    }
  };

  const toggleFavorite = async (team: Team, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent team click
    
    if (!user || !token) {
      setError("Please log in to add teams to favorites");
      return;
    }

    const teamId = team.id;
    setFavoriteLoading(prev => new Set(prev).add(teamId));

    try {
      const isFavorite = favoriteTeams.has(teamId);
      
      if (isFavorite) {
        // Remove from favorites
        await removeFromFavorites(teamId, token);
        setFavoriteTeams(prev => {
          const newSet = new Set(prev);
          newSet.delete(teamId);
          return newSet;
        });
      } else {
        // Add to favorites
        await addToFavorites(
          teamId,
          team.name,
          team.logo,
          selectedLeague?.name || 'Unknown League',
          selectedLeague?.apiId || 0,
          token
        );
        setFavoriteTeams(prev => new Set(prev).add(teamId));
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      setError(`Failed to update favorites: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFavoriteLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(teamId);
        return newSet;
      });
    }
  };

  const togglePlayerFavorite = async (player: any, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent player click
    
    if (!user || !token) {
      setError("Please log in to add players to favorites");
      return;
    }

    const playerId = player.id;
    setFavoritePlayersLoading(prev => new Set(prev).add(playerId));

    try {
      const isFavorite = favoritePlayers.has(playerId);
      
      if (isFavorite) {
        // Remove from favorites
        await removePlayerFromFavorites(playerId, token);
        setFavoritePlayers(prev => {
          const newSet = new Set(prev);
          newSet.delete(playerId);
          return newSet;
        });
      } else {
        // Add to favorites
        await addPlayerToFavorites(
          playerId,
          player.name,
          player.photo || '',
          player.position,
          {
            name: player.team?.name || selectedTeam?.name || 'Unknown Team',
            logo: player.team?.logo || selectedTeam?.logo || ''
          },
          selectedLeague?.name || 'Unknown League',
          selectedLeague?.apiId || 0,
          token
        );
        setFavoritePlayers(prev => new Set(prev).add(playerId));
      }
    } catch (error) {
      console.error('❌ Error toggling player favorite:', error);
      setError(`Failed to update player favorites: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFavoritePlayersLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
    }
  };

  const checkTeamFavoriteStatus = async (teamId: number) => {
    if (!user || !token) return false;
    
    try {
      const response = await checkFavoriteStatus(teamId, token);
      return response.isFavorite;
    } catch (error) {
      console.error('❌ Error checking favorite status:', error);
      return false;
    }
  };

  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teams;
    
    return teams.filter(team =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.venue.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teams, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isLeagueDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.league-dropdown')) {
          setIsLeagueDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLeagueDropdownOpen]);

  // Country code mapping for flags
  const getCountryCode = (countryName: string): string => {
    const normalizedName = countryName.trim().toLowerCase();
    
    const countryMap: Record<string, string> = {
      'Afghanistan': 'af', 'Albania': 'al', 'Algeria': 'dz', 'Andorra': 'ad', 'Angola': 'ao',
      'Antigua and Barbuda': 'ag', 'Argentina': 'ar', 'Armenia': 'am', 'Australia': 'au',
      'Austria': 'at', 'Azerbaijan': 'az', 'Bahamas': 'bs', 'Bahrain': 'bh', 'Bangladesh': 'bd',
      'Barbados': 'bb', 'Belarus': 'by', 'Belgium': 'be', 'Belize': 'bz', 'Benin': 'bj',
      'Bermuda': 'bm', 'Bhutan': 'bt', 'Bolivia': 'bo', 'Botswana': 'bw', 'Brazil': 'br',
      'Brunei': 'bn', 'Bulgaria': 'bg', 'Burkina Faso': 'bf', 'Burundi': 'bi', 'Cambodia': 'kh',
      'Cameroon': 'cm', 'Canada': 'ca', 'Cape Verde': 'cv', 'Central African Republic': 'cf',
      'Chad': 'td', 'Chile': 'cl', 'China': 'cn', 'Chinese Taipei': 'tw', 'Chinese-Taipei': 'tw',
      'Taiwan': 'tw', 'Colombia': 'co', 'Comoros': 'km', 'Congo': 'cg', 'DR Congo': 'cd',
      'Costa Rica': 'cr', 'costarica': 'cr', 'Croatia': 'hr', 'Cuba': 'cu', 'Curacao': 'cw',
      'Curaçao': 'cw', 'Cyprus': 'cy', 'Czech Republic': 'cz', 'Czech-Republic': 'cz',
      'Czechia': 'cz', 'Crimea': 'ua', 'Denmark': 'dk', 'Djibouti': 'dj', 'Dominica': 'dm',
      'Dominican Republic': 'do', 'Ecuador': 'ec', 'Egypt': 'eg', 'El Salvador': 'sv',
      'Eritrea': 'er', 'Estonia': 'ee', 'Eswatini': 'sz', 'Ethiopia': 'et', 'Fiji': 'fj',
      'Finland': 'fi', 'France': 'fr', 'Gabon': 'ga', 'Gambia': 'gm', 'Georgia': 'ge',
      'Germany': 'de', 'Ghana': 'gh', 'Greece': 'gr', 'Grenada': 'gd', 'Guatemala': 'gt',
      'Guinea': 'gn', 'Guinea-Bissau': 'gw', 'Guyana': 'gy', 'Haiti': 'ht', 'Honduras': 'hn',
      'Hong Kong': 'hk', 'hong kong': 'hk', 'hong cong': 'hk', 'Hungary': 'hu', 'Iceland': 'is',
      'India': 'in', 'Indonesia': 'id', 'Iran': 'ir', 'Iraq': 'iq', 'Ireland': 'ie',
      'Israel': 'il', 'Italy': 'it', 'Ivory Coast': 'ci', 'Côte d\'Ivoire': 'ci',
      'Jamaica': 'jm', 'Japan': 'jp', 'Jordan': 'jo', 'Kazakhstan': 'kz', 'Kenya': 'ke',
      'Kiribati': 'ki', 'Kuwait': 'kw', 'Kyrgyzstan': 'kg', 'Laos': 'la', 'Latvia': 'lv',
      'Lebanon': 'lb', 'Lesotho': 'ls', 'Liberia': 'lr', 'Libya': 'ly', 'Liechtenstein': 'li',
      'Lithuania': 'lt', 'Luxembourg': 'lu', 'Macao': 'mo', 'Macedonia': 'mk', 'Madagascar': 'mg',
      'Malawi': 'mw', 'Malaysia': 'my', 'Maldives': 'mv', 'Mali': 'ml', 'Malta': 'mt',
      'Marshall Islands': 'mh', 'Mauritania': 'mr', 'Mauritius': 'mu', 'Mexico': 'mx',
      'Micronesia': 'fm', 'Moldova': 'md', 'Monaco': 'mc', 'Mongolia': 'mn', 'Montenegro': 'me',
      'Morocco': 'ma', 'Mozambique': 'mz', 'Myanmar': 'mm', 'Namibia': 'na', 'Nauru': 'nr',
      'Nepal': 'np', 'Netherlands': 'nl', 'New Zealand': 'nz', 'Nicaragua': 'ni', 'Niger': 'ne',
      'Nigeria': 'ng', 'North Korea': 'kp', 'Norway': 'no', 'Oman': 'om', 'Pakistan': 'pk',
      'Palau': 'pw', 'Palestine': 'ps', 'Panama': 'pa', 'Papua New Guinea': 'pg', 'Paraguay': 'py',
      'Peru': 'pe', 'Philippines': 'ph', 'Poland': 'pl', 'Portugal': 'pt', 'Qatar': 'qa',
      'Romania': 'ro', 'Russia': 'ru', 'Rwanda': 'rw', 'Saint Kitts and Nevis': 'kn',
      'Saint Lucia': 'lc', 'Saint Vincent and the Grenadines': 'vc', 'Samoa': 'ws',
      'San Marino': 'sm', 'Sao Tome and Principe': 'st', 'Saudi Arabia': 'sa', 'Senegal': 'sn',
      'Serbia': 'rs', 'Seychelles': 'sc', 'Sierra Leone': 'sl', 'Singapore': 'sg', 'Slovakia': 'sk',
      'Slovenia': 'si', 'Solomon Islands': 'sb', 'Somalia': 'so', 'South Africa': 'za',
      'South Korea': 'kr', 'South Sudan': 'ss', 'Spain': 'es', 'Sri Lanka': 'lk', 'Sudan': 'sd',
      'Suriname': 'sr', 'Sweden': 'se', 'Switzerland': 'ch', 'Syria': 'sy', 'Tajikistan': 'tj',
      'Tanzania': 'tz', 'Thailand': 'th', 'Timor-Leste': 'tl', 'Togo': 'tg', 'Tonga': 'to',
      'Tunisia': 'tn', 'Turkey': 'tr', 'Türkiye': 'tr', 'Turkmenistan': 'tm', 'Tuvalu': 'tv',
      'Uganda': 'ug', 'Ukraine': 'ua', 'United Arab Emirates': 'ae', 'United-Arab-Emirates': 'ae',
      'United Kingdom': 'gb', 'UK': 'gb', 'England': 'gb', 'United States': 'us', 'USA': 'us',
      'US': 'us', 'Uruguay': 'uy', 'Uzbekistan': 'uz', 'Vanuatu': 'vu', 'Vatican City': 'va',
      'Venezuela': 've', 'Vietnam': 'vn', 'Yemen': 'ye', 'Zambia': 'zm', 'Zimbabwe': 'zw'
    };
    
    if (countryMap[countryName]) {
      return countryMap[countryName];
    }
    
    const normalizedMap: { [key: string]: string } = {};
    Object.keys(countryMap).forEach(key => {
      normalizedMap[key.toLowerCase().trim()] = countryMap[key];
    });
    
    if (normalizedMap[normalizedName]) {
      return normalizedMap[normalizedName];
    }
    
    return 'un';
  };

  // Theme-based styling
  const isDark = theme === "dark";
  const bgColor = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';
  const textSubtle = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <>
      <style jsx global>{`
        .team-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px 0px rgba(0,0,0,0.15);
          border-color: #10b981;
        }
        
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
        
        .team-card-gradient {
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
        
        .dark .modal-scroll::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.4);
        }
        
        .dark .modal-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.6);
        }
        
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
            <h1 className={`text-3xl md:text-4xl font-display font-bold sport-text-gradient mb-2`}>Football Teams</h1>
            <p className={`text-sm ${textMuted}`}>Explore teams from leagues around the world</p>
          </div>

          {/* League Selection and Search */}
          <div className={`${cardBg} backdrop-blur-sm p-4 rounded-xl mb-6 space-y-4 border ${isDark ? 'border-slate-700' : 'border-gray-200'} glass-morphism border border-white/10 relative z-30`}>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* League Selection */}
              <div className="relative w-full sm:w-auto league-dropdown z-40">
                <button
                  type="button"
                  onClick={() => setIsLeagueDropdownOpen(!isLeagueDropdownOpen)}
                  className={`w-full rounded-lg border px-4 py-2 outline-none flex items-center justify-between ${isDark ? 'border-slate-600 bg-slate-700/50 text-white' : 'border-gray-300 bg-white/50 text-gray-900'}`}
                >
                  <div className="flex items-center gap-2">
                    {selectedLeague && (
                      <img 
                        src={selectedLeague.logo} 
                        alt={selectedLeague.name} 
                        className="w-5 h-5 object-contain rounded-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    <span>{selectedLeague ? selectedLeague.name : "Select a League"}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
              
                {isLeagueDropdownOpen && (
                  <div className={`absolute z-40 w-full mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto modal-scroll ${isDark ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-gray-300'}`}>
                    {leagues.slice(0, 50).map((league) => (
                      <button
                        key={league._id}
                        onClick={() => {
                          setSelectedLeague(league);
                          setIsLeagueDropdownOpen(false);
                          fetchTeams(league, selectedSeason);
                        }}
                        className={`flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-100 ${isDark ? 'text-white hover:bg-slate-700' : 'text-gray-900 hover:bg-gray-100'}`}
                      >
                        <img 
                          src={league.logo} 
                          alt={league.name} 
                          className="w-5 h-5 object-contain rounded-sm"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{league.name}</span>
                          <span className="text-xs text-gray-500">{league.country}</span>
                        </div>
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
                  if (selectedLeague) {
                    fetchTeams(selectedLeague, season);
                  }
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
                placeholder="Search teams..."
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

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            </div>
          )}

          {/* Teams Grid */}
          {!loading && !selectedLeague && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className={`text-xl font-heading font-semibold mb-2 ${textColor}`}>
                  Select a League
                </h3>
                <p className={`text-sm ${textMuted}`}>
                  Choose a league from the dropdown above to view its teams
                </p>
              </div>
            </div>
          )}

          {!loading && selectedLeague && teamsLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            </div>
          )}

          {!loading && selectedLeague && !teamsLoading && filteredTeams.length > 0 && (
            <div>
              <div className={`mb-4 text-sm ${textMuted}`}>
                Showing {filteredTeams.length} teams from {selectedLeague.name} ({selectedSeason}/{selectedSeason + 1})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTeams.map((team, index) => (
                  <div
                    key={team.id}
                    onClick={() => handleTeamClick(team)}
                    className={`rounded-xl p-4 border border-l-4 border-l-blue-500 hover:scale-[1.02] transition-all duration-300 cursor-pointer team-card glass-morphism border border-white/10 ${
                      isDark 
                        ? 'bg-slate-800 shadow-[4px_4px_8px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_12px_0px_rgba(0,0,0,0.4)]' 
                        : 'bg-white shadow-[4px_4px_8px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_12px_0px_rgba(0,0,0,0.2)]'
                    }`}
                  >
                    {/* Team Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${textColor}`}>#{index + 1}</span>
                        <div className={`px-2 py-1 rounded-full text-xs font-bold text-white bg-blue-500`}>
                          Team
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`text-right`}>
                          <div className={`text-lg font-bold text-blue-400`}>
                            {team.founded || 'N/A'}
                          </div>
                          <div className={`text-xs ${textMuted}`}>Founded</div>
                        </div>
                        {/* Favorite Button */}
                        {user && (
                          <button
                            onClick={(e) => toggleFavorite(team, e)}
                            disabled={favoriteLoading.has(team.id)}
                            className={`p-2 rounded-full transition-all duration-200 hover:scale-110 ${
                              favoriteTeams.has(team.id)
                                ? 'text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20'
                                : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                            } ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-100'}`}
                            title={favoriteTeams.has(team.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {favoriteLoading.has(team.id) ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg 
                                width="20" 
                                height="20" 
                                viewBox="0 0 24 24" 
                                fill={favoriteTeams.has(team.id) ? "currentColor" : "none"} 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              >
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Team Logo and Basic Info */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 relative">
                        {team.logo ? (
                          <img
                            src={team.logo}
                            alt={team.name}
                            className="w-16 h-16 object-contain rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">${team.name.charAt(0)}</div>`;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                            {team.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-lg ${textColor} truncate`} title={team.name}>
                          {team.name}
                        </h3>
                        <p className={`text-sm ${textMuted}`}>
                          {team.country}
                        </p>
                        <p className={`text-xs ${textSubtle}`}>
                          {selectedLeague.name} • {selectedSeason}/{selectedSeason + 1}
                        </p>
                      </div>
                    </div>

                    {/* Country Flag */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 relative">
                        <img 
                          src={`https://flagcdn.com/w40/${getCountryCode(team.country)}.png`} 
                          alt={team.country} 
                          className="w-8 h-8 object-cover rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-yellow-500 flex items-center justify-center text-white text-xs font-bold">${team.country.charAt(0)}</div>`;
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${textColor} truncate`} title={team.country}>
                          {team.country}
                        </p>
                        <p className={`text-xs ${textMuted}`}>
                          Nationality
                        </p>
                      </div>
                    </div>

                    {/* Key Info */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${textColor}`}>{team.founded || 'N/A'}</div>
                        <div className={`text-xs ${textMuted}`}>Founded</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${textColor}`}>{team.venue.capacity || 'N/A'}</div>
                        <div className={`text-xs ${textMuted}`}>Capacity</div>
                      </div>
                    </div>

                    {/* Venue Info */}
                    <div className="grid grid-cols-1 gap-2 text-center">
                      <div>
                        <div className={`text-sm font-bold ${textColor} truncate`} title={team.venue.name}>
                          {team.venue.name || 'Unknown Venue'}
                        </div>
                        <div className={`text-xs ${textMuted}`}>Stadium</div>
                      </div>
                      {team.venue.city && (
                        <div>
                          <div className={`text-sm font-bold ${textColor} truncate`} title={team.venue.city}>
                            {team.venue.city}
                          </div>
                          <div className={`text-xs ${textMuted}`}>City</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && selectedLeague && !teamsLoading && filteredTeams.length === 0 && !error && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className={`text-xl font-heading font-semibold mb-2 ${textColor}`}>
                  {searchQuery ? "No teams found" : "No teams available"}
                </h3>
                <p className={`text-sm ${textMuted}`}>
                  {searchQuery ? "Try adjusting your search criteria." : "No teams are available for this league and season."}
                </p>
              </div>
            </div>
          )}

          {/* Team Details Modal */}
          {showTeamModal && selectedTeam && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowTeamModal(false)} />
              <div className={`relative max-w-6xl w-full max-h-[95vh] rounded-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'} ${cardBg} shadow-xl overflow-hidden glass-morphism border border-white/10 flex flex-col`}>
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {selectedTeam.logo && (
                        <img
                          src={selectedTeam.logo}
                          alt={selectedTeam.name}
                          className="w-16 h-16 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      )}
                      <div>
                        <h3 className={`text-2xl font-bold ${textColor}`}>{selectedTeam.name}</h3>
                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                          {selectedTeam.country} • Founded {selectedTeam.founded || 'N/A'}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                          {selectedLeague?.name} • {selectedSeason}/{selectedSeason + 1}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowTeamModal(false)}
                      className={`${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-2xl font-bold transition-colors duration-200`}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Team Info */}
                    <div className="space-y-6">
                      <div>
                        <h4 className={`text-lg font-semibold mb-6 ${textColor}`}>Team Information</h4>
                        <div className="space-y-4">
                          <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50/80'}`}>
                            <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Founded</span>
                            <span className={`font-bold ${textColor}`}>{selectedTeam.founded || 'N/A'}</span>
                          </div>
                          <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50/80'}`}>
                            <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Country</span>
                            <div className="flex items-center gap-2">
                              <img 
                                src={`https://flagcdn.com/w20/${getCountryCode(selectedTeam.country)}.png`} 
                                alt={selectedTeam.country} 
                                className="w-5 h-4 object-cover rounded-sm"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <span className={`font-bold ${textColor}`}>{selectedTeam.country}</span>
                            </div>
                          </div>
                          <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50/80'}`}>
                            <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Stadium</span>
                            <span className={`font-bold ${textColor}`}>{selectedTeam.venue.name || 'N/A'}</span>
                          </div>
                          <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50/80'}`}>
                            <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>City</span>
                            <span className={`font-bold ${textColor}`}>{selectedTeam.venue.city || 'N/A'}</span>
                          </div>
                          <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50/80'}`}>
                            <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Capacity</span>
                            <span className={`font-bold ${textColor}`}>{selectedTeam.venue.capacity?.toLocaleString() || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Players Section */}
                    <div>
                      <h4 className={`text-lg font-semibold mb-4 ${textColor}`}>Squad Players</h4>
                      {playersLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p className={`text-sm ${textMuted}`}>Loading players...</p>
                          </div>
                        </div>
                      ) : teamPlayers.length > 0 ? (
                        <div className={`space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin ${isDark ? 'scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500' : 'scrollbar-thumb-gray-400 scrollbar-track-gray-200 hover:scrollbar-thumb-gray-500'}`}>
                          {teamPlayers.slice(0, 20).map((player, index) => (
                            <div key={player.id || index} className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                              <div className="w-10 h-10 relative">
                                {player.photo ? (
                                  <img
                                    src={player.photo}
                                    alt={player.name}
                                    className="w-10 h-10 object-cover rounded-full"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">${player.name.charAt(0)}</div>`;
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                    {player.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`font-medium text-sm ${textColor} truncate`} title={player.name}>
                                    {player.name}
                                  </p>
                                  {user && (
                                    <button
                                      onClick={(e) => togglePlayerFavorite(player, e)}
                                      disabled={favoritePlayersLoading.has(player.id)}
                                      className={`transition-colors duration-200 ${
                                        favoritePlayers.has(player.id)
                                          ? 'text-red-500 hover:text-red-600'
                                          : 'text-gray-400 hover:text-red-500'
                                      }`}
                                      title={favoritePlayers.has(player.id) ? 'Remove from favorites' : 'Add to favorites'}
                                    >
                                      {favoritePlayersLoading.has(player.id) ? (
                                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                      ) : (
                                        <svg 
                                          width="14" 
                                          height="14" 
                                          viewBox="0 0 24 24" 
                                          fill={favoritePlayers.has(player.id) ? "currentColor" : "none"} 
                                          stroke="currentColor" 
                                          strokeWidth="2" 
                                          strokeLinecap="round" 
                                          strokeLinejoin="round"
                                        >
                                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                        </svg>
                                      )}
                                    </button>
                                  )}
                                </div>
                                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                                  {player.position} • {player.age} years • {player.nationality}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-bold ${textColor}`}>#{player.number || 'N/A'}</div>
                                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Number</div>
                              </div>
                            </div>
                          ))}
                          {teamPlayers.length > 20 && (
                            <div className={`text-center text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} py-2`}>
                              And {teamPlayers.length - 20} more players...
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 mx-auto bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>No players data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
