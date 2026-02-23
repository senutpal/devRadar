'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, UserPlus, Trash2, Radio } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { teamsApi } from '@/lib/api';
import type { TeamDetail, TeamMember, TeamInvitation, RoleType } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { InviteMemberModal } from '@/components/dashboard/invite-member-modal';
import { cn } from '@/lib/utils';

const roleBadgeColors: Record<RoleType, string> = {
  OWNER: 'border-primary text-primary',
  ADMIN: 'border-foreground/40 text-foreground',
  MEMBER: 'border-border text-muted-foreground',
};

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
    try {
      await teamsApi.revokeInvite(teamId, invitationId);
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      toast.success('Invitation revoked');
    } catch {
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
            <div className="border border-border p-6 text-center">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">
                Slack Integration
              </span>
              <p className="text-xs text-muted-foreground mb-4">
                Connect your Slack workspace to get team status updates and use /devradar commands.
              </p>
              <Button size="sm" variant="ghost" disabled className="text-xs font-mono">
                Coming Soon
              </Button>
            </div>
          </TabsContent>
        )}

        <TabsContent value="conflicts">
          <div className="border border-border p-6 text-center">
            <Radio className="w-5 h-5 mx-auto mb-3 text-muted-foreground animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
              Conflict Radar
            </span>
            <p className="text-xs text-muted-foreground">
              Monitoring for conflicts... When two team members edit the same file simultaneously,
              alerts will appear here.
            </p>
          </div>
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
