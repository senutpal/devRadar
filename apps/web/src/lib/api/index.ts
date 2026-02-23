import { api } from '@/lib/auth/api';
import type {
  UserStats,
  WeeklyStats,
  Friend,
  Follower,
  FriendRequest,
  PublicUser,
  LeaderboardResponse,
  NetworkActivity,
  TeamSummary,
  TeamDetail,
  TeamInvitation,
  PaginatedResponse,
} from './types';

export * from './types';

// ---- Stats ----
export const statsApi = {
  getMyStats: () => api<{ data: UserStats }>('/api/v1/stats/me'),
  getWeeklyStats: () => api<{ data: WeeklyStats }>('/api/v1/stats/weekly'),
};

// ---- Friends ----
export const friendsApi = {
  list: (page = 1, limit = 20) =>
    api<PaginatedResponse<Friend>>(`/api/v1/friends?page=${page}&limit=${limit}`),
  followers: (page = 1, limit = 20) =>
    api<PaginatedResponse<Follower>>(`/api/v1/friends/followers?page=${page}&limit=${limit}`),
  follow: (id: string) =>
    api<{ data: { followerId: string; followingId: string; username: string; createdAt: string } }>(
      `/api/v1/friends/${id}`,
      { method: 'POST' }
    ),
  unfollow: (id: string) => api<void>(`/api/v1/friends/${id}`, { method: 'DELETE' }),
  getMutual: (id: string) => api<{ data: PublicUser[] }>(`/api/v1/friends/${id}/mutual`),
};

// ---- Friend Requests ----
export const friendRequestsApi = {
  incoming: (page = 1, limit = 20) =>
    api<PaginatedResponse<FriendRequest>>(
      `/api/v1/friend-requests/incoming?page=${page}&limit=${limit}`
    ),
  outgoing: (page = 1, limit = 20) =>
    api<PaginatedResponse<FriendRequest>>(
      `/api/v1/friend-requests/outgoing?page=${page}&limit=${limit}`
    ),
  send: (toUserId: string) =>
    api<{ data: FriendRequest }>('/api/v1/friend-requests', {
      method: 'POST',
      body: JSON.stringify({ toUserId }),
    }),
  accept: (id: string) =>
    api<{ data: { message: string; friend: PublicUser } }>(`/api/v1/friend-requests/${id}/accept`, {
      method: 'POST',
    }),
  reject: (id: string) =>
    api<{ data: { message: string } }>(`/api/v1/friend-requests/${id}/reject`, {
      method: 'POST',
    }),
  cancel: (id: string) => api<void>(`/api/v1/friend-requests/${id}`, { method: 'DELETE' }),
  count: () => api<{ data: { count: number } }>('/api/v1/friend-requests/count'),
};

// ---- Leaderboard ----
export const leaderboardApi = {
  weeklyTime: (page = 1, limit = 10) =>
    api<{ data: LeaderboardResponse }>(
      `/api/v1/leaderboards/weekly/time?page=${page}&limit=${limit}`
    ),
  weeklyCommits: (page = 1, limit = 10) =>
    api<{ data: LeaderboardResponse }>(
      `/api/v1/leaderboards/weekly/commits?page=${page}&limit=${limit}`
    ),
  friends: () => api<{ data: LeaderboardResponse }>('/api/v1/leaderboards/friends'),
  networkActivity: () => api<{ data: NetworkActivity }>('/api/v1/leaderboards/network-activity'),
};

// ---- Teams ----
export const teamsApi = {
  list: (page = 1, limit = 20) =>
    api<PaginatedResponse<TeamSummary>>(`/api/v1/teams/me?page=${page}&limit=${limit}`),
  create: (name: string, slug: string) =>
    api<{ data: TeamDetail }>('/api/v1/teams', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    }),
  get: (id: string) => api<{ data: TeamDetail }>(`/api/v1/teams/${id}`),
  update: (id: string, name: string) =>
    api<{ data: { id: string; name: string; slug: string; updatedAt: string } }>(
      `/api/v1/teams/${id}`,
      { method: 'PATCH', body: JSON.stringify({ name }) }
    ),
  delete: (id: string) => api<void>(`/api/v1/teams/${id}`, { method: 'DELETE' }),
  invite: (id: string, email: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER') =>
    api<{
      data: {
        id: string;
        email: string;
        role: string;
        teamName: string;
        invitedBy: string;
        expiresAt: string;
      };
    }>(`/api/v1/teams/${id}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  join: (id: string, token: string) =>
    api<{ data: { teamId: string; teamName: string; role: string; message: string } }>(
      `/api/v1/teams/${id}/join`,
      { method: 'POST', body: JSON.stringify({ token }) }
    ),
  updateRole: (teamId: string, userId: string, role: 'ADMIN' | 'MEMBER') =>
    api<{ data: { userId: string; username: string; displayName: string | null; role: string } }>(
      `/api/v1/teams/${teamId}/members/${userId}`,
      { method: 'PATCH', body: JSON.stringify({ role }) }
    ),
  removeMember: (teamId: string, userId: string) =>
    api<void>(`/api/v1/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
  invitations: (id: string) => api<{ data: TeamInvitation[] }>(`/api/v1/teams/${id}/invitations`),
  revokeInvite: (teamId: string, invitationId: string) =>
    api<void>(`/api/v1/teams/${teamId}/invitations/${invitationId}`, { method: 'DELETE' }),
};

// ---- Users ----
export const usersApi = {
  search: (query: string) =>
    api<{ data: PublicUser[] }>(`/api/v1/users/search?q=${encodeURIComponent(query)}`),
  getById: (id: string) =>
    api<{
      data: PublicUser & {
        tier: string;
        privacyMode: boolean;
        status: string;
        activity?: unknown;
      };
    }>(`/api/v1/users/${id}`),
  updateMe: (data: { displayName?: string | null; privacyMode?: boolean }) =>
    api<{ data: PublicUser & { tier: string; privacyMode: boolean } }>('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
