'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE, addToFavorites, removeFromFavorites, checkFavoriteStatus } from '@/lib/api';

interface Match {
  _id: string;
  homeTeam: {
    name: string;
    logo: string;
    id: number;
  };
  awayTeam: {
    name: string;
    logo: string;
    id: number;
  };
  scoreA: number;
  scoreB: number;
  date: string;
  status: 'scheduled' | 'live' | 'half-time' | 'finished' | 'postponed' | 'cancelled';
  minute?: number;
  liveStatus?: string;
  liveDisplay?: string;
  isLive?: boolean;
  venue: string;
  tournament: {
    name: string;
    country: string;
    id?: number;
  };
  likes?: number;
  likedByUser?: boolean;
}

export default function MatchesPage() {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [sortBy, setSortBy] = useState('priority'); // Default to priority sorting
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteTeams, setFavoriteTeams] = useState<Set<number>>(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState<Set<number>>(new Set());

  // Priority order for leagues (same as today page)
  // World Cup, Euro, AFCON, CHAN, Champions League, Europa League, Premier League, La Liga, Serie A, Bundesliga, FA Cup, Community Shield,.
  const priorityOrder = [1, 4, 9, 21, 8, 2, 3, 39, 140, 135, 78, 61, 45, 528, 143, 137, 81, 848, 203, 10];
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  const [matchStats, setMatchStats] = useState<any>(null);
  const [matchEvents, setMatchEvents] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [lineups, setLineups] = useState<any[]>([]);
  const [loadingLineups, setLoadingLineups] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [lineupsView, setLineupsView] = useState<'list' | 'pitch'>('list');
  const [playerPhotos, setPlayerPhotos] = useState<Record<string, string>>({});
  const [playerRatings, setPlayerRatings] = useState<Record<string, number>>({});
  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [coachPhotos, setCoachPhotos] = useState<Record<string, string>>({});
  const [isLineupsFullscreen, setIsLineupsFullscreen] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  const parseGrid = (grid?: string) => {
    // API-Football grid is formatted as "x:y" where x=column, y=row (both 1..10)
    if (!grid || typeof grid !== 'string' || !grid.includes(':')) return null;
    const parts = grid.split(':');
    const x = Number(parts[0]); // column
    const y = Number(parts[1]); // row
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { row: y, col: x };
  };

  const clampPercent = (value: number, min = 6, max = 94) => Math.min(max, Math.max(min, value));

  const PlayerChip = ({ player, theme }: { player: any; theme: string }) => (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md backdrop-blur-sm ${theme === 'dark' ? 'bg-black/40 text-white' : 'bg-white/80 text-gray-900'} shadow-md border ${theme==='dark' ? 'border-white/10' : 'border-black/10'} whitespace-nowrap`}> 
      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-300 flex items-center justify-center shrink-0">
        {player?.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photo} alt={player.name} className="w-full h-full object-cover" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
        ) : (
          <span className="text-[9px] font-bold">{(player?.name || 'P').slice(0,2)}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className={`text-[11px] font-semibold truncate`}>{player?.name}</div>
        <div className={`text-[9px] opacity-90`}>{player?.number ?? '-'} • {player?.pos || '-'}</div>
      </div>
    </div>
  );

  const badgeClassFor = (rating?: number) => 'bg-blue-700 border-blue-400';

  const renderPitchWebStyle = (team: any, isFullscreen = false) => {
    const starters = (team?.startXI || []).map((p: any) => ({
      ...p,
      photo: playerPhotos[String(p?.id ?? '')] || p?.photo,
      rating: playerRatings[String(p?.id ?? '')]
    }));
    const substitutes = (team?.substitutes || []).map((p: any) => ({
      ...p,
      photo: playerPhotos[String(p?.id ?? '')] || p?.photo,
      rating: playerRatings[String(p?.id ?? '')]
    }));
    const getDisplayText = (p: any) => p?.number || '-';
    return (
      <div className="bg-[#0b1a10] rounded-xl p-4 relative overflow-hidden h-full flex flex-col">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{backgroundImage:'radial-gradient(circle at 50% 50%,#1f3d2a 0%, transparent 60%)'}} />
        
        {/* Header with team info and coach */}
        <div className="text-xs text-gray-300 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {team?.team?.logo && // eslint-disable-next-line @next/next/no-img-element
              <img src={team.team.logo} alt={team.team.name} className="w-5 h-5 rounded-full" />}
            <span>{team?.team?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">{team?.formation || '-'}</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 text-gray-300">
              {team?.coach && coachPhotos[String(team.coach.id || '')] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coachPhotos[String(team.coach.id || '')]} alt={team.coach.name} className="w-4 h-4 rounded-full object-cover" />
              )}
              <span>Coach: {team?.coach || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Pitch with starting XI */}
        <div className={`grid grid-rows-5 gap-6 mb-4 ${isFullscreen ? 'gap-8' : ''} flex-1`} style={{minHeight: isFullscreen ? 320 : 260}}>
          {Array.from({length:5}).map((_,row)=> (
            <div key={row} className="flex justify-around">
              {starters.filter((p:any)=> String(p?.grid||'').startsWith(String(row+1))).map((p:any, idx:number)=> (
                <div key={idx} className="flex flex-col items-center">
                  {p?.photo ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.photo} alt={p?.name} className={`${isFullscreen ? 'w-14 h-14' : 'w-10 h-10'} rounded-full object-cover border border-green-400`} onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
                      <span className={`absolute -bottom-1 -right-1 ${isFullscreen ? 'text-[12px]' : 'text-[10px]'} text-white px-1 rounded border min-w-[20px] text-center ${badgeClassFor(p?.rating)}`}>{getDisplayText(p)}</span>
                    </div>
                  ) : (
                    <div className={`${isFullscreen ? 'w-14 h-14' : 'w-10 h-10'} rounded-full text-white ${isFullscreen ? 'text-sm' : 'text-xs'} flex items-center justify-center border ${badgeClassFor(p?.rating)}`}>{getDisplayText(p)}</div>
                  )}
                  <div className={`${isFullscreen ? 'text-[12px]' : 'text-[10px]'} text-gray-200 mt-1 ${isFullscreen ? 'max-w-[100px]' : 'max-w-[80px]'} text-center truncate`}>{p?.name}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Substitutes */}
        <div className="border-t border-gray-600 pt-3">
          <div className={`${isFullscreen ? 'text-sm' : 'text-xs'} ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2 font-semibold`}>Substitutes</div>
          <div className={`grid gap-3 ${isFullscreen ? 'grid-cols-6 md:grid-cols-8' : 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6'} ${isFullscreen ? 'h-32' : 'h-36'} overflow-hidden`}>
            {substitutes.length > 0 ? (
              substitutes.map((p: any, idx: number) => (
                <div key={idx} className="flex flex-col items-center">
                  {p?.photo ? (
                    <div className="relative" title={p?.name}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.photo} alt={p?.name} className={`${isFullscreen ? 'w-10 h-10' : 'w-8 h-8'} rounded-full object-cover border border-gray-500`} onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
                      <span className={`absolute -bottom-1 -right-1 ${isFullscreen ? 'text-[10px]' : 'text-[8px]'} text-white px-1 rounded border min-w-[16px] text-center ${badgeClassFor(p?.rating)}`}>{getDisplayText(p)}</span>
                    </div>
                  ) : (
                    <div className={`${isFullscreen ? 'w-10 h-10' : 'w-8 h-8'} rounded-full text-white ${isFullscreen ? 'text-sm' : 'text-xs'} flex items-center justify-center border ${badgeClassFor(p?.rating)}`} title={p?.name}>{getDisplayText(p)}</div>
                  )}
                  <div
                    className={`${isFullscreen ? 'text-[10px] w-28' : 'text-[9px] w-24'} ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mt-1 text-center leading-tight break-words whitespace-normal max-h-8 overflow-hidden`}
                    title={p?.name}
                  >
                    {(p?.name || '').split(' ')[0]}
                  </div>
                </div>
              ))
            ) : (
              <div className={`col-span-full flex items-center justify-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} text-sm`}>
                No substitutes available
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Build formation rows for layout (GK + lines), e.g., 4-2-3-1 => [GK, 4, 2, 3, 1]
  const getFormationLines = (team: any): number[] => {
    const parts = (team?.formation || '').split('-').map((n: string) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0);
    if (parts.length) return [1, ...parts];
    // Fallback: estimate by pos groups from startXI
    const xi = team?.startXI || [];
    const g = xi.filter((p: any) => (p.pos || '').startsWith('G')).length || 1;
    const d = xi.filter((p: any) => (p.pos || '').startsWith('D')).length || 4;
    const m = xi.filter((p: any) => (p.pos || '').startsWith('M')).length || 3;
    const f = xi.filter((p: any) => (p.pos || '').startsWith('F')).length || 3;
    // Map into 3 lines: defenders, midfielders, forwards
    return [Math.max(1,g), d, m, f];
  };

  // Return absolute positions for each starter based on formation rows (no overlap)
  const layoutByFormation = (team: any): { key: string; top: number; left: number; player: any }[] => {
    const xi = (team?.startXI || []).slice(0, 11);
    const lines = getFormationLines(team); // includes GK line as first element
    // Vertical anchors from bottom (GK) to top (attack)
    const anchors = [88, 72, 56, 40, 24]; // up to 5 lines supported
    const positions: { key: string; top: number; left: number; player: any }[] = [];
    let index = 0;
    for (let lineIdx = 0; lineIdx < lines.length && index < xi.length; lineIdx++) {
      const count = lines[lineIdx];
      const top = anchors[Math.min(lineIdx, anchors.length - 1)];
      // Evenly spread horizontally from 12%..88%
      if (count <= 0) continue;
      const spanMin = 12;
      const spanMax = 88;
      const step = count === 1 ? 0 : (spanMax - spanMin) / (count - 1);
      for (let i = 0; i < count && index < xi.length; i++) {
        const left = clampPercent(spanMin + step * i);
        const p = xi[index++];
        positions.push({ key: `${p.id}-${p.number}-${lineIdx}-${i}`, top, left, player: p });
      }
    }
    // Any remaining players (if formation shorter), place them near middle lines
    while (index < xi.length) {
      const p = xi[index++];
      const top = 56 + (index % 2 === 0 ? -6 : 6);
      const left = clampPercent(30 + (index * 8) % 40);
      positions.push({ key: `${p.id}-${p.number}-r`, top, left, player: p });
    }
    return positions;
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
      setError(null);
      
      // Use the live matches endpoint
      const response = await fetch(`${API_BASE}/matches/live`);
      if (!response.ok) {
        throw new Error('Failed to fetch live matches');
      }
      const data = await response.json();
      setMatches(data);
      setLastUpdated(new Date());

      // Check favorite status for all teams if user is logged in
      if (user && token && data.length > 0) {
        const allTeamIds = new Set<number>();
        data.forEach((match: Match) => {
          if (match.homeTeam?.id) allTeamIds.add(match.homeTeam.id);
          if (match.awayTeam?.id) allTeamIds.add(match.awayTeam.id);
        });

        const favoriteStatuses = await Promise.all(
          Array.from(allTeamIds).map(async (teamId: number) => {
            const isFavorite = await checkTeamFavoriteStatus(teamId);
            return { teamId, isFavorite };
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
      
      // Show notification for background updates
      if (isBackground) {
        setShowUpdateNotification(true);
        setTimeout(() => setShowUpdateNotification(false), 3000);
      }
    } catch (err) {
      if (!isBackground) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  const fetchMatchDetails = async (matchId: string) => {
    // Only fetch basic match data on modal open
    // Other data will be fetched when specific tabs are clicked
  };

  const fetchTabData = async (tab: string, matchId: string) => {
    // Check if this tab has already been loaded for this match
    const tabKey = `${tab}-${matchId}`;
    if (loadedTabs.has(tabKey)) {
      return; // Already loaded, don't fetch again
    }

    try {
      switch (tab) {
        case 'details':
          setLoadingDetails(true);
          const eventsResponse = await fetch(`${API_BASE}/api/football/events/${matchId}`);
          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json();
            setMatchEvents(eventsData);
          }
          break;
          
        case 'statistics':
          setLoadingStats(true);
      const statsResponse = await fetch(`${API_BASE}/api/football/statistics/${matchId}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setMatchStats(statsData);
      }
          break;
          
        case 'lineups':
          setLoadingLineups(true);
          const lineupsResponse = await fetch(`${API_BASE}/api/football/lineups/${matchId}`);
          if (lineupsResponse.ok) {
            const lineupsData = await lineupsResponse.json();
            setLineups(lineupsData);
          } else {
            setLineups([]);
          }
          break;
          
        case 'table':
          if (selectedMatch?.tournament?.id) {
            setLoadingTable(true);
            await fetchTableData(selectedMatch.tournament.id, new Date().getFullYear());
          }
          break;
          
        case 'insights':
          setLoadingInsights(true);
          const insightsResponse = await fetch(`${API_BASE}/api/insights/match/${matchId}`);
          if (insightsResponse.ok) {
            const insightsData = await insightsResponse.json();
            setInsights(insightsData);
          } else {
            setInsights(null);
          }
          break;
      }
      
      // Mark this tab as loaded for this match
      setLoadedTabs(prev => new Set([...prev, tabKey]));
    } catch (err) {
      console.error(`Error fetching ${tab} data:`, err);
    } finally {
      setLoadingStats(false);
      setLoadingLineups(false);
      setLoadingTable(false);
      setLoadingDetails(false);
      setLoadingInsights(false);
    }
  };

  const fetchTableData = async (tournamentId: number, season: number) => {
    try {
      setLoadingTable(true);
      console.log(`🔍 Fetching table data for tournament: ${tournamentId}, season: ${season}`);
      
      const response = await fetch(`${API_BASE}/api/football/standings/${tournamentId}/${season}`);
      
      if (!response.ok) {
        console.log(`⚠️ Current season failed, trying previous year: ${season - 1}`);
        // Try previous year if current season fails
        if (season === new Date().getFullYear()) {
          const prevResponse = await fetch(`${API_BASE}/api/football/standings/${tournamentId}/${season - 1}`);
          if (prevResponse.ok) {
            const data = await prevResponse.json();
            console.log(`✅ Retrieved table data from previous year:`, data);
            setTableData(data);
            return;
          }
        }
        throw new Error(`Failed to fetch table data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved table data:`, data);
      setTableData(data);
    } catch (err) {
      console.error('❌ Error fetching table data:', err);
      setTableData([]);
    } finally {
      setLoadingTable(false);
    }
  };

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
    setShowMatchDetails(true);
    setActiveTab('details'); // Set to details tab by default
    fetchMatchDetails(match._id);
    // Clear loaded tabs for new match
    setLoadedTabs(new Set());
    // Reset insights data for new match
    setInsights(null);
    setShowAllPlayers(false);
    // Automatically fetch details data
    fetchTabData('details', match._id);
  };

  // Swipe gesture handlers for mobile tab navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe || isRightSwipe) {
      const tabs = ['details', 'lineups', 'statistics', 'table', 'insights'];
      const currentIndex = tabs.indexOf(activeTab);
      
      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      } else if (isRightSwipe && currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1]);
      }
    }
  };

  // Auto-refresh live matches every 30 seconds (background updates)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMatches(true); // Background update
    }, 15000); // 15 seconds for live matches

    return () => clearInterval(interval);
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteTeams');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  const toggleFavorite = async (team: any, tournament: any) => {
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
          team.logo || '',
          tournament?.name || 'Unknown League',
          tournament?.id || 0,
          token
        );
        setFavoriteTeams(prev => new Set(prev).add(teamId));
      }
    } catch (error) {
      console.error('❌ Error toggling team favorite:', error);
      setError(`Failed to update favorites: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFavoriteLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(teamId);
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
      console.error('❌ Error checking team favorite status:', error);
      return false;
    }
  };

  // Get unique leagues from matches
  const leagues = ['all', ...Array.from(new Set(matches.map(match => match.tournament?.name).filter(Boolean)))];
  
  const filteredMatches = matches.filter(match => {
    // Filter by search query
    const searchMatch = searchQuery === '' || 
      match.homeTeam?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.awayTeam?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.tournament?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by league
    const leagueMatch = selectedLeague === 'all' || match.tournament?.name === selectedLeague;

    // Filter by favorites
    const favoriteMatch = !showFavoritesOnly || 
      favorites.includes(match.homeTeam?.name) || 
      favorites.includes(match.awayTeam?.name);

    return searchMatch && leagueMatch && favoriteMatch;
  }).sort((a, b) => {
    // Sort matches
    switch (sortBy) {
      case 'priority':
        // Priority sorting (same logic as today page)
        const aPrio = priorityOrder.indexOf(a.tournament?.id || 0);
        const bPrio = priorityOrder.indexOf(b.tournament?.id || 0);
        
        if (aPrio !== -1 && bPrio !== -1) return aPrio - bPrio; // Both are important
        if (aPrio !== -1) return -1; // a is important, b is not
        if (bPrio !== -1) return 1; // b is important, a is not
        
        // If neither is in priority list, sort alphabetically by league
        return (a.tournament?.name || '').localeCompare(b.tournament?.name || '');
      case 'time':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'league':
        return (a.tournament?.name || '').localeCompare(b.tournament?.name || '');
      case 'favorites':
        const aHasFavorites = favorites.includes(a.homeTeam?.name) || favorites.includes(a.awayTeam?.name);
        const bHasFavorites = favorites.includes(b.homeTeam?.name) || favorites.includes(b.awayTeam?.name);
        if (aHasFavorites && !bHasFavorites) return -1;
        if (!aHasFavorites && bHasFavorites) return 1;
        return 0;
      default:
        return 0;
    }
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format score display - show - only for matches that haven't started yet
  const formatScore = (score: number, status: string) => {
    // Show "-" only if match hasn't started (scheduled status) and score is 0
    if (status === 'scheduled' || status === 'notstarted' || status === 'ns') {
      return '-';
    }
    // For live or finished matches, show actual score (including 0 if that's the real score)
    return score.toString();
  };

  // Helper function to get last 5 match results
  const getLastFiveResults = (team: any): string[] => {
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
  };

  const getStatusBadge = (match: Match) => {
    // Use new live indicators if available
    if (match.isLive && match.liveDisplay) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-red-600 text-white flex items-center gap-1 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span>{match.liveDisplay}</span>
        </span>
      );
    }
    
    switch (match.status) {
      case 'live':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-red-600 text-white flex items-center gap-1 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>{match.minute || 0}'</span>
          </span>
        );
      case 'half-time':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-orange-600 text-white flex items-center gap-1">
            <span>⏸️</span>
            <span>HT</span>
          </span>
        );
      case 'finished':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-green-600 text-white flex items-center gap-1">
            <span>🏁</span>
            <span>FT</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-gray-600 text-white flex items-center gap-1">
            <span>⏰</span>
            <span></span>
          </span>
        );
    }
  };

  // Theme-based styling (matching home page)
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';
  const textSubtle = isDark ? 'text-slate-400' : 'text-gray-500';

  if (loading) {
    return (
      <>
        <style jsx global>{`
          .match-card:hover {
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
          
          .match-card-gradient {
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
        `}</style>
        
        <div className={`min-h-screen ${bgColor} relative`}>
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20 dark:from-blue-900/10 dark:via-transparent dark:to-purple-900/10 pointer-events-none"></div>
          
        <Header />
          <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        </main>
      </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style jsx global>{`
          .match-card:hover {
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
          
          .match-card-gradient {
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
        `}</style>
        
        <div className={`min-h-screen ${bgColor} relative`}>
          {/* Background gradient overlay */}
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
                <h3 className={`text-xl font-heading font-semibold mb-2 ${textColor}`}>Error loading matches</h3>
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
        .match-card:hover {
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
        
        .match-card-gradient {
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
      `}</style>
      
      <div className={`min-h-screen ${bgColor} relative`}>
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20 dark:from-blue-900/10 dark:via-transparent dark:to-purple-900/10 pointer-events-none"></div>

      <Header />

      {/* Update Notification */}
      {showUpdateNotification && (
        <div className="fixed top-20 right-4 z-50 bg-green-600/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Updated
        </div>
      )}

      {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className={`text-3xl md:text-4xl font-display font-bold sport-text-gradient`}>Live Matches</h1>
            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 text-sm font-medium">LIVE</span>
            </div>
          </div>
          <p className={`text-sm ${textMuted}`}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          {lastUpdated && (
            <p className={`${textSubtle} text-xs mt-1`}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Advanced Controls */}
          <div className={`${cardBg} backdrop-blur-sm p-4 rounded-xl mb-6 space-y-4 border ${isDark ? 'border-slate-700' : 'border-gray-200'} glass-morphism border border-white/10`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Search Bar */}
            <div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search teams or leagues..."
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

            {/* League Dropdown */}
            <div>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                  className={`w-full px-4 py-3 ${isDark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-white/50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-12`}
              >
                {leagues.map((league) => (
                  <option key={league} value={league}>
                    {league === 'all' ? 'All Leagues' : league}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>





        {/* Matches Grid */}
          <div className="max-w-7xl mx-auto">
          {filteredMatches.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
              </div>
                  <h3 className={`text-xl font-heading font-semibold mb-2 ${textColor}`}>
                    No matches found
                  </h3>
                  <p className={`text-sm ${textMuted}`}>
                  </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMatches.map((match) => (
                <div
                  key={match._id}
                  onClick={() => handleMatchClick(match)}
                    className={`rounded-xl p-4 border border-l-4 border-l-blue-500 hover:scale-[1.02] transition-all duration-300 cursor-pointer match-card glass-morphism border border-white/10 ${
                      isDark 
                        ? 'bg-slate-800 shadow-[4px_4px_8px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_12px_0px_rgba(0,0,0,0.4)]' 
                      : 'bg-white shadow-[4px_4px_8px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_12px_0px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  {/* Match Header */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${textColor}`}>
                        {match.isLive && match.liveDisplay ? match.liveDisplay : formatTime(match.date)}
                      </span>
                      {getStatusBadge(match)}
                    </div>
                      <div className={`text-xs ${textSubtle}`}>
                      {formatDate(match.date)}
                    </div>
                  </div>

                  {/* Tournament Info */}
                  <div className="mb-4">
                      <div className={`text-blue-400 font-medium text-xs ${isDark ? '' : 'text-blue-600'}`}>
                      {match.tournament?.name || 'Unknown Tournament'}
                    </div>
                      <div className={`text-xs ${textMuted}`}>
                      {match.tournament?.country || 'Unknown Country'}
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="space-y-3 mb-4">
                    {/* Home Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 relative">
                          <Image
                            src={match.homeTeam.logo}
                            alt={`${match.homeTeam?.name || 'Home Team'} logo`}
                            fill
                            className="object-contain rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-yellow-500 flex items-center justify-center text-white text-xs font-bold">${(match.homeTeam?.name || 'H').charAt(0)}</div>`;
                              }
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm ${textColor}`}>
                            {match.homeTeam?.name || 'Home Team'}
                          </span>
                          {user && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(match.homeTeam, match.tournament);
                              }}
                              disabled={favoriteLoading.has(match.homeTeam?.id)}
                              className={`transition-colors duration-200 ${
                                favoriteTeams.has(match.homeTeam?.id)
                                  ? 'text-red-500 hover:text-red-600'
                                  : 'text-gray-400 hover:text-red-500'
                              }`}
                              title={favoriteTeams.has(match.homeTeam?.id) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              {favoriteLoading.has(match.homeTeam?.id) ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <svg 
                                  width="16" 
                                  height="16" 
                                  viewBox="0 0 24 24" 
                                  fill={favoriteTeams.has(match.homeTeam?.id) ? "currentColor" : "none"} 
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
                        <span className={`font-bold text-lg ${textColor}`}>
                        {formatScore(match.scoreA, match.status)}
                      </span>
                    </div>

                    {/* VS Separator */}
                    <div className="flex justify-center">
                        <div className={`w-8 h-px ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 relative">
                          <Image
                            src={match.awayTeam.logo}
                            alt={`${match.awayTeam?.name || 'Away Team'} logo`}
                            fill
                            className="object-contain rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">${(match.awayTeam?.name || 'A').charAt(0)}</div>`;
                              }
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm ${textColor}`}>
                            {match.awayTeam?.name || 'Away Team'}
                          </span>
                          {user && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(match.awayTeam, match.tournament);
                              }}
                              disabled={favoriteLoading.has(match.awayTeam?.id)}
                              className={`transition-colors duration-200 ${
                                favoriteTeams.has(match.awayTeam?.id)
                                  ? 'text-red-500 hover:text-red-600'
                                  : 'text-gray-400 hover:text-red-500'
                              }`}
                              title={favoriteTeams.has(match.awayTeam?.id) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              {favoriteLoading.has(match.awayTeam?.id) ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <svg 
                                  width="16" 
                                  height="16" 
                                  viewBox="0 0 24 24" 
                                  fill={favoriteTeams.has(match.awayTeam?.id) ? "currentColor" : "none"} 
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
                        <span className={`font-bold text-lg ${textColor}`}>
                        {formatScore(match.scoreB, match.status)}
                      </span>
                    </div>
                  </div>

                  {/* Venue */}
                    <div className={`flex items-center justify-between text-xs ${textColor}`}>
                      <span className={`truncate ${textMuted}`}>
                      {match.venue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Match Details Modal */}
      {showMatchDetails && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMatchDetails(false)} />
          <div className={`relative w-full h-full ${isLineupsFullscreen ? 'max-w-none max-h-none' : 'sm:max-w-4xl sm:w-full sm:max-h-[95vh] sm:rounded-lg'} border ${
              isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
            } shadow-xl overflow-hidden glass-morphism border border-white/10`}>
            {/* Match Info Header */}
            <div className={`px-4 py-3 ${isDark ? 'bg-slate-800/90' : 'bg-gray-100/90'} border-b ${isDark ? 'border-slate-600' : 'border-gray-300'} flex justify-between items-center glass-morphism backdrop-blur-sm`}>
              <div className={`text-sm font-medium ${textMuted}`}>
                {selectedMatch.tournament.name} • {selectedMatch.tournament.country} • Venue: {selectedMatch.venue}
              </div>
              <div className="flex items-center gap-2">
                {/* Close Button - Top Right */}
                <button
                  onClick={() => setShowMatchDetails(false)}
                  className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Header */}
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">

              {/* Mobile Layout */}
              <div className="block sm:hidden">
                {/* Teams and Score - Mobile Stack */}
                <div className="space-y-4">
                  {/* Home Team */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Image
                        src={selectedMatch.homeTeam.logo}
                        alt={selectedMatch.homeTeam.name}
                        width={40}
                        height={40}
                        className="w-10 h-10"
                      />
                      <div>
                        <span className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                          {selectedMatch.homeTeam.name}
                        </span>
                        {/* Home Team Goal Scorers */}
                        {matchEvents && matchEvents.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {matchEvents
                              .filter(event => event.type === 'Goal' && event.team === selectedMatch.homeTeam.name)
                              .slice(0, 1) // Show only 1 goal on mobile
                              .map((goal, index) => (
                                <div key={index} className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
                                  {goal.player} ({goal.time}')
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`font-bold text-2xl ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {selectedMatch.scoreA}
                    </span>
                  </div>

                  {/* Middle Section with LIVE indicator and time */}
                  <div className="flex justify-center items-center">
                    <div className="flex flex-col items-center gap-2">
                      {/* VS Separator */}
                      <div className={`w-16 h-px ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                      {/* LIVE Indicator with Time - Pill Shape */}
                      {selectedMatch.isLive && (
                        <div className="flex items-center gap-2 bg-red-800 px-3 py-1.5 rounded-full">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-white text-sm font-medium">
                            {selectedMatch.liveDisplay || `${selectedMatch.minute || 0}'`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Image
                        src={selectedMatch.awayTeam.logo}
                        alt={selectedMatch.awayTeam.name}
                        width={40}
                        height={40}
                        className="w-10 h-10"
                      />
                      <div>
                        <span className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                          {selectedMatch.awayTeam.name}
                        </span>
                        {/* Away Team Goal Scorers */}
                        {matchEvents && matchEvents.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {matchEvents
                              .filter(event => event.type === 'Goal' && event.team === selectedMatch.awayTeam.name)
                              .slice(0, 1) // Show only 1 goal on mobile
                              .map((goal, index) => (
                                <div key={index} className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
                                  {goal.player} ({goal.time}')
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`font-bold text-2xl ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {selectedMatch.scoreB}
                    </span>
                  </div>
                </div>

              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:block">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center justify-between w-full">
                  {/* Home Team */}
                  <div className="flex items-center gap-3">
                    <Image
                      src={selectedMatch.homeTeam.logo}
                      alt={selectedMatch.homeTeam.name}
                      width={48}
                      height={48}
                      className="w-12 h-12"
                    />
                    <div>
                      <span className={`font-bold text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        {selectedMatch.homeTeam.name}
                      </span>
                      {/* Home Team Goal Scorers */}
                      {matchEvents && matchEvents.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {matchEvents
                            .filter(event => event.type === 'Goal' && event.team === selectedMatch.homeTeam.name)
                            .slice(0, 2) // Show max 2 goals per team
                            .map((goal, index) => (
                              <div key={index} className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
                                {goal.player} ({goal.time}')
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Score and Live Indicator */}
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {selectedMatch.scoreA} - {selectedMatch.scoreB}
                    </div>
                    {selectedMatch.isLive && (
                      <div className="flex items-center justify-center mt-2">
                        <div className="flex items-center gap-2 bg-red-800 px-3 py-1.5 rounded-full">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-white text-sm font-medium">
                            {selectedMatch.liveDisplay || `${selectedMatch.minute || 0}'`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Away Team */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`font-bold text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        {selectedMatch.awayTeam.name}
                      </span>
                      {/* Away Team Goal Scorers */}
                      {matchEvents && matchEvents.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {matchEvents
                            .filter(event => event.type === 'Goal' && event.team === selectedMatch.awayTeam.name)
                            .slice(0, 2) // Show max 2 goals per team
                            .map((goal, index) => (
                              <div key={index} className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
                                {goal.player} ({goal.time}')
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <Image
                      src={selectedMatch.awayTeam.logo}
                      alt={selectedMatch.awayTeam.name}
                      width={48}
                      height={48}
                      className="w-12 h-12"
                    />
                  </div>
                </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between px-3 sm:px-6">
                <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto">
                {[
                  { id: 'details', label: 'Details' },
                  { id: 'lineups', label: 'Lineups' },
                  { id: 'statistics', label: 'Statistics' },
                  { id: 'table', label: 'Table' },
                  { id: 'insights', label: 'Insights' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={(e) => {
                      setActiveTab(tab.id); // activate immediately
                      // bring the clicked tab into view (mobile overflow-x)
                      try { (e.currentTarget as HTMLButtonElement).scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch {}
                      if (selectedMatch) {
                        // show loader instantly on first load of a tab
                        const tabKey = `${tab.id}-${selectedMatch._id}`;
                        if (!loadedTabs.has(tabKey)) {
                          if (tab.id === 'lineups') setLoadingLineups(true);
                          if (tab.id === 'statistics') setLoadingStats(true);
                          if (tab.id === 'table') setLoadingTable(true);
                          if (tab.id === 'details') setLoadingDetails(true);
                        }
                        fetchTabData(tab.id, selectedMatch._id); // fetch in background
                      }
                    }}
                    className={`py-3 sm:py-4 px-3 sm:px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap min-w-fit ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-500'
                        : theme === 'dark'
                        ? 'border-transparent text-gray-300'
                        : 'border-transparent text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
                <button
                  onClick={() => setIsLineupsFullscreen(!isLineupsFullscreen)}
                  className={`hidden sm:inline-flex ml-2 my-1 px-4 py-2 text-sm rounded-lg items-center gap-2 font-medium transition-all duration-300 glass-morphism border border-white/10 ${
                    isLineupsFullscreen
                      ? 'bg-red-600/80 text-white hover:bg-red-700/80 hover:scale-105'
                      : 'bg-blue-600/80 text-white hover:bg-blue-700/80 hover:scale-105'
                  }`}
                >
                  {isLineupsFullscreen ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Exit Fullscreen
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      Fullscreen
                    </>
                  )}
                </button>
              </div>
              {/* Swipe indicator for mobile */}
              <div className="sm:hidden text-center py-2">
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Swipe left/right to navigate tabs
                </span>
              </div>
            </div>

            {/* Modal Content */}
            <div 
              className="p-3 pb-32 max-h-[75vh] sm:max-h-[75vh] h-[calc(100vh-200px)] sm:h-auto overflow-y-auto"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="space-y-4 sm:space-y-6">
                {/* Details Tab - Match Events */}
                {activeTab === 'details' && (
                  <div className={`p-3 sm:p-3 pb-8 rounded-lg glass-morphism border border-white/10 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className={`text-lg font-semibold font-heading sport-text-gradient`}>
                      Match Events
                    </h3>
                    </div>
                    {loadingDetails ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    ) : matchEvents && matchEvents.length > 0 ? (
                        <div className="space-y-2 pb-12">
                          {matchEvents.map((event, index) => (
                            <div key={index} className={`flex items-center gap-3 p-3 text-sm glass-morphism ${isDark ? 'bg-slate-800/50' : 'bg-white/50'} hover:${isDark ? 'bg-slate-700/50' : 'bg-gray-100/50'} transition-colors rounded-lg`}>
                              <div className={`w-12 ${textMuted}`}>
                                  {event.time}'
                                  </div>
                              <div className="w-5 flex justify-center">
                                {(() => {
                                  if (event.type === 'Goal') {
                                    return <span className="text-base">⚽</span>;
                                  }
                                  if (event.type === 'Card' && event.detail?.includes('Yellow')) {
                                    return (
                                      <span className="inline-block w-3 h-4 rounded-[2px] border border-yellow-700" style={{ background: '#FFD400' }} />
                                    );
                                  }
                                  if (event.type === 'Card' && event.detail?.includes('Red')) {
                                    return (
                                      <span className="inline-block w-3 h-4 rounded-[2px] border border-red-800" style={{ background: '#e11d48' }} />
                                    );
                                  }
                                  if (event.type?.toLowerCase() === 'subst' || event.type === 'subst') {
                                    return (
                                      <div className="flex flex-col items-center">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                          <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <path d="M7 7h10M7 7l2-2M7 7l2 2" />
                                            <path d="M17 17H7M17 17l-2 2M17 17l-2-2" />
                                    </svg>
                                  </div>
                                  </div>
                                    );
                                  }
                                  return <span className="text-gray-500">•</span>;
                                })()}
                              </div>
                              <div className="flex-1">
                                <span className={`${textMuted} mr-2`}>{event.team}</span>
                                <span className={`font-medium ${textColor}`}>{event.player || 'Unknown'}</span>
                                {event.assist ? <span className={`${textMuted}`}> (assist {event.assist})</span> : null}
                                {event.detail ? <span className={`${textMuted}`}> — {event.detail}</span> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className={`${textMuted}`}>
                            No events available yet
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                {/* Lineups Tab */}
                {activeTab === 'lineups' && (
                  <div className={`p-3 sm:p-3 pb-8 rounded-lg glass-morphism border border-white/10 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className="mb-4">
                      <h3 className={`text-lg font-semibold font-heading sport-text-gradient`}>Lineups</h3>
                    </div>
                    {loadingLineups ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    ) : lineups && lineups.length > 0 ? (
                        <div className={`grid gap-6 ${isLineupsFullscreen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} items-stretch`}>
                          {lineups.map((team: any, idx: number) => (
                            <div key={idx} className="w-full h-full">
                              {renderPitchWebStyle(team, isLineupsFullscreen)}
                            </div>
                          ))}
                        </div>
                      ) : (
                      <div className="text-center py-8">
                          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Lineups not available yet.</p>
                      </div>
                      )}
                    </div>
                  )}

                {/* Statistics Tab */}
                {activeTab === 'statistics' && (
                  <div className={`p-4 sm:p-3 pb-8 rounded-lg glass-morphism border border-white/10 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className={`text-lg font-semibold font-heading sport-text-gradient`}>
                      Statistics
                    </h3>
                    </div>
                    {loadingStats ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    ) : matchStats && Object.keys(matchStats).length > 0 ? (
                        <div className="space-y-4">
                          {/* Team Headers */}
                          <div className={`${isDark ? 'bg-slate-800/90 border-b-2 border-slate-600' : 'bg-gray-100/90 border-b-2 border-gray-300'} glass-morphism backdrop-blur-sm shadow-lg rounded-lg p-4 mb-4`}>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                              <Image
                                src={selectedMatch.homeTeam.logo}
                                alt={selectedMatch.homeTeam.name}
                                  width={32}
                                  height={32}
                                  className="w-8 h-8"
                                />
                                <span className={`font-bold font-heading text-sm sm:text-base ${textColor}`}>
                                {selectedMatch.homeTeam.name}
                              </span>
                            </div>
                              <div className="flex items-center gap-3">
                                <span className={`font-bold font-heading text-sm sm:text-base ${textColor}`}>
                                  {selectedMatch.awayTeam.name}
                                </span>
                              <Image
                                src={selectedMatch.awayTeam.logo}
                                alt={selectedMatch.awayTeam.name}
                                  width={32}
                                  height={32}
                                  className="w-8 h-8"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Statistics */}
                          {Object.entries(matchStats).map(([key, value]: [string, any]) => {
                            const homeValue = parseInt(value.home) || 0;
                            const awayValue = parseInt(value.away) || 0;
                            const total = homeValue + awayValue;
                            const homePercentage = total > 0 ? (homeValue / total) * 100 : 50;
                            const awayPercentage = total > 0 ? (awayValue / total) * 100 : 50;

                            return (
                              <div key={key} className={`${isDark ? 'bg-slate-900/50' : 'bg-gray-50/50'} glass-morphism rounded-lg p-4 hover:${isDark ? 'bg-slate-700/50' : 'bg-gray-100/50'} transition-colors`}>
                                <div className="flex justify-between items-center mb-3">
                                  <span className={`text-sm font-bold font-heading uppercase tracking-wide ${textColor}`}>
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex-1 text-right">
                                    <span className={`text-lg font-bold ${textColor}`}>
                                      {homeValue}
                                    </span>
                                  </div>
                                  <div className="flex-1 relative">
                                    <div className={`h-4 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'} shadow-inner`}>
                                      <div 
                                        className="h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-l-full shadow-sm" 
                                        style={{ width: `${homePercentage}%` }}
                                      ></div>
                                      <div 
                                        className="h-4 bg-gradient-to-r from-red-500 to-red-600 rounded-r-full shadow-sm -mt-4" 
                                        style={{ width: `${awayPercentage}%`, marginLeft: `${homePercentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <div className="flex-1 text-left">
                                    <span className={`text-lg font-bold ${textColor}`}>
                                      {awayValue}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Statistics not available
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                {/* Table Tab - League Table */}
                {activeTab === 'table' && (
                  <div className={`p-3 sm:p-3 pb-8 rounded-lg glass-morphism border border-white/10 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <h3 className={`text-lg font-semibold mb-3 sm:mb-4 font-heading sport-text-gradient`}>
                      League Table
                    </h3>
                    {loadingTable ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : tableData && tableData.length > 0 ? (
                        <div className="overflow-x-auto -mx-3 sm:mx-0 pb-4">
                          <table className="w-full text-xs sm:text-sm min-w-[600px]">
                            <thead>
                              <tr className={`${isDark ? 'bg-slate-700/70 border-b border-slate-600' : 'bg-gray-200/70 border-b border-gray-300'} glass-morphism`}>
                                <th className={`text-left py-2 px-2 sm:py-3 sm:px-4 font-semibold font-heading ${textColor}`}>Club</th>
                                <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold font-heading ${textColor}`}>MP</th>
                                <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold font-heading ${textColor}`}>W</th>
                                <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold font-heading ${textColor}`}>D</th>
                                <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold font-heading ${textColor}`}>L</th>
                                <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold font-heading ${textColor}`}>GF</th>
                                <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold font-heading ${textColor}`}>GA</th>
                                <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold font-heading ${textColor}`}>GD</th>
                                <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold font-heading ${textColor}`}>Pts</th>
                                <th className={`text-center py-2 px-1 sm:py-3 sm:px-2 font-semibold font-heading ${textColor}`}>Last 5</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tableData.map((team: any, index: number) => {
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
                                    className={`${index % 2 === 0 ? (isDark ? 'bg-slate-900/50' : 'bg-gray-50/50') : (isDark ? 'bg-slate-800/50' : 'bg-white/50')} ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-100/50'} transition-colors ${barColor} glass-morphism`}
                                  >
                                    <td className="py-3 px-2 sm:py-4 sm:px-4">
                                      <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="flex items-center gap-1 sm:gap-2">
                                          <span className={`text-sm sm:text-lg font-bold w-5 sm:w-6 text-center ${textColor}`}>
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
                                        <span className={`font-semibold truncate max-w-[120px] sm:max-w-none ${textColor}`} title={team.team?.name || 'Unknown Team'}>
                                          {team.team?.name || 'Unknown Team'}
                            </span>
                          </div>
                                    </td>
                                    <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${textColor}`}>
                                      {team.all?.played || 0}
                                    </td>
                                    <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${textColor}`}>
                                      {team.all?.win || 0}
                                    </td>
                                    <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${textColor}`}>
                                      {team.all?.draw || 0}
                                    </td>
                                    <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${textColor}`}>
                                      {team.all?.lose || 0}
                                    </td>
                                    <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${textColor}`}>
                                      {team.all?.goals?.for || 0}
                                    </td>
                                    <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${textColor}`}>
                                      {team.all?.goals?.against || 0}
                                    </td>
                                    <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-medium ${textColor}`}>
                                      {team.goalsDiff > 0 ? '+' : ''}{team.goalsDiff || 0}
                                    </td>
                                    <td className={`py-3 px-1 sm:py-4 sm:px-2 text-center font-bold text-base sm:text-lg ${textColor}`}>
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
                        <div className="text-center py-8">
                          <div className="mb-4">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M12 6v6l4 2"/>
                            </svg>
                      </div>
                          <p className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            No table data available
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                            {!selectedMatch?.tournament?.id 
                              ? 'This tournament does not support league tables.' 
                              : 'This league may not have current season data.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                {/* Insights Tab - AI Analysis */}
                {activeTab === 'insights' && (
                  <div className={`p-3 sm:p-3 pb-8 rounded-lg glass-morphism border border-white/10 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className={`text-lg font-semibold font-heading sport-text-gradient`}>
                        🧠 AI Match Analysis
                      </h3>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Powered by Advanced Football Analyzer
                      </div>
                    </div>
                    {loadingInsights ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className={`ml-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Analyzing match data...
                        </span>
                      </div>
                    ) : insights && insights.success ? (
                      <div className="space-y-6">
                        {/* Match Info - Enhanced */}
                        <div className={`p-5 rounded-xl ${isDark ? 'bg-gradient-to-br from-slate-800/90 to-slate-700/90' : 'bg-gradient-to-br from-white/95 to-gray-50/95'} glass-morphism border border-white/30 shadow-lg`}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h2 className={`text-xl font-bold ${textColor} mb-1`}>{insights.matchInfo.teams}</h2>
                              <div className={`text-sm ${textMuted}`}>
                                {insights.matchInfo.tournament} • {insights.matchInfo.venue}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-3xl font-black ${textColor}`}>{insights.matchInfo.score}</div>
                            </div>
                          </div>
                          
                          <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-slate-900/40' : 'bg-gray-100/60'} border border-white/20`}>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${insights.dataQuality.includes('عالية') ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                <span className={`text-sm font-medium ${textColor}`}>
                                  Data quality: {insights.dataQuality}
                                </span>
                              </div>
                              <div className={`w-px h-4 ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`}></div>
                              <span className={`text-sm font-medium ${textColor}`}>
                                Processing time: {insights.processingTime}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* MVP Section */}
                        {insights.analysis.insights && insights.analysis.insights.length > 0 && (
                          <div className={`p-4 rounded-lg ${isDark ? 'bg-gradient-to-r from-yellow-900/30 to-yellow-800/30' : 'bg-gradient-to-r from-yellow-100/50 to-yellow-200/50'} glass-morphism border border-yellow-500/20`}>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-2xl">👑</span>
                              <span className={`font-bold text-lg ${textColor}`}>Match MVP</span>
                              <div className={`ml-auto px-2 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-yellow-800/50 text-yellow-200' : 'bg-yellow-200/50 text-yellow-800'}`}>
                                Outstanding Performance
                              </div>
                            </div>
                            {typeof insights.analysis.insights[0] === 'object' ? (
                              <div className="flex items-center gap-4">
                                {insights.analysis.insights[0].player?.photo && (
                                  <img 
                                    src={insights.analysis.insights[0].player.photo} 
                                    alt={insights.analysis.insights[0].player.name}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-yellow-500"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                )}
                                <div>
                                  <div className={`text-base font-medium ${textColor} leading-relaxed`}>
                                    {insights.analysis.insights[0].text}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className={`text-base font-medium ${textColor} leading-relaxed`}>
                                {insights.analysis.insights[0]}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Top Performers */}
                        {insights.analysis.best11 && insights.analysis.best11.length > 0 && (
                          <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-100/50'} glass-morphism`}>
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-xl">🏆</span>
                              <span className={`font-bold text-lg ${textColor}`}>Top Performers</span>
                              <div className={`ml-auto px-2 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-blue-800/50 text-blue-200' : 'bg-blue-200/50 text-blue-800'}`}>
                                {insights.analysis.best11.length} Players
                              </div>
                            </div>
                            <div className="space-y-3">
                              {(showAllPlayers ? insights.analysis.best11 : insights.analysis.best11.slice(0, 5)).map((player: any, index: number) => {
                                let perfColor = '';
                                let perfLevel = '';
                                if (player.perf >= 100) {
                                  perfColor = 'text-green-500';
                                  perfLevel = 'Excellent';
                                } else if (player.perf >= 80) {
                                  perfColor = 'text-blue-500';
                                  perfLevel = 'Very Good';
                                } else if (player.perf >= 60) {
                                  perfColor = 'text-yellow-500';
                                  perfLevel = 'Good';
                                } else {
                                  perfColor = 'text-gray-500';
                                  perfLevel = 'Average';
                                }

                                return (
                                  <div key={index} className={`p-4 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-white/50'} glass-morphism hover:${isDark ? 'bg-slate-700/50' : 'bg-gray-100/50'} transition-all duration-200 border-l-4 ${index < 3 ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index < 3 ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white'}`}>
                                          {index + 1}
                                        </div>
                                        {player.photo && (
                                          <img 
                                            src={player.photo} 
                                            alt={player.name}
                                            className="w-10 h-10 rounded-full object-cover border border-gray-600"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                            }}
                                          />
                                        )}
                                        <div>
                                          <div className={`font-semibold text-base ${textColor}`}>{player.name}</div>
                                          <div className={`text-sm ${textMuted} flex items-center gap-1`}>
                                            {player.role}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className={`text-lg font-bold ${perfColor}`}>{player.perf}</div>
                                        <div className={`text-xs ${textMuted}`}>{perfLevel}</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              {insights.analysis.best11.length > 5 && (
                                <div className="text-center pt-6">
                                  <button 
                                    onClick={() => setShowAllPlayers(!showAllPlayers)}
                                    className={`group relative px-8 py-4 rounded-xl glass-morphism border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${isDark ? 'bg-slate-800/60 hover:bg-slate-700/60' : 'bg-white/60 hover:bg-gray-50/60'} backdrop-blur-md`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <svg className={`w-5 h-5 transition-transform duration-300 text-blue-500 ${showAllPlayers ? 'rotate-180' : 'group-hover:rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showAllPlayers ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                      </svg>
                                      <span className={`font-semibold text-sm ${textColor}`}>
                                        {showAllPlayers ? 'Show Less' : `Show ${insights.analysis.best11.length - 5} More Players`}
                                      </span>
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-blue-600/30 border border-blue-500/50' : 'bg-blue-500/30 border border-blue-400/50'} backdrop-blur-sm`}>
                                        <span className="text-blue-600">{showAllPlayers ? '−' : insights.analysis.best11.length - 5}</span>
                                      </div>
                                    </div>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Performance Analysis - Enhanced */}
                        {insights.analysis.best11 && insights.analysis.best11.length > 0 && (
                          <div className={`p-6 rounded-xl ${isDark ? 'bg-gradient-to-br from-slate-800/90 to-slate-700/90' : 'bg-gradient-to-br from-white/95 to-gray-50/95'} glass-morphism border border-white/30 shadow-lg`}>
                            <div className="flex items-center gap-3 mb-6">
                              <div className={`p-2 rounded-full ${isDark ? 'bg-blue-600/30' : 'bg-blue-200/50'} border border-blue-500/50`}>
                                <span className="text-xl">📈</span>
                              </div>
                              <div>
                                <h3 className={`font-bold text-xl ${textColor}`}>Performance Analysis</h3>
                                <div className={`text-sm ${textMuted}`}>Match Statistics Overview</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className={`p-4 rounded-xl ${isDark ? 'bg-gradient-to-br from-slate-900/60 to-slate-800/60' : 'bg-gradient-to-br from-white/80 to-gray-50/80'} glass-morphism border border-white/20 shadow-md hover:shadow-lg transition-all duration-300`}>
                                <div className={`text-xs ${textMuted} mb-2 font-medium`}>Average Performance</div>
                                <div className={`text-2xl font-black text-blue-500 mb-1`}>
                                  {(insights.analysis.best11.reduce((sum: number, player: any) => sum + player.perf, 0) / insights.analysis.best11.length).toFixed(1)}
                                </div>
                                <div className={`text-xs ${textMuted}`}>Team Average</div>
                              </div>
                              <div className={`p-4 rounded-xl ${isDark ? 'bg-gradient-to-br from-slate-900/60 to-slate-800/60' : 'bg-gradient-to-br from-white/80 to-gray-50/80'} glass-morphism border border-white/20 shadow-md hover:shadow-lg transition-all duration-300`}>
                                <div className={`text-xs ${textMuted} mb-2 font-medium`}>Top Performer</div>
                                <div className={`text-lg font-bold ${textColor} mb-1 truncate`}>
                                  {insights.analysis.best11[0].name}
                                </div>
                                <div className={`text-xs ${textMuted}`}>MVP of the Match</div>
                              </div>
                              <div className={`p-4 rounded-xl ${isDark ? 'bg-gradient-to-br from-slate-900/60 to-slate-800/60' : 'bg-gradient-to-br from-white/80 to-gray-50/80'} glass-morphism border border-white/20 shadow-md hover:shadow-lg transition-all duration-300`}>
                                <div className={`text-xs ${textMuted} mb-2 font-medium`}>Excellent Players (100+)</div>
                                <div className={`text-2xl font-black text-green-500 mb-1`}>
                                  {insights.analysis.best11.filter((player: any) => player.perf >= 100).length}
                                </div>
                                <div className={`text-xs ${textMuted}`}>Outstanding Performance</div>
                              </div>
                              <div className={`p-4 rounded-xl ${isDark ? 'bg-gradient-to-br from-slate-900/60 to-slate-800/60' : 'bg-gradient-to-br from-white/80 to-gray-50/80'} glass-morphism border border-white/20 shadow-md hover:shadow-lg transition-all duration-300`}>
                                <div className={`text-xs ${textMuted} mb-2 font-medium`}>High Performers (80+)</div>
                                <div className={`text-2xl font-black text-blue-500 mb-1`}>
                                  {insights.analysis.best11.filter((player: any) => player.perf >= 80).length}
                                </div>
                                <div className={`text-xs ${textMuted}`}>Above Average</div>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    ) : insights && !insights.success ? (
                      <div className="text-center py-8">
                        <div className="mb-4">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-red-400">
                            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                          </svg>
                        </div>
                        <p className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                          Analysis Failed
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          {insights.message || 'Unable to analyze this match data'}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="mb-4">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400">
                            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                          </svg>
                        </div>
                        <p className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          No insights available
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          AI analysis is not available for this match
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
