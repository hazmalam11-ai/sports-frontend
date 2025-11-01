'use client';

import { useState, useEffect, useRef } from 'react';
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
  isCaptain?: boolean;
  isStarter?: boolean;
  // Match statistics for real-time scoring
  minutesPlayed?: number;
  goals?: number;
  assists?: number;
  cleanSheet?: boolean;
  goalsConceded?: number;
  yellowCards?: number;
  redCards?: number;
  penaltiesSaved?: number;
  penaltiesMissed?: number;
  fantasyPoints?: number;
  apiId?: number;
}

interface FantasyTeam {
  _id: string;
  name: string;
  players: Player[];
  budget: number;
  totalPoints: number;
  rank?: number;
  formation?: string;
  teamType?: 'barcelona' | 'real-madrid' | 'custom';
  tacticalSetup?: {
    starters: string[];
    substitutes: string[];
    lastUpdated: string;
  };
}

interface Gameweek {
  _id: string;
  number: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isFinished: boolean;
  externalMatches?: Array<{
    _id: string;
    apiId: number;
    teams: {
      home: { id: number; name: string; logo: string };
      away: { id: number; name: string; logo: string };
    };
    fixture: {
      date: string;
      status: { long: string; short: string };
    };
  }>;
}

interface PlayerPoints {
  playerId: string;
  playerName: string;
  position: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  basePoints: number;
  finalPoints: number;
  breakdown: {
    minutesPoints: number;
    goalPoints: number;
    assistPoints: number;
    yellowCardPoints: number;
    redCardPoints: number;
    penaltyMissedPoints: number;
  };
}

