'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE, addPlayerToFavorites, removePlayerFromFavorites, checkPlayerFavoriteStatus } from '@/lib/api';

interface Player {
  id: number;
  name: string;
  age: number;
  nationality: string;
  photo?: string;
  team: {
    id: number;
    name: string;
    logo: string;
    country: string;
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
  };
  season: number;
  position: string;
  stats: {
    appearances: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    minutes: number;
  };
}

export default function TopPlayersPage() {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [selectedLeague, setSelectedLeague] = useState('39'); // Default to Premier League
  const [sortBy, setSortBy] = useState('goals'); // goals, assists, appearances, minutes
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [favoritePlayers, setFavoritePlayers] = useState<Set<number>>(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState<Set<number>>(new Set());
  const [availableLeagues, setAvailableLeagues] = useState<Array<{id: number, name: string, country: string, priority: number}>>([]);
  const [priorityOrder, setPriorityOrder] = useState<number[]>([]);

  // Theme-based styling (matching matches page)
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';
  const textSubtle = isDark ? 'text-slate-400' : 'text-gray-500';

  const positions = [
    { value: 'all', label: 'All Positions' },
    { value: 'Goalkeeper', label: 'Goalkeeper' },
    { value: 'Defender', label: 'Defender' },
    { value: 'Midfielder', label: 'Midfielder' },
    { value: 'Attacker', label: 'Attacker' }
  ];

  // Dynamic leagues will be loaded from backend

  const sortOptions = [
    { value: 'goals', label: 'Goals' },
    { value: 'assists', label: 'Assists' },
    { value: 'appearances', label: 'Appearances' },
    { value: 'minutes', label: 'Minutes Played' }
  ];

  // Fetch priority order and available leagues from backend (same as today page)
  useEffect(() => {
    const fetchPriorityOrder = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/leagues/priority`);
        if (response.ok) {
          const data = await response.json();
          setPriorityOrder(data.priorityOrder);
          setAvailableLeagues(data.leagues);
        }
      } catch (error) {
        console.error('Error fetching priority order:', error);
        // Fallback to default priority if API fails
        setPriorityOrder([140, 39, 135, 78, 61, 2, 3, 1, 4, 9, 21, 8]);
      }
    };

    fetchPriorityOrder();
  }, []);

  useEffect(() => {
    if (availableLeagues.length > 0) {
      fetchPlayers();
    }
  }, [selectedLeague, availableLeagues]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentSeason = new Date().getFullYear();
      
      // Fetch players from specific league only
      const response = await fetch(`${API_BASE}/api/players/api/topscorers?league=${selectedLeague}&season=${currentSeason}`);
      if (!response.ok) {
        throw new Error('Failed to fetch players');
      }
      
      const data = await response.json();
      setPlayers(data);

      // Check favorite status for all players if user is logged in
      if (user && token && data.length > 0) {
        const favoriteStatuses = await Promise.all(
          data.map(async (player: Player) => {
            const isFavorite = await checkPlayerFavoriteStatusLocal(player.id);
            return { playerId: player.id, isFavorite };
          })
        );

        const newFavoritePlayers = new Set<number>();
        favoriteStatuses.forEach(({ playerId, isFavorite }) => {
          if (isFavorite) {
            newFavoritePlayers.add(playerId);
          }
        });
        setFavoritePlayers(newFavoritePlayers);
      }
    } catch (err) {
      console.error('Error fetching players:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch players');
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (player: Player) => {
    if (!user || !token) {
      setError("Please log in to add players to favorites");
      return;
    }

    const playerId = player.id;
    setFavoriteLoading(prev => new Set(prev).add(playerId));

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
          { name: player.team.name, logo: player.team.logo },
          player.league.name,
          player.league.id,
          token
        );
        setFavoritePlayers(prev => new Set(prev).add(playerId));
      }
    } catch (error) {
      console.error('❌ Error toggling player favorite:', error);
      setError(`Failed to update favorites: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFavoriteLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
    }
  };

  const checkPlayerFavoriteStatusLocal = async (playerId: number) => {
    if (!user || !token) return false;
    
    try {
      const response = await checkPlayerFavoriteStatus(playerId, token);
      return response.isFavorite;
    } catch (error) {
      console.error('❌ Error checking player favorite status:', error);
      return false;
    }
  };

  // Get unique teams and leagues for filters
  const teams = ['all', ...Array.from(new Set(players.map(p => p.team.name).filter(Boolean)))];
  const countries = ['all', ...Array.from(new Set(players.map(p => p.team.country).filter(Boolean)))];

  const filteredPlayers = players.filter(player => {
    const searchMatch = searchQuery === '' || 
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.team.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.league.name.toLowerCase().includes(searchQuery.toLowerCase());

    const positionMatch = positionFilter === 'all' || player.position === positionFilter;
    const teamMatch = teamFilter === 'all' || player.team.name === teamFilter;
    const countryMatch = leagueFilter === 'all' || player.team.country === leagueFilter;

    return searchMatch && positionMatch && teamMatch && countryMatch;
  }).sort((a, b) => {
    // Sort by selected criteria only (since we're showing only one league at a time)
    let aValue = 0;
    let bValue = 0;
    
    if (sortBy === 'goals') {
      aValue = a.stats.goals || 0;
      bValue = b.stats.goals || 0;
    } else if (sortBy === 'assists') {
      aValue = a.stats.assists || 0;
      bValue = b.stats.assists || 0;
    } else if (sortBy === 'appearances') {
      aValue = a.stats.appearances || 0;
      bValue = b.stats.appearances || 0;
    } else if (sortBy === 'minutes') {
      aValue = a.stats.minutes || 0;
      bValue = b.stats.minutes || 0;
    }
    
    if (sortOrder === 'desc') {
      return bValue - aValue;
    } else {
      return aValue - bValue;
    }
  });

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'Goalkeeper': return 'bg-green-500';
      case 'Defender': return 'bg-blue-500';
      case 'Midfielder': return 'bg-yellow-500';
      case 'Attacker': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Remove the early return for loading state - we'll show the interface with loading indicator

  if (error) {
    return (
      <>
        <style jsx global>{`
          .player-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px 0px rgba(0,0,0,0.15);
            border-color: #10b981;
          }
          
          .glass-morphism {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .sport-gradient {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          }
          
          .sport-text-gradient {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
        `}</style>
        
        <div className={`min-h-screen ${bgColor} relative`}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20 dark:from-blue-900/10 dark:via-transparent dark:to-purple-900/10 pointer-events-none"></div>
          
          <Header />
          <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className={`text-xl font-heading font-semibold mb-2 ${textColor}`}>Error loading players</h3>
                <p className={`text-sm ${textMuted}`}>{error}</p>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        .player-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px 0px rgba(0,0,0,0.15);
          border-color: #10b981;
        }
        
        .glass-morphism {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .sport-gradient {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        }
        
        .sport-text-gradient {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
      
      <div className={`min-h-screen ${bgColor} relative`}>
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20 dark:from-blue-900/10 dark:via-transparent dark:to-purple-900/10 pointer-events-none"></div>

        <Header />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className={`text-3xl md:text-4xl font-display font-bold sport-text-gradient mb-2`}>Top Players</h1>
            <p className={`text-sm ${textMuted}`}>Discover the best performing players across all leagues</p>
          </div>

          {/* Advanced Controls */}
          <div className={`${cardBg} backdrop-blur-sm p-4 rounded-xl mb-6 space-y-4 border ${isDark ? 'border-slate-700' : 'border-gray-200'} glass-morphism border border-white/10`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-4">
              {/* League Selector */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textColor}`}>Select League:</label>
                <select
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  className={`w-full px-4 py-3 ${isDark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-white/50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-12`}
                  disabled={availableLeagues.length === 0}
                >
                  {availableLeagues.length === 0 ? (
                    <option value="" disabled>Loading leagues...</option>
                  ) : (
                    availableLeagues
                      .sort((a, b) => {
                        const aPrio = priorityOrder.indexOf(a.id);
                        const bPrio = priorityOrder.indexOf(b.id);
                        if (aPrio !== -1 && bPrio !== -1) return aPrio - bPrio;
                        if (aPrio !== -1) return -1;
                        if (bPrio !== -1) return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map((league) => (
                        <option key={league.id} value={league.id.toString()}>
                          {league.name} ({league.country})
                        </option>
                      ))
                  )}
                </select>
              </div>

              {/* Search Bar */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textColor}`}>Search:</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search players, teams, countries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full px-4 py-3 pl-10 ${isDark ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400' : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'} border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-12`}
                  />
                  <svg
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Position Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textColor}`}>Position:</label>
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className={`w-full px-4 py-3 ${isDark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-white/50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-12`}
                >
                  {positions.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Team Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textColor}`}>Team:</label>
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className={`w-full px-4 py-3 ${isDark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-white/50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-12`}
                >
                  {teams.map((team) => (
                    <option key={team} value={team}>
                      {team === 'all' ? 'All Teams' : team}
                    </option>
                  ))}
                </select>
              </div>

              {/* Country Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textColor}`}>Country:</label>
                <select
                  value={leagueFilter}
                  onChange={(e) => setLeagueFilter(e.target.value)}
                  className={`w-full px-4 py-3 ${isDark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-white/50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-12`}
                >
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country === 'all' ? 'All Countries' : country}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className={`text-sm font-medium ${textColor}`}>Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`px-3 py-2 ${isDark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-white/50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:border-blue-500`}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className={`text-sm font-medium ${textColor}`}>Order:</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className={`px-3 py-2 ${isDark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-white/50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:border-blue-500`}
                >
                  <option value="desc">High to Low</option>
                  <option value="asc">Low to High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Players Grid */}
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className={`text-xl font-heading font-semibold mb-2 ${textColor}`}>
                    No players found
                  </h3>
                  <p className={`text-sm ${textMuted}`}>
                    Try adjusting your search or filters
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`rounded-xl p-4 border border-l-4 border-l-blue-500 hover:scale-[1.02] transition-all duration-300 cursor-pointer player-card glass-morphism border border-white/10 ${
                      isDark 
                        ? 'bg-slate-800 shadow-[4px_4px_8px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_12px_0px_rgba(0,0,0,0.4)]' 
                        : 'bg-white shadow-[4px_4px_8px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_12px_0px_rgba(0,0,0,0.2)]'
                    }`}
                  >
                    {/* Player Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${textColor}`}>#{index + 1}</span>
                        <div className={`px-2 py-1 rounded-full text-xs font-bold text-white ${getPositionColor(player.position)}`}>
                          {player.position}
                        </div>
                      </div>
                      <div className={`text-right`}>
                        <div className={`text-lg font-bold text-blue-400`}>
                          {player.stats.goals}
                        </div>
                        <div className={`text-xs ${textMuted}`}>Goals</div>
                      </div>
                    </div>

                    {/* Player Photo and Basic Info */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 relative">
                        {player.photo ? (
                          <Image
                            src={player.photo}
                            alt={player.name}
                            fill
                            className="object-cover rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">${player.name.charAt(0)}</div>`;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                            {player.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold text-lg ${textColor} truncate`} title={player.name}>
                            {player.name}
                          </h3>
                          {user && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(player);
                              }}
                              disabled={favoriteLoading.has(player.id)}
                              className={`transition-colors duration-200 ${
                                favoritePlayers.has(player.id)
                                  ? 'text-red-500 hover:text-red-600'
                                  : 'text-gray-400 hover:text-red-500'
                              }`}
                              title={favoritePlayers.has(player.id) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              {favoriteLoading.has(player.id) ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <svg 
                                  width="16" 
                                  height="16" 
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
                        <p className={`text-sm ${textMuted}`}>
                          {player.age} years • {player.nationality}
                        </p>
                        <p className={`text-xs ${textSubtle}`}>
                          {player.league.name} • {player.season}
                        </p>
                      </div>
                    </div>

                    {/* Team and League */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 relative">
                        {player.team.logo ? (
                          <Image
                            src={player.team.logo}
                            alt={player.team.name}
                            fill
                            className="object-contain rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-yellow-500 flex items-center justify-center text-white text-xs font-bold">${player.team.name.charAt(0)}</div>`;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-yellow-500 flex items-center justify-center text-white text-xs font-bold">
                            {player.team.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${textColor} truncate`} title={player.team.name}>
                          {player.team.name}
                        </p>
                        <p className={`text-xs ${textMuted}`}>
                          {player.team.country}
                        </p>
                      </div>
                    </div>

                    {/* Key Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${textColor}`}>{player.stats.goals}</div>
                        <div className={`text-xs ${textMuted}`}>Goals</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${textColor}`}>{player.stats.assists}</div>
                        <div className={`text-xs ${textMuted}`}>Assists</div>
                      </div>
                    </div>

                    {/* Additional Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className={`text-sm font-bold ${textColor}`}>{player.stats.appearances}</div>
                        <div className={`text-xs ${textMuted}`}>Apps</div>
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${textColor}`}>{Math.round(player.stats.minutes / 90)}</div>
                        <div className={`text-xs ${textMuted}`}>90s</div>
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${textColor}`}>{player.stats.yellowCards + player.stats.redCards}</div>
                        <div className={`text-xs ${textMuted}`}>Cards</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      </>
  );
}