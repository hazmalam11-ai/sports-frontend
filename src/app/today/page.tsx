'use client';



import { useState, useEffect, memo, useCallback } from 'react';

import Image from 'next/image';

import Header from '@/components/Header';
import { API_BASE } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';



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



export default function TodayPage() {

const { theme } = useTheme();

const [selectedDate, setSelectedDate] = useState('Today');

const [matches, setMatches] = useState<Match[]>([]);

const [loading, setLoading] = useState(true);

const [currentDate, setCurrentDate] = useState(new Date());

const [selectedLeague, setSelectedLeague] = useState('all');

const [showOnlyLive, setShowOnlyLive] = useState(false);

// Theme-based styling (matching home page)
const isDark = theme === 'dark';
const bgColor = isDark ? 'bg-slate-900' : 'bg-gray-50';
const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
const textColor = isDark ? 'text-white' : 'text-gray-900';
const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';
const textSubtle = isDark ? 'text-slate-400' : 'text-gray-500';





const MatchComponent = memo(({ match }: { match: Match }) => {

const formatTime = (dateString: string) => {

const date = new Date(dateString);

return date.toLocaleTimeString('en-US', {

hour: '2-digit',

minute: '2-digit',

hour12: false

});

};



const getStatusColor = (status: string) => {

switch (status) {

case 'NS':

return isDark ? 'text-slate-300' : 'text-gray-600';

case '1H':

case 'HT':

case '2H':

case 'ET':

case 'P':

return 'text-emerald-400';

case 'FT':

case 'AET':

case 'PEN':

return isDark ? 'text-slate-500' : 'text-gray-500';

default:

return isDark ? 'text-slate-400' : 'text-gray-500';

}

};



const renderStatus = () => {

switch (match.status) {

case 'NS':

return (

<div className={`text-sm md:text-lg font-bold ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>

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

<div className="text-sm md:text-lg font-bold text-emerald-400">

{match.scoreA ?? 0} - {match.scoreB ?? 0}

</div>

<div className="text-xs text-emerald-500 animate-pulse">

Live {match.minute}'

</div>

</div>

);

case 'FT':

case 'AET':

case 'PEN':

return (

<div className="text-center">

<div className="text-sm md:text-lg font-bold">

{match.scoreA} - {match.scoreB}

</div>

<div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Finished</div>

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



// Dynamic priority order from backend configuration
const [priorityOrder, setPriorityOrder] = useState<number[]>([]);





// Fetch priority order from backend
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

// Fetch matches from backend using template format
useEffect(() => {
  const fetchMatches = async () => {
    try {
      setLoading(true);

// Format date as YYYY-MM-DD in local timezone to avoid day shift

const dateStr = currentDate.getFullYear() + '-' +

String(currentDate.getMonth() + 1).padStart(2, '0') + '-' +

String(currentDate.getDate()).padStart(2, '0');


// Build query parameters for backend filtering (same as HTML template)

const params = new URLSearchParams({

date: dateStr,

timezone: Intl.DateTimeFormat().resolvedOptions().timeZone

});


// Add league filter if not 'all'

if (selectedLeague !== 'all') {

params.append('league', selectedLeague);

}


// Add live filter if enabled

if (showOnlyLive) {

params.append('live', 'true');

}


// Use backend API instead of direct API call (same filtering as HTML template)

const response = await fetch(`${API_BASE}/matches?${params.toString()}`, {

method: 'GET',

headers: {

'Content-Type': 'application/json'

}

});



if (!response.ok) {

throw new Error(`Backend Error: ${response.status}`);

}



const transformedMatches = await response.json();



// Backend response received


setMatches(transformedMatches);

} catch (error) {

console.error('Error fetching matches:', error);

setMatches([]);

} finally {

setLoading(false);

}

};



fetchMatches();

}, [currentDate, selectedLeague, showOnlyLive]);



// Group matches by league with priority sorting (same as HTML template)

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



// Filter and sort leagues (same logic as home page)
const filteredMatches = Object.entries(matchesByLeague)
  .filter(([leagueName, leagueGroup]) => {
    // Only show leagues with matches and filter out very small/local leagues
    const leagueNameLower = leagueGroup.leagueInfo.name.toLowerCase();
    const country = leagueGroup.leagueInfo.country.toLowerCase();
    
    // Keep major leagues and filter out very local/small leagues
    const isMajorLeague = priorityOrder.length > 0 ? priorityOrder.includes(leagueGroup.leagueInfo.id) :
      (leagueNameLower.includes('premier') || leagueNameLower.includes('la liga') || 
       leagueNameLower.includes('serie a') || leagueNameLower.includes('bundesliga') ||
       leagueNameLower.includes('champions') || leagueNameLower.includes('europa') ||
       leagueNameLower.includes('euro') || leagueNameLower.includes('world cup') ||
       country === 'england' || country === 'spain' || country === 'italy' || 
       country === 'germany' || country === 'france');
    
    return isMajorLeague && leagueGroup.matches.length > 0;
  });









// Sort leagues by priority (same logic as home page)
const sortedLeagues = filteredMatches.sort((a, b) => {
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



// Show all leagues like HTML page (no pagination)

const displayedLeagues = sortedLeagues;



// Leagues sorted by priority



// Get available leagues for filter (same logic as home page)

const availableLeagues = Array.from(new Set(matches.map(match => match.tournament.name))).sort((a, b) => {

// Find league IDs for sorting

const aMatch = matches.find(m => m.tournament.name === a);

const bMatch = matches.find(m => m.tournament.name === b);


if (!aMatch || !bMatch) return a.localeCompare(b);


const aPrio = priorityOrder.indexOf(aMatch.tournament.id || 0);

const bPrio = priorityOrder.indexOf(bMatch.tournament.id || 0);



if (aPrio !== -1 && bPrio !== -1) return aPrio - bPrio; // Both are important

if (aPrio !== -1) return -1; // a is important, b is not

if (bPrio !== -1) return 1; // b is important, a is not


return a.localeCompare(b); // Neither is important, sort alphabetically

});



const formatTime = (dateString: string) => {

const date = new Date(dateString);

return date.toLocaleTimeString('en-US', {

hour: '2-digit',

minute: '2-digit',

hour12: false

});

};



const getStatusColor = (status: string) => {

switch (status) {

case 'NS':

return isDark ? 'text-slate-300' : 'text-gray-600';

case '1H':

case 'HT':

case '2H':

case 'ET':

case 'P':

return 'text-emerald-400';

case 'FT':

case 'AET':

case 'PEN':

return isDark ? 'text-slate-500' : 'text-gray-500';

default:

return isDark ? 'text-slate-400' : 'text-gray-500';

}

};



const getStatusText = (status: string, minute?: number, matchDate?: string) => {

switch (status) {

case 'NS':

return matchDate ? formatTime(matchDate) : 'VS';

case '1H':

case '2H':

return minute ? `${minute}'` : 'Live';

case 'HT':

return 'HT';

case 'ET':

return 'ET';

case 'P':

return 'PEN';

case 'FT':

return 'Finished';

case 'AET':

return 'AET';

case 'PEN':

return 'PEN';

default:

return 'VS';

}

};



// Date navigation functions

const goToPreviousDay = () => {

const newDate = new Date(currentDate);

newDate.setDate(newDate.getDate() - 1);

setCurrentDate(newDate);

};



const goToNextDay = () => {

const newDate = new Date(currentDate);

newDate.setDate(newDate.getDate() + 1);

setCurrentDate(newDate);

};



const goToToday = () => {

setCurrentDate(new Date());

};



// Format date for display (HTML template format)

const formatDisplayDate = (date: Date) => {

return date.toISOString().split('T')[0];

};



return (

<>




<style jsx global>{`
        .match-card:hover {
          border-bottom: 2px solid #10b981 !important;
        }
        
        /* Ensure hover effect works on all match cards */
        div.match-card:hover {
          border-bottom: 2px solid #10b981 !important;
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





{/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className={`text-3xl md:text-4xl font-display font-bold sport-text-gradient mb-2`}>Today's Matches</h1>
          <p className={`text-sm ${textMuted}`}>Live football matches and upcoming games</p>
        </div>

{/* Controls */}

<div className={`${cardBg} backdrop-blur-sm p-3 rounded-xl mb-6 space-y-4 border ${isDark ? 'border-slate-700' : 'border-gray-200'} glass-morphism border border-white/10`}>

{/* Date Navigation */}

<div className="flex items-center justify-center gap-1 md:gap-2">

<button

onClick={goToNextDay}

className={`px-2 md:px-4 py-2 ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-lg transition-colors text-sm md:text-base min-w-[80px] md:min-w-[100px] ${textColor}`}

>

<span className="hidden sm:inline">Tomorrow</span>

<span className="sm:hidden">Next</span>

<span className="ml-1">←</span>

</button>

<input

type="date"

value={formatDisplayDate(currentDate)}

onChange={(e) => setCurrentDate(new Date(e.target.value))}

className={`${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-gray-300 text-gray-900'} rounded-lg p-2 focus:ring-emerald-500 focus:border-emerald-500 w-28 md:w-36 text-center text-sm md:text-base`}

/>

<button

onClick={goToPreviousDay}

className={`px-2 md:px-4 py-2 ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-lg transition-colors text-sm md:text-base min-w-[80px] md:min-w-[100px] ${textColor}`}

>

<span className="hidden sm:inline">Yesterday</span>

<span className="sm:hidden">Prev</span>

<span className="mr-1">→</span>

</button>

</div>


{/* Filters */}

<div className="flex flex-col sm:flex-row items-center justify-center gap-2">

<select

value={selectedLeague}

onChange={(e) => setSelectedLeague(e.target.value)}

className={`w-full sm:w-64 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-gray-300 text-gray-900'} rounded-lg p-3 focus:ring-emerald-500 focus:border-emerald-500 text-sm md:text-base`}

>

<option value="all">All leagues</option>

{availableLeagues.map(league => (

<option key={league} value={league}>{league}</option>

))}

</select>

<button

onClick={() => setShowOnlyLive(!showOnlyLive)}

className={`w-full sm:w-auto px-4 py-3 ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-lg transition-colors font-semibold text-sm md:text-base ${textColor} ${

showOnlyLive ? 'btn-filter-active' : ''

}`}

>

Live Now

</button>

</div>

</div>



{/* Matches Container */}

{loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : displayedLeagues.length === 0 ? (
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
                  No matches available for the selected date.
                </p>
              </div>
            </div>

) : (

<div className="space-y-6">

{displayedLeagues.map(([leagueName, leagueGroup]) => (

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
                            <h2 className={`text-base md:text-lg font-heading font-bold ${textColor} truncate`}>{leagueGroup.leagueInfo.name}</h2>
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

</div>

)}

</main>
    </div>

</>

);

}