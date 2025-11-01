'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

interface MatchCardProps {
  match: {
    _id: string;
    homeTeam: {
      name: string;
      logo: string;
    };
    awayTeam: {
      name: string;
      logo: string;
    };
    scoreA: number;
    scoreB: number;
    date: string;
    tournament: {
      name: string;
      country: string;
    };
    status: string;
    minute: number;
    venue: string;
    stats?: {
      possession: {
        home: number;
        away: number;
      };
      shots: {
        home: number;
        away: number;
      };
      shotsOnTarget: {
        home: number;
        away: number;
      };
    };
    likes?: number;
    likedByUser?: boolean;
  };
}

export default function MatchCard({ match }: MatchCardProps) {
  const { theme } = useTheme();
  const [isLiked, setIsLiked] = useState(match.likedByUser || false);
  const [likeCount, setLikeCount] = useState(match.likes || 0);
  const [showStats, setShowStats] = useState(false);

  // Format time from date string
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Format date from date string
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

  // Handle like toggle
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLikeStatus = !isLiked;
    setIsLiked(newLikeStatus);
    setLikeCount(prev => newLikeStatus ? prev + 1 : prev - 1);
    
    // Here you would typically make an API call to update the like status
    // await fetch(`/api/matches/${match._id}/like`, { method: 'POST' });
  };


  return (
    <div 
      className={`flex flex-col rounded-[12px] p-[12px] gap-[8px] w-full sm:w-[336px] sm:min-w-[300px] h-[200px] sm:h-[220px] border border-l-[2px] border-l-blue-500 flex-shrink-0 hover:scale-[1.02] transition-all duration-300 cursor-pointer group ${
        theme === 'dark' 
          ? 'bg-[#252323] shadow-[4px_4px_8px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_12px_0px_rgba(0,0,0,0.4)]' 
          : 'bg-white shadow-[4px_4px_8px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_12px_0px_rgba(0,0,0,0.2)]'
      }`}
      onClick={() => setShowStats(!showStats)}
    >
      {/* Top Section - Time, League, and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{formatTime(match.date)}</span>
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{formatDate(match.date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLike}
            className={`p-1 rounded-full transition-colors duration-200 ${
              isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{likeCount}</span>
        </div>
      </div>

      {/* League and Country */}
      <div className="flex justify-between items-center">
        <span className="text-blue-400 font-medium text-xs">{match.tournament.name}</span>
        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{match.tournament.country}</span>
      </div>

      {/* Teams Section */}
      <div className="flex flex-col gap-[8px] flex-1">
        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative">
              <Image
                src={match.homeTeam.logo}
                alt={`${match.homeTeam.name} logo`}
                fill
                className="object-contain rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-yellow-500 flex items-center justify-center text-white text-sm font-bold">${match.homeTeam.name.charAt(0)}</div>`;
                  }
                }}
              />
            </div>
            <span className={`font-medium text-sm truncate max-w-[100px] sm:max-w-[140px] ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{match.homeTeam.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{formatScore(match.scoreA, match.status)}</span>
          </div>
        </div>

        {/* VS Separator */}
        <div className="flex justify-center">
          <div className={`w-8 h-px ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative">
              <Image
                src={match.awayTeam.logo}
                alt={`${match.awayTeam.name} logo`}
                fill
                className="object-contain rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">${match.awayTeam.name.charAt(0)}</div>`;
                  }
                }}
              />
            </div>
            <span className={`font-medium text-sm truncate max-w-[100px] sm:max-w-[140px] ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{match.awayTeam.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{formatScore(match.scoreB, match.status)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Section - Venue */}
      <div className={`flex items-center justify-between text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
        <span className={`truncate max-w-[150px] sm:max-w-[200px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{match.venue}</span>
        <button className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
