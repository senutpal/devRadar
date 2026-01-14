import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Eye, EyeOff, Lock, Database, Trash2, Download, Server, Users } from 'lucide-react';

import { Container } from '@/components/layout';
import { SITE_CONFIG, LEGAL_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'DevRadar Privacy Policy - How we collect, use, and protect your data.',
};

interface PolicySectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  accent?: 'amber' | 'cyan' | 'rose';
}

function PolicySection({ title, icon, children, accent = 'amber' }: PolicySectionProps) {
  const accentColors = {
    amber: 'border-l-[#FFB800]',
    cyan: 'border-l-[#00D4FF]',
    rose: 'border-l-[#FF6B6B]',
  };

  return (
    <section className={`border-l-4 ${accentColors[accent]} pl-6 py-2`}>
      <div className="flex items-center gap-3 mb-4">
        {icon && <span className="text-primary">{icon}</span>}
        <h2 className="text-xl font-bold text-foreground text-display">{title}</h2>
      </div>
      <div className="text-muted-foreground leading-relaxed space-y-4">{children}</div>
    </section>
  );
}

function DataList({
  items,
  type = 'collect',
}: {
  items: { label: string; description?: string }[];
  type?: 'collect' | 'never';
}) {
  const isNever = type === 'never';

  return (
    <ul className="space-y-2 mt-4">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <span
            className={`w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5 ${
              isNever ? 'bg-[#FF6B6B]/20 text-[#FF6B6B]' : 'bg-primary/20 text-primary'
            }`}
          >
            {isNever ? 'X' : '+'}
          </span>
          <span>
            <strong className="text-foreground">{item.label}</strong>
            {item.description && ` - ${item.description}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  const weCollect = [
    { label: 'File names', description: 'The name of the file you are editing (can be disabled)' },
    { label: 'Programming language', description: 'Detected from file extension' },
    { label: 'Project name', description: 'The workspace/folder name (can be disabled)' },
    { label: 'Session duration', description: 'How long you have been coding' },
    { label: 'Activity intensity', description: 'A general measure of coding activity (0-100)' },
    { label: 'Timestamps', description: 'When activity occurred' },
  ];

  const neverCollect = [
    { label: 'Code content', description: 'Your actual code never leaves your machine' },
    { label: 'File contents', description: 'We do not read what is in your files' },
    { label: 'Full file paths', description: 'Only the file name, not the directory structure' },
    { label: 'Keystrokes', description: 'We do not log what you type' },
    { label: 'Screenshots', description: 'We never capture your screen' },
    { label: 'Clipboard data', description: 'We do not access your clipboard' },
  ];

  const yourControls = [
    { label: 'Enable Privacy Mode', description: 'Hide file names and project names' },
    { label: 'Use Ghost Mode', description: 'Go completely invisible (Pro/Team)' },
    { label: 'Blacklist files', description: 'Exclude specific files or patterns' },
    { label: 'Delete your data', description: 'Request complete deletion anytime' },
    { label: 'Export your data', description: 'Download all data we have about you' },
  ];

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="border-b border-border mb-12">
        <Container size="sm">
          <div className="py-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-display">Privacy Policy</h1>
                <p className="text-mono text-muted-foreground mt-1">
                  Last updated: {LEGAL_CONFIG.lastUpdated}
                </p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">
              At DevRadar, we believe privacy is a fundamental right. We are developers ourselves,
              and we understand the sensitivity of coding activity data.
            </p>
          </div>
        </Container>
      </div>

      <Container size="sm">
        <div className="space-y-12">
          <PolicySection title="What We Collect" icon={<Eye className="w-5 h-5" />}>
            <p>
              We collect only the minimum data necessary to provide our service. Here is exactly
              what we track:
            </p>
            <DataList items={weCollect} type="collect" />
          </PolicySection>

          <PolicySection
            title="What We NEVER Collect"
            icon={<EyeOff className="w-5 h-5" />}
            accent="rose"
          >
            <p>Your code stays on your machine. We have zero access to:</p>
            <DataList items={neverCollect} type="never" />
          </PolicySection>

          <PolicySection title="How We Use Your Data" icon={<Database className="w-5 h-5" />}>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-primary rounded-full" />
                Display your presence status to mutual follows
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-primary rounded-full" />
                Generate coding statistics and streaks
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-primary rounded-full" />
                Power leaderboards (opt-in only)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-primary rounded-full" />
                Improve our service and fix bugs
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-primary rounded-full" />
                Send relevant notifications (with your permission)
              </li>
            </ul>
          </PolicySection>

          <PolicySection title="Data Sharing" icon={<Users className="w-5 h-5" />}>
            <div className="card-brutal p-6">
              <p className="text-foreground font-medium mb-4">Our promise to you:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-primary">-</span>
                  Activity data is only shared with mutual follows
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">-</span>
                  We never sell your data to third parties
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">-</span>
                  We never share your data with advertisers
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">-</span>
                  Team data is only visible to team members
                </li>
              </ul>
            </div>
          </PolicySection>

          <PolicySection title="Your Controls" icon={<Lock className="w-5 h-5" />} accent="cyan">
            <p>You are in complete control of your data:</p>
            <DataList items={yourControls} type="collect" />
          </PolicySection>

          <PolicySection title="Data Security" icon={<Server className="w-5 h-5" />}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-card border border-border p-4">
                <p className="text-mono text-sm text-primary mb-1">IN TRANSIT</p>
                <p>TLS 1.3 encryption</p>
              </div>
              <div className="bg-card border border-border p-4">
                <p className="text-mono text-sm text-primary mb-1">AT REST</p>
                <p>AES-256 encryption</p>
              </div>
              <div className="bg-card border border-border p-4">
                <p className="text-mono text-sm text-primary mb-1">SECURITY</p>
                <p>Regular audits and penetration testing</p>
              </div>
              <div className="bg-card border border-border p-4">
                <p className="text-mono text-sm text-primary mb-1">COMPLIANCE</p>
                <p>SOC 2 (in progress)</p>
              </div>
            </div>
          </PolicySection>

          <PolicySection title="Data Retention" icon={<Trash2 className="w-5 h-5" />}>
            <div className="space-y-4">
              <p>
                Presence data is ephemeral and expires after{' '}
                <strong className="text-foreground">45 seconds</strong> of inactivity.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-muted px-4 py-2">
                  <span className="text-mono text-sm text-muted-foreground">FREE</span>
                  <p className="text-foreground font-bold">7 days</p>
                </div>
                <div className="bg-muted px-4 py-2">
                  <span className="text-mono text-sm text-muted-foreground">PRO</span>
                  <p className="text-foreground font-bold">30 days</p>
                </div>
                <div className="bg-muted px-4 py-2">
                  <span className="text-mono text-sm text-muted-foreground">TEAM</span>
                  <p className="text-foreground font-bold">90 days</p>
                </div>
              </div>
              <p>Request complete deletion anytime - processed within 24 hours.</p>
            </div>
          </PolicySection>

          <PolicySection title="Third-Party Services">
            <p>We use the following third-party services:</p>
            <ul className="space-y-2 mt-4">
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 bg-primary" />
                <strong className="text-foreground">GitHub OAuth</strong> - For authentication
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 bg-primary" />
                <strong className="text-foreground">RazorPay</strong> - For payment processing
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 bg-primary" />
                <strong className="text-foreground">PostHog</strong> - For anonymous usage analytics
                (self-hosted)
              </li>
            </ul>
          </PolicySection>

          <PolicySection title="Children's Privacy">
            <p>
              DevRadar is not intended for children under 13. We do not knowingly collect data from
              children under 13. If you believe we have collected data from a child under 13, please
              contact us immediately.
            </p>
          </PolicySection>

          <PolicySection title="Changes to This Policy">
            <p>
              We may update this policy from time to time. We will notify you of any significant
              changes via email or in-app notification. Continued use of DevRadar after changes
              constitutes acceptance of the new policy.
            </p>
          </PolicySection>

          <div className="border-t border-border pt-12 mt-12">
            <div className="card-brutal p-8">
              <div className="flex items-center gap-3 mb-4">
                <Download className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-display">Questions?</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Questions about this policy? We are happy to help.
              </p>
              <Link
                href={`mailto:${SITE_CONFIG.email.support}`}
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-mono transition-colors"
              >
                {SITE_CONFIG.email.support}
                <span className="text-muted-foreground">-&gt;</span>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
