'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { usersApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type ThemeOption = 'light' | 'dark' | 'system';

const themeOptions: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">
      {title}
    </span>
  );
}

export default function SettingsPage() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [pokeNotifs, setPokeNotifs] = useState(true);
  const [friendReqNotifs, setFriendReqNotifs] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPrivacyMode(user.privacyMode);
    }
  }, [user?.id]);

  useEffect(() => {
    const storedPoke = localStorage.getItem('pref-poke-notifications');
    const storedFriend = localStorage.getItem('pref-friend-request-notifications');
    if (storedPoke !== null) setPokeNotifs(storedPoke === 'true');
    if (storedFriend !== null) setFriendReqNotifs(storedFriend === 'true');
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await usersApi.updateMe({ displayName: displayName || null });
      await refreshUser();
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePrivacyToggle = async (checked: boolean) => {
    setPrivacyMode(checked);
    setSavingPrivacy(true);
    try {
      await usersApi.updateMe({ privacyMode: checked });
      await refreshUser();
      toast.success(checked ? 'Privacy mode enabled' : 'Privacy mode disabled');
    } catch {
      setPrivacyMode(!checked);
      toast.error('Failed to update privacy setting');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handlePokeToggle = (checked: boolean) => {
    setPokeNotifs(checked);
    localStorage.setItem('pref-poke-notifications', String(checked));
  };

  const handleFriendReqToggle = (checked: boolean) => {
    setFriendReqNotifs(checked);
    localStorage.setItem('pref-friend-request-notifications', String(checked));
  };

  if (authLoading) {
    return (
      <div className="p-6 lg:p-10">
        <div className="h-6 bg-muted w-32 mb-8" />
        <div className="max-w-2xl space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border border-border p-5 animate-pulse">
              <div className="h-3 bg-muted w-20 mb-3" />
              <div className="h-8 bg-muted w-48" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-display text-xl font-bold mb-8">Settings</h1>

      <div className="max-w-2xl space-y-6">
        <div className="border border-border p-5">
          <SectionHeader title="Profile" />
          <div className="flex items-start gap-4">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                width={48}
                height={48}
                className="shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-muted flex items-center justify-center text-lg font-mono font-bold shrink-0">
                {(user.displayName || user.username).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                  Username
                </label>
                <div className="text-sm font-mono text-muted-foreground">@{user.username}</div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={user.username}
                  className="w-full bg-transparent border border-border px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30"
                />
              </div>
              <Button
                size="sm"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="text-xs font-mono"
              >
                {savingProfile ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>

        <div className="border border-border p-5">
          <SectionHeader title="Privacy" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm block">Privacy mode</span>
              <span className="text-xs text-muted-foreground">
                Hide your activity and status from other users
              </span>
            </div>
            <Switch
              checked={privacyMode}
              onCheckedChange={handlePrivacyToggle}
              disabled={savingPrivacy}
            />
          </div>
        </div>

        <div className="border border-border p-5">
          <SectionHeader title="Appearance" />
          <div className="flex gap-2">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 border text-xs font-mono transition-colors',
                    isActive
                      ? 'border-foreground text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border border-border p-5">
          <SectionHeader title="Notifications" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm block">Poke notifications</span>
                <span className="text-xs text-muted-foreground">
                  Show toast when someone pokes you
                </span>
              </div>
              <Switch checked={pokeNotifs} onCheckedChange={handlePokeToggle} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm block">Friend request notifications</span>
                <span className="text-xs text-muted-foreground">
                  Show toast for incoming friend requests
                </span>
              </div>
              <Switch checked={friendReqNotifs} onCheckedChange={handleFriendReqToggle} />
            </div>
          </div>
        </div>

        <div className="border-2 border-destructive/50 p-5">
          <SectionHeader title="Danger zone" />
          <div className="space-y-2">
            <Button variant="destructive" size="sm" disabled className="text-xs font-mono">
              Delete account
            </Button>
            <p className="text-[10px] text-muted-foreground">Account deletion coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
