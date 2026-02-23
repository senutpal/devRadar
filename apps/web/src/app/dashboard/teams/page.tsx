'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Users, Lock, ArrowRight } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { teamsApi } from '@/lib/api';
import type { TeamSummary, RoleType } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { CreateTeamModal } from '@/components/dashboard/create-team-modal';
import { cn } from '@/lib/utils';

const roleBadgeColors: Record<RoleType, string> = {
  OWNER: 'border-primary text-primary',
  ADMIN: 'border-foreground/40 text-foreground',
  MEMBER: 'border-border text-muted-foreground',
};

function TierGate() {
  return (
    <div className="border-2 border-border p-8 max-w-lg mx-auto text-center">
      <Lock className="w-6 h-6 mx-auto mb-4 text-muted-foreground" />
      <h2 className="text-display text-lg font-bold mb-2">Teams is a Team Plan feature</h2>
      <ul className="text-xs text-muted-foreground space-y-1 mb-6 font-mono">
        <li>Shared team dashboards</li>
        <li>Conflict radar &amp; file awareness</li>
        <li>Slack integration</li>
        <li>Role-based access control</li>
      </ul>
      <Link href="/dashboard/billing">
        <Button size="sm" className="text-xs font-mono">
          Upgrade to Team
        </Button>
      </Link>
    </div>
  );
}

function TeamCard({ team }: { team: TeamSummary }) {
  return (
    <Link
      href={`/dashboard/teams/${team.id}`}
      className="border border-border p-4 hover:border-foreground/30 transition-colors block group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold truncate">{team.name}</h3>
          <span className="text-[10px] font-mono text-muted-foreground">{team.slug}</span>
        </div>
        <span
          className={cn(
            'text-[9px] font-mono uppercase tracking-wider border px-1.5 py-0.5 shrink-0',
            roleBadgeColors[team.role]
          )}
        >
          {team.role}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span className="font-mono tabular-nums">{team.memberCount}</span>
        </div>
        <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

export default function TeamsPage() {
  const { user, isAuthenticated } = useAuth();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teamsApi.list(1, 50);
      setTeams(res.data);
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.tier === 'TEAM') {
      fetchTeams();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user?.tier, fetchTeams]);

  if (!user) return null;

  if (user.tier !== 'TEAM') {
    return (
      <div className="p-6 lg:p-10">
        <h1 className="text-display text-xl font-bold mb-8">Teams</h1>
        <TierGate />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-display text-xl font-bold">Your Teams</h1>
        <Button size="sm" onClick={() => setShowCreate(true)} className="text-xs font-mono">
          <Plus className="w-3 h-3 mr-1.5" />
          Create Team
        </Button>
      </div>

      {loading ? (
        <div className="border border-border p-8 text-center">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin mx-auto" />
        </div>
      ) : teams.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        <div className="border border-border p-8 text-center">
          <Users className="w-6 h-6 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">Create your first team</p>
          <Button size="sm" onClick={() => setShowCreate(true)} className="text-xs font-mono">
            <Plus className="w-3 h-3 mr-1.5" />
            Create Team
          </Button>
        </div>
      )}

      <CreateTeamModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchTeams}
      />
    </div>
  );
}
