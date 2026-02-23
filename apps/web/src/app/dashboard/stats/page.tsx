'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flame, Snowflake, Clock, Code2, Hash, Layers } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { statsApi } from '@/lib/api';
import type { UserStats } from '@/lib/api';
import { ContributionHeatmap } from '@/components/dashboard/contribution-heatmap';
import { AchievementCard } from '@/components/dashboard/achievement-card';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function StatsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await statsApi.getMyStats();
      setStats(res.data);
    } catch {
      /* handled by empty state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchStats();
  }, [isAuthenticated, fetchStats]);

  if (authLoading || loading) {
    return (
      <div className="p-6 lg:p-10">
        <div className="h-6 bg-muted w-32 mb-8" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-border p-4 animate-pulse">
              <div className="h-3 bg-muted w-16 mb-3" />
              <div className="h-7 bg-muted w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const streak = stats?.streak;
  const weekly = stats?.weeklyStats;
  const achievements = stats?.recentAchievements ?? [];
  const heatmapData = new Map<string, number>();

  if (weekly && weekly.weekStart) {
    const start = new Date(weekly.weekStart);
    const avgPerDay = weekly.totalSeconds / 7;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      heatmapData.set(key, Math.round(avgPerDay));
    }
  }

  const streakIcon =
    streak?.streakStatus === 'active' ? (
      <Flame className="w-4 h-4 text-[#32ff32]" />
    ) : streak?.streakStatus === 'at_risk' ? (
      <Clock className="w-4 h-4 text-yellow-500" />
    ) : (
      <Snowflake className="w-4 h-4 text-muted-foreground" />
    );

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-display text-xl font-bold mb-8">Stats</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Streak
            </span>
            {streakIcon}
          </div>
          <div className="text-2xl font-mono font-bold tabular-nums">
            {streak?.currentStreak ?? 0}d
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-1">
            Best: {streak?.longestStreak ?? 0}d
          </div>
        </div>

        <div className="border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Weekly
            </span>
            <Code2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-mono font-bold tabular-nums">
            {formatTime(weekly?.totalSeconds ?? 0)}
          </div>
        </div>

        <div className="border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Sessions
            </span>
            <Hash className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-mono font-bold tabular-nums">
            {weekly?.totalSessions ?? 0}
          </div>
        </div>

        <div className="border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Language
            </span>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-lg font-mono font-bold truncate">{weekly?.topLanguage ?? 'N/A'}</div>
        </div>
      </div>

      <div className="border border-border p-4 mb-8">
        <div className="mb-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Contributions
          </span>
        </div>
        <ContributionHeatmap data={heatmapData} />
      </div>

      <div className="mb-8">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-4">
          Achievements
        </span>
        {achievements.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        ) : (
          <div className="border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Start coding to earn achievements</p>
          </div>
        )}
      </div>

      {weekly && (weekly.topLanguage || weekly.topProject) && (
        <div className="border border-border">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Weekly breakdown
            </span>
          </div>
          <div className="p-4 space-y-3">
            {weekly.topLanguage && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Top language</span>
                <span className="text-sm font-mono font-bold">{weekly.topLanguage}</span>
              </div>
            )}
            {weekly.topProject && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Top project</span>
                <span className="text-sm font-mono font-bold truncate ml-4 max-w-[200px]">
                  {weekly.topProject}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Commits</span>
              <span className="text-sm font-mono font-bold tabular-nums">
                {weekly.totalCommits}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