export default function FantasyMyTeamPage() {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const [team, setTeam] = useState<FantasyTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [selectedFormation, setSelectedFormation] = useState('4-3-3');
  const [showFormationSelector, setShowFormationSelector] = useState(false);
  const [isMakingSubstitution, setIsMakingSubstitution] = useState(false);
  const [showAutoLineupNotification, setShowAutoLineupNotification] = useState(false);
  const [dragOverPlayer, setDragOverPlayer] = useState<Player | null>(null);
  const [showSubstitutes, setShowSubstitutes] = useState(false);
  
  // Real-time data states
  const [currentGameweek, setCurrentGameweek] = useState<Gameweek | null>(null);
  const [playerPoints, setPlayerPoints] = useState<PlayerPoints[]>([]);
  const [teamTotalPoints, setTeamTotalPoints] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Advanced UI states
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPlayerDetails, setShowPlayerDetails] = useState<string | null>(null);
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  
  // Refs for animations
  const pitchRef = useRef<HTMLDivElement>(null);
  const teamHeaderRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';
  
  // Light theme specific colors
  const lightBgGradient = isDark ? 'from-slate-900 via-slate-800 to-slate-900' : 'from-blue-50 via-white to-green-50';
  const lightCardBg = isDark ? 'from-slate-800/90 to-slate-700/90' : 'from-white/90 to-gray-50/90';
  const lightTextPrimary = isDark ? 'text-white' : 'text-gray-900';
  const lightTextSecondary = isDark ? 'text-gray-300' : 'text-gray-600';
  const lightTextMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const lightBorder = isDark ? 'border-gray-600/20' : 'border-gray-200/50';
  const lightShadow = isDark ? 'shadow-2xl' : 'shadow-xl';

  const formations = [
    '4-4-2', '4-3-3', '3-5-2', '5-4-1', '4-5-1', '3-4-3'
  ];

  const getFormationPositions = (formation: string) => {
    const [defenders, midfielders, forwards] = formation.split('-').map(Number);
    return { defenders, midfielders, forwards };
  };

  const fetchTeam = async () => {
    try {
      setLoading(true);
      
      if (!user || !token) {
        throw new Error('No authentication token available');
      }

      // Fetch user's fantasy teams
      const teamsResponse = await apiFetch<FantasyTeam[]>('/fantasy/teams/my', {}, token);
      
      console.log('🔍 My Team - Fetched teams:', teamsResponse);
      
      if (!teamsResponse || teamsResponse.length === 0) {
        setTeam(null);
        setError('No fantasy team found. Please create a team first in the Fantasy section.');
        return;
      }

      // Get the first team (or you could add logic to select a specific team)
      const userTeam = teamsResponse[0];
      
      console.log('🔍 My Team - User team data:', userTeam);
      console.log('🔍 My Team - Team type:', userTeam?.teamType);
      
      // Validate team data
      if (!userTeam || !userTeam._id) {
        setTeam(null);
        setError('Invalid team data received.');
        return;
      }
      
      // If team has no players, show empty state
      if (!userTeam.players || userTeam.players.length === 0) {
        setTeam({
          ...userTeam,
          players: [],
          budget: userTeam.budget || 100,
          totalPoints: userTeam.totalPoints || 0,
          rank: userTeam.rank
        });
        return;
      }

      // Map the players to match the expected interface
      let mappedPlayers: Player[] = userTeam.players.map((playerData: any, index: number) => ({
        _id: playerData.player?._id || playerData._id,
        name: playerData.player?.name || 'Unknown Player',
        position: playerData.player?.position || 'Unknown',
        team: playerData.player?.team?.name || 'Unknown Team',
        price: playerData.player?.price || 5,
        photo: playerData.player?.photo || '',
        age: playerData.player?.age,
        number: playerData.player?.number,
        nationality: playerData.player?.nationality,
        height: playerData.player?.height,
        weight: playerData.player?.weight,
        injured: playerData.player?.injured || false,
        isCaptain: playerData.isCaptain || false,
        isStarter: playerData.isSubstitute === false
      }));

      // Determine team type - check if teamType exists, otherwise infer from name
      let teamType = userTeam.teamType || 'custom';
      if (teamType === 'custom') {
        const teamName = userTeam.name.toLowerCase();
        if (teamName.includes('real') || teamName.includes('madrid')) {
          teamType = 'real-madrid';
        } else if (teamName.includes('barcelona') || teamName.includes('barca')) {
          teamType = 'barcelona';
        }
      }
      
      console.log('🔍 My Team - Determined team type:', teamType);

      // Create teamData object first
      const teamData: FantasyTeam = {
        _id: userTeam._id,
        name: userTeam.name,
        players: mappedPlayers,
        budget: userTeam.budget || 100,
        totalPoints: userTeam.totalPoints || 0,
        rank: userTeam.rank,
        formation: userTeam.formation || '4-3-3',
        teamType: teamType,
        tacticalSetup: userTeam.tacticalSetup
      };

      // If no starters are set (all are substitutes or no tactical setup), automatically create a starting XI
      const startersCount = mappedPlayers.filter(p => p.isStarter).length;
      const hasTacticalSetup = userTeam.tacticalSetup && 
                              userTeam.tacticalSetup.starters && 
                              Array.isArray(userTeam.tacticalSetup.starters) && 
                              userTeam.tacticalSetup.starters.length > 0;
      
      if (startersCount === 0 || !hasTacticalSetup) {
        console.log('No starters found or no tactical setup, creating automatic starting XI...');
        setShowAutoLineupNotification(true);
        
        // Create proper formation based on actual player positions
        const goalkeepers = mappedPlayers.filter(p => p.position === 'Goalkeeper');
        const defenders = mappedPlayers.filter(p => p.position === 'Defender');
        const midfielders = mappedPlayers.filter(p => p.position === 'Midfielder');
        const attackers = mappedPlayers.filter(p => p.position === 'Attacker' || p.position === 'Forward');

        console.log('Available players by position:', {
          goalkeepers: goalkeepers.length,
          defenders: defenders.length,
          midfielders: midfielders.length,
          attackers: attackers.length,
          total: mappedPlayers.length
        });

        // Check if we have enough players to form a starting XI
        if (mappedPlayers.length < 11) {
          console.error(`Insufficient players in team! Only ${mappedPlayers.length} players available, need at least 11 for a starting XI.`);
          // Still proceed but with warning
        }

        // Select players for starting XI based on 4-3-3 formation
        const selectedStarters: Player[] = [];
        
        // 1 Goalkeeper (GK) - REQUIRED
        if (goalkeepers.length > 0) {
          selectedStarters.push(goalkeepers[0]);
        } else {
          console.warn('No goalkeepers available!');
        }
        
        // 4 Defenders (RB, 2 CBs, LB) - REQUIRED
        if (defenders.length >= 4) {
          selectedStarters.push(...defenders.slice(0, 4));
        } else {
          selectedStarters.push(...defenders);
          console.warn(`Only ${defenders.length} defenders available, need 4`);
        }
        
        // 3 Midfielders (CDM + 2 CMs) - REQUIRED
        if (midfielders.length >= 3) {
          selectedStarters.push(...midfielders.slice(0, 3));
        } else {
          selectedStarters.push(...midfielders);
          console.warn(`Only ${midfielders.length} midfielders available, need 3`);
        }
        
        // 3 Attackers (RW, ST, LW) - REQUIRED
        if (attackers.length >= 3) {
          selectedStarters.push(...attackers.slice(0, 3));
        } else {
          selectedStarters.push(...attackers);
          console.warn(`Only ${attackers.length} attackers available, need 3`);
        }

        console.log('After position selection - selectedStarters:', selectedStarters.length);
        console.log('Position breakdown:', {
          goalkeepers: selectedStarters.filter(p => p.position === 'Goalkeeper').length,
          defenders: selectedStarters.filter(p => p.position === 'Defender').length,
          midfielders: selectedStarters.filter(p => p.position === 'Midfielder').length,
          attackers: selectedStarters.filter(p => p.position === 'Attacker' || p.position === 'Forward').length
        });

        // If we don't have enough players for 4-3-3, redistribute
        const remainingPlayers = mappedPlayers.filter(p => !selectedStarters.includes(p));
        
        // If we have too many defenders and not enough attackers, move some defenders to attack
        if (selectedStarters.filter(p => p.position === 'Defender').length > 4 && 
            selectedStarters.filter(p => p.position === 'Attacker' || p.position === 'Forward').length < 3) {
          const extraDefenders = selectedStarters.filter(p => p.position === 'Defender').slice(4);
          const neededAttackers = 3 - selectedStarters.filter(p => p.position === 'Attacker' || p.position === 'Forward').length;
          
          // Move extra defenders to attack positions
          for (let i = 0; i < Math.min(extraDefenders.length, neededAttackers); i++) {
            const defender = extraDefenders[i];
            const defenderIndex = selectedStarters.indexOf(defender);
            if (defenderIndex > -1) {
              selectedStarters[defenderIndex] = { ...defender, position: 'Attacker' };
            }
          }
        }

        // Fill remaining slots with any available players to reach exactly 11
        console.log(`Current selectedStarters: ${selectedStarters.length}, need to reach 11`);
        console.log(`Remaining players available: ${remainingPlayers.length}`);
        
        while (selectedStarters.length < 11 && remainingPlayers.length > 0) {
          const nextPlayer = remainingPlayers.shift()!;
          selectedStarters.push(nextPlayer);
          console.log(`Added ${nextPlayer.name} (${nextPlayer.position}) to starters. Total: ${selectedStarters.length}`);
        }
        
        // If we still don't have 11 players, we need to use any available players
        if (selectedStarters.length < 11) {
          console.warn(`Only ${selectedStarters.length} players selected, need 11. This might indicate insufficient players in team.`);
          // Try to get more players from the original mappedPlayers that aren't already selected
          const allAvailablePlayers = mappedPlayers.filter(p => !selectedStarters.some(s => s._id === p._id));
          while (selectedStarters.length < 11 && allAvailablePlayers.length > 0) {
            const nextPlayer = allAvailablePlayers.shift()!;
            selectedStarters.push(nextPlayer);
            console.log(`Added additional player ${nextPlayer.name} (${nextPlayer.position}) to reach 11. Total: ${selectedStarters.length}`);
          }
        }
        
        // Ensure we never exceed 11 starters
        if (selectedStarters.length > 11) {
          console.log('WARNING: selectedStarters exceeded 11, trimming to 11');
          selectedStarters.splice(11);
        }

        console.log('Final selectedStarters count:', selectedStarters.length);
        console.log('Remaining players for substitutes:', remainingPlayers.length);

        // Final validation - ensure we have exactly 11 starters
        if (selectedStarters.length !== 11) {
          console.error(`CRITICAL ERROR: Expected 11 starters but got ${selectedStarters.length}!`);
          console.log('Selected starters:', selectedStarters.map(p => ({ name: p.name, position: p.position })));
          console.log('Total team players:', mappedPlayers.length);
          console.log('Team players by position:', {
            goalkeepers: mappedPlayers.filter(p => p.position === 'Goalkeeper').length,
            defenders: mappedPlayers.filter(p => p.position === 'Defender').length,
            midfielders: mappedPlayers.filter(p => p.position === 'Midfielder').length,
            attackers: mappedPlayers.filter(p => p.position === 'Attacker' || p.position === 'Forward').length,
            others: mappedPlayers.filter(p => !['Goalkeeper', 'Defender', 'Midfielder', 'Attacker', 'Forward'].includes(p.position)).length
          });
        } else {
          console.log('✅ Successfully selected 11 starters!');
        }

        console.log('Selected starters count:', selectedStarters.length);
        console.log('Selected starters:', selectedStarters.map(p => ({ name: p.name, position: p.position })));

        // Update mappedPlayers with correct starter assignments
        mappedPlayers = mappedPlayers.map(player => ({
          ...player,
          isStarter: selectedStarters.some(starter => starter._id === player._id)
        }));

        console.log('Final mappedPlayers starters:', mappedPlayers.filter(p => p.isStarter).length);
        console.log('Final mappedPlayers substitutes:', mappedPlayers.filter(p => !p.isStarter).length);

        // Update the teamData with the corrected mappedPlayers
        teamData.players = mappedPlayers;
        console.log('Updated teamData with corrected mappedPlayers');

        // Set the team state with the corrected data
        setTeam(teamData);
        console.log('Team state set with 11 starters');

        // Set the formation to 4-3-3 to match the actual distribution
        console.log('Setting formation to 4-3-3 to match auto-generated lineup');
        setSelectedFormation('4-3-3');

        // Auto-save the generated starting XI to backend
        setTimeout(async () => {
          try {
            if (!token) {
              console.error('No token available for auto-save');
              return;
            }

            if (!userTeam._id || typeof userTeam._id !== 'string') {
              console.error('Invalid team ID for auto-save');
              return;
            }

            const playersData = mappedPlayers.map(p => ({
              player: p._id,
              isCaptain: p.isCaptain,
              isViceCaptain: false,
              isSubstitute: !p.isStarter
            }));

            await apiFetch(`/fantasy/teams/${userTeam._id}`, {
              method: 'PUT',
              body: JSON.stringify({
                players: playersData
              })
            }, token);

            // Save tactical formation
            const starters = mappedPlayers.filter(p => p.isStarter).map(p => p._id);
            const substitutes = mappedPlayers.filter(p => !p.isStarter).map(p => p._id);

            await apiFetch(`/fantasy/teams/${userTeam._id}/tactics`, {
              method: 'PUT',
              body: JSON.stringify({
                formation: userTeam.formation || '4-3-3',
                starters,
                substitutes
              })
            }, token);

            console.log('Auto-generated starting XI saved to backend');
            
            // Hide notification after 5 seconds
            setTimeout(() => setShowAutoLineupNotification(false), 5000);
          } catch (err) {
            console.error('Failed to auto-save starting XI:', err);
            setShowAutoLineupNotification(false);
          }
        }, 1000); // Delay to ensure team state is set first
      } else {
        // If there's a saved tactical setup, set the team state here
        setTeam(teamData);
      }

    } catch (err) {
      console.error('Error fetching team:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team');
    } finally {
      setLoading(false);
    }
  };

  // Fetch current gameweek data
  const fetchCurrentGameweek = async () => {
    try {
      if (!token) return;
      
      const gameweekResponse = await apiFetch<Gameweek>('/fantasy/gameweeks/current', {}, token);
      console.log('🔍 Current Gameweek:', gameweekResponse);
      
      // Check if we got a valid gameweek response
      if (gameweekResponse && gameweekResponse._id) {
        setCurrentGameweek(gameweekResponse);
        console.log('✅ Active gameweek found:', gameweekResponse.number);
      } else {
        console.log('⚠️ No active gameweek found');
        setCurrentGameweek(null);
      }
    } catch (err) {
      console.error('❌ Error fetching current gameweek:', err);
      setCurrentGameweek(null);
    }
  };

  // Fetch player points for current gameweek
  const fetchPlayerPoints = async () => {
    try {
      if (!team || !currentGameweek || !token) {
        console.log('⚠️ Missing required data for player points:', { team: !!team, currentGameweek: !!currentGameweek, token: !!token });
        return;
      }
      
      console.log('🔍 Fetching player points for gameweek:', currentGameweek._id);
      
      const pointsResponse = await apiFetch<{
        message: string;
        teamId: string;
        gameweekId: string;
        totalPoints: number;
        playerPoints: PlayerPoints[];
      }>(`/fantasy/scoring/calculate/${team._id}`, {
        method: 'POST',
        body: JSON.stringify({ gameweekId: currentGameweek._id })
      }, token);
      
      console.log('🔍 Player Points:', pointsResponse);
      setPlayerPoints(pointsResponse.playerPoints || []);
      setTeamTotalPoints(pointsResponse.totalPoints || 0);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('❌ Error fetching player points:', err);
      // Don't throw the error, just log it to prevent breaking the UI
    }
  };

  // Auto-refresh data every 30 seconds
  const refreshData = async () => {
    if (!autoRefresh) return;
    
    console.log('🔄 Auto-refreshing fantasy data...');
    await fetchCurrentGameweek();
    await fetchPlayerPoints();
  };

  const handleDragStart = (e: React.DragEvent, player: Player) => {
    setDraggedPlayer(player);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handlePlayerDragOver = (e: React.DragEvent, targetPlayer: Player) => {
    e.preventDefault();
    
    if (!draggedPlayer) return;
    
    setDragOverPlayer(targetPlayer);
    
    // Set drop effect based on whether substitution is valid
    if (isValidSubstitution(draggedPlayer, targetPlayer)) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handlePlayerDragLeave = () => {
    setDragOverPlayer(null);
  };

  // Helper function to check if a substitution is valid
  const isValidSubstitution = (draggedPlayer: Player, targetPlayer: Player) => {
    if (!draggedPlayer || !targetPlayer) return false;
    
    // If not a substitution (both on pitch or both on bench), it's valid
    if (draggedPlayer.isStarter === targetPlayer.isStarter) return true;
    
    // For substitutions, check positions
    const normalizePosition = (pos: string) => {
      if (pos === 'Attacker' || pos === 'Forward') return 'Forward';
      return pos;
    };
    
    return normalizePosition(draggedPlayer.position) === normalizePosition(targetPlayer.position);
  };

  const handleDrop = async (e: React.DragEvent, targetPlayer: Player) => {
    e.preventDefault();
    
    if (!draggedPlayer || !team || !token) return;
    
    // If dragging to the same position, do nothing
    if (draggedPlayer._id === targetPlayer._id) {
      setDraggedPlayer(null);
      return;
    }
    
    // Check if this is a substitution (moving between pitch and bench)
    const isSubstitution = draggedPlayer.isStarter !== targetPlayer.isStarter;
    
    // If it's a substitution, validate that both players have the same position
    if (isSubstitution) {
      const draggedPosition = draggedPlayer.position;
      const targetPosition = targetPlayer.position;
      
      // Normalize position names for comparison
      const normalizePosition = (pos: string) => {
        if (pos === 'Attacker' || pos === 'Forward') return 'Forward';
        return pos;
      };
      
      if (normalizePosition(draggedPosition) !== normalizePosition(targetPosition)) {
        // Show error message for invalid substitution
        const positionMap: { [key: string]: string } = {
          'Forward': 'Forward/Attacker',
          'Midfielder': 'Midfielder', 
          'Defender': 'Defender',
          'Goalkeeper': 'Goalkeeper'
        };
        
        const draggedPosName = positionMap[normalizePosition(draggedPosition)] || draggedPosition;
        const targetPosName = positionMap[normalizePosition(targetPosition)] || targetPosition;
        
        alert(`❌ Invalid Substitution!\n\nCannot substitute ${draggedPlayer.name} (${draggedPosName}) with ${targetPlayer.name} (${targetPosName}).\n\nPlayers must have the same position to be substituted.`);
        setDraggedPlayer(null);
        return;
      }
      
      setIsMakingSubstitution(true);
    }
    
    const updatedPlayers = team.players.map(player => {
      if (player._id === draggedPlayer._id) {
        return { ...player, isStarter: targetPlayer.isStarter };
      }
      if (player._id === targetPlayer._id) {
        return { ...player, isStarter: draggedPlayer.isStarter };
      }
      return player;
    });
    
    setTeam({ ...team, players: updatedPlayers });
    setDraggedPlayer(null);

    // Save position changes to backend
    try {
      const playersData = updatedPlayers.map(p => ({
        player: p._id,
        isCaptain: p.isCaptain,
        isViceCaptain: false,
        isSubstitute: !p.isStarter
      }));

      await apiFetch(`/fantasy/teams/${team._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          players: playersData
        })
      }, token);

      // Save tactical formation
      await saveTacticalFormation(updatedPlayers);
      
      if (isSubstitution) {
        setTimeout(() => setIsMakingSubstitution(false), 2000); // Hide after 2 seconds
      }
    } catch (err) {
      console.error('Failed to save position changes:', err);
      // Revert the changes if save failed
      setTeam(team);
      setIsMakingSubstitution(false);
    }
  };

  const saveTacticalFormation = async (players: Player[]) => {
    if (!team || !token) return;
    
    try {
      const starters = players.filter(p => p.isStarter).map(p => p._id);
      const substitutes = players.filter(p => !p.isStarter).map(p => p._id);

      await apiFetch(`/fantasy/teams/${team._id}/tactics`, {
        method: 'PUT',
        body: JSON.stringify({
          formation: selectedFormation,
          starters,
          substitutes
        })
      }, token);
    } catch (err) {
      console.error('Failed to save tactical formation:', err);
    }
  };

  const handleCaptainSelect = async (player: Player) => {
    if (!team || !token) return;
    
    const updatedPlayers = team.players.map(p => ({
      ...p,
      isCaptain: p._id === player._id
    }));
    
    setTeam({ ...team, players: updatedPlayers });

    // Save captain selection to backend
    try {
      const playersData = updatedPlayers.map(p => ({
        player: p._id,
        isCaptain: p.isCaptain,
        isViceCaptain: false,
        isSubstitute: !p.isStarter
      }));

      await apiFetch(`/fantasy/teams/${team._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          players: playersData
        })
      }, token);

      // Save tactical formation
      await saveTacticalFormation(updatedPlayers);
    } catch (err) {
      console.error('Failed to save captain selection:', err);
      // Revert the change if save failed
      setTeam(team);
    }
  };

  // Function to redistribute players based on formation
  const redistributePlayersByFormation = (players: Player[], formation: string) => {
    const [defenders, midfielders, forwards] = formation.split('-').map(Number);
    
    // Get all players (both starters and substitutes)
    const allPlayers = [...players];
    
    // Categorize all players by position
    const goalkeepers = allPlayers.filter(p => p.position === 'Goalkeeper');
    const defendersList = allPlayers.filter(p => p.position === 'Defender');
    const midfieldersList = allPlayers.filter(p => p.position === 'Midfielder');
    const attackersList = allPlayers.filter(p => p.position === 'Attacker' || p.position === 'Forward');
    
    console.log('Redistributing players for formation:', formation);
    console.log('Available players:', {
      goalkeepers: goalkeepers.length,
      defenders: defendersList.length,
      midfielders: midfieldersList.length,
      attackers: attackersList.length,
      total: allPlayers.length
    });
    
    // Create new starting XI based on formation
    const newStarters: Player[] = [];
    
    // 1 Goalkeeper (always)
    if (goalkeepers.length > 0) {
      newStarters.push(goalkeepers[0]);
    }
    
    // Defenders (based on formation)
    const defendersToUse = Math.min(defenders, defendersList.length);
    newStarters.push(...defendersList.slice(0, defendersToUse));
    
    // If we need more defenders, take from midfielders/attackers
    if (defendersToUse < defenders) {
      const needed = defenders - defendersToUse;
      const fromMidfielders = Math.min(needed, midfieldersList.length);
      const fromAttackers = Math.min(needed - fromMidfielders, attackersList.length);
      
      newStarters.push(...midfieldersList.slice(0, fromMidfielders));
      newStarters.push(...attackersList.slice(0, fromAttackers));
    }
    
    // Midfielders (based on formation)
    const midfieldersToUse = Math.min(midfielders, midfieldersList.length);
    newStarters.push(...midfieldersList.slice(0, midfieldersToUse));
    
    // If we need more midfielders, take from defenders/attackers
    if (midfieldersToUse < midfielders) {
      const needed = midfielders - midfieldersToUse;
      const fromDefenders = Math.min(needed, defendersList.length - defendersToUse);
      const fromAttackers = Math.min(needed - fromDefenders, attackersList.length - (defenders - defendersToUse));
      
      newStarters.push(...defendersList.slice(defendersToUse, defendersToUse + fromDefenders));
      newStarters.push(...attackersList.slice(defenders - defendersToUse, defenders - defendersToUse + fromAttackers));
    }
    
    // Forwards (based on formation)
    const forwardsToUse = Math.min(forwards, attackersList.length);
    newStarters.push(...attackersList.slice(0, forwardsToUse));
    
    // If we need more forwards, take from midfielders/defenders
    if (forwardsToUse < forwards) {
      const needed = forwards - forwardsToUse;
      const fromMidfielders = Math.min(needed, midfieldersList.length - midfieldersToUse);
      const fromDefenders = Math.min(needed - fromMidfielders, defendersList.length - defendersToUse - (midfielders - midfieldersToUse));
      
      newStarters.push(...midfieldersList.slice(midfieldersToUse, midfieldersToUse + fromMidfielders));
      newStarters.push(...defendersList.slice(defendersToUse + (midfielders - midfieldersToUse), defendersToUse + (midfielders - midfieldersToUse) + fromDefenders));
    }
    
    // Fill remaining slots with any available players to ensure we have exactly 11
    const remainingPlayers = allPlayers.filter(p => !newStarters.includes(p));
    while (newStarters.length < 11 && remainingPlayers.length > 0) {
      newStarters.push(remainingPlayers.shift()!);
    }
    
    // If we still don't have 11, take from any available players
    if (newStarters.length < 11) {
      const allRemaining = allPlayers.filter(p => !newStarters.includes(p));
      while (newStarters.length < 11 && allRemaining.length > 0) {
        newStarters.push(allRemaining.shift()!);
      }
    }
    
    console.log('Final starters count:', newStarters.length);
    console.log('Final formation breakdown:', {
      goalkeepers: newStarters.filter(p => p.position === 'Goalkeeper').length,
      defenders: newStarters.filter(p => p.position === 'Defender').length,
      midfielders: newStarters.filter(p => p.position === 'Midfielder').length,
      attackers: newStarters.filter(p => p.position === 'Attacker' || p.position === 'Forward').length
    });
    
    if (newStarters.length === 11) {
      console.log('✅ Successfully created 11-player starting XI');
    } else {
      console.error(`❌ Failed to create 11-player starting XI. Only ${newStarters.length} players selected.`);
    }
    
    // Ensure we have exactly 11 starters - fallback if needed
    if (newStarters.length !== 11) {
      console.warn(`WARNING: Only ${newStarters.length} starters selected, expected 11. Adding more players...`);
      
      // Add more players from any available position to reach 11
      const allRemaining = allPlayers.filter(p => !newStarters.includes(p));
      while (newStarters.length < 11 && allRemaining.length > 0) {
        newStarters.push(allRemaining.shift()!);
      }
      
      // If still not 11, duplicate some players (emergency fallback)
      if (newStarters.length < 11) {
        const currentStarters = [...newStarters];
        while (newStarters.length < 11 && currentStarters.length > 0) {
          newStarters.push(currentStarters.shift()!);
        }
      }
    }
    
    // Update players with new starter assignments
    return players.map(player => ({
      ...player,
      isStarter: newStarters.some(starter => starter._id === player._id)
    }));
  };

  const getPositionPlayers = (position: string) => {
    if (!team) return [];
    return team.players.filter(p => p.position === position && p.isStarter);
  };

  const getFormationPlayers = () => {
    if (!team) return { forwards: [], midfielders: [], defenders: [], goalkeepers: [] };
    
    const starters = team.players.filter(p => p.isStarter);
    
    console.log('All starters:', starters.length, starters.map(p => ({ name: p.name, position: p.position, isStarter: p.isStarter })));
    
    const formationPlayers = {
      forwards: starters.filter(p => p.position === 'Attacker' || p.position === 'Forward'),
      midfielders: starters.filter(p => p.position === 'Midfielder'),
      defenders: starters.filter(p => p.position === 'Defender'),
      goalkeepers: starters.filter(p => p.position === 'Goalkeeper')
    };
    
    console.log('Formation players:', formationPlayers);
    
    return formationPlayers;
  };

  const getSubstitutes = () => {
    if (!team) return [];
    const substitutes = team.players.filter(p => !p.isStarter).slice(0, 4);
    console.log('getSubstitutes - team players:', team.players.length);
    console.log('getSubstitutes - starters:', team.players.filter(p => p.isStarter).length);
    console.log('getSubstitutes - substitutes:', substitutes.length);
    return substitutes;
  };

  const getStarters = () => {
    if (!team) return [];
    return team.players.filter(p => p.isStarter);
  };

  const getFormation = () => {
    return selectedFormation;
  };

  // Get player points for display
  const getPlayerPoints = (playerId: string) => {
    const playerPoint = playerPoints.find(p => p.playerId === playerId);
    return playerPoint ? playerPoint.finalPoints : 0;
  };

  // Get player breakdown for detailed stats
  const getPlayerBreakdown = (playerId: string) => {
    const playerPoint = playerPoints.find(p => p.playerId === playerId);
    return playerPoint ? playerPoint.breakdown : null;
  };

  useEffect(() => {
    if (user && token) {
      fetchTeam();
      fetchCurrentGameweek();
    }
  }, [user, token]);

  // Fetch player points when team and gameweek are available
  useEffect(() => {
    if (team && currentGameweek && token) {
      fetchPlayerPoints();
    }
  }, [team, currentGameweek, token]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(refreshData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, team, currentGameweek, token]);

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
                Please log in to view your team
              </p>
              <Link 
                href="/login"
                className="inline-block bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 hover:bg-blue-500/30 hover:border-blue-400/50 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
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
              <p className={`${textMuted}`}>Loading team...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className={`min-h-screen ${bgColor}`}>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <div className={`${cardBg} rounded-lg p-8 shadow-lg`}>
              <div className="text-6xl mb-4">⚽</div>
              <h2 className={`text-2xl font-bold mb-4 ${textColor}`}>
                {error?.includes('No fantasy team found') ? 'No Team Created Yet' : 'Team Not Found'}
              </h2>
              <p className={`${textMuted} mb-6`}>
                {error?.includes('No fantasy team found') 
                  ? 'You haven\'t created a fantasy team yet. Create your first team to start playing!'
                  : error || 'This team does not exist or you do not have access to it.'
                }
              </p>
              <div className="flex gap-3 justify-center">
              <Link 
                href="/fantasy"
                className="inline-block bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 hover:bg-blue-500/30 hover:border-blue-400/50 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Create Team
                </Link>
                <Link 
                  href="/fantasy"
                  className="inline-block bg-gray-500/20 backdrop-blur-sm border border-gray-400/30 hover:bg-gray-500/30 hover:border-gray-400/50 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Go to Fantasy
              </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor} relative overflow-hidden`}>
      {/* Animated Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${lightBgGradient}`}>
        <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${isDark ? 'from-blue-600/20' : 'from-blue-500/10'} via-transparent to-transparent`}></div>
        <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] ${isDark ? 'from-green-600/20' : 'from-green-500/10'} via-transparent to-transparent`}></div>
        <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] ${isDark ? 'from-yellow-600/20' : 'from-yellow-500/10'} via-transparent to-transparent`}></div>
      </div>
      
      <Header />
      
      <main className="relative container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Mobile Floating Action Button */}
        <div className="fixed top-20 right-4 z-50 sm:hidden">
          <div className="relative group">
            <button 
              onClick={() => setShowStats(!showStats)}
              className={`w-14 h-14 rounded-full ${isDark ? 'bg-green-500' : 'bg-green-600'} text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group-hover:scale-110`}
            >
              <div className="text-center">
                <div className="text-lg font-bold">{teamTotalPoints}</div>
                <div className="text-xs opacity-90">pts</div>
              </div>
            </button>
            {/* Live indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-white"></div>
          </div>
        </div>

        {/* Desktop Status Bar - Hidden on Mobile */}
        <div className={`hidden sm:block ${cardBg} rounded-2xl p-6 mb-8 ${lightShadow} ${lightBorder} backdrop-blur-sm bg-gradient-to-r ${lightCardBg}`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-8">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className={`text-sm font-medium ${lightTextSecondary}`}>Live Updates</span>
              </div>
              {currentGameweek && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                  <div className={`text-sm ${lightTextSecondary}`}>
                    <span className={`font-bold text-base sm:text-lg ${lightTextPrimary}`}>Gameweek {currentGameweek.number}</span>
                    {currentGameweek.isActive && (
                      <span className="ml-2 sm:ml-3 px-2 sm:px-3 py-1 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full text-xs font-medium border border-green-400/30">
                        ● Active
                      </span>
                    )}
                    {currentGameweek.isFinished && (
                      <span className="ml-2 sm:ml-3 px-2 sm:px-3 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium border border-blue-400/30">
                        ● Finished
                      </span>
                    )}
                  </div>
                </div>
              )}
              {lastUpdated && (
                <div className={`text-xs ${lightTextMuted} ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'} px-2 sm:px-3 py-1 rounded-full`}>
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
              <div className="text-left sm:text-right">
                <div className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-green-400 bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent' : 'text-green-600'}`}>
                  {teamTotalPoints}
              </div>
                <div className={`text-xs ${lightTextMuted} font-medium`}>Total Points</div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className={`px-3 sm:px-4 py-2 ${isDark ? 'bg-blue-500/20 text-blue-400 border-blue-400/30 hover:bg-blue-500/30 hover:border-blue-400/50' : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 hover:border-blue-300'} border rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all`}
                >
                  {showStats ? 'Hide Stats' : 'Show Stats'}
                </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  autoRefresh 
                      ? isDark 
                        ? 'bg-green-500/20 text-green-400 border border-green-400/30 hover:bg-green-500/30' 
                        : 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                      : isDark
                        ? 'bg-gray-500/20 text-gray-400 border border-gray-400/30 hover:bg-gray-500/30'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                {autoRefresh ? 'Auto ON' : 'Auto OFF'}
              </button>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Team Header */}
        <div ref={teamHeaderRef} className="relative mb-3 sm:mb-6">
          <div className={`bg-gradient-to-r ${lightCardBg} backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 ${lightShadow} ${lightBorder}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Compact Team Logo */}
                <div className="relative group">
                  <div className={`relative w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center bg-gradient-to-br ${isDark ? 'from-white/10 to-transparent border-2 border-white/20' : 'from-gray-100 to-transparent border-2 border-gray-200'} shadow-lg`}>
              {team.teamType === 'real-madrid' ? (
                <img 
                  src="https://media.api-sports.io/football/teams/541.png" 
                  alt="Real Madrid" 
                        className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full object-cover shadow-lg"
                />
              ) : team.teamType === 'barcelona' ? (
                <img 
                  src="https://media.api-sports.io/football/teams/529.png" 
                  alt="Barcelona" 
                        className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full object-cover shadow-lg"
                />
              ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                        <span className="text-white font-bold text-sm sm:text-base lg:text-lg">
                    {team.name.split(' ').map(word => word[0]).join('').slice(0, 2)}
                  </span>
                </div>
              )}
            </div>
                </div>
                
                <div className="space-y-1">
                  <h1 className={`text-lg sm:text-xl lg:text-2xl font-bold ${isDark ? 'bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent' : 'text-gray-900'}`}>
                {team.name}
              </h1>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                      <span className={`text-xs ${lightTextSecondary} font-medium`}>Live</span>
                    </div>
                    <div className={`text-xs ${lightTextMuted}`}>
                      {selectedFormation}
                    </div>
                    <div className={`text-xs ${lightTextMuted}`}>
                      C: <span className={`font-semibold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        {team.players.find(p => p.isCaptain)?.name?.split(' ')[0] || 'Not Set'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Compact Status Notifications */}
                  <div className="flex flex-wrap gap-1 mt-2">
              {isMakingSubstitution && (
                      <div className={`px-2 py-1 ${isDark ? 'bg-green-500/20 text-green-400 border-green-400/30' : 'bg-green-100 text-green-700 border-green-200'} text-xs rounded-full border animate-pulse`}>
                        🔄 Saved
                </div>
              )}
              {showAutoLineupNotification && (
                      <div className={`px-2 py-1 ${isDark ? 'bg-blue-500/20 text-blue-400 border-blue-400/30' : 'bg-blue-100 text-blue-700 border-blue-200'} text-xs rounded-full border animate-pulse`}>
                        ⚽ Auto XI
                </div>
              )}
            </div>
          </div>
              </div>
              
              {/* Compact Action Buttons */}
              <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowFormationSelector(!showFormationSelector)}
                  className={`group relative px-3 py-2 backdrop-blur-sm border rounded-lg transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 ${
                    isDark 
                      ? 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-400/30 hover:from-gray-500/30 hover:to-gray-600/30 hover:border-gray-400/50 text-white'
                      : 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300 hover:from-gray-200 hover:to-gray-300 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span className="font-medium text-xs">Formation</span>
                  </div>
            </button>
                
            <button
              onClick={() => team && saveTacticalFormation(team.players)}
                  className={`group relative px-3 py-2 backdrop-blur-sm border rounded-lg transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 ${
                    isDark 
                      ? 'bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-400/30 hover:from-green-500/30 hover:to-green-600/30 hover:border-green-400/50 text-white'
                      : 'bg-gradient-to-r from-green-100 to-green-200 border-green-300 hover:from-green-200 hover:to-green-300 hover:border-green-400 text-green-700'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium text-xs">Save</span>
                  </div>
            </button>
                
            <Link
              href="/fantasy/players"
                  className={`group relative px-3 py-2 backdrop-blur-sm border rounded-lg transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 ${
                    isDark 
                      ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-400/30 hover:from-blue-500/30 hover:to-blue-600/30 hover:border-blue-400/50 text-white'
                      : 'bg-gradient-to-r from-blue-100 to-blue-200 border-blue-300 hover:from-blue-200 hover:to-blue-300 hover:border-blue-400 text-blue-700'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    <span className="font-medium text-xs">Edit</span>
                  </div>
            </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Formation Selector */}
        {showFormationSelector && (
          <div className="mb-4 sm:mb-8 animate-in slide-in-from-top-4 duration-300">
            <div className={`bg-gradient-to-r ${lightCardBg} backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-8 ${lightShadow} ${lightBorder}`}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className={`text-lg sm:text-2xl font-bold ${lightTextPrimary}`}>Select Formation</h3>
                <button
                  onClick={() => setShowFormationSelector(false)}
                  className={`p-2 ${lightTextMuted} hover:${lightTextPrimary} transition-colors`}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {formations.map((formation) => {
                  const [defenders, midfielders, forwards] = formation.split('-').map(Number);
                  return (
                <button
                  key={formation}
                  onClick={async () => {
                        setIsAnimating(true);
                    setSelectedFormation(formation);
                    setShowFormationSelector(false);
                    
                    // Redistribute players based on new formation
                    if (team) {
                      const redistributedPlayers = redistributePlayersByFormation(team.players, formation);
                      setTeam({ ...team, players: redistributedPlayers });
                      
                      // Save formation change and redistributed players
                      await saveTacticalFormation(redistributedPlayers);
                    }
                        
                        setTimeout(() => setIsAnimating(false), 500);
                  }}
                      className={`group relative p-3 sm:p-6 rounded-xl sm:rounded-2xl border transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 ${
                    selectedFormation === formation
                          ? isDark
                            ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/30 backdrop-blur-sm text-white border-blue-400/50 shadow-blue-500/25'
                            : 'bg-gradient-to-br from-blue-100 to-blue-200 backdrop-blur-sm text-blue-900 border-blue-300 shadow-blue-200/50'
                          : isDark
                            ? 'bg-gradient-to-br from-gray-500/10 to-gray-600/10 backdrop-blur-sm text-gray-300 border-gray-400/30 hover:from-gray-500/20 hover:to-gray-600/20 hover:border-gray-400/50'
                            : 'bg-gradient-to-br from-gray-50 to-gray-100 backdrop-blur-sm text-gray-700 border-gray-200 hover:from-gray-100 hover:to-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">{formation}</div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} space-y-1`}>
                          <div className="flex justify-center space-x-1">
                            {Array.from({ length: defenders }).map((_, i) => (
                              <div key={i} className={`w-2 h-2 ${isDark ? 'bg-blue-400' : 'bg-blue-500'} rounded-full`}></div>
              ))}
            </div>
                          <div className="flex justify-center space-x-1">
                            {Array.from({ length: midfielders }).map((_, i) => (
                              <div key={i} className={`w-2 h-2 ${isDark ? 'bg-yellow-400' : 'bg-yellow-500'} rounded-full`}></div>
                            ))}
                          </div>
                          <div className="flex justify-center space-x-1">
                            {Array.from({ length: forwards }).map((_, i) => (
                              <div key={i} className={`w-2 h-2 ${isDark ? 'bg-red-400' : 'bg-red-500'} rounded-full`}></div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {selectedFormation === formation && (
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${isDark ? 'from-blue-400/20 to-blue-600/20' : 'from-blue-200/30 to-blue-300/30'} pointer-events-none`}></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          {/* Advanced Football Field */}
          <div ref={pitchRef} className="relative">
            {team.players.length === 0 ? (
              <div className={`bg-gradient-to-r ${lightCardBg} backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center ${lightShadow} ${lightBorder}`}>
                <div className="text-6xl sm:text-8xl mb-4 sm:mb-6 animate-bounce">⚽</div>
                <h3 className={`text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 ${isDark ? 'bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent' : 'text-gray-900'}`}>
                  No Players Selected
                </h3>
                <p className={`${lightTextSecondary} mb-6 sm:mb-8 text-base sm:text-lg`}>
                  Your team is empty. Go to the fantasy page to select players for your team.
                </p>
                <Link
                  href="/fantasy"
                  className={`inline-flex items-center space-x-2 backdrop-blur-sm border rounded-xl sm:rounded-2xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 ${
                    isDark 
                      ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-400/30 hover:from-blue-500/30 hover:to-blue-600/30 hover:border-blue-400/50 text-white'
                      : 'bg-gradient-to-r from-blue-100 to-blue-200 border-blue-300 hover:from-blue-200 hover:to-blue-300 hover:border-blue-400 text-blue-700'
                  } px-6 sm:px-8 py-3 sm:py-4`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Select Players</span>
                </Link>
              </div>
            ) : (
            <div className={`relative overflow-hidden min-h-[60vh] sm:min-h-[80vh] lg:min-h-screen bg-gradient-to-br ${isDark ? 'from-green-900 via-green-800 to-green-900' : 'from-green-600 via-green-500 to-green-600'} rounded-2xl sm:rounded-3xl ${lightShadow} ${lightBorder}`}>
              {/* Detailed SVG Football Pitch */}
              <div className="absolute inset-0 opacity-30 sm:opacity-25">
                <svg width="100%" height="100%" viewBox="0 0 728 547" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <g clipPath="url(#clip0_252_1910)">
                    <g clipPath="url(#clip1_252_1910)">
                      <path fillRule="evenodd" clipRule="evenodd" d="M467.53 43H488.445H509.359H530.273H551.19H569.323H587.456H605.589H623.722C625.095 45.5992 626.483 48.2266 627.886 50.8821C629.304 53.5663 630.738 56.2787 632.186 59.0209C633.651 61.7935 635.131 64.596 636.628 67.4299C638.142 70.2949 639.672 73.1914 641.22 76.121C642.887 79.2742 644.572 82.4657 646.279 85.6948C648.006 88.9646 649.755 92.2737 651.525 95.6245C653.317 99.0163 655.131 102.451 656.969 105.93C658.83 109.451 660.714 113.019 662.624 116.633C664.461 120.109 666.32 123.629 668.202 127.191C670.109 130.799 672.038 134.451 673.992 138.15C675.972 141.896 677.976 145.691 680.007 149.534C682.064 153.428 684.148 157.372 686.259 161.369C688.604 165.806 690.982 170.307 693.395 174.874C695.844 179.509 698.329 184.214 700.853 188.99C703.413 193.838 706.015 198.761 708.655 203.76C711.337 208.836 714.061 213.992 716.829 219.229C719.967 225.169 723.162 231.217 726.414 237.373C729.726 243.641 733.099 250.025 736.535 256.529C740.035 263.154 743.601 269.905 747.237 276.784C750.942 283.798 754.72 290.947 758.572 298.238C763.048 306.711 767.627 315.379 772.313 324.248C777.109 333.326 782.019 342.619 787.047 352.136C792.198 361.885 797.475 371.875 802.885 382.114C808.431 392.611 814.119 403.378 819.955 414.423C822.792 419.791 825.664 425.229 828.572 430.734C831.518 436.308 834.501 441.955 837.523 447.675C840.583 453.468 843.684 459.336 846.825 465.281C850.007 471.304 853.231 477.407 856.498 483.591C859.126 488.564 861.782 493.591 864.467 498.673C867.181 503.81 869.924 509.003 872.698 514.252C875.502 519.56 878.338 524.927 881.204 530.353C884.104 535.84 887.035 541.389 890 547H853.284H816.567H779.85H743.134H700.783H658.435H616.088H573.737H531.381H489.026H446.671H404.318H364.032H323.743H283.456H243.174H213.733H184.292H154.85H125.409H88.7389H52.0639H15.39H-21.2808H-30.8449H-40.4145H-49.9852H-59.5548H-85.6642H-111.777H-137.891H-164C-161.025 541.389 -158.084 535.84 -155.175 530.353C-152.298 524.927 -149.453 519.56 -146.64 514.252C-143.856 509.003 -141.103 503.81 -138.38 498.673C-135.686 493.591 -133.022 488.564 -130.384 483.591C-127.106 477.407 -123.871 471.304 -120.678 465.281C-117.526 459.336 -114.415 453.468 -111.344 447.675C-108.313 441.955 -105.319 436.308 -102.364 430.734C-99.4449 425.229 -96.5632 419.791 -93.7167 414.423C-87.8611 403.378 -82.1542 392.611 -76.5887 382.114C-71.1611 371.875 -65.8652 361.885 -60.6967 352.136C-55.6515 342.619 -50.7246 333.326 -45.9125 324.248C-41.2103 315.379 -36.6155 306.711 -32.1246 298.238C-28.2589 290.947 -24.4684 283.798 -20.7508 276.784C-17.1037 269.905 -13.5245 263.154 -10.0127 256.529C-6.56523 250.025 -3.18094 243.641 0.14267 237.373C3.40619 231.217 6.61205 225.169 9.76082 219.229C12.5375 213.992 15.271 208.836 17.9621 203.76C20.6119 198.761 23.2216 193.838 25.7919 188.99C28.3233 184.214 30.8176 179.509 33.275 174.874C35.6959 170.307 38.0822 165.806 40.4339 161.369C42.5532 157.372 44.6439 153.428 46.7079 149.534C48.7457 145.691 50.7575 141.896 52.7432 138.15C54.7045 134.451 56.6404 130.799 58.5532 127.191C60.4418 123.629 62.3073 120.109 64.1503 116.633C66.0661 113.019 67.9571 109.451 69.8244 105.93C71.6686 102.451 73.4892 99.0163 75.2873 95.6245C77.0635 92.2737 78.8179 88.9646 80.551 85.6948C82.2635 82.4657 83.9554 79.2742 85.6266 76.121C87.18 73.1914 88.7152 70.2949 90.2341 67.4299C91.7365 64.596 93.222 61.7935 94.6917 59.0209C96.1456 56.2787 97.5837 53.5663 99.0066 50.8821C100.414 48.2266 101.807 45.5992 103.185 43H116.08H128.976H141.873H154.767H159.493H164.22H168.946H173.67H191.78H209.893H228.005H246.115H260.655H275.196H289.736H304.275H324.17H344.066H363.963H383.859H404.776H425.694H446.611H467.53Z" fill="#31813F"/>
                      <mask id="mask0_252_1910" style={{maskType:'alpha'}} maskUnits="userSpaceOnUse" x="-164" y="43" width="1054" height="504">
                        <path fillRule="evenodd" clipRule="evenodd" d="M467.53 43H488.445H509.359H530.273H551.19H569.323H587.456H605.589H623.722C625.095 45.5992 626.483 48.2266 627.886 50.8821C629.304 53.5663 630.738 56.2787 632.186 59.0209C633.651 61.7935 635.131 64.596 636.628 67.4299C638.142 70.2949 639.672 73.1914 641.22 76.121C642.887 79.2742 644.572 82.4657 646.279 85.6948C648.006 88.9646 649.755 92.2737 651.525 95.6245C653.317 99.0163 655.131 102.451 656.969 105.93C658.83 109.451 660.714 113.019 662.624 116.633C664.461 120.109 666.32 123.629 668.202 127.191C670.109 130.799 672.038 134.451 673.992 138.15C675.972 141.896 677.976 145.691 680.007 149.534C682.064 153.428 684.148 157.372 686.259 161.369C688.604 165.806 690.982 170.307 693.395 174.874C695.844 179.509 698.329 184.214 700.853 188.99C703.413 193.838 706.015 198.761 708.655 203.76C711.337 208.836 714.061 213.992 716.829 219.229C719.967 225.169 723.162 231.217 726.414 237.373C729.726 243.641 733.099 250.025 736.535 256.529C740.035 263.154 743.601 269.905 747.237 276.784C750.942 283.798 754.72 290.947 758.572 298.238C763.048 306.711 767.627 315.379 772.313 324.248C777.109 333.326 782.019 342.619 787.047 352.136C792.198 361.885 797.475 371.875 802.885 382.114C808.431 392.611 814.119 403.378 819.955 414.423C822.792 419.791 825.664 425.229 828.572 430.734C831.518 436.308 834.501 441.955 837.523 447.675C840.583 453.468 843.684 459.336 846.825 465.281C850.007 471.304 853.231 477.407 856.498 483.591C859.126 488.564 861.782 493.591 864.467 498.673C867.181 503.81 869.924 509.003 872.698 514.252C875.502 519.56 878.338 524.927 881.204 530.353C884.104 535.84 887.035 541.389 890 547H853.284H816.567H779.85H743.134H700.783H658.435H616.088H573.737H531.381H489.026H446.671H404.318H364.032H323.743H283.456H243.174H213.733H184.292H154.85H125.409H88.7389H52.0639H15.39H-21.2808H-30.8449H-40.4145H-49.9852H-59.5548H-85.6642H-111.777H-137.891H-164C-161.025 541.389 -158.084 535.84 -155.175 530.353C-152.298 524.927 -149.453 519.56 -146.64 514.252C-143.856 509.003 -141.103 503.81 -138.38 498.673C-135.686 493.591 -133.022 488.564 -130.384 483.591C-127.106 477.407 -123.871 471.304 -120.678 465.281C-117.526 459.336 -114.415 453.468 -111.344 447.675C-108.313 441.955 -105.319 436.308 -102.364 430.734C-99.4449 425.229 -96.5632 419.791 -93.7167 414.423C-87.8611 403.378 -82.1542 392.611 -76.5887 382.114C-71.1611 371.875 -65.8652 361.885 -60.6967 352.136C-55.6515 342.619 -50.7246 333.326 -45.9125 324.248C-41.2103 315.379 -36.6155 306.711 -32.1246 298.238C-28.2589 290.947 -24.4684 283.798 -20.7508 276.784C-17.1037 269.905 -13.5245 263.154 -10.0127 256.529C-6.56523 250.025 -3.18094 243.641 0.14267 237.373C3.40619 231.217 6.61205 225.169 9.76082 219.229C12.5375 213.992 15.271 208.836 17.9621 203.76C20.6119 198.761 23.2216 193.838 25.7919 188.99C28.3233 184.214 30.8176 179.509 33.275 174.874C35.6959 170.307 38.0822 165.806 40.4339 161.369C42.5532 157.372 44.6439 153.428 46.7079 149.534C48.7457 145.691 50.7575 141.896 52.7432 138.15C54.7045 134.451 56.6404 130.799 58.5532 127.191C60.4418 123.629 62.3073 120.109 64.1503 116.633C66.0661 113.019 67.9571 109.451 69.8244 105.93C71.6686 102.451 73.4892 99.0163 75.2873 95.6245C77.0635 92.2737 78.8179 88.9646 80.551 85.6948C82.2635 82.4657 83.9554 79.2742 85.6266 76.121C87.18 73.1914 88.7152 70.2949 90.2341 67.4299C91.7365 64.596 93.222 61.7935 94.6917 59.0209C96.1456 56.2787 97.5837 53.5663 99.0066 50.8821C100.414 48.2266 101.807 45.5992 103.185 43H116.08H128.976H141.873H154.767H159.493H164.22H168.946H173.67H191.78H209.893H228.005H246.115H260.655H275.196H289.736H304.275H324.17H344.066H363.963H383.859H404.776H425.694H446.611H467.53Z" fill="white"/>
                      </mask>
                      <g mask="url(#mask0_252_1910)">
                        <path fillRule="evenodd" clipRule="evenodd" d="M634.863 43H93.1685L93.1483 43.039L84.0214 60.9581L84 61H644L634.863 43Z" fill="black" fillOpacity="0.05"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M653.544 80H75.4916L65 101H664L653.544 80Z" fill="black" fillOpacity="0.05"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M675.857 123H53.1848L41.0281 146.944L41 147H688L675.857 123Z" fill="black" fillOpacity="0.05"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M700.774 173H28.2744L14 201H715L700.774 173Z" fill="black" fillOpacity="0.05"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M730.08 231H-2.0217L-18.9603 264.921L-19 265H747L730.08 231Z" fill="black" fillOpacity="0.05"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M779.847 308H-50.774L-72 347H801L779.847 308Z" fill="black" fillOpacity="0.05"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M823.914 391H-95.8257L-121.938 442.877L-122 443H850L823.914 391Z" fill="black" fillOpacity="0.05"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M878.047 487H-151.934L-185 556H911L878.047 487Z" fill="black" fillOpacity="0.05"/>
                      </g>
                    </g>
                    <g opacity="0.4">
                      <path fillRule="evenodd" clipRule="evenodd" d="M363.493 396C362.738 396 362.019 396.11 361.364 396.311C360.708 396.511 360.118 396.802 359.621 397.161C359.124 397.52 358.721 397.949 358.44 398.426C358.16 398.903 358.003 399.429 358 399.982C357.996 400.534 358.147 401.06 358.422 401.539C358.698 402.02 359.099 402.453 359.595 402.817C360.092 403.182 360.684 403.478 361.343 403.683C362.003 403.887 362.728 404 363.49 404C364.256 404 364.984 403.887 365.646 403.683C366.307 403.478 366.902 403.182 367.4 402.817C367.898 402.453 368.3 402.02 368.576 401.539C368.852 401.06 369.003 400.534 369 399.982C368.997 399.429 368.84 398.903 368.56 398.426C368.28 397.949 367.876 397.52 367.378 397.161C366.881 396.802 366.289 396.511 365.632 396.311C364.975 396.11 364.253 396 363.493 396Z" fill="white"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M363.497 94C363.154 94 362.827 94.0414 362.529 94.1165C362.231 94.1917 361.963 94.3006 361.737 94.4352C361.511 94.5701 361.328 94.7308 361.2 94.9096C361.073 95.0887 361.002 95.2859 361 95.4933C360.998 95.7002 361.067 95.8975 361.192 96.0773C361.317 96.2575 361.499 96.42 361.725 96.5565C361.951 96.6932 362.22 96.8041 362.52 96.881C362.82 96.9577 363.149 97 363.495 97C363.844 97 364.175 96.9577 364.476 96.881C364.776 96.8041 365.046 96.6932 365.273 96.5565C365.499 96.42 365.682 96.2575 365.807 96.0773C365.933 95.8975 366.001 95.7002 366 95.4933C365.999 95.2859 365.927 95.0887 365.8 94.9096C365.673 94.7308 365.489 94.5701 365.263 94.4352C365.037 94.3006 364.768 94.1917 364.469 94.1165C364.17 94.0414 363.842 94 363.497 94Z" fill="white"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M336.879 60H299.266H223.88H159.044H145.039H144.698L2 491H2.63793H28.8826H101.712H242.975H483.63H624.893H697.722H723.967L716.451 471.719L584.134 65.6766L581.922 60H567.916H503.079H427.694H390.082H336.879ZM581.791 64.8379C580.441 64.7895 579.122 64.646 577.884 64.4238C576.646 64.2022 575.489 63.903 574.463 63.5433C573.437 63.1837 572.54 62.7646 571.823 62.3016C571.106 61.8396 570.567 61.3353 570.251 60.8046H580.235L581.791 64.8379ZM363.267 122.964C368.744 122.964 374.118 122.686 379.305 122.152C384.482 121.618 389.461 120.829 394.16 119.802C398.841 118.781 403.235 117.525 407.261 116.058C411.266 114.598 414.899 112.93 418.086 111.075H517.515L503.308 60.8046H568.252C568.607 61.4458 569.24 62.0568 570.093 62.615C570.947 63.1749 572.022 63.6825 573.256 64.1158C574.493 64.5503 575.888 64.91 577.383 65.174C578.88 65.4374 580.475 65.6051 582.106 65.6546L627.78 209.293H446.171C445.246 203.458 442.148 197.999 437.378 193.115C432.68 188.307 426.347 184.041 418.829 180.503C411.398 177.007 402.776 174.206 393.373 172.287C384.028 170.379 373.859 169.329 363.233 169.329C352.604 169.329 342.431 170.379 333.082 172.287C323.675 174.206 315.048 177.007 307.611 180.503C300.088 184.041 293.749 188.307 289.046 193.115C284.27 197.999 281.165 203.458 280.234 209.293H98.6256L144.511 65.6618C146.176 65.6282 147.806 65.4709 149.339 65.2119C150.871 64.954 152.303 64.5954 153.572 64.1587C154.839 63.7237 155.944 63.2106 156.821 62.6436C157.696 62.0772 158.346 61.4568 158.708 60.8046H223.652L209.403 111.075H308.467C311.651 112.93 315.282 114.598 319.284 116.058C323.308 117.525 327.7 118.781 332.379 119.802C337.076 120.829 342.055 121.618 347.231 122.152C352.417 122.686 357.792 122.964 363.267 122.964ZM297.093 76.6405H429.854L427.798 60.8046H501.306L515.04 110.103H419.755H306.799H211.879L225.653 60.8046H299.161L297.093 76.6405ZM299.265 75.7836L301.161 60.8046H336.835H390.125H425.789L427.672 75.7836H299.265ZM145.165 64.8379L146.725 60.8046H156.708C156.393 61.3353 155.852 61.8396 155.135 62.3016C154.417 62.7646 153.521 63.1837 152.495 63.5433C151.468 63.903 150.311 64.2022 149.073 64.4238C147.835 64.646 146.515 64.7895 145.165 64.8379ZM363.269 121.943C358.125 121.943 353.073 121.692 348.191 121.205C343.317 120.72 338.62 120 334.174 119.064C329.743 118.131 325.569 116.984 321.725 115.641C317.9 114.306 314.406 112.777 311.313 111.075H415.239C412.144 112.777 408.647 114.306 404.819 115.641C400.972 116.984 396.796 118.131 392.363 119.064C387.916 120 383.217 120.72 378.342 121.205C373.46 121.692 368.41 121.943 363.269 121.943ZM282.847 209.293C283.732 203.642 286.722 198.352 291.336 193.618C295.88 188.955 302.014 184.816 309.3 181.383C316.504 177.987 324.865 175.268 333.988 173.404C343.054 171.55 352.922 170.531 363.232 170.531C373.542 170.531 383.408 171.55 392.472 173.404C401.591 175.268 409.948 177.987 417.148 181.383C424.428 184.816 430.556 188.955 435.093 193.618C439.699 198.352 442.682 203.642 443.558 209.293H367.321C367.183 209.081 366.983 208.883 366.734 208.705C366.484 208.527 366.184 208.37 365.844 208.24C365.505 208.109 365.125 208.005 364.717 207.934C364.308 207.863 363.87 207.825 363.413 207.825C362.959 207.825 362.524 207.863 362.116 207.934C361.709 208.005 361.331 208.109 360.992 208.24C360.653 208.37 360.353 208.527 360.103 208.705C359.854 208.883 359.655 209.081 359.516 209.293H282.847ZM363.168 256.496C375.331 256.496 386.885 255.126 397.314 252.663C407.668 250.217 416.848 246.707 424.393 242.419C431.843 238.184 437.665 233.209 441.455 227.768C445.183 222.416 446.933 216.629 446.347 210.66H628.307L712.815 471.791C709.952 471.954 707.383 472.506 705.174 473.378C702.96 474.252 701.105 475.449 699.675 476.9C698.242 478.355 697.237 480.068 696.732 481.969C696.224 483.878 696.22 485.979 696.794 488.201H624.102L585.833 352.799H442.246C437.034 348.963 431.327 345.568 425.237 342.637C419.193 339.727 412.757 337.268 406.036 335.285C399.348 333.312 392.361 331.806 385.174 330.794C378.006 329.784 370.621 329.264 363.113 329.264C355.607 329.264 348.221 329.784 341.051 330.794C333.862 331.806 326.873 333.312 320.182 335.285C313.457 337.268 307.018 339.727 300.969 342.637C294.875 345.568 289.163 348.963 283.945 352.799H140.885L102.506 488.201H29.8136C30.3983 485.941 30.3857 483.807 29.853 481.873C29.3221 479.947 28.2754 478.216 26.7885 476.755C25.3061 475.298 23.3848 474.106 21.096 473.251C18.8122 472.397 16.1597 471.879 13.2073 471.767L98.0959 210.66H280.056C279.459 216.629 281.198 222.416 284.916 227.768C288.696 233.209 294.51 238.184 301.955 242.419C309.493 246.707 318.668 250.217 329.021 252.663C339.447 255.126 351.001 256.496 363.168 256.496ZM363.411 212.142C363.871 212.142 364.312 212.103 364.723 212.031C365.135 211.958 365.515 211.853 365.857 211.721C366.197 211.589 366.497 211.431 366.746 211.252C366.995 211.074 367.193 210.873 367.328 210.66H443.728C444.269 216.437 442.55 222.036 438.92 227.21C435.233 232.467 429.583 237.272 422.366 241.36C415.059 245.497 406.177 248.882 396.165 251.241C386.085 253.616 374.92 254.936 363.169 254.936C351.417 254.936 340.255 253.616 330.177 251.241C320.169 248.882 311.293 245.497 303.992 241.36C296.78 237.272 291.139 232.467 287.459 227.21C283.836 222.036 282.125 216.437 282.675 210.66H359.507C359.643 210.873 359.841 211.074 360.09 211.252C360.338 211.431 360.638 211.589 360.977 211.721C361.317 211.853 361.697 211.958 362.107 212.031C362.516 212.103 362.954 212.142 363.411 212.142ZM288.055 352.799C293.061 349.276 298.513 346.159 304.308 343.468C310.065 340.795 316.175 338.537 322.544 336.717C328.883 334.905 335.493 333.522 342.284 332.593C349.059 331.666 356.03 331.189 363.112 331.189C370.191 331.189 377.159 331.666 383.931 332.593C390.721 333.522 397.329 334.905 403.666 336.717C410.033 338.537 416.14 340.795 421.894 343.468C427.688 346.159 433.135 349.276 438.136 352.799H288.055ZM106.237 488.201L143.5 354.835H281.177H445.011H583.217L620.37 488.201H483.267L476.719 437.747H249.93L243.341 488.201H106.237ZM247.071 488.201L253.14 440.248H473.491L479.519 488.201H247.071ZM700.525 488.201C700.077 486.362 700.1 484.623 700.532 483.039C700.962 481.461 701.8 480.037 702.988 478.822C704.174 477.61 705.71 476.607 707.539 475.864C709.366 475.123 711.488 474.643 713.852 474.479L719.146 488.201H700.525ZM7.46219 488.201L12.7672 474.479C15.1311 474.643 17.2528 475.123 19.0783 475.864C20.9076 476.607 22.442 477.61 23.6264 478.822C24.814 480.037 25.651 481.461 26.0799 483.039C26.5112 484.623 26.5312 486.362 26.083 488.201H7.46219Z" fill="white"/>
                    </g>
                  </g>
                  <defs>
                    <clipPath id="clip0_252_1910">
                      <rect width="728" height="547" fill="white"/>
                    </clipPath>
                    <clipPath id="clip1_252_1910">
                      <rect width="728" height="504" fill="white" transform="translate(0 43)"/>
                    </clipPath>
                  </defs>
                </svg>
              </div>
              
              {/* Formation Header */}
              <div className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2 sm:mb-4 flex flex-col sm:flex-row items-center justify-between gap-2 animate-in slide-in-from-top-2 duration-500`}>
                <div className="flex items-center gap-2">
                  {/* <span>{team.name}</span> */}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs sm:text-sm ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-white/20 text-gray-700'}`}>{getFormation()}</span>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs sm:text-sm ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-white/20 text-gray-700'}`}>
                    <span>Captain: {team.players.find(p => p.isCaptain)?.name || 'Not Set'}</span>
                  </div>
                </div>
              </div>


              {/* Current Matches Section - Hidden on Mobile */}
              {currentGameweek && currentGameweek.externalMatches && currentGameweek.externalMatches.length > 0 && (
                <div className="hidden sm:block mb-4 sm:mb-6">
                  <h3 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'} mb-3 sm:mb-4`}></h3>
                  <div className="grid gap-2 sm:gap-3">
                    {currentGameweek.externalMatches.map((match, index) => (
                      <div key={match._id} className={`${isDark ? 'bg-black/20 border-gray-600/30' : 'bg-white/20 border-gray-300/50'} backdrop-blur-sm rounded-lg p-3 sm:p-4 border`}>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 sm:space-x-4">
                            <img src={match.teams.home.logo} alt={match.teams.home.name} className="w-6 h-6 sm:w-8 sm:h-8" />
                            <span className={`${isDark ? 'text-white' : 'text-gray-800'} font-medium text-sm sm:text-base`}>{match.teams.home.name}</span>
                          </div>
                          <div className="text-center">
                            <div className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {new Date(match.fixture.date).toLocaleDateString()}
                            </div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(match.fixture.date).toLocaleTimeString()}
                            </div>
                            <div className={`text-xs mt-1 px-2 py-1 rounded-full ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                              {match.fixture.status.long}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 sm:space-x-4">
                            <span className={`${isDark ? 'text-white' : 'text-gray-800'} font-medium text-sm sm:text-base`}>{match.teams.away.name}</span>
                            <img src={match.teams.away.logo} alt={match.teams.away.name} className="w-6 h-6 sm:w-8 sm:h-8" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced Formation Grid - Show 11 starters in selected formation */}
              <div className="grid grid-rows-5 gap-2 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8 mb-4 flex-1 px-2 sm:px-4 md:px-5 lg:px-6 xl:px-8 py-3 sm:py-5 md:py-6 lg:py-8 xl:py-12" style={{minHeight: 320}}>
                {/* Forwards Row - Show forwards based on formation */}
                <div className="flex justify-around items-center">
                  {getFormationPlayers().forwards.slice(0, getFormationPositions(getFormation()).forwards).map((player, playerIndex) => (
                    <div key={player._id} className="flex flex-col items-center group">
                      <div className={`relative transition-all duration-300 ${
                        draggedPlayer?._id === player._id ? 'opacity-50 scale-95' : 'group-hover:scale-110 group-hover:z-10'
                      }`}>
                        <div 
                          className={`w-12 h-12 sm:w-16 sm:h-16 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full text-white text-xs sm:text-sm flex items-center justify-center border-2 cursor-pointer transition-all duration-300 backdrop-blur-sm shadow-2xl hover:shadow-3xl group-hover:shadow-green-500/25 ${
                            draggedPlayer && dragOverPlayer?._id === player._id
                              ? isValidSubstitution(draggedPlayer, player)
                                ? 'bg-green-500/40 border-green-400/70 ring-4 ring-green-300/50 scale-110'
                                : 'bg-red-500/40 border-red-400/70 ring-4 ring-red-300/50 scale-110'
                              : 'bg-gradient-to-br from-red-500/30 to-red-600/30 border-red-400/50 hover:from-red-500/50 hover:to-red-600/50 hover:border-red-400/70'
                          }`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, player)}
                          onDragOver={(e) => handlePlayerDragOver(e, player)}
                          onDragLeave={handlePlayerDragLeave}
                          onDrop={(e) => handleDrop(e, player)}
                          onClick={() => handleCaptainSelect(player)}
                          onMouseEnter={() => setHoveredPlayer(player._id)}
                          onMouseLeave={() => setHoveredPlayer(null)}
                          title="Drag to move or click to make captain"
                        >
                          {player.photo ? (
                            <img 
                              src={player.photo} 
                              alt={player.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-lg">
                              {player.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                          )}
                          
                          {/* Hover effect overlay */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                        
                        {/* Position Badge */}
                        <span className="absolute -bottom-1 -right-1 text-xs text-white px-1.5 py-0.5 rounded-full border min-w-[20px] text-center font-bold bg-gradient-to-r from-red-600 to-red-700 border-red-400 shadow-md">
                          {(player.position === 'Attacker' || player.position === 'Forward') ? 'FWD' : 
                           player.position === 'Midfielder' ? 'MID' : 
                           player.position === 'Defender' ? 'DEF' : 
                           player.position === 'Goalkeeper' ? 'GK' : 'FWD'}
                        </span>
                        
                        {/* Captain Badge */}
                        {player.isCaptain && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-xs font-bold shadow-md border border-yellow-300 animate-pulse">
                            C
                          </div>
                        )}
                        
                          {/* Points Badge */}
                          <div className="absolute -top-2 -left-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs sm:text-sm font-bold px-2 py-1 rounded-full shadow-lg border-2 border-white/20 backdrop-blur-sm">
                            {getPlayerPoints(player._id)}
                      </div>
                      </div>
                      
                      {/* Player Name */}
                      <div className={`text-xs sm:text-sm ${isDark ? 'text-white group-hover:text-yellow-300' : 'text-gray-800 group-hover:text-yellow-600'} mt-1 sm:mt-2 md:mt-3 max-w-[70px] sm:max-w-[90px] md:max-w-[110px] lg:max-w-[120px] text-center font-semibold transition-colors duration-300 leading-tight`} title={player.name}>
                        {player.name.split(' ').length > 1 
                          ? `${player.name.split(' ')[0]} ${player.name.split(' ')[1][0]}.`
                          : player.name
                        }
                      </div>
                      
                      {/* Player Stats on Hover */}
                      {hoveredPlayer === player._id && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black/90 backdrop-blur-sm rounded-lg p-3 shadow-2xl border border-gray-600/50 z-10 min-w-[200px]">
                          <div className="text-xs text-gray-300 space-y-1">
                            <div className="font-semibold text-white mb-2">{player.name}</div>
                            <div>Position: {player.position}</div>
                            <div>Team: {player.team}</div>
                            <div>Price: ${player.price}M</div>
                            {player.age && <div>Age: {player.age}</div>}
                            <div className="pt-2 border-t border-gray-600">
                              <div className="text-green-400 font-bold">Points: {getPlayerPoints(player._id)}</div>
                      </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Midfielders Row - Show midfielders based on formation */}
                <div className="flex justify-around items-center">
                  {getFormationPlayers().midfielders.slice(0, getFormationPositions(getFormation()).midfielders).map((player, playerIndex) => (
                    <div key={player._id} className="flex flex-col items-center group">
                      <div className={`relative transition-all duration-300 ${
                        draggedPlayer?._id === player._id ? 'opacity-50 scale-95' : 'group-hover:scale-110 group-hover:z-10'
                      }`}>
                        <div 
                          className={`w-12 h-12 sm:w-16 sm:h-16 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full text-white text-xs sm:text-sm flex items-center justify-center border-2 cursor-pointer transition-all duration-300 backdrop-blur-sm shadow-2xl hover:shadow-3xl ${
                            draggedPlayer && dragOverPlayer?._id === player._id
                              ? isValidSubstitution(draggedPlayer, player)
                                ? 'bg-green-500/40 border-green-400/70 ring-4 ring-green-300/50 scale-110'
                                : 'bg-red-500/40 border-red-400/70 ring-4 ring-red-300/50 scale-110'
                              : 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/30 border-yellow-400/50 hover:from-yellow-500/50 hover:to-yellow-600/50 hover:border-yellow-400/70'
                          }`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, player)}
                          onDragOver={(e) => handlePlayerDragOver(e, player)}
                          onDragLeave={handlePlayerDragLeave}
                          onDrop={(e) => handleDrop(e, player)}
                          onClick={() => handleCaptainSelect(player)}
                          onMouseEnter={() => setHoveredPlayer(player._id)}
                          onMouseLeave={() => setHoveredPlayer(null)}
                          title="Drag to move or click to make captain"
                        >
                          {player.photo ? (
                            <img 
                              src={player.photo} 
                              alt={player.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-white font-bold text-lg">
                              {player.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                          )}
                          
                          {/* Hover effect overlay */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                        
                        {/* Position Badge */}
                        <span className="absolute -bottom-2 -right-2 text-xs text-white px-2 py-1 rounded-full border-2 min-w-[32px] text-center font-bold bg-gradient-to-r from-yellow-600 to-yellow-700 border-yellow-400 shadow-lg">
                          {(player.position === 'Attacker' || player.position === 'Forward') ? 'FWD' : 
                           player.position === 'Midfielder' ? 'MID' : 
                           player.position === 'Defender' ? 'DEF' : 
                           player.position === 'Goalkeeper' ? 'GK' : 'MID'}
                        </span>
                        
                        {/* Captain Badge */}
                        {player.isCaptain && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-xs font-bold shadow-md border border-yellow-300 animate-pulse">
                            C
                          </div>
                        )}
                        
                          {/* Points Badge */}
                          <div className="absolute -top-2 -left-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs sm:text-sm font-bold px-2 py-1 rounded-full shadow-lg border-2 border-white/20 backdrop-blur-sm">
                            {getPlayerPoints(player._id)}
                      </div>
                      </div>
                      
                      {/* Player Name */}
                      <div className={`text-xs sm:text-sm ${isDark ? 'text-white group-hover:text-yellow-300' : 'text-gray-800 group-hover:text-yellow-600'} mt-1 sm:mt-2 md:mt-3 max-w-[70px] sm:max-w-[90px] md:max-w-[110px] lg:max-w-[120px] text-center font-semibold transition-colors duration-300 leading-tight`} title={player.name}>
                        {player.name.split(' ').length > 1 
                          ? `${player.name.split(' ')[0]} ${player.name.split(' ')[1][0]}.`
                          : player.name
                        }
                      </div>
                      
                      {/* Player Stats on Hover */}
                      {hoveredPlayer === player._id && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black/90 backdrop-blur-sm rounded-lg p-3 shadow-2xl border border-gray-600/50 z-10 min-w-[200px]">
                          <div className="text-xs text-gray-300 space-y-1">
                            <div className="font-semibold text-white mb-2">{player.name}</div>
                            <div>Position: {player.position}</div>
                            <div>Team: {player.team}</div>
                            <div>Price: ${player.price}M</div>
                            {player.age && <div>Age: {player.age}</div>}
                            <div className="pt-2 border-t border-gray-600">
                              <div className="text-green-400 font-bold">Points: {getPlayerPoints(player._id)}</div>
                      </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Defenders Row - Show defenders based on formation */}
                <div className="flex justify-around items-center">
                  {getFormationPlayers().defenders.slice(0, getFormationPositions(getFormation()).defenders).map((player, playerIndex) => (
                    <div key={player._id} className="flex flex-col items-center group">
                      <div className={`relative transition-all duration-300 ${
                        draggedPlayer?._id === player._id ? 'opacity-50 scale-95' : 'group-hover:scale-110 group-hover:z-10'
                      }`}>
                        <div 
                          className={`w-12 h-12 sm:w-16 sm:h-16 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full text-white text-xs sm:text-sm flex items-center justify-center border-2 cursor-pointer transition-all duration-300 backdrop-blur-sm shadow-2xl hover:shadow-3xl ${
                            draggedPlayer && dragOverPlayer?._id === player._id
                              ? isValidSubstitution(draggedPlayer, player)
                                ? 'bg-green-500/40 border-green-400/70 ring-4 ring-green-300/50 scale-110'
                                : 'bg-red-500/40 border-red-400/70 ring-4 ring-red-300/50 scale-110'
                              : 'bg-gradient-to-br from-blue-500/30 to-blue-600/30 border-blue-400/50 hover:from-blue-500/50 hover:to-blue-600/50 hover:border-blue-400/70'
                          }`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, player)}
                          onDragOver={(e) => handlePlayerDragOver(e, player)}
                          onDragLeave={handlePlayerDragLeave}
                          onDrop={(e) => handleDrop(e, player)}
                          onClick={() => handleCaptainSelect(player)}
                          onMouseEnter={() => setHoveredPlayer(player._id)}
                          onMouseLeave={() => setHoveredPlayer(null)}
                          title="Drag to move or click to make captain"
                        >
                          {player.photo ? (
                            <img 
                              src={player.photo} 
                              alt={player.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                              {player.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                          )}
                          
                          {/* Hover effect overlay */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                        
                        {/* Position Badge */}
                        <span className="absolute -bottom-2 -right-2 text-xs text-white px-2 py-1 rounded-full border-2 min-w-[32px] text-center font-bold bg-gradient-to-r from-blue-600 to-blue-700 border-blue-400 shadow-lg">
                          {(player.position === 'Attacker' || player.position === 'Forward') ? 'FWD' : 
                           player.position === 'Midfielder' ? 'MID' : 
                           player.position === 'Defender' ? 'DEF' : 
                           player.position === 'Goalkeeper' ? 'GK' : 'DEF'}
                        </span>
                        
                        {/* Captain Badge */}
                        {player.isCaptain && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-xs font-bold shadow-md border border-yellow-300 animate-pulse">
                            C
                          </div>
                        )}
                        
                          {/* Points Badge */}
                          <div className="absolute -top-2 -left-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs sm:text-sm font-bold px-2 py-1 rounded-full shadow-lg border-2 border-white/20 backdrop-blur-sm">
                            {getPlayerPoints(player._id)}
                      </div>
                      </div>
                      
                      {/* Player Name */}
                      <div className={`text-xs sm:text-sm ${isDark ? 'text-white group-hover:text-yellow-300' : 'text-gray-800 group-hover:text-yellow-600'} mt-1 sm:mt-2 md:mt-3 max-w-[70px] sm:max-w-[90px] md:max-w-[110px] lg:max-w-[120px] text-center font-semibold transition-colors duration-300 leading-tight`} title={player.name}>
                        {player.name.split(' ').length > 1 
                          ? `${player.name.split(' ')[0]} ${player.name.split(' ')[1][0]}.`
                          : player.name
                        }
                      </div>
                      
                      {/* Player Stats on Hover */}
                      {hoveredPlayer === player._id && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black/90 backdrop-blur-sm rounded-lg p-3 shadow-2xl border border-gray-600/50 z-10 min-w-[200px]">
                          <div className="text-xs text-gray-300 space-y-1">
                            <div className="font-semibold text-white mb-2">{player.name}</div>
                            <div>Position: {player.position}</div>
                            <div>Team: {player.team}</div>
                            <div>Price: ${player.price}M</div>
                            {player.age && <div>Age: {player.age}</div>}
                            <div className="pt-2 border-t border-gray-600">
                              <div className="text-green-400 font-bold">Points: {getPlayerPoints(player._id)}</div>
                      </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Goalkeeper Row - Show 1 goalkeeper */}
                <div className="flex justify-center items-center">
                  {getFormationPlayers().goalkeepers.slice(0, 1).map((player, playerIndex) => (
                    <div key={player._id} className="flex flex-col items-center group">
                      <div className={`relative transition-all duration-300 ${
                        draggedPlayer?._id === player._id ? 'opacity-50 scale-95' : 'group-hover:scale-110 group-hover:z-10'
                      }`}>
                        <div 
                          className={`w-12 h-12 sm:w-16 sm:h-16 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full text-white text-xs sm:text-sm flex items-center justify-center border-2 cursor-pointer transition-all duration-300 backdrop-blur-sm shadow-2xl hover:shadow-3xl ${
                            draggedPlayer && dragOverPlayer?._id === player._id
                              ? isValidSubstitution(draggedPlayer, player)
                                ? 'bg-green-500/40 border-green-400/70 ring-4 ring-green-300/50 scale-110'
                                : 'bg-red-500/40 border-red-400/70 ring-4 ring-red-300/50 scale-110'
                              : 'bg-gradient-to-br from-green-500/30 to-green-600/30 border-green-400/50 hover:from-green-500/50 hover:to-green-600/50 hover:border-green-400/70'
                          }`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, player)}
                          onDragOver={(e) => handlePlayerDragOver(e, player)}
                          onDragLeave={handlePlayerDragLeave}
                          onDrop={(e) => handleDrop(e, player)}
                          onClick={() => handleCaptainSelect(player)}
                          onMouseEnter={() => setHoveredPlayer(player._id)}
                          onMouseLeave={() => setHoveredPlayer(null)}
                          title="Drag to move or click to make captain"
                        >
                          {player.photo ? (
                            <img 
                              src={player.photo} 
                              alt={player.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                              {player.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                          )}
                          
                          {/* Hover effect overlay */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                        
                        {/* Position Badge */}
                        <span className="absolute -bottom-2 -right-2 text-xs text-white px-2 py-1 rounded-full border-2 min-w-[32px] text-center font-bold bg-gradient-to-r from-green-600 to-green-700 border-green-400 shadow-lg">
                          {(player.position === 'Attacker' || player.position === 'Forward') ? 'FWD' : 
                           player.position === 'Midfielder' ? 'MID' : 
                           player.position === 'Defender' ? 'DEF' : 
                           player.position === 'Goalkeeper' ? 'GK' : 'GK'}
                        </span>
                        
                        {/* Captain Badge */}
                        {player.isCaptain && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-xs font-bold shadow-md border border-yellow-300 animate-pulse">
                            C
                          </div>
                        )}
                        
                          {/* Points Badge */}
                          <div className="absolute -top-2 -left-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs sm:text-sm font-bold px-2 py-1 rounded-full shadow-lg border-2 border-white/20 backdrop-blur-sm">
                            {getPlayerPoints(player._id)}
                      </div>
                      </div>
                      
                      {/* Player Name */}
                      <div className={`text-xs sm:text-sm ${isDark ? 'text-white group-hover:text-yellow-300' : 'text-gray-800 group-hover:text-yellow-600'} mt-1 sm:mt-2 md:mt-3 max-w-[70px] sm:max-w-[90px] md:max-w-[110px] lg:max-w-[120px] text-center font-semibold transition-colors duration-300 leading-tight`} title={player.name}>
                        {player.name.split(' ').length > 1 
                          ? `${player.name.split(' ')[0]} ${player.name.split(' ')[1][0]}.`
                          : player.name
                        }
                      </div>
                      
                      {/* Player Stats on Hover */}
                      {hoveredPlayer === player._id && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black/90 backdrop-blur-sm rounded-lg p-3 shadow-2xl border border-gray-600/50 z-10 min-w-[200px]">
                          <div className="text-xs text-gray-300 space-y-1">
                            <div className="font-semibold text-white mb-2">{player.name}</div>
                            <div>Position: {player.position}</div>
                            <div>Team: {player.team}</div>
                            <div>Price: ${player.price}M</div>
                            {player.age && <div>Age: {player.age}</div>}
                            <div className="pt-2 border-t border-gray-600">
                              <div className="text-green-400 font-bold">Points: {getPlayerPoints(player._id)}</div>
                      </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced Substitutes Button */}
              <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2">
                <button 
                  onClick={() => setShowSubstitutes(!showSubstitutes)}
                  className={`group backdrop-blur-sm border-2 rounded-xl sm:rounded-2xl px-4 sm:px-8 py-3 sm:py-4 transition-all duration-300 flex items-center gap-2 sm:gap-3 shadow-2xl hover:shadow-3xl hover:scale-105 ${
                    isDark 
                      ? 'bg-gradient-to-r from-white/20 to-white/10 border-white/30 text-white hover:from-white/30 hover:to-white/20 hover:border-white/50'
                      : 'bg-gradient-to-r from-white/40 to-white/20 border-white/50 text-gray-800 hover:from-white/50 hover:to-white/30 hover:border-white/70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-xs sm:text-sm font-semibold">
                    Substitutes ({getSubstitutes().length}/4)
                  </span>
                  </div>
                  <svg 
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${showSubstitutes ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Advanced Substitutes Panel */}
              {showSubstitutes && (
                <div className={`absolute bottom-16 sm:bottom-24 left-1/2 transform -translate-x-1/2 backdrop-blur-md border-2 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${
                  isDark 
                    ? 'bg-gradient-to-r from-black/90 to-gray-900/90 border-white/20'
                    : 'bg-gradient-to-r from-white/95 to-gray-50/95 border-gray-200/50'
                }`}>
                  <div className={`text-base sm:text-lg ${isDark ? 'text-white' : 'text-gray-800'} mb-3 sm:mb-4 font-bold text-center`}>
                    Substitutes ({getSubstitutes().length}/4)
                  </div>
                  <div className="grid grid-cols-4 gap-1 sm:gap-2 md:gap-4">
                    {getSubstitutes().map((player, idx) => (
                      <div key={player._id} className="flex flex-col items-center group">
                        <div className={`relative transition-all duration-300 ${
                          draggedPlayer?._id === player._id ? 'opacity-50 scale-95' : 'group-hover:scale-110'
                        }`} title={player.name}>
                          <div 
                            className={`w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full text-white text-xs flex items-center justify-center border-2 cursor-pointer transition-all duration-300 backdrop-blur-sm shadow-xl hover:shadow-2xl ${
                              draggedPlayer && dragOverPlayer?._id === player._id
                                ? isValidSubstitution(draggedPlayer, player)
                                  ? 'bg-green-500/40 border-green-400/70 ring-4 ring-green-300/50 scale-110'
                                  : 'bg-red-500/40 border-red-400/70 ring-4 ring-red-300/50 scale-110'
                                : 'bg-gradient-to-br from-gray-500/30 to-gray-600/30 border-gray-400/50 hover:from-gray-500/50 hover:to-gray-600/50 hover:border-gray-400/70'
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, player)}
                            onDragOver={(e) => handlePlayerDragOver(e, player)}
                            onDragLeave={handlePlayerDragLeave}
                            onDrop={(e) => handleDrop(e, player)}
                            onClick={() => handleCaptainSelect(player)}
                            onMouseEnter={() => setHoveredPlayer(player._id)}
                            onMouseLeave={() => setHoveredPlayer(null)}
                            title="Drag to substitute or click to make captain"
                          >
                            {player.photo ? (
                              <img 
                                src={player.photo} 
                                alt={player.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white font-bold text-sm">
                                {player.name.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                            )}
                            
                            {/* Hover effect overlay */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                          
                          {/* Position Badge */}
                          <span className="absolute -bottom-1 -right-1 text-xs text-white px-1.5 py-0.5 rounded-full border min-w-[18px] text-center font-bold bg-gradient-to-r from-gray-600 to-gray-700 border-gray-400 shadow-md">
                            {(player.position === 'Attacker' || player.position === 'Forward') ? 'FWD' : 
                             player.position === 'Midfielder' ? 'MID' : 
                             player.position === 'Defender' ? 'DEF' : 
                             player.position === 'Goalkeeper' ? 'GK' : 'SUB'}
                          </span>
                          
                          {/* Captain Badge */}
                          {player.isCaptain && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-xs font-bold shadow-md border border-yellow-300 animate-pulse">
                              C
                            </div>
                          )}
                          
                          {/* Points Badge */}
                          <div className="absolute -top-2 -left-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs sm:text-sm font-bold px-2 py-1 rounded-full shadow-lg border-2 border-white/20 backdrop-blur-sm">
                            {getPlayerPoints(player._id)}
                        </div>
                        </div>
                        
                        {/* Player Name */}
                        <div className={`text-xs ${isDark ? 'text-gray-300 group-hover:text-yellow-300' : 'text-gray-600 group-hover:text-yellow-600'} mt-1 sm:mt-2 w-14 sm:w-16 md:w-20 text-center leading-tight break-words whitespace-normal max-h-4 sm:max-h-6 md:max-h-8 overflow-hidden transition-colors duration-300 font-medium`} title={player.name}>
                          {player.name.split(' ').length > 1 
                            ? `${player.name.split(' ')[0]} ${player.name.split(' ')[1][0]}.`
                            : player.name
                          }
                        </div>
                        
                        {/* Player Stats on Hover */}
                        {hoveredPlayer === player._id && (
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black/90 backdrop-blur-sm rounded-lg p-3 shadow-2xl border border-gray-600/50 z-10 min-w-[180px]">
                            <div className="text-xs text-gray-300 space-y-1">
                              <div className="font-semibold text-white mb-2">{player.name}</div>
                              <div>Position: {player.position}</div>
                              <div>Team: {player.team}</div>
                              <div>Price: ${player.price}M</div>
                              {player.age && <div>Age: {player.age}</div>}
                              <div className="pt-2 border-t border-gray-600">
                                <div className="text-green-400 font-bold">Points: {getPlayerPoints(player._id)}</div>
                        </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Fill empty substitute slots */}
                    {Array.from({ length: 4 - getSubstitutes().length }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="flex flex-col items-center">
                        <div className={`w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full border-2 border-dashed backdrop-blur-sm flex items-center justify-center transition-colors duration-300 ${
                          isDark 
                            ? 'border-gray-400/30 bg-gray-500/10 hover:border-gray-400/50'
                            : 'border-gray-300/50 bg-gray-100/50 hover:border-gray-400/70'
                        }`}>
                          <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm sm:text-lg`}>+</span>
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-1 sm:mt-2 w-16 sm:w-20 text-center`}>
                          Empty
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}
          </div>

        </div>

        {/* Advanced Back to Fantasy */}
        <div className="mt-6 sm:mt-12 text-center">
          <Link
            href="/fantasy"
            className={`group inline-flex items-center gap-2 sm:gap-3 backdrop-blur-sm border rounded-xl sm:rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 px-6 sm:px-8 py-3 sm:py-4 ${
              isDark 
                ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-400/30 hover:from-blue-500/30 hover:to-blue-600/30 hover:border-blue-400/50 text-blue-400 hover:text-blue-300'
                : 'bg-gradient-to-r from-blue-100 to-blue-200 border-blue-300 hover:from-blue-200 hover:to-blue-300 hover:border-blue-400 text-blue-700 hover:text-blue-800'
            }`}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm sm:text-base">Back to Fantasy Overview</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
