'use client';

import { useRef } from 'react';
import { toast } from 'sonner';
import { useWebSocket } from '@/lib/hooks/use-websocket';
import { useAuth } from '@/lib/auth';

interface ConflictAlertPayload {
  fileHash: string;
  editors: string[];
  teamId: string;
}

export function ConflictToastListener() {
  const { user } = useAuth();
  const shownRef = useRef(new Set<string>());

  useWebSocket({
    enabled: !!user,
    handlers: {
      CONFLICT_ALERT: (payload) => {
        const alert = payload as ConflictAlertPayload;
        const key = `${alert.teamId}:${alert.fileHash}`;

        // Don't show duplicate toasts for the same conflict
        if (shownRef.current.has(key)) return;
        shownRef.current.add(key);

        // Clear after 5 minutes
        setTimeout(() => shownRef.current.delete(key), 300000);

        const otherEditors = alert.editors.filter((id) => id !== user?.id).length;
        toast.warning(
          `Conflict detected: ${otherEditors} other editor${otherEditors > 1 ? 's' : ''} on the same file`,
          {
            description: `File hash: ${alert.fileHash.slice(0, 8)}...`,
            duration: 10000,
          }
        );
      },
    },
  });

  return null;
}
