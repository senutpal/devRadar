'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Radio, Users, Shield, Flame, Trophy, GitBranch, LucideIcon } from 'lucide-react';

import { Container } from '@/components/layout';
import { FEATURES } from '@/lib/constants';
import { gsap } from '@/lib/gsap-config';

const iconMap: Record<string, LucideIcon> = {
  Radio,
  Users,
  Shield,
  Flame,
  Trophy,
  GitBranch,
};

interface FeatureCardProps {
  feature: (typeof FEATURES)[number];
  index: number;
}

function FeatureCard({ feature, index }: FeatureCardProps) {
  const Icon = iconMap[feature.icon];
  const isEven = index % 2 === 0;

  if (!Icon) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: isEven ? -40 : 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="feature-card group relative"
    >
      <div className="card-brutal p-8 lg:p-10 card-hover h-full">
        <div className="mb-6 relative">
          <div className="w-14 h-14 flex items-center justify-center border border-border group-hover:border-primary transition-colors duration-300">
            <Icon className="w-7 h-7 text-primary" />
          </div>
        </div>

        <h3 className="text-display text-xl lg:text-2xl text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
          {feature.title}
        </h3>
        <p className="text-muted-foreground leading-relaxed">{feature.description}</p>

        <div className="absolute bottom-0 left-0 w-0 h-1 bg-primary group-hover:w-full transition-all duration-500" />
      </div>
    </motion.div>
  );
}

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.section-line', {
        scaleX: 0,
        duration: 1.5,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.section-header',
          start: 'top 80%',
          once: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="features" className="relative py-32 lg:py-40">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-dots" />

      <Container className="relative z-10">
        <div className="section-header grid lg:grid-cols-12 gap-8 mb-20 lg:mb-32">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-mono text-sm text-primary tracking-wider uppercase">
                01 / Features
              </span>
              <div className="section-line flex-1 h-px bg-border origin-left" />
            </div>
            <h2 className="text-display text-4xl sm:text-5xl lg:text-6xl text-foreground">
              EVERYTHING
              <br />
              <span className="text-gradient">YOU NEED</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-8 flex items-end">
            <p className="text-lg text-muted-foreground leading-relaxed">
              DevRadar brings the social features you love from Discord and gaming into your
              development workflow. Privacy-first, developer-obsessed.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      </Container>
    </section>
  );
}
