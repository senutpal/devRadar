'use client';

import { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { leaderboardApi } from '@/lib/api';
import type { NetworkActivity } from '@/lib/api';

export function NetworkActivityCard() {
  const [data, setData] = useState<NetworkActivity | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const fetchData = async () => {
      try {
        const res = await leaderboardApi.networkActivity();
        if (mountedRef.current) setData(res.data);
      } catch {
        /* silent */
      }
    };

    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, []);

  if (!data) return null;

  return (
    <div className="border border-border">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Activity
          className={cn('w-3.5 h-3.5', data.isHot ? 'text-[#32ff32]' : 'text-muted-foreground')}
        />
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Network
        </span>
        {data.isHot && <span className="w-1.5 h-1.5 bg-[#32ff32] animate-pulse ml-auto" />}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-2xl font-mono font-bold tabular-nums">
              {data.totalActiveUsers}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">active</span>
          </div>
          <div className="h-1 bg-muted w-full">
            <div
              className="h-full bg-[#32ff32] transition-all duration-500"
              style={{ width: `${Math.min(data.averageIntensity, 100)}%` }}
            />
          </div>
        </div>

        {data.topLanguages.length > 0 && (
          <div className="space-y-1">
            {data.topLanguages.slice(0, 3).map((lang) => (
              <div key={lang.language} className="flex items-center justify-between text-xs">
                <span className="font-mono">{lang.language}</span>
                <span className="font-mono text-muted-foreground tabular-nums">{lang.count}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">{data.message}</p>
      </div>
    </div>
  );
}
