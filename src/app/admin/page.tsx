"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { SimpleLine, SimpleBars, SimpleDonut } from "./SimpleCharts";
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || (typeof window !== 'undefined' ? window.location.origin.replace(/:\d+$/, ':5050') : 'http://localhost:5050'));

type Stats = {
  usersCount: number;
  matchesCount: number;
  commentsCount: number;
  likesCount: number;
  newsCount: number;
  usersMonthly: { month: string; count: number }[];
  newsMonthly: { month: string; count: number }[];
  matchesMonthly: { month: string; count: number }[];
};

export default function AdminPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false); // prevent double fetch in React Strict Mode
  const [mobileMenu, setMobileMenu] = useState(false);
  const [active, setActive] = useState<'dashboard' | 'users' | 'news' | 'leagues' | 'gameweeks'>('dashboard');
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [changing, setChanging] = useState<string | null>(null);
  const [usersSuccess, setUsersSuccess] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState("all");

  // News state (in-dashboard)
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsSuccess, setNewsSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [newsQuery, setNewsQuery] = useState("");
  const [newsAuthor, setNewsAuthor] = useState("all");
  const [newsSort, setNewsSort] = useState<'latest' | 'oldest'>('latest');
  const [editFeatured, setEditFeatured] = useState(false);

  // Leagues state
  const [leagues, setLeagues] = useState<any[]>([]);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [leaguesError, setLeaguesError] = useState<string | null>(null);
  const [leaguesSuccess, setLeaguesSuccess] = useState<string | null>(null);
  const [allowedLeagues, setAllowedLeagues] = useState<number[]>([]);
  const [leaguesSearch, setLeaguesSearch] = useState("");
  const [leaguesCountry, setLeaguesCountry] = useState("all");
  const [leaguesType, setLeaguesType] = useState("all");
  const [leaguesTab, setLeaguesTab] = useState<'all' | 'allowed' | 'available'>('all');
  const [configInfo, setConfigInfo] = useState<any>(null);
  const [allAvailableLeagues, setAllAvailableLeagues] = useState<any[]>([]);
  const [leaguesPage, setLeaguesPage] = useState(1);
  const [leaguesPerPage] = useState(50); // Limit to 50 leagues per page

  // Gameweeks state
  const [gameweeks, setGameweeks] = useState<any[]>([]);
  const [gameweeksLoading, setGameweeksLoading] = useState(false);
  const [gameweeksError, setGameweeksError] = useState<string | null>(null);
  const [gameweeksSuccess, setGameweeksSuccess] = useState<string | null>(null);
  const [availableMatches, setAvailableMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any>(null);
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);

  // Simple manual match input
  const [showSimpleManual, setShowSimpleManual] = useState(false);
  const [simpleMatchId, setSimpleMatchId] = useState('');

  // Reset page when switching tabs or changing filters
  useEffect(() => {
    setLeaguesPage(1);
  }, [leaguesTab, leaguesSearch, leaguesCountry, leaguesType]);

  // Debounce search to improve performance
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(leaguesSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [leaguesSearch]);

  useEffect(() => {
    if (!token || fetchedRef.current) return;
    fetchedRef.current = true;
    apiFetch<Stats>("/dashboard", {}, token)
      .then((data: any) => setStats(data))
      .catch((e) => setError(e.message));
  }, [token]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (active === 'users') {
        loadUsers();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [userSearch, userRole, active]);

  async function loadUsers() {
    if (!token) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set('search', userSearch);
      if (userRole !== 'all') params.set('role', userRole);
      const qs = params.toString();
      const data = await apiFetch<{ items: any[] }>(`/users${qs ? `?${qs}` : ''}` , {}, token);
      setUsers(data.items || []);
    } catch (e: any) {
      setUsersError(e.message);
    } finally {
      setUsersLoading(false);
    }
  }

  function absImg(url: string) {
    if (!url) return "";
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${API_BASE}${url}`;
    return `${API_BASE}/${url}`;
  }

  async function loadNews() {
    if (!token) return;
    setNewsLoading(true);
    setNewsError(null);
    try {
      const data = await apiFetch<any[]>("/news", {}, token);
      setNews(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setNewsError(e.message);
    } finally {
      setNewsLoading(false);
    }
  }

  async function loadLeagues() {
    if (!token) return;
    
    setLeaguesLoading(true);
    setLeaguesError(null);
    try {
      const data = await apiFetch<any>("/api/leagues/status", {}, token);
      setLeagues(data.tournaments || []);
      
      // Use allowedIds directly from the API response
      const allowedIds = data.allowedIds || [];
      setAllowedLeagues(allowedIds);
      
      // Load config info
      try {
        const configData = await apiFetch<any>("/api/leagues/config-info", {}, token);
        setConfigInfo(configData.configInfo);
      } catch (configError) {
        // Config info failed, continue without it
      }
      
      // Load all available leagues
      await loadAllAvailableLeagues();
    } catch (e: any) {
      setLeaguesError(e.message);
      
      // Fallback: Show La Liga as allowed if API fails
      setLeagues([{
        _id: 'league_140',
        apiId: 140,
        name: 'La Liga',
        country: 'Spain',
        type: 'League',
        season: new Date().getFullYear(),
        logo: 'https://media.api-sports.io/football/leagues/140.png',
        isAllowed: true,
        priority: 1
      }]);
      setAllowedLeagues([140]);
    } finally {
      setLeaguesLoading(false);
    }
  }

  async function loadAllAvailableLeagues() {
    if (!token) return;
    
    try {
      const data = await apiFetch<any>("/tournaments", {}, token);
      setAllAvailableLeagues(data || []);
    } catch (e: any) {
      setLeaguesError('Failed to load available leagues: ' + e.message);
    }
  }

  // Gameweek functions
  async function loadGameweeks() {
    if (!token) return;
    setGameweeksLoading(true);
    setGameweeksError(null);
    try {
      const data = await apiFetch<any[]>("/fantasy/gameweeks", {}, token);
      setGameweeks(data || []);
    } catch (e: any) {
      setGameweeksError(e.message);
    } finally {
      setGameweeksLoading(false);
    }
  }

  async function fetchAvailableMatches() {
    if (!token) return;
    setGameweeksLoading(true);
    setGameweeksError(null);
    try {
      const data = await apiFetch<any>("/fantasy/gameweeks/api/fetch-matches", {}, token);
      setAvailableMatches(data.matches || []);
      setTeams(data.teams);
    } catch (e: any) {
      setGameweeksError(e.message);
    } finally {
      setGameweeksLoading(false);
    }
  }

  async function addSimpleManualMatch() {
    if (!token || !simpleMatchId.trim()) {
      setGameweeksError("Please enter a match ID");
      return;
    }

    setGameweeksLoading(true);
    setGameweeksError(null);
    
    try {
      console.log("Creating gameweek with manual match ID:", simpleMatchId);
      
      // Create a new gameweek with the manual match ID (same as "Add Selected Matches")
      const newGameweek = {
        name: `Gameweek ${new Date().toLocaleDateString()}`,
        description: `Created with manual match ID: ${simpleMatchId}`,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
        matchData: [] // Empty array - the backend will handle adding the match by ID
      };
      
      console.log("Creating gameweek:", newGameweek);
      const gameweekResponse = await apiFetch("/fantasy/gameweeks", {
        method: "POST",
        body: JSON.stringify(newGameweek),
      }, token!);
      
      console.log("Gameweek created successfully:", gameweekResponse);
      
      if (gameweekResponse && gameweekResponse.gameweek && gameweekResponse.gameweek._id) {
        // Now add the match to the newly created gameweek
        console.log("Adding match to gameweek:", gameweekResponse.gameweek._id);
        const matchResponse = await apiFetch(`/fantasy/gameweeks/${gameweekResponse.gameweek._id}/matches`, {
          method: "POST",
          body: JSON.stringify({ 
            matchIds: [simpleMatchId.trim()],
            autoSync: true 
          }),
        }, token!);
        
        console.log("Match added successfully:", matchResponse);
        setGameweeksSuccess(`Match ${simpleMatchId} added successfully!`);
        setTimeout(() => setGameweeksSuccess(null), 3000);
        
        // Reset form
        setSimpleMatchId('');
        setShowSimpleManual(false);
        
        // Reload gameweeks
        await loadGameweeks();
      } else {
        console.error("Invalid gameweek response:", gameweekResponse);
        setGameweeksError("Failed to create gameweek - invalid response format");
      }
      
    } catch (e: any) {
      console.error("Error in addSimpleManualMatch:", e);
      setGameweeksError(e.message || "Failed to add match");
    } finally {
      setGameweeksLoading(false);
    }
  }



  async function deleteGameweek(id: string) {
    if (!token) return;
    setGameweeksLoading(true);
    setGameweeksError(null);
    try {
      await apiFetch(`/fantasy/gameweeks/${id}`, { method: "DELETE" }, token);
      setGameweeksSuccess("Gameweek deleted successfully!");
      setTimeout(() => setGameweeksSuccess(null), 3000);
      loadGameweeks();
    } catch (e: any) {
      setGameweeksError(e.message);
    } finally {
      setGameweeksLoading(false);
    }
  }

  async function activateGameweek(id: string) {
    if (!token) return;
    setGameweeksLoading(true);
    setGameweeksError(null);
    try {
      await apiFetch(`/fantasy/gameweeks/${id}/activate`, { method: "POST" }, token);
      setGameweeksSuccess("Gameweek activated successfully!");
      setTimeout(() => setGameweeksSuccess(null), 3000);
      loadGameweeks();
    } catch (e: any) {
      setGameweeksError(e.message);
    } finally {
      setGameweeksLoading(false);
    }
  }

  async function addMatchesToGameweek(gameweekId: string) {
    console.log("addMatchesToGameweek called with:", gameweekId);
    console.log("Token:", token);
    console.log("Selected matches:", selectedMatches);
    
    if (!token || selectedMatches.length === 0) {
      console.log("Early return: no token or no selected matches");
      return;
    }
    
    setGameweeksLoading(true);
    setGameweeksError(null);
    try {
      console.log("Making API call to add matches...");
      const response = await apiFetch(`/fantasy/gameweeks/${gameweekId}/matches`, {
        method: "POST",
        body: JSON.stringify({ matchIds: selectedMatches }),
      }, token);
      
      console.log("API response:", response);
      
      if (response) {
        setGameweeksSuccess("Matches added to gameweek successfully!");
        setTimeout(() => setGameweeksSuccess(null), 3000);
        setSelectedMatches([]);
        loadGameweeks();
      }
    } catch (e: any) {
      console.error("Error in addMatchesToGameweek:", e);
      setGameweeksError(e.message || "Failed to add matches to gameweek");
    } finally {
      setGameweeksLoading(false);
    }
  }


  async function toggleLeagueStatus(leagueId: number) {
    if (!token) return;
    setLeaguesLoading(true);
    setLeaguesError(null);
    try {
      const newAllowedLeagues = allowedLeagues.includes(leagueId)
        ? allowedLeagues.filter(id => id !== leagueId)
        : [...allowedLeagues, leagueId];
      
      await apiFetch("/api/leagues/allowed", {
        method: "PUT",
        body: JSON.stringify({ allowedLeagueIds: newAllowedLeagues }),
      }, token);
      
      setAllowedLeagues(newAllowedLeagues);
      setLeaguesSuccess(`League ${allowedLeagues.includes(leagueId) ? 'blocked' : 'allowed'} successfully!`);
      setTimeout(() => setLeaguesSuccess(null), 3000);
    } catch (e: any) {
      setLeaguesError(e.message);
    } finally {
      setLeaguesLoading(false);
    }
  }

  async function updateAllowedLeagues(leagueIds: number[]) {
    if (!token) return;
    setLeaguesLoading(true);
    setLeaguesError(null);
    try {
      await apiFetch("/api/leagues/allowed", {
        method: "PUT",
        body: JSON.stringify({ allowedLeagueIds: leagueIds }),
      }, token);
      setAllowedLeagues(leagueIds);
      setLeaguesSuccess("Allowed leagues updated successfully!");
      setTimeout(() => setLeaguesSuccess(null), 3000);
    } catch (e: any) {
      setLeaguesError(e.message);
    } finally {
      setLeaguesLoading(false);
    }
  }

  async function updateLeaguePriorities() {
    if (!token) return;
    setLeaguesLoading(true);
    setLeaguesError(null);
    try {
      // Create priority mapping from current leagues
      const priorityMap = leagues.reduce((acc: any, league: any) => {
        if (allowedLeagues.includes(league.apiId)) {
          acc[league.apiId] = league.priority || 1;
        }
        return acc;
      }, {});


      const response = await apiFetch("/api/leagues/priorities", {
        method: "PUT",
        body: JSON.stringify({ 
          priorities: priorityMap 
        }),
      }, token);
      
      
      setLeaguesSuccess("League priorities updated successfully!");
      setTimeout(() => setLeaguesSuccess(null), 3000);
      
      // Don't reload - priorities are already saved and working
    } catch (e: any) {
      console.error('❌ Error updating priorities:', e);
      setLeaguesError(e.message);
    } finally {
      setLeaguesLoading(false);
    }
  }

  const authorOptions = Array.from(new Set(news.map((n: any) => (n.author?.username || n.author?.email || 'Unknown'))));
  const filteredNews = news
    .filter((n: any) => {
      const text = `${n.title || ''} ${n.content || ''}`.toLowerCase();
      const matchesQuery = newsQuery ? text.includes(newsQuery.toLowerCase()) : true;
      const authorName = (n.author?.username || n.author?.email || 'Unknown');
      const matchesAuthor = newsAuthor === 'all' ? true : authorName === newsAuthor;
      return matchesQuery && matchesAuthor;
    })
    .sort((a: any, b: any) => {
      const da = new Date(a.publishedAt || a.createdAt).getTime();
      const db = new Date(b.publishedAt || b.createdAt).getTime();
      return newsSort === 'latest' ? db - da : da - db;
    });

  async function deleteNews(id: string) {
    if (!token) return;
    try {
      await apiFetch(`/news/${id}`, { method: 'DELETE' }, token);
      setNews(prev => prev.filter(n => n._id !== id));
      setNewsSuccess('News deleted successfully');
      setTimeout(() => setNewsSuccess(null), 2000);
    } catch (e: any) {
      setNewsError(e.message);
    }
  }

  async function toggleFeatured(n: any) {
    if (!token) return;
    try {
      const fd = new FormData();
      fd.append('title', n.title || '');
      fd.append('content', n.content || '');
      fd.append('isFeatured', String(!Boolean(n.isFeatured)));
      const res = await fetch(`${API_BASE}/news/${n._id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (!res.ok) { setNewsError(data?.message || 'Error'); return; }
      const saved = data;
      setNews(prev => prev.map(x => x._id === saved._id ? saved : (saved.isFeatured ? { ...x, isFeatured: false } : x)));
      setNewsSuccess(saved.isFeatured ? 'Set as featured' : 'Unfeatured');
      setTimeout(() => setNewsSuccess(null), 2000);
    } catch (e: any) {
      setNewsError(e.message);
    }
  }

  function openEdit(n: any) {
    setEditing(n);
    setEditTitle(n.title || "");
    setEditContent(n.content || "");
    setEditImage(null);
    setEditPreview(n.imageUrl ? absImg(n.imageUrl) : null);
    setEditFeatured(Boolean(n.isFeatured));
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !editing) return;
    const fd = new FormData();
    fd.append('title', editTitle);
    fd.append('content', editContent);
    fd.append('isFeatured', String(editFeatured));
    if (editImage) fd.append('image', editImage);
    const isCreate = !editing._id;
    const url = isCreate ? `${API_BASE}/news` : `${API_BASE}/news/${editing._id}`;
    const method = isCreate ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    if (!res.ok) { setNewsError(data?.message || 'Error'); return; }
    const saved = data;
    if (isCreate) setNews(prev => [saved, ...prev]); else setNews(prev => prev.map(n => n._id === saved._id ? saved : n));
    setNewsSuccess(isCreate ? 'News created successfully' : 'News updated successfully');
    setTimeout(() => setNewsSuccess(null), 2000);
    if (editPreview && editImage) URL.revokeObjectURL(editPreview);
    setEditing(null);
  }

  // Auto-hide news success notification
  useEffect(() => {
    if (!newsSuccess) return;
    const t = setTimeout(() => setNewsSuccess(null), 2500);
    return () => clearTimeout(t);
  }, [newsSuccess]);

  async function deleteUser(id: string) {
    if (!token) return;
    setChanging(id);
    try {
      await apiFetch(`/users/${id}`, { method: 'DELETE' }, token);
      setUsers(prev => prev.filter(u => u._id !== id));
      setUsersSuccess('User deleted successfully');
    } catch (e: any) {
      setUsersError(e.message);
    } finally {
      setChanging(null);
    }
  }

  async function updateRole(id: string, role: string) {
    if (!token) return;
    setChanging(id);
    try {
      const data = await apiFetch<{ user: any }>(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }, token);
      setUsers(prev => prev.map(u => u._id === id ? data.user : u));
      setUsersSuccess('Role updated successfully');
    } catch (e: any) {
      setUsersError(e.message);
    } finally {
      setChanging(null);
    }
  }

  // Auto-hide success notification
  useEffect(() => {
    if (!usersSuccess) return;
    const t = setTimeout(() => setUsersSuccess(null), 2500);
    return () => clearTimeout(t);
  }, [usersSuccess]);

  if (!user || user.role !== "admin") {
    return (
      <main className="min-h-screen bg-[#2D2525] text-white">
        <Header />
        <section className="mx-auto max-w-5xl px-4 md:px-8 pt-12">
          <div className="rounded-xl border border-white/10 bg-[#161616] p-6">
            <h1 className="text-xl font-semibold">Unauthorized</h1>
            <p className="text-gray-300 mt-2">Admin role is required to access the dashboard.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#111]">
      <div className="mx-auto max-w-[1200px] px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 sm:gap-6">
          {/* Light Sidebar (hidden on mobile) */}
          <aside className="hidden md:block rounded-xl border border-gray-200 bg-white p-4 h-fit shadow-sm">
            <div className="text-xs font-semibold text-gray-500 mb-3">ADMIN</div>
            <nav className="space-y-2 text-sm">
              <a className={`flex items-center justify-between px-3 py-2 rounded-lg font-medium ${active === 'dashboard' ? 'bg-[#e9f2ff] text-[#1d4ed8]' : 'hover:bg-gray-100'}`}
                 onClick={() => setActive('dashboard')}>
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                  Dashboard
                </span>
              </a>
              <button onClick={() => { setActive('users'); loadUsers(); }} className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-left ${active === 'users' ? 'bg-[#e9f2ff] text-[#1d4ed8]' : 'hover:bg-gray-100'}` }>
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  User
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button 
                onClick={() => { 
                  setActive('news'); 
                  loadNews(); 
                }} 
                onTouchStart={() => {}}
                className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-left cursor-pointer touch-manipulation ${active === 'news' ? 'bg-[#e9f2ff] text-[#1d4ed8]' : 'hover:bg-gray-100'}`}
                style={{ touchAction: 'manipulation' }}
              >
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>
                  News
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button 
                onClick={() => { 
                  setActive('leagues'); 
                  loadLeagues(); 
                }} 
                className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-left ${active === 'leagues' ? 'bg-[#e9f2ff] text-[#1d4ed8]' : 'hover:bg-gray-100'}`}
              >
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
                  Leagues
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button 
                onClick={() => { 
                  setActive('gameweeks'); 
                  loadGameweeks(); 
                }} 
                className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-left ${active === 'gameweeks' ? 'bg-[#e9f2ff] text-[#1d4ed8]' : 'hover:bg-gray-100'}`}
              >
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Gameweeks
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <a className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100">
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 19V5l12-2v14"/><rect x="2" y="7" width="6" height="12" rx="1"/></svg>
                  Championships
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </a>
              <a className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100">
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v12H4z"/><path d="M4 10h16"/></svg>
                  Teams
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </a>
              <a className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100">
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 22v-2a6 6 0 0 1 12 0v2"/></svg>
                  Players
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </a>
              <a className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100">
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 9l4-4M21 9l-4-4M3 15l4 4M21 15l-4 4"/></svg>
                  Matches
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </a>
            </nav>
          </aside>

          {/* Light Content */}
          <section>
            {/* Mobile Topbar */}
            <div className="md:hidden sticky top-0 z-10 -mx-3 px-3 py-3 bg-[#f7f9fc] flex items-center justify-between border-b border-gray-200">
              <button className="p-2" aria-label="menu" onClick={() => setMobileMenu(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
              </button>
              <div className="text-sm font-semibold">{active === 'dashboard' ? 'Dashboard' : active === 'users' ? 'Users' : active === 'news' ? 'News' : active === 'leagues' ? 'Leagues' : 'Gameweeks'}</div>
              <div className="flex items-center gap-3">
                <button aria-label="notifications" className="p-2 text-gray-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </button>
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img 
                      src={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5050'}${user.avatar}`} 
                      alt={user.username}
                      className="w-7 h-7 object-cover"
                    />
                  ) : (
                    <span className="text-xs font-medium text-gray-600">
                      {user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Mobile drawer */}
            {mobileMenu && (
              <div className="md:hidden fixed inset-0 z-20">
                <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenu(false)} />
                <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-semibold text-gray-500">ADMIN</div>
                    <button onClick={() => setMobileMenu(false)} className="p-2" aria-label="close">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <nav className="space-y-2 text-sm">
                    <button onClick={() => { setActive('dashboard'); setMobileMenu(false); }} className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-left ${active === 'dashboard' ? 'bg-[#e9f2ff] text-[#1d4ed8] font-medium' : 'hover:bg-gray-100'}`}>
                      <span className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                        Dashboard
                      </span>
                    </button>
                    <button onClick={() => { setActive('users'); setMobileMenu(false); loadUsers(); }} className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-left ${active === 'users' ? 'bg-[#e9f2ff] text-[#1d4ed8] font-medium' : 'hover:bg-gray-100'}`}>
                      <span className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        User
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                    <button 
                      onClick={() => { 
                        setActive('news'); 
                        setMobileMenu(false); 
                        loadNews(); 
                      }} 
                      className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-left ${active === 'news' ? 'bg-[#e9f2ff] text-[#1d4ed8] font-medium' : 'hover:bg-gray-100'}`}
                    >
                      <span className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>
                        News
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                    <button 
                      onClick={() => { 
                        setActive('leagues'); 
                        setMobileMenu(false); 
                        loadLeagues(); 
                      }} 
                      className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-left ${active === 'leagues' ? 'bg-[#e9f2ff] text-[#1d4ed8] font-medium' : 'hover:bg-gray-100'}`}
                    >
                      <span className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
                        Leagues
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                    <button 
                      onClick={() => { 
                        setActive('gameweeks'); 
                        setMobileMenu(false); 
                        loadGameweeks(); 
                      }} 
                      className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-left ${active === 'gameweeks' ? 'bg-[#e9f2ff] text-[#1d4ed8] font-medium' : 'hover:bg-gray-100'}`}
                    >
                      <span className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        Gameweeks
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                    <a className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100">
                      <span className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 19V5l12-2v14"/><rect x="2" y="7" width="6" height="12" rx="1"/></svg>
                        Championships
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </a>
                    <a className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100">
                      <span className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v12H4z"/><path d="M4 10h16"/></svg>
                        Teams
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </a>
                    <a className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100">
                      <span className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 22v-2a6 6 0 0 1 12 0v2"/></svg>
                        Players
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </a>
                    <a className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100">
                      <span className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 9l4-4M21 9l-4-4M3 15l4 4M21 15l-4 4"/></svg>
                        Matches
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </a>
                  </nav>
                </div>
              </div>
            )}
            {/* Desktop header */}
            <div className="hidden md:flex items-center justify-between mb-6">
              <div className="text-xl font-semibold text-gray-900">{active === 'dashboard' ? 'Dashboard' : active === 'users' ? 'Users' : active === 'news' ? 'News' : active === 'leagues' ? 'Leagues' : 'Gameweeks'}</div>
              <div className="flex items-center gap-4">
                
                {/* User Profile */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {user?.avatar ? (
                      <img 
                        src={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5050'}${user.avatar}`} 
                        alt={user.username}
                        className="w-8 h-8 object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">
                        {user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{user?.fullName || user?.username}</div>
                    <div className="text-xs text-gray-500">{user?.role}</div>
                  </div>
                </div>
              </div>
            </div>

            {active === 'dashboard' && error && (
              <div className="mb-4 rounded-lg border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
            )}
            {active === 'dashboard' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="col-span-2 sm:col-span-1 rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm flex items-center gap-3">
                    <Image src="/logo.png" alt="Logo" width={150} height={48} className="rounded" />
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
                    <div className="text-gray-500 text-sm">Visitors</div>
                    <div className="text-3xl font-semibold">-</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
                    <div className="text-gray-500 text-sm">News</div>
                    <div className="text-3xl font-semibold">{stats?.newsCount ?? '-'}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
                    <div className="text-gray-500 text-sm">Users</div>
                    <div className="text-3xl font-semibold">{stats?.usersCount ?? '-'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3 sm:gap-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm h-[320px] sm:h-[360px]">
                    <div className="text-gray-500 text-sm mb-2">Users</div>
                    <div className="w-full h-full">
                      <SimpleLine data={stats?.usersMonthly || []} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm h-[320px] sm:h-[360px]">
                    <div className="text-gray-500 text-sm mb-2">Overview</div>
                    <SimpleDonut users={stats?.usersCount || 0} news={stats?.newsCount || 0} visitors={0} />
                  </div>
                </div>
              </>
            )}

            {usersSuccess && (
              <div className="fixed right-4 top-4 z-30 rounded-lg bg-green-600 text-white px-4 py-2 shadow-lg animate-[fadein_0.2s_ease]">
                {usersSuccess}
              </div>
            )}

            {active === 'users' && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-semibold mb-4">Users</h2>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by name or email"
                      className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                    />
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="all">All roles</option>
                      <option value="admin">admin</option>
                      <option value="editor">editor</option>
                      <option value="moderator">moderator</option>
                      <option value="user">user</option>
                    </select>
                    <button onClick={loadUsers} className="w-full sm:w-auto text-sm bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition-colors">Search</button>
                    <button onClick={() => { setUserSearch(""); setUserRole("all"); loadUsers(); }} className="w-full sm:w-auto text-sm bg-gray-200 hover:bg-gray-300 rounded px-4 py-2 transition-colors">Reset</button>
                  </div>
                </div>
                {(usersError || usersSuccess) && (
                  <div className={`p-3 text-sm border-b ${usersError ? 'text-red-700 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}>
                    {usersError || usersSuccess}
                  </div>
                )}
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">User</th>
                        <th className="text-left p-3">Email</th>
                        <th className="text-left p-3">Role</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u: any) => (
                        <tr key={u._id} className="border-t border-gray-100">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                {u.avatar ? (
                                  <img 
                                    src={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5050'}${u.avatar}`} 
                                    alt={u.username}
                                    className="w-8 h-8 object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-gray-600">
                                    {u.username?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase() || 'U'}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{u.fullName || u.username}</div>
                                <div className="text-sm text-gray-500">{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">{u.email}</td>
                          <td className="p-3">
                            <select
                              value={u.role}
                              onChange={(e) => updateRole(u._id, e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                              disabled={changing === u._id}
                            >
                              <option value="admin">admin</option>
                              <option value="editor">editor</option>
                              <option value="moderator">moderator</option>
                              <option value="user">user</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => deleteUser(u._id)}
                              className="p-2 rounded-full hover:bg-red-50 text-red-600"
                              aria-label="Delete user"
                              disabled={changing === u._id}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!usersLoading && users.length === 0 && (
                        <tr><td className="p-4 text-gray-500" colSpan={4}>No users found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-4">
                  {users.map((u: any) => (
                    <div key={u._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {u.avatar ? (
                              <img 
                                src={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5050'}${u.avatar}`} 
                                alt={u.username}
                                className="w-10 h-10 object-cover"
                              />
                            ) : (
                              <span className="text-lg font-medium text-gray-600">
                                {u.username?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{u.fullName || u.username}</h3>
                            <p className="text-sm text-gray-600">{u.email}</p>
                            <p className="text-xs text-gray-500">@{u.username}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteUser(u._id)}
                          className="p-2 rounded-full hover:bg-red-50 text-red-600"
                          aria-label="Delete user"
                          disabled={changing === u._id}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Role:</label>
                        <select
                          value={u.role}
                          onChange={(e) => updateRole(u._id, e.target.value)}
                          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                          disabled={changing === u._id}
                        >
                          <option value="admin">admin</option>
                          <option value="editor">editor</option>
                          <option value="moderator">moderator</option>
                          <option value="user">user</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {!usersLoading && users.length === 0 && (
                    <div className="text-center text-gray-500 py-8">No users found.</div>
                  )}
                </div>
                {usersLoading && <div className="p-4 text-gray-500">Loading...</div>}
              </div>
            )}

            {active === 'news' && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                {newsSuccess && (
                  <div className="fixed right-4 top-4 z-30 rounded-lg bg-green-600 text-white px-4 py-2 shadow-lg animate-[fadein_0.2s_ease]">
                    {newsSuccess}
                  </div>
                )}
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-semibold mb-4">News</h2>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        value={newsQuery}
                        onChange={(e) => setNewsQuery(e.target.value)}
                        placeholder="Search title/content"
                        className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                      <div className="flex gap-2">
                        <button onClick={loadNews} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors" aria-label="Refresh">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v7h-7"/></svg>
                        </button>
                        <button onClick={() => openEdit({ _id: null, title: '', content: '', imageUrl: '' })} className="p-2 rounded-lg bg-black text-white hover:opacity-90 transition-opacity" aria-label="Add">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        value={newsAuthor}
                        onChange={(e) => setNewsAuthor(e.target.value)}
                        className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="all">All authors</option>
                        {authorOptions.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                      <select
                        value={newsSort}
                        onChange={(e) => setNewsSort(e.target.value as any)}
                        className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="latest">Latest</option>
                        <option value="oldest">Oldest</option>
                      </select>
                    </div>
                  </div>
                </div>
                {(newsError || newsSuccess) && (
                  <div className={`p-3 text-sm border-b ${newsError ? 'text-red-700 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}>
                    {newsError || newsSuccess}
                  </div>
                )}
                {newsLoading && <div className="p-4 text-gray-500">Loading...</div>}
                {!newsLoading && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredNews.map((n: any) => (
                      <article key={n._id} className="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
                        {n.imageUrl && (
                          <div
                            className="w-full h-40 bg-gray-100"
                            style={{ backgroundImage: `url("${encodeURI(absImg(n.imageUrl))}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                          />
                        )}
                        <div className="p-3">
                          <h3 className="font-semibold line-clamp-2 mb-1">{n.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-3 mb-2">{n.content}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => toggleFeatured(n)} className={`p-2 rounded-full ${n.isFeatured ? 'text-yellow-500 hover:bg-yellow-50' : 'hover:bg-gray-100'}`} aria-label="Toggle featured">
                                {n.isFeatured ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/></svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/></svg>
                                )}
                              </button>
                              <button onClick={() => openEdit(n)} className="p-2 rounded-full hover:bg-gray-100" aria-label="Edit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                              </button>
                              <button onClick={() => deleteNews(n._id)} className="p-2 rounded-full hover:bg-red-50 text-red-600" aria-label="Delete">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                    {!newsLoading && news.length === 0 && (
                      <div className="text-gray-500">No news found.</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {editing && (
              <div className="fixed inset-0 z-30 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
                <div className="relative w-full max-w-xl bg-white rounded-xl shadow-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{editing._id ? 'Edit News' : 'Add News'}</h3>
                    <button onClick={() => setEditing(null)} aria-label="close">✕</button>
                  </div>
                  <form onSubmit={submitEdit} className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">Title</label>
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Content</label>
                      <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black h-32" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block">Image (optional)</label>
                      {editPreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={editPreview} alt="Preview" className="w-full h-40 object-cover rounded mb-2 border" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setEditImage(file);
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setEditPreview(url);
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={editFeatured} onChange={(e) => setEditFeatured(e.target.checked)} />
                        Set as featured (main post)
                      </label>
                      <div className="flex gap-2">
                      <button type="button" onClick={() => setEditing(null)} className="rounded bg-gray-200 px-4 py-2">Cancel</button>
                      <button type="submit" className="rounded bg-black text-white px-4 py-2">Save</button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {active === 'leagues' && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                {leaguesSuccess && (
                  <div className="fixed right-4 top-4 z-30 rounded-lg bg-green-600 text-white px-4 py-2 shadow-lg animate-[fadein_0.2s_ease]">
                    {leaguesSuccess}
                  </div>
                )}
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-semibold mb-4">League Management</h2>
                  
                  {/* Configuration Info */}
                  {configInfo && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-blue-900">JSON Configuration</div>
                          <div className="text-xs text-blue-700">
                            Last updated: {new Date(configInfo.lastUpdated).toLocaleString()} • 
                            Version: {configInfo.version} • 
                            File size: {configInfo.size} bytes
                          </div>
                        </div>
                        <div className="text-xs text-blue-600">
                          {configInfo.count} league{configInfo.count !== 1 ? 's' : ''} configured
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Performance Warning */}
                  {allAvailableLeagues.length > 100 && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-yellow-800">
                          <strong>Performance Notice:</strong> Showing {allAvailableLeagues.length} leagues with pagination (50 per page) to prevent browser crashes.
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Tabs */}
                  <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setLeaguesTab('all')}
                      className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                        leaguesTab === 'all' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      All Leagues ({leagues.length})
                    </button>
                    <button
                      onClick={() => setLeaguesTab('allowed')}
                      className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                        leaguesTab === 'allowed' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Allowed Leagues ({allowedLeagues.length}) {allowedLeagues.length > 0 && <span className="text-xs text-gray-500">• Priority Order</span>}
                    </button>
                    <button
                      onClick={() => setLeaguesTab('available')}
                      className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                        leaguesTab === 'available' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Available Leagues ({allAvailableLeagues.length})
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        value={leaguesSearch}
                        onChange={(e) => setLeaguesSearch(e.target.value)}
                        placeholder="Search leagues..."
                        className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                 <div className="flex gap-2">
                   <button onClick={loadLeagues} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors" aria-label="Refresh">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v7h-7"/></svg>
                   </button>
                   {leaguesTab === 'available' && (
                     <button onClick={loadAllAvailableLeagues} className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors" aria-label="Load Available Leagues">
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M7 10h10"/><path d="M7 14h4"/></svg>
                     </button>
                   )}
                   {leaguesTab === 'allowed' && (
                     <button 
                       onClick={() => updateAllowedLeagues(allowedLeagues)} 
                       className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors" 
                       aria-label="Save Priority Changes"
                     >
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>
                     </button>
                   )}
                   {(leaguesTab === 'all' || leaguesTab === 'allowed') && (
                     <button 
                       onClick={updateLeaguePriorities} 
                       className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors" 
                       aria-label="Save Priority Numbers"
                     >
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
                     </button>
                   )}
                   <button 
                     onClick={async () => {
                       if (!token) return;
                       setLeaguesLoading(true);
                       try {
                         await apiFetch("/api/leagues/refresh-info", { method: "POST" }, token);
                         setLeaguesSuccess("League information refreshed from database!");
                         setTimeout(() => setLeaguesSuccess(null), 3000);
                         loadLeagues(); // Reload to show updated info
                       } catch (e: any) {
                         setLeaguesError(e.message);
                       } finally {
                         setLeaguesLoading(false);
                       }
                     }}
                     className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors" 
                     aria-label="Refresh League Info"
                   >
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v7h-7"/></svg>
                   </button>
                      </div>
                    </div>
                    {leaguesTab === 'all' && (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select
                          value={leaguesCountry}
                          onChange={(e) => setLeaguesCountry(e.target.value)}
                          className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="all">All Countries</option>
                          {Array.from(new Set(leagues.map((l: any) => l.country))).sort().map((country: string) => (
                            <option key={country} value={country}>{country}</option>
                          ))}
                        </select>
                        <select
                          value={leaguesType}
                          onChange={(e) => setLeaguesType(e.target.value)}
                          className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="all">All Types</option>
                          {Array.from(new Set(leagues.map((l: any) => l.type))).sort().map((type: string) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                {(leaguesError || leaguesSuccess) && (
                  <div className={`p-3 text-sm border-b ${leaguesError ? 'text-red-700 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}>
                    {leaguesError || leaguesSuccess}
                  </div>
                )}
                <div className="p-4">
                  {leaguesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                 {leaguesTab === 'available' ? (
                   // Available Leagues Tab - Show paginated available leagues with add buttons
                   (() => {
                     const filteredLeagues = allAvailableLeagues.filter((league: any) => {
                       const matchesSearch = debouncedSearch ? 
                         league.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                         league.country.toLowerCase().includes(debouncedSearch.toLowerCase()) : true;
                       return matchesSearch;
                     });
                     
                     const totalPages = Math.ceil(filteredLeagues.length / leaguesPerPage);
                     const startIndex = (leaguesPage - 1) * leaguesPerPage;
                     const endIndex = startIndex + leaguesPerPage;
                     const paginatedLeagues = filteredLeagues.slice(startIndex, endIndex);
                     
                     return (
                       <>
                         {paginatedLeagues.map((league: any) => (
                       <div key={league._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                         <div className="flex items-center gap-3">
                           {league.logo && (
                             <img 
                               src={league.logo} 
                               alt={league.name}
                               className="w-8 h-8 object-contain"
                             />
                           )}
                           <div>
                             <div className="font-medium">{league.name}</div>
                             <div className="text-sm text-gray-500">{league.country} • {league.type}</div>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className={`text-xs px-2 py-1 rounded-full ${
                             allowedLeagues.includes(league.apiId) 
                               ? 'bg-green-100 text-green-800' 
                               : 'bg-gray-100 text-gray-600'
                           }`}>
                             {allowedLeagues.includes(league.apiId) ? 'Already Added' : 'Available'}
                           </span>
                           <button
                             onClick={() => toggleLeagueStatus(league.apiId)}
                             disabled={allowedLeagues.includes(league.apiId)}
                             className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                               allowedLeagues.includes(league.apiId)
                                 ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                 : 'bg-green-100 text-green-700 hover:bg-green-200'
                             }`}
                           >
                             {allowedLeagues.includes(league.apiId) ? 'Added' : 'Add to Allowed'}
                           </button>
                         </div>
                       </div>
                         ))}
                         
                         {/* Pagination Controls */}
                         {totalPages > 1 && (
                           <div className="flex items-center justify-center gap-2 mt-6">
                             <button
                               onClick={() => setLeaguesPage(Math.max(1, leaguesPage - 1))}
                               disabled={leaguesPage === 1}
                               className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                               Previous
                             </button>
                             <span className="text-sm text-gray-600">
                               Page {leaguesPage} of {totalPages} ({filteredLeagues.length} total)
                             </span>
                             <button
                               onClick={() => setLeaguesPage(Math.min(totalPages, leaguesPage + 1))}
                               disabled={leaguesPage === totalPages}
                               className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                               Next
                             </button>
                           </div>
                         )}
                       </>
                     );
                   })()
                 ) : leaguesTab === 'allowed' ? (
                   // Allowed Leagues Tab - Show with priority management
                   leagues
                     .filter((league: any) => allowedLeagues.includes(league.apiId))
                     .filter((league: any) => {
                       const matchesSearch = leaguesSearch ? 
                         league.name.toLowerCase().includes(leaguesSearch.toLowerCase()) ||
                         league.country.toLowerCase().includes(leaguesSearch.toLowerCase()) : true;
                       return matchesSearch;
                     })
                     .map((league: any, index: number) => (
                            <div key={league._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-green-50">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      const newAllowedLeagues = [...allowedLeagues];
                                      const currentIndex = newAllowedLeagues.indexOf(league.apiId);
                                      if (currentIndex > 0) {
                                        [newAllowedLeagues[currentIndex], newAllowedLeagues[currentIndex - 1]] = 
                                        [newAllowedLeagues[currentIndex - 1], newAllowedLeagues[currentIndex]];
                                        setAllowedLeagues(newAllowedLeagues);
                                      }
                                    }}
                                    disabled={index === 0}
                                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                                  </button>
                                  <button
                                    onClick={() => {
                                      const newAllowedLeagues = [...allowedLeagues];
                                      const currentIndex = newAllowedLeagues.indexOf(league.apiId);
                                      if (currentIndex < newAllowedLeagues.length - 1) {
                                        [newAllowedLeagues[currentIndex], newAllowedLeagues[currentIndex + 1]] = 
                                        [newAllowedLeagues[currentIndex + 1], newAllowedLeagues[currentIndex]];
                                        setAllowedLeagues(newAllowedLeagues);
                                      }
                                    }}
                                    disabled={index === allowedLeagues.length - 1}
                                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                                  </button>
                                </div>
                                {league.logo && (
                                  <img 
                                    src={league.logo} 
                                    alt={league.name}
                                    className="w-8 h-8 object-contain"
                                  />
                                )}
                                <div>
                                  <div className="font-medium">{league.name}</div>
                                  <div className="text-sm text-gray-500">{league.country} • {league.type}</div>
                                </div>
                              </div>
                         <div className="flex items-center gap-2">
                           <div className="flex items-center gap-1">
                             <span className="text-xs text-gray-500">Priority:</span>
                             <div className="flex items-center gap-1">
                               <input
                                 type="number"
                                 min="1"
                                 max="100"
                                 value={league.priority || index + 1}
                                 onChange={(e) => {
                                   const newPriority = parseInt(e.target.value) || 1;
                                   const updatedLeagues = leagues.map((l: any) => 
                                     l.apiId === league.apiId ? { ...l, priority: newPriority } : l
                                   );
                                   setLeagues(updatedLeagues);
                                 }}
                                 onFocus={(e) => e.target.select()}
                                 className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                 placeholder="1"
                               />
                               <button
                                 onClick={() => {
                                   const updatedLeagues = leagues.map((l: any) => 
                                     l.apiId === league.apiId ? { ...l, priority: 1 } : l
                                   );
                                   setLeagues(updatedLeagues);
                                 }}
                                 className="p-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                 title="Reset to 1"
                               >
                                 ↺
                               </button>
                             </div>
                           </div>
                           <button
                             onClick={() => toggleLeagueStatus(league.apiId)}
                             className="px-3 py-1 text-sm rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                           >
                             Block
                           </button>
                         </div>
                            </div>
                          ))
                 ) : (
                   // All Leagues Tab - Show paginated leagues with toggle
                   (() => {
                     const filteredLeagues = leagues.filter((league: any) => {
                       const matchesSearch = debouncedSearch ? 
                         league.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                         league.country.toLowerCase().includes(debouncedSearch.toLowerCase()) : true;
                       const matchesCountry = leaguesCountry === 'all' || league.country === leaguesCountry;
                       const matchesType = leaguesType === 'all' || league.type === leaguesType;
                       return matchesSearch && matchesCountry && matchesType;
                     });
                     
                     const totalPages = Math.ceil(filteredLeagues.length / leaguesPerPage);
                     const startIndex = (leaguesPage - 1) * leaguesPerPage;
                     const endIndex = startIndex + leaguesPerPage;
                     const paginatedLeagues = filteredLeagues.slice(startIndex, endIndex);
                     
                     return (
                       <>
                         {paginatedLeagues.map((league: any) => (
                            <div key={league._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <div className="flex items-center gap-3">
                                {league.logo && (
                                  <img 
                                    src={league.logo} 
                                    alt={league.name}
                                    className="w-8 h-8 object-contain"
                                  />
                                )}
                                <div>
                                  <div className="font-medium">{league.name}</div>
                                  <div className="text-sm text-gray-500">{league.country} • {league.type}</div>
                                </div>
                              </div>
                         <div className="flex items-center gap-2">
                           <div className="flex items-center gap-1">
                             <span className="text-xs text-gray-500">Priority:</span>
                             <div className="flex items-center gap-1">
                               <input
                                 type="number"
                                 min="1"
                                 max="100"
                                 value={league.priority || 1}
                                 onChange={(e) => {
                                   const newPriority = parseInt(e.target.value) || 1;
                                   const updatedLeagues = leagues.map((l: any) => 
                                     l.apiId === league.apiId ? { ...l, priority: newPriority } : l
                                   );
                                   setLeagues(updatedLeagues);
                                 }}
                                 onFocus={(e) => e.target.select()}
                                 className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                 placeholder="1"
                               />
                               <button
                                 onClick={() => {
                                   const updatedLeagues = leagues.map((l: any) => 
                                     l.apiId === league.apiId ? { ...l, priority: 1 } : l
                                   );
                                   setLeagues(updatedLeagues);
                                 }}
                                 className="p-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                 title="Reset to 1"
                               >
                                 ↺
                               </button>
                             </div>
                           </div>
                           <span className={`text-xs px-2 py-1 rounded-full ${
                             allowedLeagues.includes(league.apiId) 
                               ? 'bg-green-100 text-green-800' 
                               : 'bg-gray-100 text-gray-600'
                           }`}>
                             {allowedLeagues.includes(league.apiId) ? 'Allowed' : 'Blocked'}
                           </span>
                           <button
                             onClick={() => toggleLeagueStatus(league.apiId)}
                             className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                               allowedLeagues.includes(league.apiId)
                                 ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                 : 'bg-green-100 text-green-700 hover:bg-green-200'
                             }`}
                           >
                             {allowedLeagues.includes(league.apiId) ? 'Block' : 'Allow'}
                           </button>
                         </div>
                            </div>
                          ))}
                         
                         {/* Pagination Controls */}
                         {totalPages > 1 && (
                           <div className="flex items-center justify-center gap-2 mt-6">
                             <button
                               onClick={() => setLeaguesPage(Math.max(1, leaguesPage - 1))}
                               disabled={leaguesPage === 1}
                               className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                               Previous
                             </button>
                             <span className="text-sm text-gray-600">
                               Page {leaguesPage} of {totalPages} ({filteredLeagues.length} total)
                             </span>
                             <button
                               onClick={() => setLeaguesPage(Math.min(totalPages, leaguesPage + 1))}
                               disabled={leaguesPage === totalPages}
                               className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                               Next
                             </button>
                           </div>
                         )}
                       </>
                     );
                   })()
                      )}
                 {(leagues.length === 0 && leaguesTab !== 'available') && !leaguesLoading && (
                   <div className="text-center py-8 text-gray-500">
                     No leagues found. Click refresh to load leagues.
                   </div>
                 )}
                 {leaguesTab === 'available' && allAvailableLeagues.length === 0 && !leaguesLoading && (
                   <div className="text-center py-8 text-gray-500">
                     No available leagues found. Click refresh to load available leagues.
                   </div>
                 )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {active === 'gameweeks' && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                {gameweeksSuccess && (
                  <div className="fixed right-4 top-4 z-30 rounded-lg bg-green-600 text-white px-4 py-2 shadow-lg animate-[fadein_0.2s_ease]">
                    {gameweeksSuccess}
                  </div>
                )}
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-semibold mb-4">Gameweek Management</h2>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={fetchAvailableMatches}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Fetch Real Madrid & Barcelona Matches
                    </button>
                    <button
                      onClick={() => setShowSimpleManual(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Match by ID
                    </button>
                    <button
                      onClick={loadGameweeks}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
                {(gameweeksError || gameweeksSuccess) && (
                  <div className={`p-3 text-sm border-b ${gameweeksError ? 'text-red-700 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}>
                    {gameweeksError || gameweeksSuccess}
                  </div>
                )}
                <div className="p-4">
                  {gameweeksLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {gameweeks.map((gameweek: any) => (
                        <div key={gameweek._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{gameweek.name}</h3>
                              {gameweek.description && (
                                <p className="text-sm text-gray-600">{gameweek.description}</p>
                              )}
                              <div className="text-sm text-gray-500 mt-1">
                                {new Date(gameweek.startDate).toLocaleDateString()} - {new Date(gameweek.endDate).toLocaleDateString()}
                                {gameweek.isActive && <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>}
                                {gameweek.isFinished && <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Finished</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!gameweek.isActive && !gameweek.isFinished && (
                                <button
                                  onClick={() => activateGameweek(gameweek._id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                >
                                  Activate
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete this entire gameweek? This will remove all ${(gameweek.matches?.length || 0) + (gameweek.externalMatches?.length || 0)} matches.`)) {
                                    deleteGameweek(gameweek._id);
                                  }
                                }}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                              >
                                Delete Gameweek
                              </button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            Matches: {(gameweek.matches?.length || 0) + (gameweek.externalMatches?.length || 0)}
                          </div>
                          {gameweek.externalMatches && gameweek.externalMatches.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {gameweek.externalMatches.map((match: any, index: number) => (
                                <div key={index} className="bg-blue-900 text-white p-2 rounded flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{match.teams.home.name}</span>
                                    <img src={match.teams.home.logo} alt={match.teams.home.name} className="w-5 h-5 rounded-full" />
                                  </div>
                                  <div className="flex flex-col items-center text-sm font-medium">
                                    <span className="text-xs text-gray-300">
                                      {new Date(match.fixture.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    <span>
                                      {new Date(match.fixture.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <img src={match.teams.away.logo} alt={match.teams.away.name} className="w-5 h-5 rounded-full" />
                                    <span className="text-sm font-medium">{match.teams.away.name}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {gameweeks.length === 0 && !gameweeksLoading && (
                        <div className="text-center py-8 text-gray-500">
                          No gameweeks found. Create your first gameweek to get started.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Available Matches Modal */}
            {availableMatches.length > 0 && (
              <div className="fixed inset-0 z-30 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40" onClick={() => setAvailableMatches([])} />
                <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl p-6 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Select Matches for Gameweek</h3>
                    <button onClick={() => setAvailableMatches([])} className="text-gray-500 hover:text-gray-700">
                      ✕
                    </button>
                  </div>
                  {teams && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <img src={teams.realMadrid.logo} alt="Real Madrid" className="w-6 h-6" />
                          <span className="font-medium">{teams.realMadrid.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <img src={teams.barcelona.logo} alt="Barcelona" className="w-6 h-6" />
                          <span className="font-medium">{teams.barcelona.name}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableMatches.map((match: any) => (
                      <label key={match.fixture.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedMatches.includes(match.fixture.id.toString())}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMatches([...selectedMatches, match.fixture.id.toString()]);
                            } else {
                              setSelectedMatches(selectedMatches.filter(id => id !== match.fixture.id.toString()));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img src={match.teams.home.logo} alt={match.teams.home.name} className="w-6 h-6" />
                              <span className="font-medium">{match.teams.home.name}</span>
                              <span className="text-gray-500">vs</span>
                              <span className="font-medium">{match.teams.away.name}</span>
                              <img src={match.teams.away.logo} alt={match.teams.away.name} className="w-6 h-6" />
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(match.fixture.date).toLocaleDateString()} {new Date(match.fixture.date).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {match.league.name} - {match.league.country}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setAvailableMatches([])}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        console.log("Add Selected Matches button clicked!");
                        console.log("Selected matches:", selectedMatches);
                        console.log("Gameweeks:", gameweeks);
                        
                        if (selectedMatches.length === 0) {
                          console.log("No matches selected");
                          setGameweeksError("Please select at least one match");
                          return;
                        }
                        
                        try {
                          console.log("Creating gameweek from selected matches:", selectedMatches);
                          
                          // Get the full match data for selected matches
                          const selectedMatchData = availableMatches.filter((match: any) => 
                            selectedMatches.includes(match.fixture.id.toString())
                          );
                          
                          // Create a new gameweek with the selected matches
                          const newGameweek = {
                            name: `Gameweek ${new Date().toLocaleDateString()}`,
                            description: 'Created from fetched matches',
                            startDate: new Date().toISOString().split('T')[0],
                            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            isActive: true,
                            matchData: selectedMatchData
                          };
                          
                          console.log("Creating gameweek:", newGameweek);
                          const response = await apiFetch("/fantasy/gameweeks", {
                            method: "POST",
                            body: JSON.stringify(newGameweek),
                          }, token!);
                          
                          console.log("Gameweek created successfully:", response);
                          setGameweeksSuccess("Gameweek created successfully!");
                          setTimeout(() => setGameweeksSuccess(null), 3000);
                          
                          // Reload gameweeks to show the new one
                          await loadGameweeks();
                          
                          // Close the modal
                          setAvailableMatches([]);
                          setSelectedMatches([]);
                        } catch (error) {
                          console.error("Error creating gameweek:", error);
                          setGameweeksError("Failed to create gameweek");
                        }
                      }}
                      disabled={gameweeksLoading}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        gameweeksLoading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                    >
                      {gameweeksLoading ? 'Adding Matches...' : 'Add Selected Matches'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Simple Manual Match Input Modal */}
            {showSimpleManual && (
              <div className="fixed inset-0 z-30 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40" onClick={() => setShowSimpleManual(false)} />
                <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Add Match by ID</h3>
                    <button onClick={() => setShowSimpleManual(false)} className="text-gray-500 hover:text-gray-700">
                      ✕
                    </button>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); addSimpleManualMatch(); }} className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Match ID</label>
                      <input
                        type="text"
                        value={simpleMatchId}
                        onChange={(e) => setSimpleMatchId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 1277934"
                        required
                      />
                      <p className="text-xs text-gray-500">
                        Enter any match ID to create new gameweek with real match data
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowSimpleManual(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={gameweeksLoading}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                          gameweeksLoading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        } text-white`}
                      >
                        {gameweeksLoading ? 'Adding...' : 'Add Match'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}


