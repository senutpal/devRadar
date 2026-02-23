'use client';

import { Lock, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Achievement } from '@/lib/api';

interface AchievementCardProps {
  achievement: Achievement;
  locked?: boolean;
}

export function AchievementCard({ achievement, locked = false }: AchievementCardProps) {
  return (
    <div className={cn('border border-border p-4 relative', locked && 'opacity-40')}>
      {locked && (
        <div className="absolute top-3 right-3">
          <Lock className="w-3 h-3 text-muted-foreground" />
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-muted flex items-center justify-center shrink-0">
          <Award className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{achievement.title}</p>
          {achievement.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{achievement.description}</p>
          )}
          {!locked && achievement.earnedAt && (
            <p className="text-[10px] font-mono text-muted-foreground mt-1">
              {new Date(achievement.earnedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
