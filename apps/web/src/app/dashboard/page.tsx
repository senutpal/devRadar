'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Lock,
  ExternalLink,
  Flame,
  Snowflake,
  Clock,
  Code2,
  Users,
  ArrowRight,
  BarChart3,
  Trophy,
  Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SITE_CONFIG } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { statsApi, friendsApi } from '@/lib/api';
import type { UserStats, Friend } from '@/lib/api';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function SignedOutView() {
  const { signIn } = useAuth();

  return (
    <div className="p-6 lg:p-10 min-h-screen flex items-center justify-center">
      <div className="max-w-sm w-full">
        <div className="w-12 h-12 bg-muted flex items-center justify-center mb-6">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>

        <h1 className="text-display text-2xl font-bold mb-2">Sign in</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Access your dashboard, stats, and friends.
        </p>

        <Button size="lg" onClick={signIn} className="w-full mb-6">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
              clipRule="evenodd"
            />
          </svg>
          Continue with GitHub
        </Button>

        <p className="text-xs text-muted-foreground">
          No extension?{' '}
          <Link
            href={SITE_CONFIG.links.marketplace}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline inline-flex items-center gap-1"
          >
            Install DevRadar
            <ExternalLink className="w-3 h-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}

function StreakIcon({ status }: { status: string }) {
  if (status === 'active') return <Flame className="w-4 h-4 text-[#32ff32]" />;
  if (status === 'broken') return <Snowflake className="w-4 h-4 text-muted-foreground" />;
  return <Clock className="w-4 h-4 text-yellow-500" />;
}

function StatBlock({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <div className="text-2xl font-mono font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function SignedInView() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, friendsRes] = await Promise.allSettled([
        statsApi.getMyStats(),
        friendsApi.list(1, 5),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (friendsRes.status === 'fulfilled') setFriends(friendsRes.value.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onlineFriends = friends.filter((f) => f.status === 'online' || f.status === 'idle');
  const streak = stats?.streak;
  const weekly = stats?.weeklyStats;

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center gap-4 mb-8">
        {user?.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.displayName || user.username}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-muted flex items-center justify-center text-sm font-bold font-mono">
            {(user?.displayName || user?.username || 'U').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{user?.displayName || user?.username}</h1>
          <span className="text-xs text-muted-foreground font-mono">@{user?.username}</span>
        </div>
        <Badge
          variant={
            user?.tier === 'PRO' ? 'default' : user?.tier === 'TEAM' ? 'secondary' : 'outline'
          }
          className="font-mono text-[10px]"
        >
          {user?.tier || 'FREE'}
        </Badge>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border border-border p-4 animate-pulse">
              <div className="h-3 bg-muted w-20 mb-3" />
              <div className="h-8 bg-muted w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <StatBlock
            label="Streak"
            value={`${streak?.currentStreak ?? 0}d`}
            sub={
              streak?.streakStatus === 'active'
                ? 'On fire'
                : streak?.streakStatus === 'at_risk'
                  ? 'Code today to keep it'
                  : 'Start a new streak'
            }
            icon={<StreakIcon status={streak?.streakStatus ?? 'broken'} />}
          />
          <StatBlock
            label="This week"
            value={formatTime(weekly?.totalSeconds ?? 0)}
            sub={`${weekly?.totalSessions ?? 0} sessions`}
            icon={<Code2 className="w-4 h-4 text-muted-foreground" />}
          />
          <StatBlock
            label="Friends online"
            value={String(onlineFriends.length)}
            sub={`${friends.length} total`}
            icon={<Users className="w-4 h-4 text-muted-foreground" />}
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Activity
            </span>
            <Link
              href="/dashboard/stats"
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              Details <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {weekly?.topLanguage ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Top language</span>
                  <span className="text-sm font-mono font-bold">{weekly.topLanguage}</span>
                </div>
                {weekly.topProject && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Top project</span>
                    <span className="text-sm font-mono font-bold truncate ml-4 max-w-[200px]">
                      {weekly.topProject}
                    </span>
                  </div>
                )}
                {stats?.recentAchievements && stats.recentAchievements.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Latest achievement
                    </span>
                    <p className="text-sm font-medium mt-1">{stats.recentAchievements[0].title}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No activity this week. Install the extension and start coding.
              </p>
            )}
          </div>
        </div>

        <div className="border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Friends
            </span>
            <Link
              href="/dashboard/friends"
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4">
            {onlineFriends.length > 0 ? (
              <div className="space-y-2">
                {onlineFriends.slice(0, 4).map((f) => (
                  <div key={f.id} className="flex items-center gap-3">
                    <div className="relative">
                      {f.avatarUrl ? (
                        <Image
                          src={f.avatarUrl}
                          alt={f.displayName || f.username}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-muted flex items-center justify-center text-[10px] font-mono font-bold">
                          {(f.displayName || f.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-[#32ff32] border border-background" />
                    </div>
                    <span className="text-sm truncate flex-1">{f.displayName || f.username}</span>
                    {f.activity?.language && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {f.activity.language}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No friends online right now.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { href: '/dashboard/stats', icon: BarChart3, label: 'Stats' },
          { href: '/dashboard/friends', icon: Users, label: 'Friends' },
          { href: '/dashboard/leaderboard', icon: Trophy, label: 'Leaderboard' },
          { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="border border-border px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            <action.icon className="w-3.5 h-3.5" />
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignedOutView />;
  }

  return <SignedInView />;
}
