'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { friendsApi, friendRequestsApi } from '@/lib/api';
import type { Friend, Follower, FriendRequest } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FriendItem, RequestCard } from '@/components/dashboard/friend-card';
import { UserSearch } from '@/components/dashboard/user-search';

export default function FriendsPage() {
  const { isAuthenticated } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [fr, fo, inc, out] = await Promise.allSettled([
        friendsApi.list(1, 50),
        friendsApi.followers(1, 50),
        friendRequestsApi.incoming(1, 50),
        friendRequestsApi.outgoing(1, 50),
      ]);

      if (fr.status === 'fulfilled') setFriends(fr.value.data);
      if (fo.status === 'fulfilled') setFollowers(fo.value.data);
      if (inc.status === 'fulfilled') setIncoming(inc.value.data);
      if (out.status === 'fulfilled') setOutgoing(out.value.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchAll();
  }, [isAuthenticated, fetchAll]);

  const handleUnfollow = async (id: string) => {
    setActionLoading(id);
    try {
      await friendsApi.unfollow(id);
      setFriends((prev) => prev.filter((f) => f.id !== id));
      toast.success('Unfollowed');
    } catch {
      toast.error('Failed to unfollow');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await friendRequestsApi.accept(id);
      setIncoming((prev) => prev.filter((r) => r.id !== id));
      toast.success('Request accepted');
      fetchAll();
    } catch {
      toast.error('Failed to accept');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await friendRequestsApi.reject(id);
      setIncoming((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error('Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    try {
      await friendRequestsApi.cancel(id);
      setOutgoing((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error('Failed to cancel');
    } finally {
      setActionLoading(null);
    }
  };

  const existingFriendIds = new Set(friends.map((f) => f.id));
  const pendingRequestUserIds = new Set(outgoing.map((r) => r.toUser.id));

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-display text-xl font-bold mb-8">Friends</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="following">
            <TabsList className="mb-4">
              <TabsTrigger value="following" className="text-xs font-mono">
                Following ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="followers" className="text-xs font-mono">
                Followers ({followers.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="text-xs font-mono">
                Requests
                {incoming.length > 0 && (
                  <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] px-1 leading-4 font-mono">
                    {incoming.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="following">
              <div className="border border-border">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin mx-auto" />
                  </div>
                ) : friends.length > 0 ? (
                  friends.map((f) => (
                    <FriendItem
                      key={f.id}
                      friend={f}
                      onUnfollow={handleUnfollow}
                      loading={actionLoading === f.id}
                    />
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">Not following anyone yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="followers">
              <div className="border border-border">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin mx-auto" />
                  </div>
                ) : followers.length > 0 ? (
                  followers.map((f) => <FriendItem key={f.id} friend={f} />)
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">No followers yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="requests">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                    Incoming
                  </span>
                  <div className="border border-border">
                    {incoming.length > 0 ? (
                      incoming.map((r) => (
                        <RequestCard
                          key={r.id}
                          request={r}
                          type="incoming"
                          onAccept={handleAccept}
                          onReject={handleReject}
                          loading={actionLoading === r.id}
                        />
                      ))
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">No incoming requests</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                    Outgoing
                  </span>
                  <div className="border border-border">
                    {outgoing.length > 0 ? (
                      outgoing.map((r) => (
                        <RequestCard
                          key={r.id}
                          request={r}
                          type="outgoing"
                          onCancel={handleCancel}
                          loading={actionLoading === r.id}
                        />
                      ))
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">No outgoing requests</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">
            Add friends
          </span>
          <UserSearch
            existingFriendIds={existingFriendIds}
            pendingRequestUserIds={pendingRequestUserIds}
          />
        </div>
      </div>
    </div>
  );
}
