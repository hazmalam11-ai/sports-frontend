'use client';

import { useState, useEffect, useRef } from 'react';
import MatchCard from './MatchCard';
import LoadingAnimation from './LoadingAnimation';
import { useTheme } from '@/contexts/ThemeContext';
import { API_BASE } from '@/lib/api';

interface Match {
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
}

interface MatchCardsContainerProps {
  selectedDate: string;
}

export default function MatchCardsContainer({ selectedDate }: MatchCardsContainerProps) {
  const { theme } = useTheme();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate requests using ref for immediate check
    if (fetchingRef.current) return;
    
    fetchingRef.current = true;
    let aborted = false;
    
    const fetchData = async () => {
      try {
        await fetchMatches();
        if (aborted) return;
      } finally {
        if (!aborted) fetchingRef.current = false;
      }
    };
    
    fetchData();
    return () => { 
      aborted = true;
      fetchingRef.current = false;
    };
  }, [selectedDate]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate the date based on selectedDate
      const today = new Date();
      let targetDate: Date;
      
      switch (selectedDate) {
        case 'Yesterday':
          targetDate = new Date(today);
          targetDate.setDate(today.getDate() - 1);
          break;
        case 'Tomorrow':
          targetDate = new Date(today);
          targetDate.setDate(today.getDate() + 1);
          break;
        case 'Today':
        default:
          targetDate = today;
          break;
      }
      
      // Format date as YYYY-MM-DD
      const dateStr = targetDate.getFullYear() + '-' +
                     String(targetDate.getMonth() + 1).padStart(2, '0') + '-' +
                     String(targetDate.getDate()).padStart(2, '0');
      
      // Get user's timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Use new backend filtering method with date and timezone parameters
      const response = await fetch(`${API_BASE}/matches?date=${dateStr}&timezone=${encodeURIComponent(timezone)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }
      
      const data = await response.json();
      setMatches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingAnimation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 text-sm">Error: {error}</div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-sm">No matches found for {selectedDate.toLowerCase()}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <MatchCard
          key={match._id}
          match={match}
        />
      ))}
    </div>
  );
}