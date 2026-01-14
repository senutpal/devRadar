'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  X,
  ArrowRight,
  CreditCard,
  Settings,
  Zap,
  Crown,
  Users,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';

import { Container } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PRICING_TIERS, SITE_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface BillingStatus {
  tier: 'FREE' | 'PRO' | 'TEAM';
  hasSubscription: boolean;
  currentPeriodEnd: string | null;
  billingEnabled: boolean;
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });
}

function BillingPageContent() {
  const searchParams = useSearchParams();
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus>({
    tier: 'FREE',
    hasSubscription: false,
    currentPeriodEnd: null,
    billingEnabled: true,
  });

  const success = searchParams.get('success') === 'true';
  const canceled = searchParams.get('canceled') === 'true';
  const upgradeTo = searchParams.get('upgrade') as 'PRO' | 'TEAM' | null;

  useEffect(() => {
    fetchBillingStatus();
  }, []);

  const fetchBillingStatus = async () => {
    try {
      const response = await fetch('/api/billing/status');
      if (response.ok) {
        const data = await response.json();
        setBillingStatus({
          tier: data.tier,
          hasSubscription: data.hasSubscription,
          currentPeriodEnd: data.currentPeriodEnd,
          billingEnabled: data.billingEnabled,
        });
      }
    } catch (error) {
      console.error('Failed to fetch billing status:', error);
    }
  };

  const handleCheckout = async (tier: 'PRO' | 'TEAM') => {
    setLoading(tier);
    try {
      await loadRazorpayScript();

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          billingInterval: isAnnual ? 'annual' : 'monthly',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout');
      }

      const { subscriptionId, orderId, keyId } = await response.json();

      const options = {
        key: keyId,
        name: 'DevRadar',
        description: `${tier} Plan - ${isAnnual ? 'Annual' : 'Monthly'}`,
        order_id: orderId,
        subscription_id: subscriptionId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_subscription_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyResponse = await fetch('/api/billing/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySubscriptionId: response.razorpay_subscription_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            if (verifyResponse.ok) {
              window.location.href = '/dashboard/billing?success=true';
            } else {
              window.location.href = '/dashboard/billing?canceled=true';
            }
          } catch (error) {
            window.location.href = '/dashboard/billing?canceled=true';
          }
        },
        prefill: {
          name: '',
          email: '',
        },
        theme: {
          color: '#2563eb',
        },
      };

      const razorpay = new (
        window as unknown as { Razorpay: new (options: unknown) => { open: () => void } }
      ).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to initialize checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoading('portal');
    try {
      const response = await fetch('/api/billing/status');
      if (response.ok) {
        const data = await response.json();
        if (data.hasSubscription) {
          alert(
            'Subscription management is available through the Razorpay dashboard. Contact support@devradar.dev for assistance.'
          );
        }
      }
    } catch {
      console.error('Failed to check subscription status');
    } finally {
      setLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.'
      )
    ) {
      return;
    }

    setLoading('cancel');
    try {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
      });

      if (response.ok) {
        fetchBillingStatus();
        alert('Subscription cancelled successfully');
      } else {
        throw new Error('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel failed:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'FREE':
        return <Zap className="w-5 h-5" />;
      case 'PRO':
        return <Crown className="w-5 h-5" />;
      case 'TEAM':
        return <Users className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <Container size="lg">
        {success && (
          <div className="mb-8 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-green-500">Subscription activated!</p>
              <p className="text-sm text-muted-foreground">
                Your account has been upgraded. Enjoy your new features!
              </p>
            </div>
          </div>
        )}

        {canceled && (
          <div className="mb-8 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-500">Checkout canceled</p>
              <p className="text-sm text-muted-foreground">No worries! You can upgrade anytime.</p>
            </div>
          </div>
        )}

        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Billing & Subscription</h1>
          <p className="text-lg text-muted-foreground">
            Manage your DevRadar subscription and billing settings.
          </p>
        </div>

        <Card className="mb-12 bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    billingStatus.tier === 'FREE' && 'bg-muted',
                    billingStatus.tier === 'PRO' && 'bg-primary/10',
                    billingStatus.tier === 'TEAM' && 'bg-primary/10'
                  )}
                >
                  {getTierIcon(billingStatus.tier)}
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {billingStatus.tier} Plan
                    {billingStatus.tier !== 'FREE' && (
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {billingStatus.tier === 'FREE'
                      ? 'Free forever, upgrade anytime'
                      : billingStatus.currentPeriodEnd
                        ? `Renews on ${new Date(billingStatus.currentPeriodEnd).toLocaleDateString()}`
                        : 'Active subscription'}
                  </CardDescription>
                </div>
              </div>
              {billingStatus.hasSubscription && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={loading === 'portal'}
                  >
                    {loading === 'portal' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Settings className="w-4 h-4 mr-2" />
                    )}
                    Manage
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelSubscription}
                    disabled={loading === 'cancel'}
                    className="text-red-500 hover:text-red-600"
                  >
                    {loading === 'cancel' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <X className="w-4 h-4 mr-2" />
                    )}
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          {billingStatus.tier === 'FREE' && (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upgrade to unlock unlimited friends, ghost mode, custom themes, and more.
              </p>
            </CardContent>
          )}
        </Card>

        <div className="flex items-center justify-center gap-4 mb-8">
          <span
            className={cn(
              'text-sm font-medium transition-colors',
              !isAnnual ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Monthly
          </span>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            className="data-[state=checked]:bg-primary"
            aria-label="Toggle between monthly and annual billing"
          />
          <span
            className={cn(
              'text-sm font-medium transition-colors',
              isAnnual ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Annual
            <span className="ml-2 text-xs text-primary font-mono">-50%</span>
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto mb-16">
          {PRICING_TIERS.map((tier) => {
            const price = isAnnual ? Math.round(tier.price * 0.5) : tier.price;
            const isCurrentPlan = tier.id.toUpperCase() === billingStatus.tier;
            const isHighlighted = tier.highlighted || tier.id.toUpperCase() === upgradeTo;
            const canUpgrade =
              (tier.id === 'pro' && billingStatus.tier === 'FREE') ||
              (tier.id === 'team' && billingStatus.tier !== 'TEAM');

            return (
              <Card
                key={tier.id}
                className={cn(
                  'relative transition-all duration-300',
                  isHighlighted && 'ring-2 ring-primary',
                  isCurrentPlan && 'bg-primary/5'
                )}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Current Plan</Badge>
                  </div>
                )}
                <CardHeader className="border-b border-border">
                  <div className="flex items-center gap-2 mb-2">
                    {getTierIcon(tier.id.toUpperCase())}
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-4xl font-bold">{price === 0 ? 'Free' : `$${price}`}</span>
                    {price > 0 && (
                      <span className="text-muted-foreground">
                        /{'priceNote' in tier && tier.priceNote ? tier.priceNote : 'mo'}
                      </span>
                    )}
                  </div>
                  {isAnnual && price > 0 && (
                    <p className="text-sm text-primary mt-1">Save 50% with annual</p>
                  )}
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature.text} className="flex items-start gap-2 text-sm">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                        )}
                        <span
                          className={cn(
                            feature.included
                              ? 'text-foreground'
                              : 'text-muted-foreground line-through'
                          )}
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {tier.id === 'free' ? (
                    isCurrentPlan ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" asChild>
                        <Link href={SITE_CONFIG.links.marketplace} target="_blank">
                          Get Started
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    )
                  ) : tier.id === 'team' ? (
                    isCurrentPlan ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={isHighlighted ? 'default' : 'outline'}
                        onClick={() => handleCheckout('TEAM')}
                        disabled={loading === 'TEAM' || !canUpgrade}
                      >
                        {loading === 'TEAM' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4 mr-2" />
                        )}
                        {canUpgrade ? 'Upgrade to Team' : 'Contact Sales'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )
                  ) : isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isHighlighted ? 'default' : 'outline'}
                      onClick={() => handleCheckout('PRO')}
                      disabled={loading === 'PRO' || !canUpgrade}
                    >
                      {loading === 'PRO' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      Upgrade to Pro
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Billing FAQ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">How do I cancel my subscription?</h4>
              <p className="text-sm text-muted-foreground">
                Click the &quot;Cancel&quot; button above to cancel your subscription. You&apos;ll
                retain access until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Can I switch between plans?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! You can upgrade or downgrade at any time. When upgrading, you&apos;ll be
                charged the prorated difference. When downgrading, you&apos;ll receive credit toward
                future billing.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">What payment methods do you accept?</h4>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards (Visa, Mastercard, American Express), UPI, net
                banking, and popular wallets through our secure payment processor, Razorpay.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Need help?</h4>
              <p className="text-sm text-muted-foreground">
                Contact us at{' '}
                <Link
                  href={`mailto:${SITE_CONFIG.email.support}`}
                  className="text-primary hover:underline"
                >
                  {SITE_CONFIG.email.support}
                </Link>{' '}
                for billing questions or issues.
              </p>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-24 pb-16 min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
