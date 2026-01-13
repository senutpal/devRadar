'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { Quote } from 'lucide-react';

import { Container } from '@/components/layout';
import { STATS, TESTIMONIALS } from '@/lib/constants';

function AnimatedStat({ stat, index }: { stat: (typeof STATS)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    if (!isInView) return;

    const numericValue = parseInt(stat.value.replace(/[^0-9]/g, ''), 10);
    const hasPlus = stat.value.includes('+');
    const hasK = stat.value.toLowerCase().includes('k');
    const hasM = stat.value.toLowerCase().includes('m');
    const hasMs = stat.value.includes('ms');

    const targetValue = numericValue;

    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(targetValue * easeOut);

      let formatted = currentValue.toLocaleString();
      if (hasK) formatted = currentValue + 'K';
      if (hasM) formatted = currentValue + 'M';
      if (hasMs) formatted = '<' + currentValue + 'ms';
      if (hasPlus && !hasMs) formatted += '+';

      setDisplayValue(formatted);

      if (currentStep >= steps) {
        clearInterval(timer);
        setDisplayValue(stat.value);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isInView, stat.value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="text-center py-8 border-l border-border first:border-l-0"
    >
      <div className="text-display text-5xl lg:text-6xl text-primary mb-2">{displayValue}</div>
      <div className="text-mono text-xs text-muted-foreground uppercase tracking-widest">
        {stat.label}
      </div>
    </motion.div>
  );
}

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: (typeof TESTIMONIALS)[number];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative"
    >
      <div className="border-brutal p-8 lg:p-10 h-full">
        <Quote className="w-8 h-8 text-primary mb-6" />

        <blockquote className="text-lg lg:text-xl text-foreground leading-relaxed mb-8">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-none bg-secondary border border-border flex items-center justify-center text-display text-lg text-primary">
            {testimonial.author.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-foreground">{testimonial.author}</div>
            <div className="text-mono text-sm text-muted-foreground">{testimonial.role}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SocialProofSection() {
  return (
    <section className="relative py-32 lg:py-40">
      <div className="absolute inset-0 bg-background" />

      <div className="relative border-y border-border bg-secondary/50">
        <Container>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat, index) => (
              <AnimatedStat key={stat.label} stat={stat} index={index} />
            ))}
          </div>
        </Container>
      </div>

      <Container className="relative z-10 pt-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-16 lg:mb-24"
        >
          <div className="flex items-center gap-4 mb-6">
            <span className="text-mono text-sm text-primary tracking-wider uppercase">
              03 / Testimonials
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <h2 className="text-display text-4xl sm:text-5xl lg:text-6xl text-foreground">
            LOVED BY
            <br />
            <span className="text-gradient">DEVELOPERS</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <TestimonialCard key={testimonial.author} testimonial={testimonial} index={index} />
          ))}
        </div>
      </Container>
    </section>
  );
}
