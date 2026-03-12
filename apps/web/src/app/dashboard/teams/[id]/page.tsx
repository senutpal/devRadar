'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Radio,
  Trophy,
  BarChart3,
  Users,
  Clock,
  GitCommit,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { teamsApi, leaderboardApi, slackApi } from '@/lib/api';
import type {
  TeamDetail,
  TeamMember,
  TeamInvitation,
  TeamAnalytics,
  LeaderboardEntry,
  RoleType,
  ConflictAlert,
} from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { InviteMemberModal } from '@/components/dashboard/invite-member-modal';
import { roleBadgeColors } from '@/components/dashboard/constants';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function MemberRow({
  member,
  isOwner,
  currentUserId,
  teamOwnerId,
  onRoleChange,
  onRemove,
  actionLoading,
}: {
  member: TeamMember;
  isOwner: boolean;
  currentUserId: string;
  teamOwnerId: string;
  onRoleChange: (userId: string, role: 'ADMIN' | 'MEMBER') => void;
  onRemove: (userId: string) => void;
  actionLoading: string | null;
}) {
  const isSelf = member.id === currentUserId;
  const isTeamOwner = member.id === teamOwnerId;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
      {member.avatarUrl ? (
        <Image
          src={member.avatarUrl}
          alt={member.displayName || member.username}
          width={28}
          height={28}
          className="shrink-0"
        />
      ) : (
        <div className="w-7 h-7 bg-muted flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
          {(member.displayName || member.username).charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm truncate block">
          {member.displayName || member.username}
          {isSelf && (
            <span className="text-[10px] font-mono text-muted-foreground ml-1.5">you</span>
          )}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          joined {new Date(member.joinedAt).toLocaleDateString()}
        </span>
      </div>

      {isOwner && !isSelf && !isTeamOwner ? (
        <select
          value={member.role}
          onChange={(e) => onRoleChange(member.id, e.target.value as 'ADMIN' | 'MEMBER')}
          disabled={actionLoading === member.id}
          className="bg-transparent border border-border px-2 py-1 text-[10px] font-mono focus:outline-none"
        >
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
      ) : (
        <span
          className={cn(
            'text-[9px] font-mono uppercase tracking-wider border px-1.5 py-0.5',
            roleBadgeColors[member.role]
          )}
        >
          {isTeamOwner ? 'OWNER' : member.role}
        </span>
      )}

      {isOwner && !isSelf && !isTeamOwner && (
        <button
          aria-label="Remove member"
          onClick={() => onRemove(member.id)}
          disabled={actionLoading === member.id}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function InvitationRow({
  invitation,
  onRevoke,
  loading,
}: {
  invitation: TeamInvitation;
  onRevoke: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-mono truncate block">{invitation.email}</span>
        <span className="text-[10px] text-muted-foreground">
          {invitation.role} &middot; by {invitation.invitedBy} &middot; expires{' '}
          {new Date(invitation.expiresAt).toLocaleDateString()}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onRevoke(invitation.id)}
        disabled={loading}
        className="text-xs font-mono text-destructive hover:text-destructive"
      >
        Revoke
      </Button>
    </div>
  );
}

function TeamLeaderboard({ teamId, currentUserId }: { teamId: string; currentUserId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    leaderboardApi
      .team(teamId)
      .then((res) => {
        if (!cancelled) {
          setEntries(res.data.leaderboard);
          setMyRank(res.data.myRank);
        }
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (loading) {
    return (
      <div className="border border-border p-8 text-center">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="border border-border p-8 text-center">
        <Trophy className="w-5 h-5 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No leaderboard data yet. Start coding to appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {myRank != null && (
        <div className="border-2 border-primary p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Your team rank
            </span>
            <div className="text-3xl text-display font-bold">#{myRank}</div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">by weekly time</span>
        </div>
      )}

      <div className="border border-border">
        <div className="grid grid-cols-[3rem_1fr_auto] gap-0 text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-4 py-2 border-b border-border">
          <span>#</span>
          <span>Member</span>
          <span>Time</span>
        </div>

        {entries.map((entry) => {
          const isMe = entry.userId === currentUserId;
          return (
            <div
              key={entry.userId}
              className={cn(
                'grid grid-cols-[3rem_1fr_auto] gap-0 items-center px-4 py-2.5 border-b border-border last:border-b-0',
                isMe && 'bg-accent',
                entry.rank === 1 && 'border-l-2 border-l-primary',
                entry.rank === 2 && 'border-l-2 border-l-muted-foreground',
                entry.rank === 3 && 'border-l-2 border-l-border'
              )}
            >
              <span className="text-display text-lg font-bold tabular-nums">{entry.rank}</span>
              <div className="flex items-center gap-3 min-w-0">
                {entry.avatarUrl ? (
                  <Image
                    src={entry.avatarUrl}
                    alt={entry.displayName || entry.username}
                    width={24}
                    height={24}
                    className="rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 bg-muted flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                    {(entry.displayName || entry.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm truncate">
                  {entry.displayName || entry.username}
                  {isMe && (
                    <span className="text-[10px] font-mono text-muted-foreground ml-1.5">you</span>
                  )}
                </span>
              </div>
              <span className="text-sm font-mono font-bold tabular-nums">
                {formatTime(entry.score)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamAnalyticsTab({ teamId }: { teamId: string }) {
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    teamsApi
      .analytics(teamId)
      .then((res) => {
        if (!cancelled) setAnalytics(res.data);
      })
      .catch(() => {
        if (!cancelled) setAnalytics(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (loading) {
    return (
      <div className="border border-border p-8 text-center">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="border border-border p-8 text-center">
        <BarChart3 className="w-5 h-5 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No analytics data available yet.</p>
      </div>
    );
  }

  const maxWeeklySeconds = Math.max(...analytics.weeklyTrend.map((w) => w.totalSeconds), 1);
  const maxMemberSeconds = Math.max(...analytics.memberActivity.map((m) => m.totalSeconds), 1);
  const maxLangSeconds = Math.max(...analytics.topLanguages.map((l) => l.seconds), 1);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Members
            </span>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-mono font-bold tabular-nums">
            {analytics.summary.totalMembers}
          </div>
        </div>
        <div className="border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Total Time
            </span>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-mono font-bold tabular-nums">
            {formatTime(analytics.summary.totalSeconds)}
          </div>
        </div>
        <div className="border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Commits
            </span>
            <GitCommit className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-mono font-bold tabular-nums">
            {analytics.summary.totalCommits.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Weekly Trend */}
      {analytics.weeklyTrend.length > 0 && (
        <div className="border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Weekly Trend
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              last {analytics.weeklyTrend.length} weeks
            </span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {analytics.weeklyTrend.map((week) => {
              const height =
                week.totalSeconds > 0
                  ? Math.max(8, (week.totalSeconds / maxWeeklySeconds) * 100)
                  : 0;
              const weekDate = new Date(week.weekStart);
              const label = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;
              return (
                <div key={week.weekStart} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
                    <div
                      className="w-full bg-foreground/20 hover:bg-foreground/40 transition-colors"
                      style={{ height: `${height}%` }}
                      title={`${label}: ${formatTime(week.totalSeconds)} / ${week.totalCommits} commits / ${week.activeMembers} active`}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Member Activity */}
      {analytics.memberActivity.length > 0 && (
        <div className="border border-border">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Member Activity (last 4 weeks)
            </span>
          </div>
          {analytics.memberActivity.map((member) => {
            const barWidth = Math.max(2, (member.totalSeconds / maxMemberSeconds) * 100);
            return (
              <div key={member.userId} className="px-4 py-3 border-b border-border last:border-b-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {member.avatarUrl ? (
                      <Image
                        src={member.avatarUrl}
                        alt={member.displayName || member.username}
                        width={20}
                        height={20}
                        className="rounded-full shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 bg-muted flex items-center justify-center text-[9px] font-mono font-bold shrink-0">
                        {(member.displayName || member.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm truncate">
                      {member.displayName || member.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">
                      {member.totalCommits} commits
                    </span>
                    <span className="text-xs font-mono font-bold tabular-nums">
                      {formatTime(member.totalSeconds)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted">
                  <div className="h-full bg-foreground/30" style={{ width: `${barWidth}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Language Breakdown */}
      {analytics.topLanguages.length > 0 && (
        <div className="border border-border">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Top Languages
            </span>
          </div>
          <div className="p-4 space-y-3">
            {analytics.topLanguages.map((lang) => {
              const barWidth = Math.max(2, (lang.seconds / maxLangSeconds) * 100);
              return (
                <div key={lang.language}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-mono">{lang.language}</span>
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">
                      {formatTime(lang.seconds)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted">
                    <div className="h-full bg-foreground/30" style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ConflictRadarPanel({ teamId }: { teamId: string }) {
  const [conflicts, setConflicts] = useState<ConflictAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConflicts = useCallback(async () => {
    try {
      const res = await teamsApi.conflicts(teamId);
      setConflicts(res.data);
    } catch {
      setConflicts([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchConflicts();
    const interval = setInterval(fetchConflicts, 30000);
    return () => clearInterval(interval);
  }, [fetchConflicts]);

  if (loading) {
    return (
      <div className="border border-border p-8 text-center">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <div className="border border-border p-8 text-center">
        <Radio className="w-5 h-5 mx-auto mb-3 text-muted-foreground animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
          No Active Conflicts
        </span>
        <p className="text-xs text-muted-foreground">
          Monitoring for conflicts... When two team members edit the same file simultaneously,
          alerts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-destructive">
          {conflicts.length} active conflict{conflicts.length > 1 ? 's' : ''}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          auto-refreshes every 30s
        </span>
      </div>
      {conflicts.map((conflict) => (
        <div key={conflict.fileHash} className="border border-destructive/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-3.5 h-3.5 text-destructive animate-pulse" />
            <span className="text-xs font-mono font-bold">{conflict.fileHash.slice(0, 12)}...</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-muted-foreground">Editors:</span>
            {conflict.editors.map((editor) => (
              <div key={editor.id} className="flex items-center gap-1.5 bg-muted px-2 py-1">
                {editor.avatarUrl ? (
                  <Image
                    src={editor.avatarUrl}
                    alt={editor.displayName || editor.username}
                    width={16}
                    height={16}
                    className="shrink-0"
                  />
                ) : (
                  <div className="w-4 h-4 bg-border flex items-center justify-center text-[8px] font-mono font-bold shrink-0">
                    {(editor.displayName || editor.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-[11px] font-mono">
                  {editor.displayName || editor.username}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SlackIntegrationPanel({ teamId }: { teamId: string }) {
  const [status, setStatus] = useState<{
    connected: boolean;
    slackTeamName?: string;
    channelId?: string;
    connectedAt?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await slackApi.getStatus(teamId);
      setStatus(res);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = () => {
    const token = localStorage.getItem('auth_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    // Redirect to server's Slack install endpoint (it handles OAuth redirect)
    window.location.href = `${apiUrl}/slack/install?teamId=${encodeURIComponent(teamId)}&token=${token ? encodeURIComponent(token) : ''}`;
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await slackApi.disconnect(teamId);
      setStatus({ connected: false });
      toast.success('Slack disconnected');
    } catch {
      toast.error('Failed to disconnect Slack');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="border border-border p-8 text-center">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="border border-border p-6">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-4">
          Slack Integration
        </span>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border">
            <div className="w-8 h-8 bg-[#4A154B] flex items-center justify-center text-white text-xs font-bold shrink-0">
              S
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-mono block truncate">{status.slackTeamName}</span>
              <span className="text-[10px] text-muted-foreground">
                Connected{' '}
                {status.connectedAt ? new Date(status.connectedAt).toLocaleDateString() : ''}
              </span>
            </div>
            <span className="text-[10px] font-mono text-green-500 uppercase">Connected</span>
          </div>

          {status.channelId && (
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                Default Channel
              </span>
              <span className="text-sm font-mono">#{status.channelId}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Your team can use{' '}
            <code className="bg-muted px-1 py-0.5 text-[11px]">/devradar status</code> in Slack to
            see who&apos;s coding.
          </p>

          <div className="pt-2 border-t border-border">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs font-mono"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect Slack'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border p-6 text-center">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">
        Slack Integration
      </span>
      <p className="text-xs text-muted-foreground mb-4">
        Connect your Slack workspace to get team status updates and use /devradar commands.
      </p>
      <Button size="sm" onClick={handleConnect} className="text-xs font-mono">
        Connect to Slack
      </Button>
    </div>
  );
}

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.id as string;
  const { user } = useAuth();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const isOwner = team?.owner.id === user?.id;
  const isAdmin =
    isOwner ||
    team?.members.some((m) => m.id === user?.id && (m.role === 'ADMIN' || m.role === 'OWNER'));

  const fetchTeam = useCallback(async () => {
    try {
      const res = await teamsApi.get(teamId);
      setTeam(res.data);
    } catch {
      toast.error('Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await teamsApi.invitations(teamId);
      setInvitations(res.data);
    } catch {
      setInvitations([]);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
    fetchInvitations();
  }, [fetchTeam, fetchInvitations]);

  const handleRoleChange = async (userId: string, role: 'ADMIN' | 'MEMBER') => {
    setActionLoading(userId);
    try {
      await teamsApi.updateRole(teamId, userId, role);
      await fetchTeam();
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setActionLoading(userId);
    try {
      await teamsApi.removeMember(teamId, userId);
      await fetchTeam();
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    setActionLoading(invitationId);
    const prev = invitations;
    setInvitations((list) => list.filter((i) => i.id !== invitationId));
    try {
      await teamsApi.revokeInvite(teamId, invitationId);
      toast.success('Invitation revoked');
    } catch {
      setInvitations(prev);
      toast.error('Failed to revoke invitation');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-10">
        <div className="flex items-center justify-center py-20">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-sm text-muted-foreground">Team not found</p>
      </div>
    );
  }

  if (!user) return null;

  const allMembers: TeamMember[] = [
    {
      id: team.owner.id,
      username: team.owner.username,
      displayName: team.owner.displayName,
      avatarUrl: team.owner.avatarUrl,
      role: 'OWNER' as RoleType,
      joinedAt: team.createdAt,
    },
    ...team.members,
  ];

  return (
    <div className="p-6 lg:p-10">
      <Link
        href="/dashboard/teams"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to teams
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-display text-xl font-bold">{team.name}</h1>
          <span className="text-xs font-mono text-muted-foreground">{team.slug}</span>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowInvite(true)} className="text-xs font-mono">
            <UserPlus className="w-3 h-3 mr-1.5" />
            Invite
          </Button>
        )}
      </div>

      <Tabs defaultValue="members">
        <TabsList className="mb-4">
          <TabsTrigger value="members" className="text-xs font-mono">
            Members ({allMembers.length})
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-xs font-mono">
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs font-mono">
            Analytics
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="invitations" className="text-xs font-mono">
              Invitations
              {invitations.length > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] px-1 leading-4 font-mono">
                  {invitations.length}
                </span>
              )}
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger value="slack" className="text-xs font-mono">
              Slack
            </TabsTrigger>
          )}
          <TabsTrigger value="conflicts" className="text-xs font-mono">
            Conflict Radar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <div className="border border-border">
            <div className="grid grid-cols-[1fr_auto_auto] gap-0 text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-4 py-2 border-b border-border">
              <span>User</span>
              <span>Role</span>
              <span />
            </div>
            {allMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isOwner={!!isOwner}
                currentUserId={user?.id ?? ''}
                teamOwnerId={team.owner.id}
                onRoleChange={handleRoleChange}
                onRemove={handleRemoveMember}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard">
          <TeamLeaderboard teamId={teamId} currentUserId={user.id} />
        </TabsContent>

        <TabsContent value="analytics">
          <TeamAnalyticsTab teamId={teamId} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="invitations">
            <div className="border border-border">
              {invitations.length > 0 ? (
                invitations.map((inv) => (
                  <InvitationRow
                    key={inv.id}
                    invitation={inv}
                    onRevoke={handleRevokeInvitation}
                    loading={actionLoading === inv.id}
                  />
                ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-xs text-muted-foreground">No pending invitations</p>
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="slack">
            <SlackIntegrationPanel teamId={teamId} />
          </TabsContent>
        )}

        <TabsContent value="conflicts">
          <ConflictRadarPanel teamId={teamId} />
        </TabsContent>
      </Tabs>

      <InviteMemberModal
        open={showInvite}
        teamId={teamId}
        onClose={() => setShowInvite(false)}
        onInvited={() => {
          fetchInvitations();
          fetchTeam();
        }}
      />
    </div>
  );
}
