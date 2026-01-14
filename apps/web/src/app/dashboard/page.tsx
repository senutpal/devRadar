import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, ExternalLink, Calendar, Award, TrendingUp } from 'lucide-react';

import { Container } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SITE_CONFIG } from '@/lib/constants';
import { useAuth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'DevRadar Dashboard - Manage your account and view your coding activity.',
};

function SignedOutView() {
  const { signIn } = useAuth();

  return (
    <div className="pt-24 pb-16 min-h-screen flex items-center">
      <Container size="sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-8">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Sign in to continue</h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            Access your dashboard to manage your account, view your coding stats, and connect with
            friends.
          </p>

          <Button size="lg" onClick={signIn} className="mb-8">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
                clipRule="evenodd"
              />
            </svg>
            Continue with GitHub
          </Button>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-primary mb-1">0</div>
                <p className="text-sm text-muted-foreground">Coding Streak</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-primary mb-1">0h 0m</div>
                <p className="text-sm text-muted-foreground">This Week</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-primary mb-1">0</div>
                <p className="text-sm text-muted-foreground">Friends Online</p>
              </CardContent>
            </Card>
          </div>

          <p className="text-sm text-muted-foreground">
            Don&apos;t have the extension yet?{' '}
            <Link
              href={SITE_CONFIG.links.marketplace}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Install DevRadar
              <ExternalLink className="w-3 h-3" />
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}

function SignedInView() {
  const { user, signOut } = useAuth();

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <Container>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {(user?.displayName || user?.username || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{user?.displayName || user?.username}</h1>
              <p className="text-muted-foreground">@{user?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Badge
              variant={
                user?.tier === 'PRO' ? 'default' : user?.tier === 'TEAM' ? 'secondary' : 'outline'
              }
            >
              {user?.tier || 'FREE'}
            </Badge>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coding Streak</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 days</div>
              <p className="text-xs text-muted-foreground">Keep coding daily!</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0h 0m</div>
              <p className="text-xs text-muted-foreground">Total coding time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Friends</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Online now</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              {user?.tier === 'FREE' ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">Upgrade to unlock premium features</p>
                  <Button asChild>
                    <Link href="/dashboard/billing">View Plans</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Current Plan</span>
                    <Badge>{user?.tier}</Badge>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/billing">Manage Subscription</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/friends">Find Friends</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/settings">Settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="pt-24 pb-16 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignedOutView />;
  }

  return <SignedInView />;
}
