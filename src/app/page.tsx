'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { API_BASE } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  imageUrl: string;
  createdAt: string;
}

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
    id?: number;
    name: string;
    country: string;
    logo: string;
  };
  status: string;
  minute: number;
  venue: string;
}

export default function Home() {
  const { theme } = useTheme();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('Matches');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDate, setSelectedDate] = useState('Today');

  // Function to handle image URLs (same as news page)
  const absoluteImage = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return `${API_BASE}${url}`;
    return `${API_BASE}/${url}`;
  };

  // Function to handle news item clicks
  const handleNewsClick = (newsId: string) => {
    router.push(`/news/${newsId}`);
  };

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch(`${API_BASE}/news`);
        if (response.ok) {
          const data = await response.json();
          setNews(data.slice(0, 5)); // Get top 5 news items
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setNewsLoading(false);
      }
    };

    const fetchMatches = async () => {
      try {
        setMatchesLoading(true);
        const today = new Date();
        let targetDate = new Date(today);
        
        // Adjust date based on selection
        if (selectedDate === 'Yesterday') {
          targetDate.setDate(today.getDate() - 1);
        } else if (selectedDate === 'Tomorrow') {
          targetDate.setDate(today.getDate() + 1);
        }
        
        const dateStr = targetDate.getFullYear() + '-' +
                       String(targetDate.getMonth() + 1).padStart(2, '0') + '-' +
                       String(targetDate.getDate()).padStart(2, '0');
        
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await fetch(`${API_BASE}/matches?date=${dateStr}&timezone=${encodeURIComponent(timezone)}`);
        
        if (response.ok) {
          const data = await response.json();
          setMatches(data);
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setMatchesLoading(false);
      }
    };

    fetchNews();
    fetchMatches();
  }, [selectedDate]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';

  // Dynamic priority order from backend configuration (same as today page)
  const [priorityOrder, setPriorityOrder] = useState<number[]>([]);

  // Fetch priority order from backend (same as today page)
  useEffect(() => {
    const fetchPriorityOrder = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/leagues/priority`);
        if (response.ok) {
          const data = await response.json();
          setPriorityOrder(data.priorityOrder);
        }
      } catch (error) {
        console.error('Error fetching priority order:', error);
        // Fallback to default priority if API fails
        setPriorityOrder([140, 39, 135, 78, 61, 2, 3, 1, 4, 9, 21, 8]);
      }
    };

    fetchPriorityOrder();
  }, []);

  // Memoized Match Component for performance optimization
  const MatchComponent = memo(({ match }: { match: Match }) => {
    const formatTime = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };

    const renderStatus = () => {
      switch (match.status) {
        case 'NS':
          return (
            <div className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              {formatTime(match.date)}
            </div>
          );
        case '1H':
        case 'HT':
        case '2H':
        case 'ET':
        case 'P':
          return (
            <div className="text-center">
              <div className="text-sm font-bold text-emerald-400">
                {match.scoreA ?? 0} - {match.scoreB ?? 0}
              </div>
              <div className="text-xs text-emerald-500 animate-pulse">
                {match.minute}'
              </div>
            </div>
          );
        case 'FT':
        case 'AET':
        case 'PEN':
          return (
            <div className="text-center">
              <div className="text-sm font-bold">
                {match.scoreA} - {match.scoreB}
              </div>
            </div>
          );
        default:
          return (
            <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {match.status}
            </div>
          );
      }
    };

  return (
      <div className="flex items-center justify-between p-3 match-card transition-colors duration-200">
        {/* Home Team */}
        <div className="flex items-center gap-2 w-2/5 justify-end min-w-0">
          <span className={`text-sm font-semibold text-right flex-1 truncate ${textColor}`}>
            {match.homeTeam.name}
          </span>
          <img
            src={match.homeTeam.logo}
            alt={match.homeTeam.name}
            className="w-6 h-6 object-contain flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Match Status/Score */}
        <div className="w-1/5 text-center px-1">
          {renderStatus()}
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-2 w-2/5 min-w-0">
          <img
            src={match.awayTeam.logo}
            alt={match.awayTeam.name}
            className="w-6 h-6 object-contain flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className={`text-sm font-semibold text-left flex-1 truncate ${textColor}`}>
            {match.awayTeam.name}
          </span>
        </div>
      </div>
    );
  });

  MatchComponent.displayName = 'MatchComponent';

  // Group matches by league with priority sorting (same as today page)
  const matchesByLeague = matches.reduce((acc, match) => {
    // Create a unique key using both league name and country to avoid mixing leagues
    const leagueKey = `${match.tournament.name} (${match.tournament.country})`;
    if (!acc[leagueKey]) {
      acc[leagueKey] = {
        leagueInfo: {
          id: match.tournament.id,
          name: match.tournament.name,
          logo: match.tournament.logo,
          country: match.tournament.country
        },
        matches: []
      };
    }
    acc[leagueKey].matches.push(match);
    return acc;
  }, {} as Record<string, { leagueInfo: any, matches: Match[] }>);

  // Filter and sort leagues by priority (same logic as today page)
  const sortedLeagues = Object.entries(matchesByLeague)
    .filter(([leagueKey, leagueGroup]) => {
      // Only show leagues with matches and filter out very small/local leagues
      const leagueName = leagueGroup.leagueInfo.name.toLowerCase();
      const country = leagueGroup.leagueInfo.country.toLowerCase();
      
      // Keep major leagues and filter out very local/small leagues
      const isMajorLeague = priorityOrder.length > 0 ? priorityOrder.includes(leagueGroup.leagueInfo.id) :
        (leagueName.includes('premier') || leagueName.includes('la liga') || 
         leagueName.includes('serie a') || leagueName.includes('bundesliga') ||
         leagueName.includes('champions') || leagueName.includes('europa') ||
         leagueName.includes('euro') || leagueName.includes('world cup') ||
         country === 'england' || country === 'spain' || country === 'italy' || 
         country === 'germany' || country === 'france');
      
      return isMajorLeague && leagueGroup.matches.length > 0;
    })
    .sort((a, b) => {
      const aLeague = a[1].leagueInfo;
      const bLeague = b[1].leagueInfo;

      // 1. Priority order
      const aPrio = priorityOrder.indexOf(aLeague.id);
      const bPrio = priorityOrder.indexOf(bLeague.id);

      if (aPrio !== -1 && bPrio !== -1) return aPrio - bPrio; // Both are important
      if (aPrio !== -1) return -1; // a is important, b is not
      if (bPrio !== -1) return 1; // b is important, a is not

      // 2. Alphabetical
      return aLeague.name.localeCompare(bLeague.name);
    });

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
        
        .news-card-gradient {
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
      {/* Header */}
      <Header />

      {/* Main Content - Two Column Layout */}
      <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start">
          
          {/* Right Column - Matches (First on mobile) */}
          <div className="space-y-6 lg:order-2">
            <h2 className={`text-lg sm:text-xl md:text-2xl font-display font-bold sport-text-gradient`}>Matches</h2>
            
            {/* Combined Navigation */}
            <div className="flex space-x-1 bg-gray-200 dark:bg-slate-700 p-1 rounded-lg glass-morphism border border-white/10">
              <button
                onClick={() => {
                  setSelectedDate('Yesterday');
                  setSelectedTab('Matches'); // Reset to matches view
                }}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedDate === 'Yesterday' && selectedTab !== 'Leagues'
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => {
                  setSelectedDate('Today');
                  setSelectedTab('Matches'); // Reset to matches view
                }}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedDate === 'Today' && selectedTab !== 'Leagues'
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => {
                  setSelectedDate('Tomorrow');
                  setSelectedTab('Matches'); // Reset to matches view
                }}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedDate === 'Tomorrow' && selectedTab !== 'Leagues'
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Tomorrow
              </button>
              <button
                onClick={() => setSelectedTab('Leagues')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedTab === 'Leagues'
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Leagues
              </button>
            </div>

            {/* Matches Display Area */}
            <div className={`${cardBg} rounded-lg p-6`}>
              {selectedTab !== 'Leagues' ? (
                matchesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : sortedLeagues.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className={`text-lg ${textMuted}`}>No matches found for {selectedDate.toLowerCase()}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Show all leagues on desktop, only first league on mobile */}
                    {(isMobile ? sortedLeagues.slice(0, 1) : sortedLeagues).map(([leagueName, leagueGroup]) => (
                      <div key={leagueName} className={`${cardBg} backdrop-blur-sm border ${isDark ? 'border-slate-700' : 'border-gray-200'} rounded-xl overflow-hidden glass-morphism hover:shadow-2xl transition-all duration-500`}>
                        <div className={`${isDark ? 'bg-slate-900/70' : 'bg-gray-100/90'} px-3 md:px-4 py-2 md:py-3 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'} flex items-center gap-2 md:gap-3`}>
                          <img
                            src={leagueGroup.leagueInfo.logo}
                            alt={leagueName}
                            className="w-5 h-5 md:w-6 md:h-6 object-contain flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <div className="flex flex-col">
                            <h2 className={`text-xs sm:text-sm md:text-base lg:text-lg font-heading font-bold ${textColor} truncate`}>{leagueGroup.leagueInfo.name}</h2>
                            <span className={`text-xs ${textMuted}`}>{leagueGroup.leagueInfo.country}</span>
                          </div>
                        </div>
                        <div className="divide-y divide-slate-800">
                          {leagueGroup.matches.map((match) => (
                            <MatchComponent key={match._id} match={match} />
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {/* View All Button - Mobile Only */}
                    {isMobile && sortedLeagues.length > 1 && (
                      <div className="mt-4">
                        <Link href="/today" className="block">
                          <button className={`w-full py-3 px-4 rounded-lg font-medium text-center transition-all duration-300 ${
                            isDark 
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white' 
                              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                          } shadow-lg hover:shadow-xl hover:scale-[1.02] glass-morphism border border-white/10`}>
                            <div className="flex items-center justify-center gap-2">
                              <span>View All Matches</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                )
              ) : selectedLeague ? (
                // Show matches for selected league
                <div className="space-y-6">
                  {/* Back to Leagues List Button */}
                  <div className="flex items-center gap-4 mb-4">
                    <button
                      onClick={() => setSelectedLeague(null)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isDark 
                          ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      }`}
                    >
                      ← Back to Leagues
                    </button>
                    <h3 className={`text-lg font-semibold ${textColor}`}>
                      {selectedLeague} Matches
                    </h3>
                  </div>

                  {/* Selected League Matches */}
                  {(() => {
                    const leagueData = sortedLeagues.find(([name]) => name === selectedLeague);
                    if (!leagueData) return null;
                    
                    const [leagueName, leagueGroup] = leagueData;
                    return (
                      <div className={`${cardBg} backdrop-blur-sm border ${isDark ? 'border-slate-700' : 'border-gray-200'} rounded-xl overflow-hidden`}>
                        <div className={`${isDark ? 'bg-slate-900/70' : 'bg-gray-100/90'} px-3 md:px-4 py-2 md:py-3 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'} flex items-center gap-2 md:gap-3`}>
                          <img
                            src={leagueGroup.leagueInfo.logo}
                            alt={leagueName}
                            className="w-5 h-5 md:w-6 md:h-6 object-contain flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <div className="flex flex-col">
                            <h2 className={`text-xs sm:text-sm md:text-base lg:text-lg font-heading font-bold ${textColor} truncate`}>{leagueGroup.leagueInfo.name}</h2>
                            <span className={`text-xs ${textMuted}`}>{leagueGroup.leagueInfo.country}</span>
                          </div>
                        </div>
                        <div className="divide-y divide-slate-800">
                          {leagueGroup.matches.map((match) => (
                            <MatchComponent key={match._id} match={match} />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                // Show leagues list
                <div className="space-y-4">
                  <h3 className={`text-lg font-semibold ${textColor} mb-4`}>Select a League</h3>
                  
                  {sortedLeagues.map(([leagueName, leagueGroup]) => (
                    <div
                      key={leagueName}
                      onClick={() => setSelectedLeague(leagueName)}
                      className={`${cardBg} border ${isDark ? 'border-slate-700' : 'border-gray-200'} rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={leagueGroup.leagueInfo.logo}
                          alt={leagueName}
                          className="w-8 h-8 object-contain flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <div className="flex-1">
                          <h4 className={`font-semibold ${textColor}`}>{leagueName}</h4>
                          <p className={`text-sm ${textMuted}`}>
                            {leagueGroup.matches.length} match{leagueGroup.matches.length !== 1 ? 'es' : ''}
                          </p>
                        </div>
                        <div className={`text-2xl ${textMuted}`}>→</div>
                      </div>
                    </div>
                  ))}
                  
                  {sortedLeagues.length === 0 && (
                    <div className="text-center py-8">
                      <p className={`text-lg ${textMuted}`}>No leagues available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Left Column - Top News (Second on mobile) */}
          <div className="space-y-6 lg:order-1">
            <h2 className={`text-lg sm:text-xl md:text-2xl font-display font-bold sport-text-gradient`}>Top News</h2>
            
            {/* Featured News Article */}
            {news.length > 0 && (
              <div 
                className={`${cardBg} rounded-lg overflow-hidden shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer glass-morphism border border-white/10`}
                onClick={() => handleNewsClick(news[0]._id)}
              >
                {news[0].imageUrl && (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={absoluteImage(news[0].imageUrl)}
                      alt={news[0].title}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className={`text-sm sm:text-base md:text-lg lg:text-xl font-heading font-bold mb-2 ${textColor} hover:text-blue-500 transition-all duration-300 hover:scale-105`}>{news[0].title}</h3>
                  <p className={`text-sm ${textMuted} line-clamp-3`}>{news[0].content}</p>
                </div>
              </div>
            )}

            {/* News Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-4">
              {news.slice(1, 5).map((item, index) => (
                <div 
                  key={item._id} 
                  className={`${cardBg} rounded-lg overflow-hidden shadow-md hover:shadow-lg hover:scale-[1.03] transition-all duration-300 cursor-pointer glass-morphism border border-white/5`}
                  onClick={() => handleNewsClick(item._id)}
                >
                  {item.imageUrl && (
                    <div className="relative h-32 overflow-hidden">
                      <img
                        src={absoluteImage(item.imageUrl)}
                        alt={item.title}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className={`text-sm font-heading font-semibold mb-1 ${textColor} line-clamp-2 hover:text-blue-500 transition-all duration-300 hover:scale-105`}>{item.title}</h4>
                    <p className={`text-xs ${textMuted} line-clamp-2`}>{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
    </>
  );
}
