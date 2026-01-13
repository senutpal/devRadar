import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, X, Download } from 'lucide-react';

import { Container } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { PRICING_TIERS, SITE_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for DevRadar. Start free and upgrade as you grow.',
};

const comparisonFeatures = [
  {
    category: 'Presence & Activity',
    features: [
      { name: 'Real-time presence', free: true, pro: true, team: true },
      { name: 'Activity status', free: true, pro: true, team: true },
      { name: 'Language detection', free: true, pro: true, team: true },
      { name: 'Custom status messages', free: false, pro: true, team: true },
      { name: 'Ghost mode', free: false, pro: true, team: true },
    ],
  },
  {
    category: 'Social Features',
    features: [
      { name: 'Friends list', free: '10 max', pro: 'Unlimited', team: 'Unlimited' },
      { name: 'Global leaderboards', free: true, pro: true, team: true },
      { name: 'Team leaderboards', free: false, pro: false, team: true },
      { name: 'Poke friends', free: true, pro: true, team: true },
    ],
  },
  {
    category: 'Analytics & History',
    features: [
      { name: 'Basic stats', free: true, pro: true, team: true },
      { name: 'History retention', free: '7 days', pro: '30 days', team: '90 days' },
      { name: 'Team analytics', free: false, pro: false, team: true },
      { name: 'Export data', free: false, pro: true, team: true },
    ],
  },
  {
    category: 'Team Features',
    features: [
      { name: 'Merge conflict radar', free: false, pro: false, team: true },
      { name: 'Slack integration', free: false, pro: false, team: true },
      { name: 'SSO & SAML', free: false, pro: false, team: true },
      { name: 'Admin controls', free: false, pro: false, team: true },
    ],
  },
];

function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="w-5 h-5 text-[#FFB800]" />
    ) : (
      <X className="w-5 h-5 text-[#404040]" />
    );
  }
  return <span className="text-sm font-medium text-[#FAFAFA]">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="pt-24 pb-16 bg-[#050505] min-h-screen">
      <section className="py-20 lg:py-32 relative">
        <div className="absolute inset-0 bg-grid-brutal" />
        <Container className="relative">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-mono text-sm text-[#FFB800] tracking-wider uppercase">
                Pricing
              </span>
              <div className="flex-1 h-px bg-[#262626]" />
            </div>
            <h1 className="text-display text-5xl sm:text-6xl lg:text-7xl text-[#FAFAFA] mb-6">
              CHOOSE YOUR
              <br />
              <span className="text-gradient">PLAN</span>
            </h1>
            <p className="text-xl text-[#737373] max-w-xl">
              Start free and upgrade when you need more. No hidden fees, cancel anytime.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={cn(
                  'relative h-full',
                  tier.highlighted ? 'pricing-featured' : 'border border-[#262626] bg-[#0A0A0A]'
                )}
              >
                <div className="p-8 lg:p-10">
                  <h3 className="text-display text-2xl text-[#FAFAFA] mb-2">{tier.name}</h3>
                  <p className="text-sm text-[#737373] mb-6">{tier.description}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-display text-5xl text-[#FAFAFA]">
                      {tier.price === 0 ? 'Free' : `$${tier.price}`}
                    </span>
                    {tier.price > 0 && <span className="text-[#737373]">/mo</span>}
                  </div>
                  <Button
                    className={cn(
                      'w-full h-12 btn-brutal text-base',
                      tier.highlighted
                        ? 'bg-[#FFB800] text-[#050505] hover:bg-[#FFD000]'
                        : 'bg-transparent border border-[#262626] text-[#FAFAFA] hover:border-[#FFB800]'
                    )}
                    asChild
                  >
                    <Link
                      href={
                        tier.id === 'team'
                          ? `mailto:${SITE_CONFIG.email.hello}`
                          : SITE_CONFIG.links.marketplace
                      }
                    >
                      {tier.cta}
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 lg:py-32">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-display text-3xl lg:text-4xl text-[#FAFAFA] mb-4">
              COMPARE <span className="text-gradient">PLANS</span>
            </h2>
            <p className="text-[#737373]">Detailed feature comparison</p>
          </div>

          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left py-4 px-4 text-mono text-xs text-[#737373] uppercase tracking-widest">
                    Features
                  </th>
                  <th className="text-center py-4 px-4 text-mono text-xs text-[#737373] uppercase tracking-widest">
                    Free
                  </th>
                  <th className="text-center py-4 px-4 text-mono text-xs text-[#FFB800] uppercase tracking-widest">
                    Pro
                  </th>
                  <th className="text-center py-4 px-4 text-mono text-xs text-[#737373] uppercase tracking-widest">
                    Team
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((category) => (
                  <>
                    <tr key={category.category} className="bg-[#0A0A0A]">
                      <td colSpan={4} className="py-4 px-4 text-display text-sm text-[#FAFAFA]">
                        {category.category}
                      </td>
                    </tr>
                    {category.features.map((feature) => (
                      <tr
                        key={feature.name}
                        className="border-b border-[#1A1A1A] hover:bg-[#0A0A0A] transition-colors"
                      >
                        <td className="py-4 px-4 text-sm text-[#737373]">{feature.name}</td>
                        <td className="py-4 px-4">
                          <div className="flex justify-center">
                            <FeatureValue value={feature.free} />
                          </div>
                        </td>
                        <td className="py-4 px-4 bg-[#FFB800]/5">
                          <div className="flex justify-center">
                            <FeatureValue value={feature.pro} />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-center">
                            <FeatureValue value={feature.team} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <div className="text-center">
            <h2 className="text-display text-2xl lg:text-3xl text-[#FAFAFA] mb-4">
              Ready to get started?
            </h2>
            <p className="text-[#737373] mb-8">
              Join thousands of developers using DevRadar today.
            </p>
            <Button
              size="lg"
              className="btn-brutal bg-[#FFB800] text-[#050505] hover:bg-[#FFD000] glow-amber-sm px-10 h-14"
              asChild
            >
              <Link href={SITE_CONFIG.links.marketplace}>
                <Download className="w-5 h-5 mr-2" />
                Install Free Extension
              </Link>
            </Button>
          </div>
        </Container>
      </section>
    </div>
  );
}
