'use client';

import { motion } from 'motion/react';
import { Plus, Minus } from 'lucide-react';
import { useState } from 'react';

import { Container } from '@/components/layout';
import { FAQ_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

function FAQItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: (typeof FAQ_ITEMS)[number];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="border-b border-border"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-6 py-6 text-left group"
      >
        <span className="text-mono text-sm text-muted-foreground pt-1">
          {String(index + 1).padStart(2, '0')}
        </span>

        <span
          className={cn(
            'flex-1 text-lg font-medium transition-colors',
            isOpen ? 'text-primary' : 'text-foreground group-hover:text-primary'
          )}
        >
          {item.question}
        </span>

        <span className="shrink-0 pt-1">
          {isOpen ? (
            <Minus className="w-5 h-5 text-primary" />
          ) : (
            <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </span>
      </button>

      <div
        className={cn(
          'grid transition-all duration-300 ease-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <p className="text-muted-foreground leading-relaxed pb-6 pl-12">{item.answer}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-32 lg:py-40">
      <div className="absolute inset-0 bg-background" />

      <Container size="sm" className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="flex items-center gap-4 mb-6">
            <span className="text-mono text-sm text-primary tracking-wider uppercase">
              05 / FAQ
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <h2 className="text-display text-4xl sm:text-5xl lg:text-6xl text-foreground">
            QUESTIONS
            <br />
            <span className="text-gradient">ANSWERED</span>
          </h2>
        </motion.div>

        <div className="border-t border-border">
          {FAQ_ITEMS.map((item, index) => (
            <FAQItem
              key={item.question}
              item={item}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
