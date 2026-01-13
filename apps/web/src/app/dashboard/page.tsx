import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, ExternalLink } from 'lucide-react';

import { Container } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'DevRadar Dashboard - Manage your account and view your coding activity.',
};

export default function DashboardPage() {
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
