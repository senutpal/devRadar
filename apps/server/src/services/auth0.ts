/**
 * Auth0 SSO/SAML Service
 *
 * Handles Auth0 OAuth 2.0 / SAML flow for enterprise SSO authentication.
 * This is a TEAM tier feature for organizations that require centralized login.
 */

import { env } from '@/config';
import { logger } from '@/lib/logger';

interface Auth0TokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

interface Auth0UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  nickname: string;
  picture: string;
}

const AUTH0_API_TIMEOUT_MS = 10000;

/**
 * Check whether Auth0 SSO is fully configured.
 *
 * @returns true if all required Auth0 environment variables are set
 */
export function isAuth0Configured(): boolean {
  return !!(
    env.AUTH0_DOMAIN &&
    env.AUTH0_CLIENT_ID &&
    env.AUTH0_CLIENT_SECRET &&
    env.AUTH0_CALLBACK_URL
  );
}

/**
 * Build the Auth0 authorization URL for initiating the SSO flow.
 *
 * @param state - CSRF state token
 * @param connection - Optional Auth0 connection name (e.g. 'google-oauth2', 'samlp')
 * @returns Full authorization URL to redirect the user to
 */
export function getAuth0AuthorizeUrl(state: string, connection?: string): string {
  const clientId = env.AUTH0_CLIENT_ID ?? '';
  const redirectUri = env.AUTH0_CALLBACK_URL ?? '';
  const domain = env.AUTH0_DOMAIN ?? '';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
  });

  if (connection) {
    params.set('connection', connection);
  }

  return `https://${domain}/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for Auth0 tokens.
 *
 * @param code - Authorization code from the Auth0 callback
 * @returns Token response containing access_token and id_token
 * @throws Error if the token exchange fails
 */
export async function exchangeAuth0Code(code: string): Promise<Auth0TokenResponse> {
  const domain = env.AUTH0_DOMAIN ?? '';
  const response = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: env.AUTH0_CLIENT_ID,
      client_secret: env.AUTH0_CLIENT_SECRET,
      code,
      redirect_uri: env.AUTH0_CALLBACK_URL,
    }),
    signal: AbortSignal.timeout(AUTH0_API_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ error, status: response.status }, 'Auth0 token exchange failed');
    throw new Error('Failed to exchange Auth0 authorization code');
  }

  return response.json() as Promise<Auth0TokenResponse>;
}

/**
 * Fetch user profile information from Auth0 using an access token.
 *
 * @param accessToken - Auth0 access token
 * @returns User profile information
 * @throws Error if the request fails
 */
export async function getAuth0UserInfo(accessToken: string): Promise<Auth0UserInfo> {
  const domain = env.AUTH0_DOMAIN ?? '';
  const response = await fetch(`https://${domain}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(AUTH0_API_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ error, status: response.status }, 'Auth0 userinfo request failed');
    throw new Error('Failed to get Auth0 user info');
  }

  return response.json() as Promise<Auth0UserInfo>;
}
