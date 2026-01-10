/**
 * Slack Integration Service
 *
 * Provides Slack OAuth installation, request verification, messaging,
 * and team activity summaries using the Slack Web API.
 *
 * This module is responsible for:
 * - Verifying incoming Slack requests
 * - Handling OAuth installation and callbacks
 * - Formatting and posting team status summaries
 * - Managing Slack workspace connections per team
 */

import crypto from 'crypto';

import { WebClient, type ChatPostMessageResponse } from '@slack/web-api';

import type { KnownBlock } from '@slack/types';

import { env } from '@/config';
import { logger } from '@/lib/logger';
import { getDb } from '@/services/db';
import { getPresences } from '@/services/redis';

export interface SlackOAuthResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id: string;
  app_id: string;
  team: {
    id: string;
    name: string;
  };
  enterprise?: {
    id: string;
    name: string;
  };
  authed_user: {
    id: string;
  };
}

export interface TeamStatusSummary {
  teamId: string;
  teamName: string;
  online: TeamMemberStatus[];
  idle: TeamMemberStatus[];
  offline: TeamMemberStatus[];
  totalMembers: number;
}

export interface TeamMemberStatus {
  userId: string;
  username: string;
  displayName: string | null;
  status: 'online' | 'idle' | 'offline' | 'dnd';
  activity?: {
    fileName?: string;
    language?: string;
    project?: string;
    sessionDuration: number;
  };
}

/**
 * Slack OAuth scopes required by the application.
 *
 * - chat:write — Send messages as the bot
 * - commands — Handle slash commands
 */
const SLACK_OAUTH_SCOPES = ['chat:write', 'commands'].join(',');

/**
 * Verifies the authenticity of an incoming Slack request.
 *
 * This function validates:
 * - Request freshness (prevents replay attacks)
 * - HMAC signature using Slack signing secret
 *
 * @param signingSecret - Slack signing secret
 * @param timestamp - X-Slack-Request-Timestamp header value
 * @param body - Raw request body
 * @param signature - X-Slack-Signature header value
 * @returns `true` if the request is valid and trusted
 */
export function verifySlackRequest(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp, 10) < fiveMinutesAgo) {
    logger.warn('Slack request timestamp too old');
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const expectedSignature =
    'v0=' + crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

/**
 * Builds the Slack OAuth installation URL for a team.
 *
 * @param teamId - Internal team identifier
 * @param state - CSRF protection token
 * @returns Slack OAuth authorization URL
 * @throws Error if Slack OAuth is not configured
 */
export function getSlackInstallUrl(teamId: string, state: string): string {
  if (!env.SLACK_CLIENT_ID) {
    throw new Error('SLACK_CLIENT_ID is not configured');
  }

  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: SLACK_OAUTH_SCOPES,
    state: JSON.stringify({ teamId, csrf: state }),
    redirect_uri: getSlackRedirectUri(),
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

/**
 * Resolves the Slack OAuth redirect URI based on runtime environment.
 *
 * @returns Absolute redirect URI
 */
function getSlackRedirectUri(): string {
  const baseUrl =
    env.NODE_ENV === 'production'
      ? 'https://api.devradar.io'
      : `http://localhost:${String(env.PORT)}`;
  return `${baseUrl}/slack/callback`;
}

/**
 * Handles Slack OAuth callback and persists workspace credentials.
 *
 * @param code - OAuth authorization code
 * @param teamId - Internal team identifier
 * @returns Connected Slack workspace identifiers
 * @throws Error if OAuth exchange fails
 */
export async function handleSlackOAuthCallback(
  code: string,
  teamId: string
): Promise<{ slackWorkspaceId: string; slackTeamName: string }> {
  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
    throw new Error('Slack OAuth is not configured');
  }

  const db = getDb();

  const client = new WebClient();
  const response = (await client.oauth.v2.access({
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
    code,
    redirect_uri: getSlackRedirectUri(),
  })) as SlackOAuthResponse;

  if (!response.ok || !response.access_token) {
    throw new Error('Failed to exchange Slack OAuth code for token');
  }

  await db.slackWorkspace.upsert({
    where: { teamId },
    create: {
      teamId,
      slackWorkspaceId: response.team.id,
      slackTeamName: response.team.name,
      accessToken: response.access_token,
      botUserId: response.bot_user_id,
    },
    update: {
      slackWorkspaceId: response.team.id,
      slackTeamName: response.team.name,
      accessToken: response.access_token,
      botUserId: response.bot_user_id,
    },
  });

  logger.info(
    {
      teamId,
      slackWorkspaceId: response.team.id,
      slackTeamName: response.team.name,
    },
    'Slack workspace connected'
  );

  return {
    slackWorkspaceId: response.team.id,
    slackTeamName: response.team.name,
  };
}

/**
 * Returns a configured Slack WebClient for a team.
 *
 * @param teamId - Internal team identifier
 * @returns Slack WebClient instance or `null` if not connected
 */
export async function getSlackClient(teamId: string): Promise<WebClient | null> {
  const db = getDb();

  const workspace = await db.slackWorkspace.findUnique({
    where: { teamId },
    select: { accessToken: true },
  });

  if (!workspace) {
    return null;
  }

  return new WebClient(workspace.accessToken);
}

/**
 * Computes current team presence summary.
 *
 * @param teamId - Internal team identifier
 * @returns Aggregated team status summary
 */
export async function getTeamStatus(teamId: string): Promise<TeamStatusSummary> {
  const db = getDb();

  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      owner: {
        select: { id: true, username: true, displayName: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, username: true, displayName: true },
          },
        },
      },
    },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  const allMemberIds = [team.owner.id, ...team.members.map((m) => m.user.id)];
  const allMembers = [
    { id: team.owner.id, username: team.owner.username, displayName: team.owner.displayName },
    ...team.members.map((m) => m.user),
  ];

  const presences = await getPresences(allMemberIds);

  const online: TeamMemberStatus[] = [];
  const idle: TeamMemberStatus[] = [];
  const offline: TeamMemberStatus[] = [];

  for (const member of allMembers) {
    const presence = presences.get(member.id);
    const status: TeamMemberStatus = {
      userId: member.id,
      username: member.username,
      displayName: member.displayName,
      status: presence?.status ? (presence.status as TeamMemberStatus['status']) : 'offline',
    };

    if (presence?.activity) {
      const sessionDuration =
        typeof presence.activity.sessionDuration === 'number'
          ? presence.activity.sessionDuration
          : 0;
      const activity: TeamMemberStatus['activity'] = {
        sessionDuration,
      };
      if (presence.activity.fileName) {
        activity.fileName = presence.activity.fileName as string;
      }
      if (presence.activity.language) {
        activity.language = presence.activity.language as string;
      }
      if (presence.activity.project) {
        activity.project = presence.activity.project as string;
      }
      status.activity = activity;
    }

    if (status.status === 'online') {
      online.push(status);
    } else if (status.status === 'idle' || status.status === 'dnd') {
      idle.push(status);
    } else {
      offline.push(status);
    }
  }

  return {
    teamId,
    teamName: team.name,
    online,
    idle,
    offline,
    totalMembers: allMembers.length,
  };
}

