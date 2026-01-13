import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, Terminal, Book, ArrowRight, ExternalLink } from 'lucide-react';

import { Container } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Learn how to get started with DevRadar. Installation, configuration, and API reference.',
};

const quickStartSteps = [
  {
    step: '01',
    title: 'Install the Extension',
    description: 'Add DevRadar to VS Code from the marketplace',
    code: 'code --install-extension devradar.devradar',
  },
  {
    step: '02',
    title: 'Sign in with GitHub',
    description: 'Authenticate to connect with your developer network',
    code: 'Cmd/Ctrl + Shift + P → DevRadar: Login',
  },
  {
    step: '03',
    title: 'Start Coding',
    description: "Your presence is now live. That's it.",
    code: "// You're all set!",
  },
];

const docSections = [
  {
    title: 'Getting Started',
    href: '/docs/getting-started',
    items: ['Installation', 'Authentication', 'First Steps'],
  },
  {
    title: 'Configuration',
    href: '/docs/configuration',
    items: ['Privacy Settings', 'Notifications', 'Themes'],
  },
  {
    title: 'Privacy & Security',
    href: '/docs/privacy',
    items: ['Data Collection', 'Ghost Mode', 'Blacklisting'],
  },
  { title: 'Teams', href: '/docs/teams', items: ['Team Setup', 'Conflict Radar', 'Analytics'] },
];

export default function DocsPage() {
  return (
    <div className="pt-24 pb-16 bg-background min-h-screen">
      <section className="py-20 lg:py-32 relative">
        <div className="absolute inset-0 bg-grid-brutal" />
        <Container className="relative">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
              <Book className="w-5 h-5 text-primary" />
              <span className="text-mono text-sm text-primary tracking-wider uppercase">
                Documentation
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <h1 className="text-display text-5xl sm:text-6xl lg:text-7xl text-foreground mb-6">
              LEARN
              <br />
              <span className="text-gradient">DEVRADAR</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-xl mb-10">
              Everything you need to get started and make the most of DevRadar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="btn-brutal bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 h-14"
                asChild
              >
                <Link href={SITE_CONFIG.links.marketplace}>
                  <Download className="w-5 h-5 mr-2" />
                  Install Extension
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="btn-brutal border-border text-foreground hover:border-primary px-8 h-14"
                asChild
              >
                <Link href="#quick-start">
                  Quick Start
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section id="quick-start" className="py-20 lg:py-32 bg-card">
        <Container>
          <div className="mb-16">
            <h2 className="text-display text-3xl lg:text-4xl text-foreground mb-4">
              QUICK <span className="text-gradient">START</span>
            </h2>
            <p className="text-muted-foreground">Get up and running in under a minute</p>
          </div>

          <div className="max-w-3xl space-y-6">
            {quickStartSteps.map((item) => (
              <div key={item.step} className="border-brutal p-8">
                <div className="flex items-start gap-6">
                  <span className="text-display text-4xl text-primary/20">{item.step}</span>
                  <div className="flex-1">
                    <h3 className="text-display text-xl text-foreground mb-2">{item.title}</h3>
                    <p className="text-muted-foreground mb-4">{item.description}</p>
                    <div className="bg-secondary border border-border p-4 flex items-center gap-3">
                      <Terminal className="w-4 h-4 text-primary" />
                      <code className="text-mono text-sm text-foreground">{item.code}</code>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 lg:py-32">
        <Container>
          <div className="mb-16">
            <h2 className="text-display text-3xl lg:text-4xl text-foreground mb-4">
              EXPLORE THE <span className="text-gradient">DOCS</span>
            </h2>
            <p className="text-muted-foreground">Deep dive into specific topics</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {docSections.map((section) => (
              <div key={section.title} className="card-brutal p-8 card-hover group cursor-pointer">
                <h3 className="text-display text-xl text-foreground mb-4 group-hover:text-primary transition-colors">
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <span className="w-1 h-1 bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container size="sm">
          <div className="text-center p-12 border-2 border-border bg-card">
            <h2 className="text-display text-2xl text-foreground mb-4">Need help?</h2>
            <p className="text-muted-foreground mb-8">
              Our community and support team are here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                className="border-border text-foreground hover:border-primary"
                asChild
              >
                <Link href={SITE_CONFIG.links.discord}>
                  Join Discord
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <Link href={`mailto:${SITE_CONFIG.email.support}`}>Contact Support</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
