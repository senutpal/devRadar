'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, UserPlus, Check, Clock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { usersApi, friendRequestsApi } from '@/lib/api';
import type { PublicUser } from '@/lib/api';
import { UserAvatar } from './friend-card';

interface UserSearchProps {
  existingFriendIds: Set<string>;
  pendingRequestUserIds: Set<string>;
}

export function UserSearch({ existingFriendIds, pendingRequestUserIds }: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await usersApi.search(query);
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const sendRequest = async (userId: string) => {
    setSendingTo(userId);
    try {
      await friendRequestsApi.send(userId);
      setSentIds((prev) => new Set(prev).add(userId));
      toast.success('Friend request sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setSendingTo(null);
    }
  };

  const getButtonState = (userId: string) => {
    if (existingFriendIds.has(userId)) return 'following';
    if (pendingRequestUserIds.has(userId) || sentIds.has(userId)) return 'pending';
    return 'add';
  };

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full bg-transparent border border-border pl-9 pr-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <div className="border border-border border-t-0 divide-y divide-border">
          {results.map((user) => {
            const state = getButtonState(user.id);
            return (
              <div key={user.id} className="flex items-center gap-3 px-3 py-2">
                <UserAvatar user={user} size={24} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm truncate block">
                    {user.displayName || user.username}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    @{user.username}
                  </span>
                </div>
                {state === 'following' && (
                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    <Check className="w-3 h-3" /> Following
                  </span>
                )}
                {state === 'pending' && (
                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                )}
                {state === 'add' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={sendingTo === user.id}
                    onClick={() => sendRequest(user.id)}
                    className="h-7 px-2 text-xs"
                  >
                    {sendingTo === user.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <UserPlus className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {query.length >= 2 && !searching && results.length === 0 && (
        <div className="border border-border border-t-0 p-4 text-center">
          <p className="text-xs text-muted-foreground">No users found</p>
        </div>
      )}
    </div>
  );
}
