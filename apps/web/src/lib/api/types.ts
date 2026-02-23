// ---- Shared primitives ----
export type UserStatusType = 'online' | 'idle' | 'dnd' | 'offline';
export type TierType = 'FREE' | 'PRO' | 'TEAM';
export type RoleType = 'OWNER' | 'ADMIN' | 'MEMBER';
export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type StreakStatus = 'active' | 'at_risk' | 'broken';

// ---- Pagination ----
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// ---- User ----
export interface PublicUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ActivityPayload {
  fileName?: string;
  language?: string;
  project?: string;
  workspace?: string;
  sessionDuration: number;
  intensity?: number;
  fileHash?: string;
  teamId?: string;
}

export interface Friend extends PublicUser {
  tier: string;
  privacyMode: boolean;
  status: UserStatusType | 'incognito';
  activity?: ActivityPayload;
  followedAt: string;
}

export interface Follower extends PublicUser {
  tier: string;
  followedAt: string;
}

// ---- Friend Requests ----
export interface FriendRequest {
  id: string;
  fromUser: PublicUser;
  toUser: PublicUser;
  status: FriendRequestStatus;
  createdAt: string;
}

// ---- Stats ----
export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  isActiveToday: boolean;
  streakStatus: StreakStatus;
}

export interface WeeklyStats {
  weekStart: string;
  totalSeconds: number;
  totalSessions: number;
  totalCommits: number;
  topLanguage: string | null;
  topProject: string | null;
  rank?: number;
}

export interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string | null;
  earnedAt: string;
}

export interface UserStats {
  streak: StreakInfo;
  todaySession: number;
  weeklyStats: WeeklyStats | null;
  recentAchievements: Achievement[];
}

// ---- Leaderboard ----
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  score: number;
  isFriend: boolean;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  myRank: number | null;
  pagination?: Pagination;
}

export interface NetworkActivity {
  totalActiveUsers: number;
  averageIntensity: number;
  isHot: boolean;
  message: string;
  topLanguages: Array<{ language: string; count: number }>;
}

// ---- Teams ----
export interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  role: RoleType;
  memberCount: number;
  createdAt: string;
}

export interface TeamMember extends PublicUser {
  role: RoleType;
  joinedAt: string;
}

export interface TeamDetail {
  id: string;
  name: string;
  slug: string;
  tier: string;
  owner: PublicUser;
  members: TeamMember[];
  pendingInvitations: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: RoleType;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

// ---- WebSocket ----
export type MessageType =
  | 'AUTH'
  | 'AUTH_SUCCESS'
  | 'CONNECTED'
  | 'STATUS_UPDATE'
  | 'FRIEND_STATUS'
  | 'POKE'
  | 'CONFLICT_ALERT'
  | 'ACHIEVEMENT'
  | 'ERROR'
  | 'HEARTBEAT'
  | 'PONG'
  | 'FRIEND_REQUEST_RECEIVED'
  | 'FRIEND_REQUEST_ACCEPTED';

export interface WebSocketMessage<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: number;
  correlationId?: string;
}
