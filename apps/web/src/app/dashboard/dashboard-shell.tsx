'use client';

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { useWebSocket } from '@/lib/hooks';
import { Sidebar } from '@/components/dashboard';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  const handlePoke = useCallback((payload: unknown) => {
    const p = payload as { fromUserId: string; message?: string };
    toast.info(p.message || 'Someone poked you!');
  }, []);

  const handleAchievement = useCallback((payload: unknown) => {
    const p = payload as { achievement: { title: string; description: string } };
    toast.success(`Achievement unlocked: ${p.achievement.title}`);
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
