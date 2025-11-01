'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import Header from '@/components/Header';
import Link from 'next/link';

interface Player {
  _id: string;
  name: string;
  position: string;
  team: string;
  price: number;
  photo?: string;
  age?: number;
  number?: number;
  nationality?: string;
  height?: string;
  weight?: string;
  injured?: boolean;
  selected?: boolean;
}

export default function FantasyPlayersPage() {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');

  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';

  // Position limits for fantasy football
  const positionLimits = {
    'Goalkeeper': 2,
    'Defender': 5,
    'Midfielder': 5,
    'Forward': 3
  };

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const response = await apiFetch<Player[]>('/fantasy/players', {}, token ?? '');
      setPlayers(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch players');
    } finally {
      setLoading(false);
    }
  };

  const canSelectPlayer = (player: Player) => {
    if (selectedPlayers.length >= 15) return false;
    
    const positionCount = selectedPlayers.filter(p => p.position === player.position).length;
    const limit = positionLimits[player.position as keyof typeof positionLimits] || 0;
    
    return positionCount < limit;
  };

  const handlePlayerSelect = (player: Player) => {
    if (!canSelectPlayer(player)) return;
    
    const isSelected = selectedPlayers.some(p => p._id === player._id);
    
    if (isSelected) {
      setSelectedPlayers(selectedPlayers.filter(p => p._id !== player._id));
    } else {
      setSelectedPlayers([...selectedPlayers, { ...player, selected: true }]);
    }
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPosition = positionFilter === 'all' || player.position === positionFilter;
    const matchesTeam = teamFilter === 'all' || player.team === teamFilter;
    
    return matchesSearch && matchesPosition && matchesTeam;
  });

  const getPositionCount = (position: string) => {
    return selectedPlayers.filter(p => p.position === position).length;
  };

  const getTotalCost = () => {
    return selectedPlayers.reduce((sum, player) => sum + player.price, 0);
  };

  useEffect(() => {
    if (user && token) {
      fetchPlayers();
    }
  }, [user, token]);

  if (!user) {
    return (
      <div className={`min-h-screen ${bgColor}`}>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <div className={`${cardBg} rounded-lg p-8 shadow-lg`}>
              <div className="text-6xl mb-4">⚽</div>
              <h2 className={`text-2xl font-bold mb-4 ${textColor}`}>Login Required</h2>
              <p className={`${textMuted} mb-6`}>
                Please log in to access player selection
              </p>
              <Link 
                href="/login"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor}`}>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className={`${textMuted}`}>Loading players...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${textColor}`}>
              Player Selection
            </h1>
            <p className={`text-lg ${textMuted}`}>
              Pick your fantasy squad
            </p>
          </div>
          <Link
            href="/fantasy"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Fantasy
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Player Selection */}
          <div className="lg:col-span-3">
            {/* Filters */}
            <div className={`${cardBg} rounded-xl p-6 shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'} mb-6`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textColor}`}>Search Players</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Search by name..."
                  />
                </div>

                {/* Position Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textColor}`}>Position</label>
                  <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="all">All Positions</option>
                    <option value="Goalkeeper">Goalkeeper</option>
                    <option value="Defender">Defender</option>
                    <option value="Midfielder">Midfielder</option>
                    <option value="Forward">Forward</option>
                  </select>
                </div>

                {/* Team Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textColor}`}>Team</label>
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="all">All Teams</option>
                    <option value="Real Madrid">Real Madrid</option>
                    <option value="Barcelona">Barcelona</option>
                    <option value="Manchester City">Manchester City</option>
                    <option value="Liverpool">Liverpool</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlayers.map((player) => {
                const isSelected = selectedPlayers.some(p => p._id === player._id);
                const canSelect = canSelectPlayer(player);
                
                return (
                  <div
                    key={player._id}
                    className={`${cardBg} rounded-xl p-4 shadow-lg border transition-all duration-300 cursor-pointer ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : canSelect 
                          ? 'border-gray-200 dark:border-slate-700 hover:border-blue-300 hover:shadow-md' 
                          : 'border-gray-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => handlePlayerSelect(player)}
                  >
                    {/* Player Photo */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        {player.photo ? (
                          <img 
                            src={player.photo} 
                            alt={player.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-gray-600 dark:text-gray-300">
                            {player.name.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-bold ${textColor}`}>{player.name}</h3>
                        <p className={`text-sm ${textMuted}`}>{player.position}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${textColor}`}>${player.price}M</div>
                        {player.injured && (
                          <div className="text-xs text-red-500">Injured</div>
                        )}
                      </div>
                    </div>

                    {/* Player Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className={textMuted}>Age:</span> {player.age || 'N/A'}
                      </div>
                      <div>
                        <span className={textMuted}>Team:</span> {player.team}
                      </div>
                      {player.number && (
                        <div>
                          <span className={textMuted}>#:</span> {player.number}
                        </div>
                      )}
                      {player.nationality && (
                        <div>
                          <span className={textMuted}>Country:</span> {player.nationality}
                        </div>
                      )}
                    </div>

                    {/* Selection Status */}
                    {isSelected && (
                      <div className="mt-3 text-center">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                          Selected
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selection Summary */}
          <div className="lg:col-span-1">
            <div className={`${cardBg} rounded-xl p-6 shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'} sticky top-8`}>
              <h3 className={`text-xl font-bold mb-4 ${textColor}`}>Selection Summary</h3>
              
              {/* Budget */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm ${textMuted}`}>Budget</span>
                  <span className={`font-bold ${textColor}`}>$100M</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${textMuted}`}>Used</span>
                  <span className={`font-bold ${getTotalCost() > 100 ? 'text-red-500' : textColor}`}>
                    ${getTotalCost().toFixed(1)}M
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${getTotalCost() > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min((getTotalCost() / 100) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Position Counts */}
              <div className="mb-4">
                <h4 className={`font-semibold mb-2 ${textColor}`}>Players by Position</h4>
                {Object.entries(positionLimits).map(([position, limit]) => {
                  const count = getPositionCount(position);
                  const isAtLimit = count >= limit;
                  
                  return (
                    <div key={position} className="flex justify-between items-center mb-1">
                      <span className={`text-sm ${textMuted}`}>{position}</span>
                      <span className={`text-sm font-medium ${isAtLimit ? 'text-red-500' : textColor}`}>
                        {count}/{limit}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Total Players */}
              <div className="mb-6">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${textMuted}`}>Total Players</span>
                  <span className={`font-bold ${selectedPlayers.length >= 15 ? 'text-red-500' : textColor}`}>
                    {selectedPlayers.length}/15
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <button
                disabled={selectedPlayers.length < 11 || getTotalCost() > 100}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  selectedPlayers.length < 11 || getTotalCost() > 100
                    ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {selectedPlayers.length < 11 
                  ? `Need ${11 - selectedPlayers.length} more players`
                  : getTotalCost() > 100
                    ? 'Exceeds budget'
                    : 'Save Team'
                }
              </button>

              {/* Fantasy Rules */}
              <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className={`text-sm font-semibold mb-2 ${textColor}`}>Fantasy Rules</h4>
                <ul className={`text-xs ${textMuted} space-y-1`}>
                  <li>• Select exactly 15 players</li>
                  <li>• Max 2 Goalkeepers</li>
                  <li>• Max 5 Defenders</li>
                  <li>• Max 5 Midfielders</li>
                  <li>• Max 3 Forwards</li>
                  <li>• Stay within budget</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
