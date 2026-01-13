'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Check, X, ArrowRight } from 'lucide-react';

import { Container } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PRICING_TIERS, SITE_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface PricingCardProps {
  tier: (typeof PRICING_TIERS)[number];
  index: number;
  isAnnual: boolean;
}

function PricingCard({ tier, index, isAnnual }: PricingCardProps) {
  const price = isAnnual ? Math.round(tier.price * 0.5) : tier.price;
  const isHighlighted = tier.highlighted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn('relative', isHighlighted && 'lg:-mt-6 lg:mb-6')}
    >
      <div
        className={cn(
          'h-full transition-all duration-300',
          isHighlighted ? 'pricing-featured bg-card' : 'border border-border bg-card card-hover'
        )}
      >
        <div className="p-8 lg:p-10 border-b border-border">
          <h3 className="text-display text-2xl text-foreground mb-2">{tier.name}</h3>
          <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>

          <div className="flex items-baseline gap-1">
            <span className="text-display text-5xl lg:text-6xl text-foreground">
              {price === 0 ? 'Free' : `$${price}`}
            </span>
            {price > 0 && (
              <span className="text-muted-foreground text-lg">
                /{'priceNote' in tier && tier.priceNote ? tier.priceNote : 'mo'}
              </span>
            )}
          </div>
          {isAnnual && price > 0 && (
            <p className="text-sm text-primary mt-2">Save 50% with annual</p>
          )}
        </div>

        <div className="p-8 lg:p-10">
          <ul className="space-y-4 mb-8">
            {tier.features.map((feature) => (
              <li key={feature.text} className="flex items-start gap-3 text-sm">
                {feature.included ? (
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                ) : (
                  <X className="w-5 h-5 text-muted-foreground/50 shrink-0 mt-0.5" />
                )}
                <span
                  className={cn(
                    feature.included ? 'text-foreground' : 'text-muted-foreground line-through'
                  )}
                >
                  {feature.text}
                </span>
              </li>
            ))}
          </ul>

          <Button
            className={cn(
              'w-full h-12 text-base font-medium transition-all duration-200',
              isHighlighted
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-transparent border border-border text-foreground hover:bg-border/50'
            )}
            asChild
          >
            <Link
              href={
                tier.id === 'team'
                  ? `mailto:${SITE_CONFIG.email.hello}`
                  : tier.id === 'free'
                    ? SITE_CONFIG.links.marketplace
                    : '/dashboard'
              }
            >
              {tier.cta}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="relative py-32 lg:py-40 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-grid-brutal" />

      <Container className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-px bg-border" />
            <span className="text-mono text-sm text-primary tracking-wider uppercase">
              04 / Pricing
            </span>
            <div className="w-16 h-px bg-border" />
          </div>
          <h2 className="text-display text-4xl sm:text-5xl lg:text-6xl text-foreground mb-4">
            SIMPLE <span className="text-gradient">PRICING</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start free. Upgrade when you need more. No hidden fees.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex items-center justify-center gap-4 mb-16"
        >
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
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {PRICING_TIERS.map((tier, index) => (
            <PricingCard key={tier.id} tier={tier} index={index} isAnnual={isAnnual} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-muted-foreground">
            Need enterprise features?{' '}
            <Link
              href={`mailto:${SITE_CONFIG.email.hello}`}
              className="text-primary hover:underline"
            >
              Let&apos;s talk
            </Link>
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
