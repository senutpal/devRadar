/**
 * Feature Gating Service
 *
 * Client-side feature access control for the VS Code extension.
 * Checks user tier and prompts for upgrade when accessing gated features.
 */

import {
  type Feature,
  type SubscriptionTier,
  SUBSCRIPTION_FEATURES,
  FEATURE_DESCRIPTIONS,
} from '@devradar/shared';
import * as vscode from 'vscode';

import type { AuthService } from './authService';
import type { Logger } from '../utils/logger';
import type { ConfigManager } from '../utils/configManager';

const FEATURE_TIER_MAP: Record<Feature, SubscriptionTier> = {
  presence: 'FREE',
  friends: 'FREE',
  globalLeaderboard: 'FREE',
  friendsLeaderboard: 'FREE',
  streaks: 'FREE',
  achievements: 'FREE',
  poke: 'FREE',
  privacyMode: 'FREE',
  unlimitedFriends: 'PRO',
  ghostMode: 'PRO',
  customStatus: 'PRO',
  history30d: 'PRO',
  themes: 'PRO',
  customEmoji: 'PRO',
  prioritySupport: 'PRO',
  conflictRadar: 'TEAM',
  teamCreation: 'TEAM',
  teamAnalytics: 'TEAM',
  slackIntegration: 'TEAM',
  privateLeaderboards: 'TEAM',
  adminControls: 'TEAM',
  ssoSaml: 'TEAM',
  dedicatedSupport: 'TEAM',
} as const;

/** Manages feature access control and upgrade prompts. */
export class FeatureGatingService implements vscode.Disposable {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: Logger,
    private readonly configManager: ConfigManager
  ) {}

  /**
   * Checks if the current user has access to a feature.
   * @param feature - The feature to check access for
   * @returns true if the user has access
   */
  hasAccess(feature: Feature): boolean {
    const user = this.authService.getUser();
    if (!user) {
      return false;
    }

    // Defensive: ensure tier is valid, default to FREE if not
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime value might differ from type
    const tier = (user.tier ?? 'FREE') as SubscriptionTier;
    return SUBSCRIPTION_FEATURES[tier].includes(feature);
  }

  /**
   * Gets the minimum tier required for a feature.
   * @param feature - The feature to check
   * @returns The minimum tier required
   */
  getRequiredTier(feature: Feature): SubscriptionTier {
    return FEATURE_TIER_MAP[feature];
  }

  /**
   * Gets the user's current tier.
   * @returns The user's tier or 'FREE' if not authenticated
   */
  getCurrentTier(): SubscriptionTier {
    const user = this.authService.getUser();
    return (user?.tier ?? 'FREE') as SubscriptionTier;
  }

  /**
   * Prompts the user to upgrade if they don't have access to a feature.
   * Opens the billing page in the browser with upgrade parameters.
   *
   * @param feature - The feature requiring upgrade
   * @returns true if the user has access, false if they need to upgrade
   */
  async promptUpgrade(feature: Feature): Promise<boolean> {
    if (this.hasAccess(feature)) {
      return true;
    }

    const requiredTier = this.getRequiredTier(feature);
    const featureDescription = FEATURE_DESCRIPTIONS[feature];

    const action = await vscode.window.showWarningMessage(
      `DevRadar: "${featureDescription}" requires ${requiredTier} tier.`,
      'Upgrade Now',
      'Maybe Later'
    );

    if (action === 'Upgrade Now') {
      const webAppUrl = this.getWebAppUrl();
      const upgradeUrl = `${webAppUrl}/dashboard/billing?upgrade=${requiredTier}&feature=${feature}`;

      await vscode.env.openExternal(vscode.Uri.parse(upgradeUrl));
      this.logger.info('Opened upgrade page', { feature, requiredTier });
    }

    return false;
  }

  /**
   * Gets the upgrade URL for a specific tier.
   * @param tier - The target tier
   * @returns The full upgrade URL
   */
  getUpgradeUrl(tier: SubscriptionTier): string {
    const webAppUrl = this.getWebAppUrl();
    return `${webAppUrl}/dashboard/billing?upgrade=${tier}`;
  }

  /**
   * Gets the web app URL from config or uses default.
   * @returns The web application URL
   */
  getWebAppUrl(): string {
    return this.configManager.get('webAppUrl') ?? 'http://localhost:3000';
  }

  dispose(): void {
    // No disposables to clean up
  }
}
