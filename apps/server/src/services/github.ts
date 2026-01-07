/*** GitHub OAuth Service
 *
 * Handles GitHub OAuth 2.0 flow for authentication.
 * Creates or updates user records on successful authentication ***/

import type { User } from '@/generated/prisma/client';

import { env } from '@/config';
import { AuthenticationError, InternalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getDb } from '@/services/db';

const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

const GITHUB_API_TIMEOUT_MS = 10000;

/**
 * Generate the GitHub OAuth authorization URL.
 *
 * @param state - Optional state parameter for CSRF protection
 * @returns Authorization URL to redirect user to
 */
export function getGitHubAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    scope: 'read:user user:email',
    allow_signup: 'true',
  });

  if (state) {
    params.set('state', state);
  }

  return `${GITHUB_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token.
 *
 * @param code - Authorization code from GitHub callback
 * @returns Access token
 * @throws AuthenticationError if exchange fails
 */
async function exchangeCodeForToken(code: string): Promise<string> {
  try {
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_CALLBACK_URL,
      }),
      signal: AbortSignal.timeout(GITHUB_API_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.error({ status: response.status }, 'GitHub token exchange failed');
      throw new AuthenticationError('Failed to authenticate with GitHub');
    }

    const data = (await response.json()) as TokenResponse;

    if (data.error) {
      logger.error(
        { error: data.error, description: data.error_description },
        'GitHub OAuth error'
      );
      throw new AuthenticationError(data.error_description ?? 'GitHub authentication failed');
    }

    return data.access_token;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new AuthenticationError('GitHub authentication timed out');
    }
    throw error;
  }
}

/**
 * Fetch GitHub user profile using access token.
 *
 * @param accessToken - GitHub access token
 * @returns GitHub user profile
 * @throws AuthenticationError if fetch fails
 */
async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  try {
    const response = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
      signal: AbortSignal.timeout(GITHUB_API_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.error({ status: response.status }, 'Failed to fetch GitHub user');
      throw new AuthenticationError('Failed to fetch GitHub user profile');
    }

    return (await response.json()) as GitHubUser;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new AuthenticationError('GitHub authentication timed out');
    }
    throw error;
  }
}

/**
 * Authenticate user with GitHub OAuth.
 * Creates new user if not exists, updates if exists.
 *
 * @param code - Authorization code from GitHub callback
 * @returns Authenticated user
 * @throws AuthenticationError if authentication fails
 */
export async function authenticateWithGitHub(code: string): Promise<User> {
  try {
    /* Exchange code for access token */
    const accessToken = await exchangeCodeForToken(code);
    /* Fetch user profile */
    const githubUser = await fetchGitHubUser(accessToken);
    /* Upsert user in database */
    const db = getDb();
    const user = await db.user.upsert({
      where: { githubId: String(githubUser.id) },
      create: {
        githubId: String(githubUser.id),
        username: githubUser.login,
        displayName: githubUser.name,
        avatarUrl: githubUser.avatar_url,
        email: githubUser.email,
      },
      update: {
        username: githubUser.login,
        displayName: githubUser.name,
        avatarUrl: githubUser.avatar_url,
        email: githubUser.email,
      },
    });

    logger.info({ userId: user.id, username: user.username }, 'User authenticated via GitHub');

    return user;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    logger.error({ error }, 'GitHub authentication error');
    throw new InternalError('Authentication failed', { cause: error as Error });
  }
}

/**
 * Get user by ID.
 *
 * @param userId - User ID
 * @returns User or null if not found
 */
export async function getUserById(userId: string): Promise<User | null> {
  const db = getDb();
  return db.user.findUnique({ where: { id: userId } }) as Promise<User | null>;
}

/**
 * Get user by GitHub ID.
 *
 * @param githubId - GitHub user ID
 * @returns User or null if not found
 */
export async function getUserByGitHubId(githubId: string): Promise<User | null> {
  const db = getDb();
  return db.user.findUnique({ where: { githubId } }) as Promise<User | null>;
}
