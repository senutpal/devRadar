'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Download, UserPlus, Radio, LucideIcon } from 'lucide-react';

import { Container } from '@/components/layout';
import { gsap } from '@/lib/gsap-config';
import { HOW_IT_WORKS_STEPS } from '@/lib/constants';

const stepIconMap: Record<string, LucideIcon> = {
  Download,
  UserPlus,
  Radio,
};

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.step-connector', {
        scaleX: 0,
        duration: 1,
        ease: 'power2.out',
        stagger: 0.2,
        scrollTrigger: {
          trigger: '.steps-grid',
          start: 'top 70%',
          once: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 lg:py-40 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-grid-dense" />

      <Container className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20 lg:mb-32"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-px bg-border" />
            <span className="text-mono text-sm text-primary tracking-wider uppercase">
              02 / How It Works
            </span>
            <div className="w-16 h-px bg-border" />
          </div>
          <h2 className="text-display text-4xl sm:text-5xl lg:text-6xl text-foreground">
            THREE <span className="text-gradient">SIMPLE</span> STEPS
          </h2>
        </motion.div>

        <div className="steps-grid grid md:grid-cols-3 gap-8 lg:gap-12">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: 0.6,
                delay: index * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative"
            >
              {index < 2 && (
                <div className="step-connector hidden md:block absolute top-12 left-full w-full h-px bg-border origin-left z-0" />
              )}

              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-6">
                  <div
                    className="w-24 h-24 flex items-center justify-center border-2"
                    style={{ borderColor: step.accent }}
                  >
                    {(() => {
                      const Icon = stepIconMap[step.icon];
                      return Icon ? (
                        <Icon className="w-10 h-10" style={{ color: step.accent }} />
                      ) : null;
                    })()}
                  </div>
                  <span className="text-display text-7xl" style={{ color: `${step.accent}20` }}>
                    {step.number}
                  </span>
                </div>

                <h3 className="text-display text-2xl lg:text-3xl text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
