'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { usersApi } from '@/lib/api';
import { useThemePreset } from '@/lib/theme-context';
import { THEME_PRESETS } from '@/lib/themes';
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
  const { user, refreshUser, signOut, isLoading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { preset, setPreset, setCustomColor, customColors } = useThemePreset();

  const [displayName, setDisplayName] = useState('');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [pokeNotifs, setPokeNotifs] = useState(true);
  const [friendReqNotifs, setFriendReqNotifs] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [ghostMode, setGhostMode] = useState(false);
  const [savingGhost, setSavingGhost] = useState(false);
  const [customStatus, setCustomStatus] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPrivacyMode(user.privacyMode);
      setGhostMode(user.ghostMode);
      setCustomStatus(user.customStatus || '');
    }
  }, [user]);

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

  const handleGhostToggle = async (checked: boolean) => {
    setGhostMode(checked);
    setSavingGhost(true);
    try {
      await usersApi.updateMe({ ghostMode: checked });
      await refreshUser();
      toast.success(checked ? 'Ghost mode enabled' : 'Ghost mode disabled');
    } catch {
      setGhostMode(!checked);
      toast.error('Failed to update ghost mode');
    } finally {
      setSavingGhost(false);
    }
  };

  const handleSaveStatus = async () => {
    setSavingStatus(true);
    try {
      await usersApi.updateMe({ customStatus: customStatus || null });
      await refreshUser();
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user?.username) return;
    setIsDeleting(true);
    try {
      await usersApi.deleteAccount();
      signOut();
    } catch {
      toast.error('Failed to delete account');
      setIsDeleting(false);
    }
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
          <SectionHeader title="Status" />
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                Custom status
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="What are you working on?"
                  maxLength={50}
                  className="flex-1 bg-transparent border border-border px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30"
                  disabled={user.tier === 'FREE'}
                />
                <Button
                  size="sm"
                  onClick={handleSaveStatus}
                  disabled={savingStatus || user.tier === 'FREE'}
                  className="text-xs font-mono"
                >
                  {savingStatus ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <div className="flex justify-between mt-1">
                {user.tier === 'FREE' ? (
                  <span className="text-[10px] text-amber-500">Requires PRO</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    {customStatus.length}/50
                  </span>
                )}
              </div>
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
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div>
              <span className="text-sm block">Ghost mode</span>
              <span className="text-xs text-muted-foreground">
                Go completely invisible — not shown in any friend lists or leaderboards
              </span>
              {user.tier === 'FREE' && (
                <span className="text-[10px] text-amber-500 block mt-0.5">Requires PRO</span>
              )}
            </div>
            <Switch
              checked={ghostMode}
              onCheckedChange={handleGhostToggle}
              disabled={savingGhost || user.tier === 'FREE'}
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

          <div className="mt-4 pt-4 border-t border-border">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
              Color theme
              {user.tier === 'FREE' && <span className="ml-1 text-amber-500">PRO</span>}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {THEME_PRESETS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => user.tier !== 'FREE' && setPreset(t.id)}
                  disabled={user.tier === 'FREE'}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 border text-xs font-mono transition-colors',
                    preset === t.id
                      ? 'border-foreground text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30',
                    user.tier === 'FREE' && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: t.colors.accent }}
                  />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
              Custom accent color
              {user.tier === 'FREE' && <span className="ml-1 text-amber-500">PRO</span>}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customColors?.accent ?? '#f5f5f5'}
                onChange={(e) => {
                  if (user.tier === 'FREE') return;
                  setCustomColor('accent', e.target.value);
                }}
                disabled={user.tier === 'FREE'}
                className="w-8 h-8 border border-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-muted-foreground font-mono">
                {preset === 'custom' ? 'Custom' : 'Pick a color to customize'}
              </span>
            </div>
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
            <Button
              variant="destructive"
              size="sm"
              className="text-xs font-mono"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete account
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Permanently delete your account and all associated data
            </p>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-bold">Delete Account</h2>
            <p className="text-sm text-muted-foreground">
              This action is permanent and cannot be undone. All your data including stats,
              achievements, friends, and team memberships will be permanently deleted.
            </p>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                Type <span className="text-destructive font-bold">{user.username}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={user.username}
                className="w-full bg-transparent border border-border px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-destructive/50"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                className="text-xs font-mono"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="text-xs font-mono"
                disabled={deleteConfirmText !== user.username || isDeleting}
                onClick={handleDeleteAccount}
              >
                {isDeleting ? 'Deleting...' : 'Delete permanently'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
