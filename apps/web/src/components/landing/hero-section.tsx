'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Download } from 'lucide-react';
import { Container } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/lib/constants';
import { gsap } from '@/lib/gsap-config';
import { EXTENSION_VERSION } from '@/lib/extension-version';
import { RadarAnimation } from '@/components/animations';

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!heroRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('.hero-eyebrow', {
        x: -40,
        opacity: 0,
        duration: 0.6,
      })
        .from(
          '.hero-title-line',
          {
            y: 80,
            opacity: 0,
            duration: 0.8,
            stagger: 0.1,
          },
          '-=0.3'
        )
        .from(
          '.hero-description',
          {
            y: 30,
            opacity: 0,
            duration: 0.6,
          },
          '-=0.4'
        )
        .from(
          '.hero-cta',
          {
            y: 20,
            opacity: 0,
            duration: 0.5,
            stagger: 0.1,
          },
          '-=0.3'
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative min-h-screen pt-24 overflow-x-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-grid-brutal" />

      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />

      <div className="absolute inset-0 noise pointer-events-none z-20" />

      <Container className="relative z-10 pt-8 lg:pt-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="order-2 lg:order-1">
            <div className="hero-eyebrow flex items-center gap-3 mb-6">
              <span className="w-12 h-px bg-primary" />
              <span className="text-mono text-sm light:text-amber-dim text-primary tracking-wider">
                v{EXTENSION_VERSION}
              </span>
            </div>

            <h1 className="mb-6 overflow-hidden">
              <span className="hero-title-line block text-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-gradient-subtle">
                THE
              </span>
              <span className="hero-title-line block text-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-gradient">
                DISCORD
              </span>
              <span className="hero-title-line block text-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-gradient-subtle">
                FOR
              </span>
              <span className="hero-title-line block text-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-gradient">
                VS CODE
              </span>
            </h1>

            <p className="hero-description text-base lg:text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              See what <span className="text-foreground/80">friends are coding in real-time.</span>
              <br />
              <span className="text-foreground/80">Transform solo coding</span> into a multiplayer
              experience.
            </p>

            <div className="hero-cta flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="btn-brutal bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 h-14 text-base"
                asChild
              >
                <Link
                  href={SITE_CONFIG.links.marketplace}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Install Extension
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="btn-brutal border-border text-foreground hover:text-foreground hover:border-primary hover:bg-transparent px-8 h-14 text-base"
                asChild
              >
                <Link href="#features">
                  See Features
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="order-1 lg:order-2 -mt-12 lg:-mt-20 flex justify-center lg:block">
            <RadarAnimation />
          </div>
        </div>
      </Container>
    </section>
  );
}
