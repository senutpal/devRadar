import { Resend } from 'resend';

import { env } from '@/config';
import { logger } from '@/lib/logger';

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  resend ??= new Resend(env.RESEND_API_KEY);
  return resend;
}

interface TeamInviteEmailParams {
  to: string;
  teamName: string;
  inviterName: string;
  role: string;
  joinUrl: string;
  expiresAt: string;
}

export async function sendTeamInviteEmail(params: TeamInviteEmailParams): Promise<boolean> {
  const client = getResend();
  if (!client) {
    logger.warn('RESEND_API_KEY not configured, skipping invitation email');
    return false;
  }

  try {
    await client.emails.send({
      from: 'DevRadar <noreply@devradar.app>',
      to: params.to,
      subject: `You're invited to join ${params.teamName} on DevRadar`,
      html: `
        <div style="font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; max-width: 500px; margin: 0 auto; padding: 40px 20px; color: #e5e5e5; background: #0a0a0a;">
          <div style="border: 1px solid #262626; padding: 32px;">
            <h1 style="font-size: 16px; font-weight: 700; margin: 0 0 24px; color: #fafafa;">Team Invitation</h1>
            <p style="font-size: 13px; line-height: 1.6; margin: 0 0 16px; color: #a3a3a3;">
              <strong style="color: #fafafa;">${params.inviterName}</strong> has invited you to join
              <strong style="color: #fafafa;">${params.teamName}</strong> as a <strong style="color: #fafafa;">${params.role.toLowerCase()}</strong>.
            </p>
            <a href="${params.joinUrl}" style="display: inline-block; padding: 10px 24px; background: #fafafa; color: #0a0a0a; text-decoration: none; font-size: 12px; font-weight: 600; font-family: monospace; letter-spacing: 0.05em; text-transform: uppercase;">
              Accept Invitation
            </a>
            <p style="font-size: 11px; color: #737373; margin: 24px 0 0; border-top: 1px solid #262626; padding-top: 16px;">
              This invitation expires on ${new Date(params.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
              If you didn't expect this invitation, you can safely ignore it.
            </p>
          </div>
          <p style="font-size: 10px; color: #525252; margin: 16px 0 0; text-align: center;">
            DevRadar — See what your friends are coding
          </p>
        </div>
      `,
    });

    logger.info({ to: params.to, teamName: params.teamName }, 'Team invitation email sent');
    return true;
  } catch (error) {
    logger.error({ error, to: params.to }, 'Failed to send team invitation email');
    return false;
  }
}