/**
 * Converts a duration in seconds into a human-readable string.
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${String(seconds)}s`;
  if (seconds < 3600) return `${String(Math.floor(seconds / 60))}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${String(hours)}h ${String(mins)}m`;
}

/**
 * Formats a team status summary into Slack Block Kit blocks.
 *
 * @param status - Team status summary
 * @returns Slack Block Kit block definitions
 */
export function formatStatusForSlack(status: TeamStatusSummary): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📊 ${status.teamName} - Team Status`,
        emoji: true,
      },
    },
    {
      type: 'divider',
    },
  ];

  if (status.online.length > 0) {
    const onlineText = status.online
      .map((m) => {
        const name = m.displayName ?? m.username;
        const activity = m.activity
          ? ` - ${m.activity.language ?? 'coding'}${m.activity.fileName ? ` in ${m.activity.fileName}` : ''} (${formatDuration(m.activity.sessionDuration)})`
          : '';
        return `🟢 *${name}*${activity}`;
      })
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Online (${String(status.online.length)})*\n${onlineText}`,
      },
    });
  }

  if (status.idle.length > 0) {
    const idleText = status.idle.map((m) => `🟡 ${m.displayName ?? m.username}`).join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Idle (${String(status.idle.length)})*\n${idleText}`,
      },
    });
  }

  if (status.offline.length > 0) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `⚫ ${String(status.offline.length)} team member${status.offline.length > 1 ? 's' : ''} offline`,
        },
      ],
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `_Updated: ${new Date().toLocaleTimeString()}_`,
      },
    ],
  });

  return blocks;
}

/**
 * Posts a message to a Slack channel on behalf of a team.
 *
 * @param teamId - Internal team identifier
 * @param channelId - Slack channel ID
 * @param text - Fallback plain-text message
 * @param blocks - Optional Block Kit blocks
 * @returns Slack API response or `null` on failure
 */
export async function postSlackMessage(
  teamId: string,
  channelId: string,
  text: string,
  blocks?: KnownBlock[]
): Promise<ChatPostMessageResponse | null> {
  const client = await getSlackClient(teamId);

  if (!client) {
    logger.warn({ teamId }, 'No Slack client for team');
    return null;
  }

  try {
    const response = await client.chat.postMessage({
      channel: channelId,
      text,
      blocks,
    });
    return response;
  } catch (error) {
    logger.error({ error, teamId, channelId }, 'Failed to post Slack message');
    return null;
  }
}

/**
 * Posts the daily team activity summary to Slack.
 *
 * @param teamId - Internal team identifier
 */
export async function postDailySummary(teamId: string): Promise<void> {
  const db = getDb();

  const workspace = await db.slackWorkspace.findUnique({
    where: { teamId },
    select: { channelId: true },
  });

  if (!workspace?.channelId) {
    logger.debug({ teamId }, 'No Slack channel configured for daily summary');
    return;
  }

  const status = await getTeamStatus(teamId);
  const blocks = formatStatusForSlack(status);

  await postSlackMessage(
    teamId,
    workspace.channelId,
    `Team Status: ${String(status.online.length)} online, ${String(status.idle.length)} idle, ${String(status.offline.length)} offline`,
    blocks
  );

  logger.info({ teamId, channelId: workspace.channelId }, 'Posted daily summary to Slack');
}
