'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import Header from '@/components/Header';
import Link from 'next/link';

interface FantasyTeam {
  _id: string;
  name: string;
  totalPoints: number;
  players: any[];
  rank?: number;
  budget?: number;
  teamType?: 'barcelona' | 'real-madrid' | 'custom';
}

interface FantasyLeague {
  _id: string;
  name: string;
  type: 'public' | 'private';
  inviteCode?: string;
  teams: FantasyTeam[];
  standings: any[];
}

export default function FantasyPage() {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [userTeams, setUserTeams] = useState<FantasyTeam[]>([]);
  const [leagues, setLeagues] = useState<FantasyLeague[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [currentGameweek, setCurrentGameweek] = useState<any>(null);
  const [gameweeks, setGameweeks] = useState<any[]>([]);
  const [gameweeksLoading, setGameweeksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<'barcelona' | 'real-madrid' | null>(null);
  const [teamName, setTeamName] = useState('');
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<any[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [selectedTeamForPlayers, setSelectedTeamForPlayers] = useState<any | null>(null);

  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';

  // Helpers to safely render player display strings
  const getInitials = (name?: string): string => {
    if (!name || typeof name !== 'string') return '?';
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
  };

  const getFirstName = (name?: string): string => {
    if (!name || typeof name !== 'string') return 'Unknown';
    const first = name.trim().split(/\s+/)[0];
    return first || 'Unknown';
  };

  // Helper to get team logo
  const getTeamLogo = (teamType?: string): string => {
    switch (teamType) {
      case 'barcelona':
        return 'https://media.api-sports.io/football/teams/529.png';
      case 'real-madrid':
        return 'https://media.api-sports.io/football/teams/541.png';
      default:
        return 'https://via.placeholder.com/32x32/6B7280/FFFFFF?text=?';
    }
  };

  const fetchGameweeks = async () => {
    try {
      setGameweeksLoading(true);
      const gameweeksResponse = await apiFetch<any[]>('/fantasy/gameweeks', {}, token!);
      setGameweeks(gameweeksResponse);
    } catch (err) {
      console.log('Failed to fetch gameweeks:', err);
      setGameweeks([]);
    } finally {
      setGameweeksLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const leaderboardResponse = await apiFetch<any[]>('/fantasy/leaderboard', {}, token!);
      setLeaderboard(leaderboardResponse);
      
      // Find current user's rank
      if (user && leaderboardResponse) {
        const userTeamIndex = leaderboardResponse.findIndex(team => 
          team.user?._id === user._id
        );
        setUserRank(userTeamIndex >= 0 ? userTeamIndex + 1 : null);
      }
    } catch (err) {
      console.log('Failed to fetch leaderboard:', err);
      setLeaderboard([]);
      setUserRank(null);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      if (!user || !token) {
        throw new Error('No authentication token available');
      }
      
      // Fetch real teams data from API
      try {
        const teamsResponse = await apiFetch<FantasyTeam[]>('/fantasy/teams/my', {}, token);
        if (teamsResponse && teamsResponse.length > 0) {
          setUserTeams(teamsResponse);
        } else {
          // No teams found - show empty state
          setUserTeams([]);
        }
      } catch (err) {
        console.log('Failed to fetch teams:', err);
        // Show empty state if API fails
        setUserTeams([]);
      }
      
      // Fetch leaderboard data
      try {
        const leaderboardResponse = await apiFetch<any[]>('/fantasy/leaderboard', {}, token);
        setLeaderboard(leaderboardResponse);
      } catch (err) {
        console.log('Using empty leaderboard');
        setLeaderboard([]);
      }
      
      // Fetch current gameweek
      try {
        const gameweekResponse = await apiFetch<any>('/fantasy/gameweeks/current', {}, token);
        setCurrentGameweek(gameweekResponse);
      } catch (err) {
        console.log('Gameweek endpoint not available or no current gameweek');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fantasy data');
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!token) return;
    
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    try {
      await apiFetch(`/fantasy/teams/${teamId}`, {
        method: 'DELETE'
      }, token);
      
      // Remove team from local state
      setUserTeams(prev => prev.filter(team => team._id !== teamId));
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team');
    }
  };

  const createTeam = async () => {
    if (!token || !selectedTeam || !teamName.trim()) return;

    try {
      // Create team without players initially to avoid ObjectId validation errors
      const response = await apiFetch('/fantasy/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: teamName.trim(),
          teamType: selectedTeam,
          // Don't send players array to avoid ObjectId validation
        })
      }, token);

      // Add the new team to local state
      const newTeam: FantasyTeam = {
        _id: response.team._id,
        name: teamName.trim(),
        totalPoints: 0,
        rank: undefined,
        budget: 100,
        players: [],
        teamType: selectedTeam
      };

      setUserTeams(prev => [...prev, newTeam]);
      setShowCreateTeamModal(false);
      setSelectedTeam(null);
      setTeamName('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
    }
  };

  // Normalize player from various shapes to the one used in the selector
  const normalizePlayer = (p: any) => ({
    _id: p?.player?._id || p?._id,
    name: p?.player?.name || p?.name || 'Unknown Player',
    position: p?.player?.position || p?.position || 'Unknown',
    price: p?.player?.price ?? p?.price ?? 5,
    photo: p?.player?.photo || p?.photo || '',
  });

  const loadTeamPlayers = async (teamType: string, currentTeam?: FantasyTeam) => {
    if (!token) return;
    
    setPlayersLoading(true);
    try {
      const response = await apiFetch(`/fantasy/teams/players/${teamType}`, {}, token);
      setAvailablePlayers(response.players || []);
      setSelectedTeamForPlayers(response.team);
      // Pre-select already saved players for this team (up to 15)
      if (currentTeam && Array.isArray(currentTeam.players)) {
        const normalized = currentTeam.players.map((pp: any) => normalizePlayer(pp)).slice(0, 15);
        setSelectedPlayers(normalized);
      } else {
        // If we have the same team in local userTeams, try to find it and preselect
        const matching = userTeams.find(t => t.teamType === teamType);
        if (matching && Array.isArray(matching.players)) {
          const normalized = matching.players.map((pp: any) => normalizePlayer(pp)).slice(0, 15);
          setSelectedPlayers(normalized);
        }
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load players');
    } finally {
      setPlayersLoading(false);
    }
  };

  const togglePlayerSelection = (player: any) => {
    setSelectedPlayers(prev => {
      const isSelected = prev.some(p => p._id === player._id);
      if (isSelected) {
        return prev.filter(p => p._id !== player._id);
      } else {
        if (prev.length >= 15) {
          return prev; // enforce cap of 15 - user must unselect first
        }
        return [...prev, player];
      }
    });
  };

  const saveSelectedPlayers = async (teamId: string) => {
    if (!token || selectedPlayers.length === 0) return;

    try {
      console.log('🔍 Saving players for team ID:', teamId);
      console.log('🔍 Selected players:', selectedPlayers);
      
      const playersData = selectedPlayers.map(player => ({
        player: player._id,
        isCaptain: false,
        isViceCaptain: false,
        isSubstitute: false
      }));

      console.log('🔍 Players data to save:', playersData);

      // Check if team exists in database
      const existingTeam = userTeams.find(t => t._id === teamId);
      console.log('🔍 Existing team found:', existingTeam);
      
      if (existingTeam) {
        // Update existing team
        console.log('🔄 Updating existing team...');
        await apiFetch(`/fantasy/teams/${teamId}`, {
          method: 'PUT',
          body: JSON.stringify({
            players: playersData
          })
        }, token);
      } else {
        // Try to create new team (only if user has no teams)
        console.log('🆕 Creating new team...');
        const teamName = selectedTeamForPlayers?.name || 'My Fantasy Team';
        const teamType = selectedTeamForPlayers?.name?.toLowerCase().includes('barcelona') ? 'barcelona' : 
                        selectedTeamForPlayers?.name?.toLowerCase().includes('real madrid') ? 'real-madrid' : 'custom';
        
        try {
          const response = await apiFetch('/fantasy/teams', {
            method: 'POST',
            body: JSON.stringify({
              name: teamName,
              teamType: teamType,
              players: playersData
            })
          }, token);
          
          console.log('✅ New team created:', response);
          // Add new team to local state
          setUserTeams(prev => [...prev, response.team]);
        } catch (createError: any) {
          if (createError.message?.includes('already have a fantasy team')) {
            setError('You already have a fantasy team. Please update your existing team instead.');
            return;
          }
          throw createError;
        }
      }

      // Update local state
      setUserTeams(prev => prev.map(team => 
        team._id === teamId 
          ? { ...team, players: selectedPlayers }
          : team
      ));

      setSelectedPlayers([]);
      setAvailablePlayers([]);
      setSelectedTeamForPlayers(null);
      setError(null);
      console.log('✅ Team saved successfully!');
    } catch (err) {
      console.error('❌ Error saving team:', err);
      setError(err instanceof Error ? err.message : 'Failed to save players');
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '🏆' },
    { id: 'my-team', name: 'My Team', icon: '⚽' },
    { id: 'gameweeks', name: 'Gameweeks', icon: '📅' },
    { id: 'leaderboard', name: 'Leaderboard', icon: '📊' },
    { id: 'leagues', name: 'Leagues', icon: '🏟️' },
  ];

  useEffect(() => {
    if (user && token) {
      fetchUserData();
    }
  }, [user, token]);

  useEffect(() => {
    if (activeTab === 'gameweeks' && user && token) {
      fetchGameweeks();
    }
  }, [activeTab, user, token]);

  useEffect(() => {
    if (activeTab === 'leaderboard' && user && token) {
      fetchLeaderboard();
    }
  }, [activeTab, user, token]);

  // Debug: Log activeTab changes
  useEffect(() => {
    console.log('Active tab changed to:', activeTab);
  }, [activeTab]);

  // Auto-load players when My Team tab is active and team is available
  useEffect(() => {
    if (activeTab === 'my-team' && userTeams.length > 0 && token) {
      const team = userTeams[0]; // Get the first (and only) team
      if (team.teamType && (team.teamType === 'barcelona' || team.teamType === 'real-madrid')) {
        loadTeamPlayers(team.teamType, team);
      }
    }
  }, [activeTab, userTeams, token]);

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
                Please log in to access your fantasy teams
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


  if (error) {
    return (
      <div className={`min-h-screen ${bgColor}`}>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <div className={`${cardBg} rounded-lg p-8 shadow-lg`}>
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className={`text-2xl font-bold mb-4 ${textColor}`}>Error</h2>
              <p className={`${textMuted} mb-6`}>{error}</p>
              <button 
                onClick={fetchUserData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        /* Custom scrollbar for modal */
        .modal-scroll::-webkit-scrollbar {
          width: 6px;
        }
        
        .modal-scroll::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.1);
          border-radius: 3px;
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

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-slide-in-top {
          animation: slideInFromTop 0.6s ease-out;
        }
        
        @keyframes slideInFromTop {
          0% {
            opacity: 0;
            transform: translateY(-30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

      `}</style>
    <div className={`min-h-screen ${bgColor} relative overflow-hidden`}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/10 via-transparent to-purple-50/10 dark:from-blue-900/10 dark:via-transparent dark:to-purple-900/10 pointer-events-none"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-float pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-float pointer-events-none" style={{animationDelay: '2s'}}></div>
      
      <Header />
      
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl">
        {/* Fantasy Header */}
        <div className="mb-6 sm:mb-8 animate-slide-in-top">
          <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 ${textColor} bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent`}>
            Fantasy Football
          </h1>
          <p className={`text-base sm:text-lg ${textMuted}`}>
            Build your dream team and compete with friends
          </p>
        </div>

        {/* Tab Navigation */}
        <div className={`${cardBg} rounded-xl p-2 shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'} mb-6 sm:mb-8`}>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Tab clicked:', tab.id, 'Current active tab:', activeTab);
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-all duration-300 cursor-pointer text-sm sm:text-base ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : `${textColor} hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105`
                }`}
                type="button"
              >
                <span className="text-base sm:text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6 sm:space-y-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 sm:space-y-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className={`${cardBg} rounded-xl p-4 sm:p-6 shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <span className="text-xl sm:text-2xl">⚽</span>
                    </div>
                    <div>
                      <h3 className={`text-xl sm:text-2xl font-bold ${textColor}`}>{userTeams.length}</h3>
                      <p className={`text-sm sm:text-base ${textMuted}`}>My Teams</p>
                    </div>
                  </div>
                </div>

                <div className={`${cardBg} rounded-xl p-4 sm:p-6 shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <span className="text-xl sm:text-2xl">🏆</span>
                    </div>
                    <div>
                      <h3 className={`text-xl sm:text-2xl font-bold ${textColor}`}>
                        {userTeams.reduce((sum, team) => sum + team.totalPoints, 0)}
                      </h3>
                      <p className={`text-sm sm:text-base ${textMuted}`}>Total Points</p>
                    </div>
                  </div>
                </div>

                <div className={`${cardBg} rounded-xl p-4 sm:p-6 shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                      <span className="text-xl sm:text-2xl">📊</span>
                    </div>
                    <div>
                      <h3 className={`text-xl sm:text-2xl font-bold ${textColor}`}>
                        {userTeams.length > 0 ? Math.round(userTeams.reduce((sum, team) => sum + team.totalPoints, 0) / userTeams.length) : 0}
                      </h3>
                      <p className={`text-sm sm:text-base ${textMuted}`}>Avg Points</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Teams */}
                <div className={`${cardBg} rounded-xl p-4 sm:p-6 shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <h2 className={`text-lg sm:text-xl font-bold ${textColor}`}>Recent Teams</h2>
                  {userTeams.length === 0 ? (
                    <button 
                      onClick={() => setShowCreateTeamModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base"
                    >
                      <span>+</span>
                      Create Team
                    </button>
                  ) : (
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      You already have a team (1/1)
                    </div>
                  )}
                </div>
                {userTeams.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {userTeams.slice(0, 3).map((team) => (
                      <div key={team._id} className={`${isDark ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-4 relative`}>
                        {/* Action Buttons */}
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Link
                            href="/fantasy/my-team"
                            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            title="Edit Team"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => deleteTeam(team._id)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            title="Delete Team"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        {/* Team Header with Logo */}
                        <div className="flex items-center gap-3 mb-3">
                          <img 
                            src={getTeamLogo(team.teamType)} 
                            alt={team.teamType === 'barcelona' ? 'Barcelona' : team.teamType === 'real-madrid' ? 'Real Madrid' : 'Custom Team'}
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1">
                          <h3 className={`font-semibold ${textColor}`}>{team.name}</h3>
                          {team.rank && (
                              <span className="text-yellow-600 font-bold text-xs">#{team.rank}</span>
                          )}
                          </div>
                        </div>
                        
                        <div className={`text-sm ${textMuted}`}>
                          {team.totalPoints} points • {team.players.length} players
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">⚽</div>
                    <h3 className={`text-lg font-semibold mb-2 ${textColor}`}>No Teams Yet</h3>
                    <p className={`${textMuted} mb-4`}>Create your first fantasy team to get started</p>
                    <button 
                      onClick={() => setShowCreateTeamModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Create Your First Team
                    </button>
                </div>
              )}
              </div>
            </div>
          )}

          {/* My Team Tab - Professional El Clásico Style */}
          {activeTab === 'my-team' && (
            <div className="space-y-4 sm:space-y-6">
              <div className={`${cardBg} rounded-xl p-4 shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'} mb-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${textColor}`}>My Team</h2>
                  </div>
                  {userTeams.length === 0 ? (
                    <button 
                      onClick={() => setShowCreateTeamModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base"
                    >
                      <span>+</span>
                      Create New Team
                    </button>
                  ) : (
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      You already have a team (1/1)
                    </div>
                  )}
                </div>
              </div>
              {userTeams.length > 0 ? (
                userTeams.map((team, index) => (
                  <div key={team._id} className={`${cardBg} rounded-xl p-4 sm:p-6 shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    {/* Team Header - Professional Style */}
                    <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <img 
                          src={getTeamLogo(team.teamType)} 
                          alt={team.teamType === 'barcelona' ? 'Barcelona' : team.teamType === 'real-madrid' ? 'Real Madrid' : 'Custom Team'}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full"
                        />
                        <div className="flex-1">
                          <h3 className={`text-lg sm:text-xl md:text-2xl font-bold ${textColor}`}>{team.name}</h3>
                        {team.rank && (
                            <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 px-2 sm:px-3 py-1 rounded-full mt-1 w-fit">
                              <span className="text-yellow-600 dark:text-yellow-400 font-bold text-xs sm:text-sm">#{team.rank}</span>
                              <span className={`text-xs sm:text-sm ${textMuted}`}>Rank</span>
                          </div>
                        )}
                        </div>
                      </div>
                       <div className="flex items-center justify-end">
                         <div className="bg-blue-600 text-white rounded-full px-4 py-2 shadow-lg">
                           <div className="text-center">
                             <div className="text-lg font-bold">{team.totalPoints}</div>
                             <div className="text-xs opacity-90">Points</div>
                           </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Player Selection Area */}
                    <div className="bg-gradient-to-br from-green-900 via-green-800 to-green-900 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage:'radial-gradient(circle at 50% 50%,#1f3d2a 0%, transparent 60%)'}} />
                      <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
                        <h4 className="text-base sm:text-lg font-semibold text-white">Select Players</h4>
                      </div>


                      {/* Available Players Grid */}
                      {availablePlayers.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 max-h-72 sm:max-h-80 md:max-h-96 overflow-y-auto modal-scroll relative z-10">
                          {availablePlayers.map((player) => {
                            const isSelected = selectedPlayers.some(p => p._id === player._id);
                            const getPositionColor = (position: string) => {
                              switch (position.toLowerCase()) {
                                case 'forward':
                                case 'attacker':
                                  return 'bg-red-500 border-red-400';
                                case 'midfielder':
                                case 'midfield':
                                  return 'bg-yellow-500 border-yellow-400';
                                case 'defender':
                                case 'defence':
                                  return 'bg-blue-500 border-blue-400';
                                case 'goalkeeper':
                                case 'keeper':
                                  return 'bg-green-500 border-green-400';
                                default:
                                  return 'bg-gray-500 border-gray-400';
                              }
                            };
                            
                            return (
                              <div
                                key={player._id}
                                onClick={() => togglePlayerSelection(player)}
                                className={`p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
                                  isSelected
                                    ? 'border-blue-400 bg-blue-900/30 shadow-lg'
                                    : 'border-gray-400 bg-gray-800/50 hover:border-gray-300 hover:bg-gray-700/50'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
                                  <div className="relative">
                                    <img
                                      src={player.photo || 'https://via.placeholder.com/40x40/6B7280/FFFFFF?text=?'}
                                      alt={player.name}
                                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                                    />
                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 text-white text-xs flex items-center justify-center ${getPositionColor(player.position)}`}>
                                      {player.position.charAt(0).toUpperCase()}
                                </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs sm:text-sm font-medium text-white truncate">
                                {player.name}
                              </div>
                                    <div className="text-xs text-gray-300">
                                      {player.position} • ${player.price}M
                            </div>
                                    {player.stats && (
                                      <div className="text-xs text-gray-400">
                                        {player.stats.goals || 0}G {player.stats.assists || 0}A
                                  </div>
                                )}
                              </div>
                                  {isSelected && (
                                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                              </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                                  </div>
                                )}

                      {/* Empty State */}
                      {availablePlayers.length === 0 && !playersLoading && (
                        <div className="text-center py-8 relative z-10">
                          <div className="text-4xl mb-4">⚽</div>
                          <h3 className="text-lg font-semibold mb-2 text-white">Loading Players...</h3>
                          <p className="text-gray-300 mb-4">
                            Fetching players from {team.teamType === 'barcelona' ? 'Barcelona' : team.teamType === 'real-madrid' ? 'Real Madrid' : 'your team'}
                          </p>
                            </div>
                          )}

                      {/* Loading State */}
                      {playersLoading && (
                        <div className="text-center py-8 relative z-10">
                          <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-300">Loading players...</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 sm:gap-4">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                        {selectedPlayers.length > 0 && (
                          <button
                            onClick={() => saveSelectedPlayers(team._id)}
                            className="backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 sm:px-6 py-3 sm:py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl text-sm sm:text-base order-1 sm:order-none"
                          >
                            <span>💾</span>
                            Save Team
                          </button>
                        )}
                        <Link href="/fantasy/my-team" className="backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 sm:px-6 py-3 sm:py-3 rounded-xl transition-all duration-300 inline-flex items-center justify-center font-medium shadow-lg hover:shadow-xl text-sm sm:text-base order-2 sm:order-none">
                          Edit Team
                        </Link>
                        <button 
                          onClick={() => deleteTeam(team._id)}
                          className="backdrop-blur-md bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-100 hover:text-white px-4 sm:px-6 py-3 sm:py-3 rounded-xl transition-all duration-300 font-medium shadow-lg hover:shadow-xl text-sm sm:text-base order-3 sm:order-none"
                        >
                          Delete Team
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`${cardBg} rounded-xl p-6 sm:p-8 text-center shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                  <div className="text-4xl sm:text-6xl mb-4">⚽</div>
                  <h3 className={`text-lg sm:text-xl font-bold mb-2 ${textColor}`}>No Teams Yet</h3>
                  <p className={`text-sm sm:text-base ${textMuted} mb-4 sm:mb-6`}>
                    Create your first fantasy team to get started
                  </p>
                  <button 
                    onClick={() => setShowCreateTeamModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
                  >
                    Create Team
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Gameweeks Tab */}
          {activeTab === 'gameweeks' && (
            <div className="space-y-6">
              <div className={`${cardBg} rounded-xl p-6 shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <h2 className={`text-2xl font-bold mb-4 ${textColor}`}>Fantasy Gameweeks</h2>
                
                {gameweeksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className={`ml-3 ${textMuted}`}>Loading gameweeks...</span>
                  </div>
                ) : gameweeks.length === 0 ? (
                  <div className="text-center py-8">
              <div className="text-6xl mb-4">📅</div>
                    <h3 className={`text-xl font-bold mb-2 ${textColor}`}>No Gameweeks Available</h3>
                    <p className={`${textMuted}`}>No gameweeks have been created yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gameweeks.map((gameweek: any) => (
                      <div key={gameweek._id} className={`${isDark ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-4 border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className={`text-lg font-semibold ${textColor}`}>Gameweek {gameweek.number}</h3>
                            {gameweek.isActive && (
                              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Display External Matches */}
                        {gameweek.externalMatches && gameweek.externalMatches.length > 0 && (
                          <div className="space-y-3">
                            {gameweek.externalMatches.map((match: any, index: number) => (
                              <div key={index} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-xl shadow-sm">
                                {/* Mobile-first responsive layout */}
                                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                                  {/* Home Team */}
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <img src={match.teams.home.logo} alt={match.teams.home.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/20 flex-shrink-0" />
                                    <span className="font-semibold text-sm sm:text-base truncate">{match.teams.home.name}</span>
                                  </div>
                                  
                                  {/* Date/Time - Center on mobile, between teams on desktop */}
                                  <div className="flex flex-col items-center text-center flex-shrink-0">
                                    <div className="text-xs sm:text-sm text-blue-100 mb-1">
                                      {new Date(match.fixture.date).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                      })}
                                    </div>
                                    <div className="text-sm sm:text-base font-bold">
                                      {new Date(match.fixture.date).toLocaleTimeString([], {
                                        hour: '2-digit', 
                                        minute:'2-digit', 
                                        hour12: true
                                      })}
                                    </div>
                                    <div className="text-xs text-blue-100 mt-1 hidden sm:block">vs</div>
                                  </div>
                                  
                                  {/* Away Team */}
                                  <div className="flex items-center gap-3 flex-1 min-w-0 justify-end sm:justify-start">
                                    <span className="font-semibold text-sm sm:text-base truncate order-2 sm:order-1">{match.teams.away.name}</span>
                                    <img src={match.teams.away.logo} alt={match.teams.away.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/20 flex-shrink-0 order-1 sm:order-2" />
                                  </div>
                                </div>
                                
                                {/* Mobile-only VS indicator */}
                                <div className="text-center mt-2 sm:hidden">
                                  <span className="text-xs text-blue-100 bg-white/10 px-2 py-1 rounded-full">vs</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {(!gameweek.externalMatches || gameweek.externalMatches.length === 0) && (
                          <div className="text-center py-4">
                            <div className="text-gray-400 text-sm">No matches scheduled</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-6">
              <div className={`${cardBg} rounded-xl p-6 shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className={`text-2xl font-bold ${textColor}`}>Fantasy Leaderboard</h2>
                    {userRank && (
                      <p className={`text-sm ${textMuted} mt-1`}>
                        Your rank: <span className="font-semibold text-blue-400">#{userRank}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {userRank && (
                      <button 
                        onClick={() => {
                          const userTeamElement = document.getElementById(`team-${userRank - 1}`);
                          if (userTeamElement) {
                            userTeamElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // Add temporary highlight effect
                            userTeamElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-75');
                            setTimeout(() => {
                              userTeamElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-75');
                            }, 3000);
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <span>🎯</span>
                        Go to My Rank
                      </button>
                    )}
                    <button 
                      onClick={fetchLeaderboard}
                      disabled={leaderboardLoading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {leaderboardLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          <span>🔄</span>
                          Refresh
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {leaderboardLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className={`${textMuted}`}>Loading leaderboard...</p>
                    </div>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏆</div>
                    <h3 className={`text-xl font-bold mb-2 ${textColor}`}>No Teams Yet</h3>
                    <p className={`${textMuted}`}>No teams have been created yet. Be the first to create a team!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Header */}
                    <div className={`${isDark ? 'bg-slate-700' : 'bg-gray-100'} rounded-lg p-4 grid grid-cols-12 gap-4 items-center font-semibold text-sm`}>
                      <div className="col-span-1 text-center">#</div>
                      <div className="col-span-1"></div>
                      <div className="col-span-4">Team</div>
                      <div className="col-span-2 text-center">Type</div>
                      <div className="col-span-2 text-center">Total Points</div>
                      <div className="col-span-2 text-center">Owner</div>
                    </div>

                    {/* Leaderboard Entries */}
                    {leaderboard.map((team, index) => {
                      const isUserTeam = user && team.user?._id === user._id;
                      return (
                        <div 
                          key={team.teamId || team._id}
                          id={`team-${index}`}
                          className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-lg p-4 grid grid-cols-12 gap-4 items-center border ${isDark ? 'border-slate-600' : 'border-gray-200'} hover:shadow-md transition-all duration-300 ${
                            isUserTeam 
                              ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50/10 dark:bg-blue-900/20 border-blue-400' 
                              : ''
                          }`}
                        >
                        {/* Rank */}
                        <div className="col-span-1 text-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                        </div>

                        {/* Team Logo */}
                        <div className="col-span-1">
                          <img 
                            src={getTeamLogo(team.teamType)} 
                            alt={team.teamType === 'barcelona' ? 'Barcelona' : team.teamType === 'real-madrid' ? 'Real Madrid' : 'Custom Team'}
                            className="w-8 h-8 rounded-full"
                          />
                        </div>

                        {/* Team Name */}
                        <div className="col-span-4">
                          <div className={`font-semibold ${textColor}`}>{team.teamName || team.name}</div>
                          {team.formation && (
                            <div className={`text-xs ${textMuted}`}>Formation: {team.formation}</div>
                          )}
                        </div>

                        {/* Team Type */}
                        <div className="col-span-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            team.teamType === 'barcelona' ? 'bg-blue-100 text-blue-800' :
                            team.teamType === 'real-madrid' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {team.teamType === 'barcelona' ? 'Barcelona' : 
                             team.teamType === 'real-madrid' ? 'Real Madrid' : 
                             'Custom'}
                          </span>
                        </div>

                        {/* Total Points */}
                        <div className="col-span-2 text-center">
                          <div className={`text-lg font-bold ${textColor}`}>
                            {team.totalPoints || team.gameweekPoints || 0}
                          </div>
                          {team.gameweekPoints && team.gameweekPoints !== team.totalPoints && (
                            <div className={`text-xs ${textMuted}`}>
                              +{team.gameweekPoints} this week
                            </div>
                          )}
                        </div>

                        {/* Owner */}
                        <div className="col-span-2 text-center">
                          <div className={`text-sm ${textColor} flex items-center justify-center gap-2`}>
                            {team.userName || team.user?.fullName || team.user?.username || 'Unknown'}
                            {isUserTeam && (
                              <span className="text-blue-500 text-xs font-bold">(You)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'leagues' && (
            <div className={`${cardBg} rounded-xl p-8 text-center shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="text-6xl mb-4">🏟️</div>
              <h3 className={`text-xl font-bold mb-2 ${textColor}`}>Leagues</h3>
              <p className={`${textMuted}`}>Join or create leagues to compete with friends</p>
            </div>
          )}
        </div>
      </main>

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateTeamModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Fantasy Team</h3>
              <button 
                onClick={() => setShowCreateTeamModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {userTeams.length > 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Team Already Exists</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  You already have a fantasy team. Only one team per user is allowed.
                </p>
                <button 
                  onClick={() => setShowCreateTeamModal(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Choose Your Base Team
                </label>
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedTeam('barcelona')}
                    className={`w-full p-4 border-2 rounded-lg transition-all ${
                      selectedTeam === 'barcelona'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src="https://media.api-sports.io/football/teams/529.png" alt="Barcelona" className="w-8 h-8" />
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-white">Barcelona</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">FC Barcelona Squad</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedTeam('real-madrid')}
                    className={`w-full p-4 border-2 rounded-lg transition-all ${
                      selectedTeam === 'real-madrid'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src="https://media.api-sports.io/football/teams/541.png" alt="Real Madrid" className="w-8 h-8" />
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-white">Real Madrid</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Real Madrid Squad</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateTeamModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createTeam}
                  disabled={!selectedTeam || !teamName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Create Team
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}