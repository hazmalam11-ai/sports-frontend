// components/MatchDataSync.tsx
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

interface LiveMatch {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      long: string;
    };
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
    };
    away: {
      id: number;
      name: string;
      logo: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface PlayerStats {
  playerId: number;
  name: string;
  position: string;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheet: boolean;
  goalsConceded: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
}

const MatchDataSync: React.FC = () => {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<LiveMatch | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);

  // Fetch live matches
  const fetchLiveMatches = async () => {
    setLoading(true);
    try {
      const liveMatches: any[] = await apiFetch<any[]>('/api/match-data/live');
setLiveMatches(liveMatches || []);
    } catch (error) {
      console.error('Error fetching live matches:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sync match data to fantasy teams
  const syncMatchData = async (matchId: number) => {
    setSyncing(true);
    try {
      const response = await apiFetch(`/api/match-data/sync/${matchId}`, {
        method: 'POST'
      });
      
      alert('✅ Match data synced successfully!');
      // Refresh live matches
      fetchLiveMatches();
    } catch (error) {
      console.error('Error syncing match data:', error);
      alert('❌ Failed to sync match data');
    } finally {
      setSyncing(false);
    }
  };

  // Sync all live matches
const syncAllLiveMatches = async () => {
  setSyncing(true);
  try {
    // استدعاء المزامنة
    const syncRes = await apiFetch('/api/match-data/sync-live', {
      method: 'POST',
    });

    // بعد المزامنة، جيب تفاصيل الماتشات
    const matchRes = (await apiFetch<any>(`/api/match-data/match/${matchId}`)) as any;

    fetchLiveMatches(); // إعادة تحميل البيانات بعد المزامنة

  } catch (error) {
    console.error('Error syncing live matches:', error);
    alert('❌ Failed to sync live matches');
  } finally {
    setSyncing(false);
  }
};

// Get match player stats
const fetchMatchPlayerStats = async (matchId: number) => {
  try {
    const playerRes = await apiFetch(`/api/match-data/match/${matchId}`);
    if (playerRes.playerStats) {
      // Process player stats for display
      const stats: PlayerStats[] = [];

        // Process home team players
        if (response.playerStats[0]) {
          response.playerStats[0].forEach((player: any) => {
            stats.push({
              playerId: player.player.id,
              name: player.player.name,
              position: player.statistics[0]?.games.position || 'M',
              minutesPlayed: player.statistics[0]?.games.minutes || 0,
              goals: player.statistics[0]?.goals.total || 0,
              assists: player.statistics[0]?.goals.assists || 0,
              yellowCards: player.statistics[0]?.cards.yellow || 0,
              redCards: player.statistics[0]?.cards.red || 0,
              cleanSheet: false, // Would need team data to calculate
              goalsConceded: 0, // Would need team data to calculate
              penaltiesSaved: player.statistics[0]?.goals.saves || 0,
              penaltiesMissed: player.statistics[0]?.penalty.missed || 0
            });
          });
        }
        
        // Process away team players
        if (response.playerStats[1]) {
          response.playerStats[1].forEach((player: any) => {
            stats.push({
              playerId: player.player.id,
              name: player.player.name,
              position: player.statistics[0]?.games.position || 'M',
              minutesPlayed: player.statistics[0]?.games.minutes || 0,
              goals: player.statistics[0]?.goals.total || 0,
              assists: player.statistics[0]?.goals.assists || 0,
              yellowCards: player.statistics[0]?.cards.yellow || 0,
              redCards: player.statistics[0]?.cards.red || 0,
              cleanSheet: false,
              goalsConceded: 0,
              penaltiesSaved: player.statistics[0]?.goals.saves || 0,
              penaltiesMissed: player.statistics[0]?.penalty.missed || 0
            });
          });
        }
        
        setPlayerStats(stats);
      }
    } catch (error) {
      console.error('Error fetching match player stats:', error);
    }
  };

  useEffect(() => {
    fetchLiveMatches();
  }, []);

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">
          ⚽ Live Match Data Sync
        </h1>

        {/* Controls */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={fetchLiveMatches}
            disabled={loading}
            className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 hover:bg-blue-500/30 hover:border-blue-400/50 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh Live Matches'}
          </button>
          
          <button
            onClick={syncAllLiveMatches}
            disabled={syncing || liveMatches.length === 0}
            className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 hover:bg-green-500/30 hover:border-green-400/50 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {syncing ? '🔄 Syncing...' : `🚀 Sync All (${liveMatches.length})`}
          </button>
        </div>

        {/* Live Matches */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {liveMatches.map((match) => (
            <div
              key={match.fixture.id}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/70 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={match.teams.home.logo}
                    alt={match.teams.home.name}
                    className="w-8 h-8"
                  />
                  <span className="text-white font-medium">
                    {match.teams.home.name}
                  </span>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {match.goals.home || 0} - {match.goals.away || 0}
                  </div>
                  <div className="text-sm text-gray-400">
                    {match.fixture.status.short}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">
                    {match.teams.away.name}
                  </span>
                  <img
                    src={match.teams.away.logo}
                    alt={match.teams.away.name}
                    className="w-8 h-8"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedMatch(match);
                    fetchMatchPlayerStats(match.fixture.id);
                  }}
                  className="flex-1 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 hover:bg-blue-500/30 hover:border-blue-400/50 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm"
                >
                  📊 View Stats
                </button>
                <button
                  onClick={() => syncMatchData(match.fixture.id)}
                  disabled={syncing}
                  className="flex-1 bg-green-500/20 backdrop-blur-sm border border-green-400/30 hover:bg-green-500/30 hover:border-green-400/50 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm disabled:opacity-50"
                >
                  {syncing ? '🔄' : '⚡ Sync'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Player Stats Modal */}
        {selectedMatch && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  Player Statistics - {selectedMatch.teams.home.name} vs {selectedMatch.teams.away.name}
                </h2>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-300 py-2">Player</th>
                      <th className="text-left text-gray-300 py-2">Pos</th>
                      <th className="text-left text-gray-300 py-2">Min</th>
                      <th className="text-left text-gray-300 py-2">G</th>
                      <th className="text-left text-gray-300 py-2">A</th>
                      <th className="text-left text-gray-300 py-2">YC</th>
                      <th className="text-left text-gray-300 py-2">RC</th>
                      <th className="text-left text-gray-300 py-2">PS</th>
                      <th className="text-left text-gray-300 py-2">PM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerStats.map((player) => (
                      <tr key={player.playerId} className="border-b border-gray-700/50">
                        <td className="text-white py-2">{player.name}</td>
                        <td className="text-gray-300 py-2">{player.position}</td>
                        <td className="text-gray-300 py-2">{player.minutesPlayed}</td>
                        <td className="text-green-400 py-2 font-bold">{player.goals}</td>
                        <td className="text-blue-400 py-2 font-bold">{player.assists}</td>
                        <td className="text-yellow-400 py-2">{player.yellowCards}</td>
                        <td className="text-red-400 py-2">{player.redCards}</td>
                        <td className="text-green-400 py-2">{player.penaltiesSaved}</td>
                        <td className="text-red-400 py-2">{player.penaltiesMissed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => syncMatchData(selectedMatch.fixture.id)}
                  disabled={syncing}
                  className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 hover:bg-green-500/30 hover:border-green-400/50 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {syncing ? '🔄 Syncing...' : '⚡ Sync to Fantasy Teams'}
                </button>
              </div>
            </div>
          </div>
        )}

        {liveMatches.length === 0 && !loading && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-6xl mb-4">⚽</div>
            <div className="text-xl">No live matches found</div>
            <div className="text-sm">Try refreshing or check back later</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchDataSync;
