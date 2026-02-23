'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Friend, Follower, FriendRequest, PublicUser } from '@/lib/api';

interface FriendItemProps {
  friend: Friend | Follower;
  onUnfollow?: (id: string) => void;
  loading?: boolean;
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'w-1.5 h-1.5 shrink-0',
        status === 'online' && 'bg-[#32ff32]',
        status === 'idle' && 'bg-yellow-500',
        (status === 'offline' || status === 'dnd' || status === 'incognito') &&
          'bg-muted-foreground'
      )}
    />
  );
}

function UserAvatar({ user, size = 28 }: { user: PublicUser; size?: number }) {
  if (user.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt={user.displayName || user.username}
        width={size}
        height={size}
        className="rounded-full shrink-0"
      />
    );
  }
  return (
    <div
      className="bg-muted flex items-center justify-center text-[10px] font-mono font-bold shrink-0 rounded-full"
      style={{ width: size, height: size }}
    >
      {(user.displayName || user.username).charAt(0).toUpperCase()}
    </div>
  );
}

export function FriendItem({ friend, onUnfollow, loading }: FriendItemProps) {
  const f = friend as Friend;
  const hasStatus = 'status' in friend;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0">
      <UserAvatar user={friend} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {friend.displayName || friend.username}
          </span>
          {hasStatus && <StatusDot status={f.status} />}
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          @{friend.username}
          {hasStatus && f.activity?.language && <> &middot; {f.activity.language}</>}
        </span>
      </div>
      {onUnfollow && (
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={() => onUnfollow(friend.id)}
          className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive"
        >
          Unfollow
        </Button>
      )}
    </div>
  );
}

interface RequestCardProps {
  request: FriendRequest;
  type: 'incoming' | 'outgoing';
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
  loading?: boolean;
}

export function RequestCard({
  request,
  type,
  onAccept,
  onReject,
  onCancel,
  loading,
}: RequestCardProps) {
  const user = type === 'incoming' ? request.fromUser : request.toUser;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0">
      <UserAvatar user={user} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">
          {user.displayName || user.username}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">@{user.username}</span>
      </div>
      <div className="flex gap-1">
        {type === 'incoming' && (
          <>
            <Button
              size="sm"
              disabled={loading}
              onClick={() => onAccept?.(request.id)}
              className="text-xs h-7 px-2"
            >
              Accept
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={() => onReject?.(request.id)}
              className="text-xs h-7 px-2 text-muted-foreground"
            >
              Reject
            </Button>
          </>
        )}
        {type === 'outgoing' && (
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => onCancel?.(request.id)}
            className="text-xs h-7 px-2 text-muted-foreground"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export { UserAvatar, StatusDot };
