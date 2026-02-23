'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import { useAuth } from '@/lib/auth';
import { leaderboardApi } from '@/lib/api';
import type { LeaderboardEntry, LeaderboardResponse } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaderboardTable } from '@/components/dashboard/leaderboard-table';
import { NetworkActivityCard } from '@/components/dashboard/network-activity-card';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatCount(n: number): string {
  return n.toLocaleString();
}

type Tab = 'time' | 'commits' | 'friends';

export default function LeaderboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>('time');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const pageRef = useRef(page);
  pageRef.current = page;
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLeaderboard = useCallback(async (t: Tab, p: number, append = false) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const fetcher =
        t === 'time'
          ? leaderboardApi.weeklyTime
          : t === 'commits'
            ? leaderboardApi.weeklyCommits
            : null;

      let result: { data: LeaderboardResponse };
      if (fetcher) {
        result = await fetcher(p, 10);
      } else {
        result = await leaderboardApi.friends();
      }

      const data = result.data;
      setMyRank(data.myRank);
      setHasMore(data.pagination?.hasMore ?? false);

      if (append) {
        setEntries((prev) => [...prev, ...data.leaderboard]);
      } else {
        setEntries(data.leaderboard);
      }
    } catch {
      if (!append) setEntries([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setPage(1);
      fetchLeaderboard(tab, 1);
    }
  }, [isAuthenticated, tab, fetchLeaderboard]);

  const loadMore = () => {
    const next = pageRef.current + 1;
    setPage(next);
    fetchLeaderboard(tab, next, true);
  };

  const formatter = tab === 'commits' ? formatCount : formatTime;

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-display text-xl font-bold mb-8">Leaderboard</h1>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div>
          {myRank != null && (
            <div className="border-2 border-primary p-4 mb-6 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Your rank
                </span>
                <div className="text-3xl text-display font-bold">#{myRank}</div>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {tab === 'time' ? 'by time' : tab === 'commits' ? 'by commits' : 'among friends'}
              </span>
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="time" className="text-xs font-mono">
                Weekly Time
              </TabsTrigger>
              <TabsTrigger value="commits" className="text-xs font-mono">
                Commits
              </TabsTrigger>
              <TabsTrigger value="friends" className="text-xs font-mono">
                Friends
              </TabsTrigger>
            </TabsList>

            <TabsContent value={tab}>
              {loading ? (
                <div className="border border-border p-8 text-center">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin mx-auto" />
                </div>
              ) : (
                <LeaderboardTable
                  entries={entries}
                  currentUserId={user?.id ?? ''}
                  formatScore={formatter}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  loadingMore={loadingMore}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden lg:block">
          <NetworkActivityCard />
        </div>
      </div>
    </div>
  );
}
