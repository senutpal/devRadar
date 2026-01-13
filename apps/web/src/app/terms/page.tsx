import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '@/components/layout';
import { Separator } from '@/components/ui/separator';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'DevRadar Terms of Service - Rules and guidelines for using our service.',
};

export default function TermsPage() {
  const lastUpdated = 'January 1, 2025';

  return (
    <div className="pt-24 pb-16">
      <Container size="sm">
        <article className="prose prose-invert prose-lg max-w-none">
          <header className="not-prose mb-12">
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
          </header>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using DevRadar (&quot;the Service&quot;), you agree to be bound by
                these Terms of Service. If you do not agree to these terms, do not use the Service.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                DevRadar is a developer presence platform that allows users to share their coding
                activity with friends and colleagues. The Service includes a VS Code extension, web
                dashboard, and API.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>To use DevRadar, you must:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Have a valid GitHub account</li>
                  <li>Be at least 13 years of age</li>
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your account</li>
                </ul>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>You agree NOT to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Use the Service for any illegal purpose</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Attempt to gain unauthorized access to the Service</li>
                  <li>Interfere with or disrupt the Service</li>
                  <li>Use automated tools to scrape or collect data</li>
                  <li>Impersonate other users or entities</li>
                  <li>Share your account credentials with others</li>
                </ul>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-semibold mb-4">5. Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your privacy is important to us. Please review our{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>{' '}
                to understand how we collect, use, and protect your data.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-semibold mb-4">6. Subscription and Payments</h2>
              <div className="space-y-4 text-muted-foreground">
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Paid plans are billed monthly or annually</li>
                  <li>Prices are subject to change with 30 days notice</li>
                  <li>Refunds are available within 14 days of purchase</li>
                  <li>Failed payments may result in service suspension</li>
                  <li>You can cancel your subscription at any time</li>
                </ul>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service and its original content, features, and functionality are owned by
                DevRadar and are protected by international copyright, trademark, patent, trade
                secret, and other intellectual property laws.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-semibold mb-4">8. User Content</h2>
              <p className="text-muted-foreground leading-relaxed">
                You retain ownership of any content you create or share through the Service. By
                using the Service, you grant us a license to use your activity data as described in
                our Privacy Policy. You are responsible for any content you share.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-semibold mb-4">9. Disclaimers</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
                  WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                </p>
                <p>
                  We do not guarantee that the Service will be uninterrupted, secure, or error-free.
                  We are not responsible for any data loss or security breaches that may occur.
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                IN NO EVENT SHALL DEVRADAR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS,
                DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may terminate or suspend your account immediately, without prior notice, for any
                reason, including breach of these Terms. Upon termination, your right to use the
                Service will immediately cease.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify users of
                significant changes via email or in-app notification. Continued use of the Service
                after changes constitutes acceptance.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the
                State of Delaware, United States, without regard to its conflict of law provisions.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-semibold mb-4">14. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                Questions about these Terms? Contact us at{' '}
                <Link
                  href={`mailto:${SITE_CONFIG.email.support}`}
                  className="text-primary hover:underline"
                >
                  {SITE_CONFIG.email.support}
                </Link>
              </p>
            </div>
          </section>
        </article>
      </Container>
    </div>
  );
}
