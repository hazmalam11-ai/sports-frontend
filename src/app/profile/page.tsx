"use client";

import Image from "next/image";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { apiFetch, getFavoriteTeams, FavoriteTeam, getFavoritePlayers, FavoritePlayer } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, token, loading, refresh } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [me, setMe] = useState<any | null>(user || null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [favoriteTeams, setFavoriteTeams] = useState<FavoriteTeam[]>([]);
  const [favoriteTeamsLoading, setFavoriteTeamsLoading] = useState(false);
  const [favoritePlayers, setFavoritePlayers] = useState<FavoritePlayer[]>([]);
  const [favoritePlayersLoading, setFavoritePlayersLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function toggle<T extends string>(arr: T[], value: T, setter: (v: T[]) => void) {
    if (arr.includes(value)) setter(arr.filter((x) => x !== value));
    else setter([...arr, value]);
  }

  async function handleAvatarUpload() {
    if (!avatarFile || !token) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5050'}/auth/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMe(data.user);
        // Update the AuthContext user data as well
        await refresh();
        setAvatarFile(null);
        setAvatarPreview(null);
        setError(null);
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  }

  // Fetch favorite teams
  const loadFavoriteTeams = async () => {
    if (!token) return;
    
    setFavoriteTeamsLoading(true);
    try {
      const data = await getFavoriteTeams(token);
      setFavoriteTeams(data.favoriteTeams || []);
    } catch (e: any) {
      console.error('Failed to load favorite teams:', e);
    } finally {
      setFavoriteTeamsLoading(false);
    }
  };

  // Fetch favorite players
  const loadFavoritePlayers = async () => {
    if (!token) return;
    
    setFavoritePlayersLoading(true);
    try {
      const data = await getFavoritePlayers(token);
      setFavoritePlayers(data.favoritePlayers || []);
    } catch (e: any) {
      console.error('Failed to load favorite players:', e);
    } finally {
      setFavoritePlayersLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (loading) {
      return;
    }
    if (!token) {
      router.replace("/");
      return () => { mounted = false; };
    }
    
    // Use existing user data if available, only fetch if needed
    if (user && !me) {
      setMe(user);
      return () => { mounted = false; };
    }
    
    async function load() {
      setProfileLoading(true);
      setError(null);
      try {
        const data = await apiFetch<any>("/auth/me", {}, token || undefined);
        if (mounted) setMe(data?.user || data);
      } catch (e: any) {
        if (mounted) setError(e.message || "Failed to load profile");
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }
    
    // Only fetch if we don't have user data
    if (!user) {
      load();
    }
    
    // Load favorite teams and players
    loadFavoriteTeams();
    loadFavoritePlayers();
    
    return () => { mounted = false; };
  }, [token, loading, router, user, me]);

  const avatarLetter = useMemo(() => (me?.username || me?.email || "?").charAt(0).toUpperCase(), [me]);

  // Theme-based styling (matching home page)
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';
  const textSubtle = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <>
      <style jsx global>{`
        .profile-card:hover {
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
        
        .glass-morphism-light {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 0, 0, 0.2);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .gradient-bg {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .sport-gradient {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        }
        
        .profile-card-gradient {
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
        {!loading && token && (
        <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className={`text-3xl md:text-4xl font-display font-bold sport-text-gradient mb-2`}>Profile</h1>
            <p className={`text-sm ${textMuted}`}>Manage your account and preferences</p>
          </div>
          
          <section className="mx-auto max-w-5xl">
            <div className={`rounded-2xl p-6 md:p-8 shadow-xl ${isDark ? 'glass-morphism border border-white/10' : 'glass-morphism-light border border-gray-200'} ${cardBg}`}>
          <div className="flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className={`relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-xl font-semibold group ${isDark ? 'glass-morphism border border-white/10 bg-slate-700/50 text-white' : 'glass-morphism-light border border-gray-300 bg-white text-gray-800'}`}>
                {me?.avatar || avatarPreview ? (
                  <Image 
                    src={avatarPreview || `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5050'}${me.avatar}`} 
                    alt="avatar" 
                    width={80} 
                    height={80} 
                    className="w-20 h-20 object-cover" 
                    onError={(e) => {
                      console.error('Avatar load error:', e);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{avatarLetter}</span>
                )}
                <div className={`absolute inset-0 ${isDark ? 'bg-black/50' : 'bg-black/20'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center`}>
                  <label className="cursor-pointer">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17,8 12,3 7,8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <div className="text-center">
                <div className={`font-semibold text-lg ${textColor}`}>{me?.fullName || "User"}</div>
              </div>
            </div>
          </div>

          {avatarFile && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleAvatarUpload}
                disabled={uploading}
                className={`px-4 py-2 bg-[#D9262D] text-white rounded-lg hover:opacity-90 disabled:opacity-50 ${isDark ? 'glass-morphism border border-white/10' : 'glass-morphism-light border border-gray-300'}`}
              >
                {uploading ? 'Uploading...' : 'Upload Avatar'}
              </button>
            </div>
          )}

          {error && (
            <div className={`mt-4 text-center text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</div>
          )}

          <div className="mt-8 space-y-6">
            <InfoRowFull label="Username" value={me?.username || "-"} />
            <InfoRowFull label="Email" value={me?.email || "-"} />
            <InfoRowFull label="Country" value={me?.country || "-"} />
            <FavSection title="My Favorite Teams">
              {favoriteTeamsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : favoriteTeams.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {favoriteTeams.map((team) => (
                    <TeamPill key={`team-${team.teamId}`} team={team} />
                  ))}
                </div>
              ) : (
                <div className={`text-center py-4 ${textMuted}`}>
                  <div className="flex items-center justify-center mb-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </div>
                  <p className="text-sm">No favorite teams yet</p>
                </div>
              )}
            </FavSection>

            <FavSection title="My Favorite Players">
              {favoritePlayersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : favoritePlayers.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {favoritePlayers.map((player) => (
                    <PlayerPill key={`player-${player.playerId}`} player={player} />
                  ))}
                </div>
              ) : (
                <div className={`text-center py-4 ${textMuted}`}>
                  <div className="flex items-center justify-center mb-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </div>
                  <p className="text-sm">No favorite players yet</p>
                </div>
              )}
            </FavSection>
          </div>
        </div>
      </section>
        </main>
      )}
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';
  
  return (
    <div className={`pb-2 border-b ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
      <div className={`text-xs ${textMuted}`}>{label}</div>
      <div className={`text-sm ${textColor}`}>{value}</div>
    </div>
  );
}

function InfoRowFull({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';
  
  return (
    <div className="mb-4">
      <div className={`text-sm font-semibold mb-2 ${textColor}`}>{label}</div>
      <div className={`text-base font-medium ${textColor}`}>
        {value}
      </div>
    </div>
  );
}

function FavSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  
  return (
    <div>
      <div className={`text-sm font-semibold mb-2 ${textColor}`}>{title}</div>
      <div className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

function Pill({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const inactiveDark = 'bg-slate-700/50 text-white hover:bg-slate-600/50 glass-morphism border border-white/10';
  const inactiveLight = 'bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-400 shadow-sm';
  
  return (
    <button onClick={onClick} className={`flex items-center gap-2 rounded-lg px-3 py-1 text-sm transition-all duration-300 ${active ? `bg-[#D9262D] text-white ${isDark ? 'glass-morphism border border-white/10' : 'border border-red-500 shadow-md'}` : (isDark ? inactiveDark : inactiveLight)}`}>
      <span>{label}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
    </button>
  );
}

function TeamPill({ team }: { team: FavoriteTeam }) {
  return (
    <div className="relative group">
      {/* Team Logo Only */}
      <div className="w-16 h-16 relative transition-all duration-300 hover:scale-110">
        {team.teamLogo ? (
          <img
            src={team.teamLogo}
            alt={team.teamName}
            className="w-16 h-16 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold">${team.teamName.charAt(0)}</div>`;
              }
            }}
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
            {team.teamName.charAt(0)}
          </div>
        )}
      </div>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-10 backdrop-blur-md bg-slate-800/95 border border-white/20 shadow-2xl">
        <div className="font-semibold text-white">{team.teamName}</div>
        <div className="text-xs text-slate-300 mt-1">{team.leagueName}</div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800/95"></div>
      </div>
    </div>
  );
}

function PlayerPill({ player }: { player: FavoritePlayer }) {
  return (
    <div className="relative group">
      {/* Player Photo Only */}
      <div className="w-16 h-16 relative transition-all duration-300 hover:scale-110">
        {player.playerPhoto ? (
          <img
            src={player.playerPhoto}
            alt={player.playerName}
            className="w-16 h-16 object-cover rounded-full"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<div class="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white text-lg font-bold">${player.playerName.charAt(0)}</div>`;
              }
            }}
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white text-lg font-bold">
            {player.playerName.charAt(0)}
          </div>
        )}
      </div>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-10 backdrop-blur-md bg-slate-800/95 border border-white/20 shadow-2xl">
        <div className="font-semibold text-white">{player.playerName}</div>
        <div className="text-xs text-slate-300 mt-1">{player.position} • {player.team.name}</div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800/95"></div>
      </div>
    </div>
  );
}