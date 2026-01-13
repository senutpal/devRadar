'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Download } from 'lucide-react';

import { Container } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/lib/constants';

export function CTASection() {
  return (
    <section className="relative py-32 lg:py-40 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      <div className="absolute inset-0 bg-linear-to-t from-primary/5 via-transparent to-transparent" />

      <div className="absolute inset-0 bg-grid-brutal" />

      <Container className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative border-2 border-primary bg-card p-12 lg:p-20">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary -translate-x-0.5 -translate-y-0.5" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary translate-x-0.5 -translate-y-0.5" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary -translate-x-0.5 translate-y-0.5" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary translate-x-0.5 translate-y-0.5" />

            <div className="text-center">
              <h2 className="text-display text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6">
                READY TO
                <br />
                <span className="text-gradient">GO LIVE?</span>
              </h2>

              <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
                Join thousands of developers who&apos;ve transformed their coding experience.
                Install DevRadar and watch your network come alive.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="btn-brutal bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-10 h-14 text-base glow-amber"
                  asChild
                >
                  <Link
                    href={SITE_CONFIG.links.marketplace}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Install Free Extension
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="btn-brutal border-border text-foreground hover:border-primary hover:bg-transparent px-10 h-14 text-base"
                  asChild
                >
                  <Link href="/docs">
                    Read Documentation
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mt-12 flex flex-wrap items-center justify-center gap-8 text-mono text-xs text-muted-foreground uppercase tracking-widest"
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary" />
                  No credit card
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary" />
                  Privacy first
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary" />
                  Open source friendly
                </span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
