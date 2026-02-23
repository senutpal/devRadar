'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Trophy,
  UsersRound,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Menu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { friendRequestsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard', hasBadge: false },
  { icon: BarChart3, label: 'Stats', href: '/dashboard/stats', hasBadge: false },
  { icon: Users, label: 'Friends', href: '/dashboard/friends', hasBadge: true },
  { icon: Trophy, label: 'Leaderboard', href: '/dashboard/leaderboard', hasBadge: false },
  { icon: UsersRound, label: 'Teams', href: '/dashboard/teams', hasBadge: false },
  { icon: CreditCard, label: 'Billing', href: '/dashboard/billing', hasBadge: false },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings', hasBadge: false },
] as const;

interface SidebarProps {
  isConnected?: boolean;
}

export function Sidebar({ isConnected = false }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('sidebar-collapsed') === 'true'
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    friendRequestsApi
      .count()
      .then((res) => setRequestCount(res.data.count))
      .catch((err) => console.warn('Failed to fetch friend request count', err));
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: (typeof NAV_ITEMS)[number], showLabels: boolean) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const badge = item.hasBadge && requestCount > 0 ? requestCount : null;

    const link = (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors relative',
          active
            ? 'text-foreground bg-accent border-l-2 border-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {showLabels && <span className="truncate">{item.label}</span>}
        {badge && showLabels && (
          <span className="ml-auto text-[10px] font-mono tabular-nums bg-primary text-primary-foreground px-1.5 py-0.5 leading-none">
            {badge}
          </span>
        )}
        {badge && !showLabels && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary" />}
      </Link>
    );

    if (!showLabels) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{link}</div>;
  };

  const renderFooter = (showLabels: boolean) => (
    <div className="border-t border-border p-3">
      {user && (
        <div className={cn('flex items-center gap-3', !showLabels && 'justify-center')}>
          <div className="relative shrink-0">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-mono">
                {(user.displayName || user.username || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 w-2 h-2 border-2 border-background',
                isConnected ? 'bg-[#32ff32]' : 'bg-muted-foreground'
              )}
            />
          </div>
          {showLabels && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{user.displayName || user.username}</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  @{user.username}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={signOut} className="shrink-0 h-7 w-7">
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        aria-label="Open menu"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border"
      >
        <Menu className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed top-0 left-0 z-50 h-full w-56 bg-background border-r border-border flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-display font-bold text-xs tracking-tight">
                  DEV<span className="text-primary">RADAR</span>
                </span>
                <button aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 py-2">
                <nav className="space-y-0.5">
                  {NAV_ITEMS.map((item) => renderNavItem(item, true))}
                </nav>
              </div>
              {renderFooter(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'hidden md:flex flex-col h-screen sticky top-0 bg-background border-r border-border transition-all duration-300',
          collapsed ? 'w-14' : 'w-56'
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className={cn('px-4 py-3 border-b border-border', collapsed && 'px-2.5')}>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="DevRadar" width={24} height={24} className="shrink-0" />
            {!collapsed && (
              <span className="text-display font-bold text-xs tracking-tight">
                DEV<span className="text-primary">RADAR</span>
              </span>
            )}
          </Link>
        </div>

        <div className="flex-1 py-2">
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => renderNavItem(item, !collapsed))}
          </nav>
        </div>

        {renderFooter(!collapsed)}

        <button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={toggleCollapse}
          className="border-t border-border py-2 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>
    </>
  );
}
