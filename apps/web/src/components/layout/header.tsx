'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from 'motion/react';
import { Menu, X, Download, Github, ChevronRight } from 'lucide-react';

import { Container } from './container';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { NAV_LINKS, SITE_CONFIG } from '@/lib/constants';

function Logo() {
  return (
    <Link href="/" className="flex items-center group relative z-50">
      <Image src="/logo.png" alt="DevRadar" width={55} height={55} className="object-contain" />
      <div className="flex flex-col">
        <span className="text-display font-bold text-lg leading-none text-foreground tracking-tight">
          DEV<span className="text-primary">RADAR</span>
        </span>
      </div>
    </Link>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="relative px-1 py-2 group">
      <span className="relative z-10 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
        {label}
      </span>

      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
    </Link>
  );
}

function MagneticButton({ children, href }: { children: React.ReactNode; href: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set((clientX - centerX) * 0.2);
    y.set((clientY - centerY) * 0.2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div style={{ x: springX, y: springY }}>
      <Button
        size="sm"
        className="relative overflow-hidden btn-brutal bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 h-10 group"
        asChild
      >
        <Link
          ref={ref}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <span className="relative z-10 flex items-center">{children}</span>
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shine_1s_ease-in-out_infinite] bg-linear-to-r from-transparent via-white/20 to-transparent" />
        </Link>
      </Button>
    </motion.div>
  );
}

export function Header() {
  const { scrollY } = useScroll();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const headerOpacity = useTransform(scrollY, [0, 50], [0, 1]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <motion.header className="fixed top-0 left-0 right-0 z-50 h-20 flex items-center">
        <motion.div
          className="absolute inset-0 bg-white dark:bg-zinc-950 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-b border-neutral-200 dark:border-neutral-800"
          style={{ opacity: headerOpacity }}
        />

        <Container className="relative z-10">
          <nav className="flex items-center justify-between">
            <Logo />

            <div className="hidden md:flex items-center gap-8 bg-neutral-100 dark:bg-neutral-900 px-6 rounded-full border border-neutral-200 dark:border-neutral-700">
              {NAV_LINKS.map((link) => (
                <NavItem key={link.href} {...link} />
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link
                href={SITE_CONFIG.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-2 text-muted-foreground hover:text-foreground transition-colors relative"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5 transition-transform group-hover:scale-110" />
              </Link>

              <ModeToggle />

              <MagneticButton href={SITE_CONFIG.links.marketplace}>
                <Download className="w-4 h-4 mr-2" />
                Install
              </MagneticButton>
            </div>

            <button
              className="md:hidden relative z-50 w-10 h-10 flex items-center justify-center text-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </nav>
        </Container>
      </motion.header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-background md:hidden flex flex-col pt-24"
            initial={{ opacity: 0, y: '-100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="absolute inset-0 bg-grid-brutal opacity-50 pointer-events-none" />

            <Container className="relative flex flex-col h-full pb-8">
              <div className="flex-1 flex flex-col gap-2">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                  >
                    <Link
                      href={link.href}
                      className="group flex items-center justify-between py-4 border-b border-border"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="text-display text-3xl text-foreground group-hover:text-primary transition-colors">
                        {link.label}
                      </span>
                      <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-8 space-y-4"
              >
                <Button
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-14 text-lg"
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

                <div className="flex items-center justify-center gap-6 pt-6">
                  <Link
                    href={SITE_CONFIG.links.github}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Github className="w-6 h-6" />
                  </Link>
                </div>
              </motion.div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
