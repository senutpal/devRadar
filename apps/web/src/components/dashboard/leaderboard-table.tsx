'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LeaderboardEntry } from '@/lib/api';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  formatScore: (score: number) => string;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore?: boolean;
}

export function LeaderboardTable({
  entries,
  currentUserId,
  formatScore,
  hasMore,
  onLoadMore,
  loadingMore,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">No entries yet</p>
      </div>
    );
  }

  return (
    <div className="border border-border">
      <div className="grid grid-cols-[3rem_1fr_auto] gap-0 text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-4 py-2 border-b border-border">
        <span>#</span>
        <span>User</span>
        <span>Score</span>
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
              <div className="min-w-0">
                <span className="text-sm truncate block">
                  {entry.displayName || entry.username}
                  {isMe && (
                    <span className="text-[10px] font-mono text-muted-foreground ml-1.5">you</span>
                  )}
                </span>
                {entry.isFriend && !isMe && (
                  <span className="text-[9px] font-mono text-muted-foreground">friend</span>
                )}
              </div>
            </div>
            <span className="text-sm font-mono font-bold tabular-nums">
              {formatScore(entry.score)}
            </span>
          </div>
        );
      })}

      {hasMore && (
        <div className="p-3 text-center border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-xs font-mono"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
