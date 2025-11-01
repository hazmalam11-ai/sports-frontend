export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5050";

export async function apiFetch<T = any>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || res.statusText;
    throw new Error(message);
  }
  return data as T;
}

// Favorite Teams API functions
export interface FavoriteTeam {
  teamId: number;
  teamName: string;
  teamLogo: string;
  leagueName: string;
  leagueId: number;
  addedAt: string;
}

export interface FavoriteTeamsResponse {
  success: boolean;
  favoriteTeams: FavoriteTeam[];
  count: number;
}

export interface FavoriteStatusResponse {
  success: boolean;
  isFavorite: boolean;
  teamId: number;
}

export async function getFavoriteTeams(token: string): Promise<FavoriteTeamsResponse> {
  return apiFetch<FavoriteTeamsResponse>('/users/favorites', {
    method: 'GET',
  }, token);
}

export async function addToFavorites(
  teamId: number, 
  teamName: string, 
  teamLogo: string, 
  leagueName: string, 
  leagueId: number, 
  token: string
): Promise<{ success: boolean; message: string; favoriteTeams: FavoriteTeam[] }> {
  return apiFetch('/users/favorites', {
    method: 'POST',
    body: JSON.stringify({
      teamId,
      teamName,
      teamLogo,
      leagueName,
      leagueId,
    }),
  }, token);
}

export async function removeFromFavorites(teamId: number, token: string): Promise<{ success: boolean; message: string; favoriteTeams: FavoriteTeam[] }> {
  return apiFetch(`/users/favorites/${teamId}`, {
    method: 'DELETE',
  }, token);
}

export async function checkFavoriteStatus(teamId: number, token: string): Promise<FavoriteStatusResponse> {
  return apiFetch<FavoriteStatusResponse>(`/users/favorites/${teamId}`, {
    method: 'GET',
  }, token);
}

// ============= FAVORITE PLAYERS INTERFACES =============

export interface FavoritePlayer {
  playerId: number;
  playerName: string;
  playerPhoto: string;
  position: string;
  team: {
    name: string;
    logo: string;
  };
  leagueName: string;
  leagueId: number;
  addedAt: string;
}

export interface FavoritePlayersResponse {
  favoritePlayers: FavoritePlayer[];
}

export interface FavoritePlayerStatusResponse {
  isFavorite: boolean;
}

// ============= FAVORITE PLAYERS API FUNCTIONS =============

export async function getFavoritePlayers(token: string): Promise<FavoritePlayersResponse> {
  return apiFetch<FavoritePlayersResponse>('/users/favorite-players', {
    method: 'GET',
  }, token);
}

export async function addPlayerToFavorites(
  playerId: number,
  playerName: string,
  playerPhoto: string,
  position: string,
  team: { name: string; logo: string },
  leagueName: string,
  leagueId: number,
  token: string
): Promise<{ message: string; player: FavoritePlayer }> {
  return apiFetch<{ message: string; player: FavoritePlayer }>('/users/favorite-players', {
    method: 'POST',
    body: JSON.stringify({
      playerId,
      playerName,
      playerPhoto,
      position,
      team,
      leagueName,
      leagueId,
    }),
  }, token);
}

export async function removePlayerFromFavorites(playerId: number, token: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/users/favorite-players/${playerId}`, {
    method: 'DELETE',
  }, token);
}

export async function checkPlayerFavoriteStatus(playerId: number, token: string): Promise<FavoritePlayerStatusResponse> {
  return apiFetch<FavoritePlayerStatusResponse>(`/users/favorite-players/${playerId}`, {
    method: 'GET',
  }, token);
}

