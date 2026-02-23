'use client';

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { useWebSocket } from '@/lib/hooks';
import { Sidebar } from '@/components/dashboard';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  const handlePoke = useCallback((payload: unknown) => {
    if (typeof payload !== 'object' || payload === null) return;
    const p = payload as Record<string, unknown>;
    const message = typeof p.message === 'string' ? p.message : 'Someone poked you!';
    toast.info(message);
  }, []);

  const handleAchievement = useCallback((payload: unknown) => {
    if (typeof payload !== 'object' || payload === null || !('achievement' in payload)) return;
    const achievement = (payload as Record<string, unknown>).achievement;
    if (typeof achievement !== 'object' || achievement === null || !('title' in achievement))
      return;
    const title = (achievement as Record<string, unknown>).title;
    if (typeof title !== 'string') return;
    toast.success(`Achievement unlocked: ${title}`);
  }, []);

  const handlers = useMemo(
    () => ({
      POKE: handlePoke,
      ACHIEVEMENT: handleAchievement,
    }),
    [handlePoke, handleAchievement]
  );

  const { isConnected } = useWebSocket({
    enabled: isAuthenticated,
    handlers,
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isConnected={isConnected} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
