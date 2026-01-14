/**
 * Razorpay billing service for subscription management.
 */

import crypto from 'crypto';

import { env } from '@/config';
import { ValidationError, InternalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getDb } from '@/services/db';

export interface UserForBilling {
  id: string;
  email: string | null;
  displayName: string | null;
  username: string;
  githubId: string;
  razorpayCustomerId: string | null;
  razorpaySubscriptionId: string | null;
}

type BillingInterval = 'monthly' | 'annual';
type SubscriptionTier = 'PRO' | 'TEAM';

interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  plans: {
    PRO: { monthly: string; annual: string };
    TEAM: { monthly: string; annual: string };
  };
  webAppUrl: string;
}

interface RazorpaySubscriptionResponse {
  id: string;
  status: string;
  current_end: number;
  current_start: number;
  end_at: number | null;
  notes: Record<string, string>;
}

let razorpayClient: Record<string, unknown> | null = null;
let razorpayConfig: RazorpayConfig | null = null;

export function isRazorpayEnabled(): boolean {
  return !!(
    env.RAZORPAY_KEY_ID &&
    env.RAZORPAY_KEY_SECRET &&
    env.RAZORPAY_WEBHOOK_SECRET &&
    env.RAZORPAY_PRO_MONTHLY_PLAN_ID &&
    env.RAZORPAY_PRO_ANNUAL_PLAN_ID &&
    env.RAZORPAY_TEAM_MONTHLY_PLAN_ID &&
    env.RAZORPAY_TEAM_ANNUAL_PLAN_ID &&
    env.WEB_APP_URL
  );
}

async function getClient(): Promise<Record<string, unknown>> {
  if (!isRazorpayEnabled()) {
    throw new InternalError('Razorpay billing is not configured');
  }

  if (!razorpayClient) {
    const Razorpay = (await import('razorpay')).default;
    razorpayClient = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    }) as unknown as Record<string, unknown>;
  }

  return razorpayClient;
}

function getConfig(): RazorpayConfig {
  if (!razorpayConfig) {
    if (!isRazorpayEnabled()) {
      throw new InternalError('Razorpay billing is not configured');
    }

    razorpayConfig = {
      keyId: env.RAZORPAY_KEY_ID,
      keySecret: env.RAZORPAY_KEY_SECRET,
      webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
      plans: {
        PRO: {
          monthly: env.RAZORPAY_PRO_MONTHLY_PLAN_ID,
          annual: env.RAZORPAY_PRO_ANNUAL_PLAN_ID,
        },
        TEAM: {
          monthly: env.RAZORPAY_TEAM_MONTHLY_PLAN_ID,
          annual: env.RAZORPAY_TEAM_ANNUAL_PLAN_ID,
        },
      },
      webAppUrl: env.WEB_APP_URL,
    };
  }

  return razorpayConfig;
}

export function getPlanId(tier: SubscriptionTier, interval: BillingInterval): string {
  const config = getConfig();
  return config.plans[tier][interval];
}

export async function getOrCreateCustomer(user: UserForBilling): Promise<string> {
  const client = await getClient();
  const clientCasted = client as {
    customers: {
      all: (params: {
        count: number;
        skip: number;
      }) => Promise<{ items: { id: string; email: string | undefined }[] }>;
      create: (data: Record<string, unknown>) => Promise<{ id: string }>;
    };
  };
  const db = getDb();

  if (user.razorpayCustomerId) {
    return user.razorpayCustomerId;
  }

  if (user.email) {
    const userEmail = user.email;
    try {
      const pageSize = 100;
      let skip = 0;
      let foundCustomer: { id: string; email: string | undefined } | null = null;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- intentional infinite loop with explicit break conditions
      while (true) {
        const customersList = await clientCasted.customers.all({ count: pageSize, skip });
        const matchingCustomer = customersList.items.find((c) => c.email === userEmail);

        if (matchingCustomer) {
          foundCustomer = matchingCustomer;
          break;
        }

        if (customersList.items.length < pageSize) {
          break;
        }

        skip += pageSize;
      }

      if (foundCustomer) {
        await db.user.update({
          where: { id: user.id },
          data: { razorpayCustomerId: foundCustomer.id },
        });
        logger.info(
          { userId: user.id, customerId: foundCustomer.id },
          'Found existing Razorpay customer'
        );
        return foundCustomer.id;
      }
    } catch {
      logger.warn(
        { userId: user.id, error: 'Failed to search customers' },
        'Customer search failed'
      );
    }
  }

  const customerData: Record<string, unknown> = {
    name: user.displayName ?? user.username,
    notes: {
      userId: user.id,
      githubId: user.githubId,
      username: user.username,
    },
  };
  if (user.email) {
    customerData.email = user.email;
  }

  const customer = await clientCasted.customers.create(customerData);

  await db.user.update({
    where: { id: user.id },
    data: { razorpayCustomerId: customer.id },
  });

  logger.info({ userId: user.id, customerId: customer.id }, 'Created Razorpay customer');

  return customer.id;
}

export async function createSubscription(
  userId: string,
  tier: SubscriptionTier,
  billingInterval: BillingInterval
): Promise<{ subscriptionId: string; orderId: string; keyId: string }> {
  const client = await getClient();
  const clientCasted = client as {
    subscriptions: {
      create: (
        data: Record<string, unknown>
      ) => Promise<{ id: string; notes: Record<string, unknown> }>;
    };
    orders: {
      create: (data: Record<string, unknown>) => Promise<{ id: string }>;
    };
  };
  const config = getConfig();
  const db = getDb();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ValidationError('User not found');
  }

  if (user.razorpaySubscriptionId) {
    throw new ValidationError(
      'User already has an active subscription. Please manage it from your dashboard.'
    );
  }

  const customerId = await getOrCreateCustomer({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    username: user.username,
    githubId: user.githubId,
    razorpayCustomerId: user.razorpayCustomerId,
    razorpaySubscriptionId: user.razorpaySubscriptionId,
  });

  const planId = config.plans[tier][billingInterval];

  const subscriptionData: Record<string, unknown> = {
    customer_id: customerId,
    plan_id: planId,
    total_count: billingInterval === 'annual' ? 5 : 12,
    notes: {
      userId: user.id,
      tier,
    },
  };

  const subscription = await clientCasted.subscriptions.create(subscriptionData);

  const order = await clientCasted.orders.create({
    amount: (subscription.notes.total_amount as number | undefined) ?? 0,
    currency: 'INR',
    receipt: `sub_${subscription.id}`,
  });

  await db.user.update({
    where: { id: userId },
    data: {
      razorpaySubscriptionId: subscription.id,
    },
  });

  logger.info(
    { userId, tier, billingInterval, subscriptionId: subscription.id, orderId: order.id },
    'Created Razorpay subscription'
  );

  return {
    subscriptionId: subscription.id,
    orderId: order.id,
    keyId: config.keyId,
  };
}

export async function cancelSubscription(userId: string): Promise<void> {
  const client = await getClient();
  const clientCasted = client as {
    subscriptions: {
      cancel: (id: string) => Promise<unknown>;
    };
  };
  const db = getDb();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ValidationError('User not found');
  }

  if (!user.razorpaySubscriptionId) {
    throw new ValidationError('No active subscription found');
  }

  try {
    await clientCasted.subscriptions.cancel(user.razorpaySubscriptionId);

    await db.user.update({
      where: { id: userId },
      data: {
        tier: 'FREE',
        razorpaySubscriptionId: null,
        razorpayCurrentPeriodEnd: null,
      },
    });

    logger.info(
      { userId, subscriptionId: user.razorpaySubscriptionId },
      'Cancelled Razorpay subscription'
    );
  } catch (error) {
    logger.error(
      { userId, subscriptionId: user.razorpaySubscriptionId, error },
      'Failed to cancel subscription'
    );
    throw new InternalError('Failed to cancel subscription');
  }
}

export async function pauseSubscription(userId: string): Promise<void> {
  const client = await getClient();
  const clientCasted = client as {
    subscriptions: {
      pause: (id: string) => Promise<unknown>;
    };
  };

  const db = getDb();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ValidationError('User not found');
  }

  if (!user.razorpaySubscriptionId) {
    throw new ValidationError('No active subscription found');
  }

  await clientCasted.subscriptions.pause(user.razorpaySubscriptionId);

  logger.info(
    { userId, subscriptionId: user.razorpaySubscriptionId },
    'Paused Razorpay subscription'
  );
}

export async function resumeSubscription(userId: string): Promise<void> {
  const client = await getClient();
  const clientCasted = client as {
    subscriptions: {
      resume: (id: string) => Promise<unknown>;
    };
  };

  const db = getDb();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ValidationError('User not found');
  }

  if (!user.razorpaySubscriptionId) {
    throw new ValidationError('No subscription found');
  }

  await clientCasted.subscriptions.resume(user.razorpaySubscriptionId);

  logger.info(
    { userId, subscriptionId: user.razorpaySubscriptionId },
    'Resumed Razorpay subscription'
  );
}

export async function getSubscriptionDetails(
  subscriptionId: string
): Promise<RazorpaySubscriptionResponse> {
  const client = await getClient();
  const clientCasted = client as {
    subscriptions: {
      fetch: (id: string) => Promise<{
        id: string;
        status: string;
        current_end: number;
        current_start: number;
        end_at: number | null | undefined;
        notes: Record<string, unknown>;
      }>;
    };
  };

  const subscription = await clientCasted.subscriptions.fetch(subscriptionId);

  return {
    id: subscription.id,
    status: subscription.status,
    current_end: subscription.current_end,
    current_start: subscription.current_start,
    end_at: subscription.end_at ?? null,
    notes: subscription.notes as Record<string, string>,
  };
}

export async function getCustomerSubscriptions(
  customerId: string
): Promise<RazorpaySubscriptionResponse[]> {
  const client = await getClient();
  const clientCasted = client as {
    subscriptions: {
      all: (data: Record<string, string>) => Promise<{
        items: {
          id: string;
          status: string;
          current_end: number;
          current_start: number;
          end_at: number | null | undefined;
          notes: Record<string, unknown>;
        }[];
      }>;
    };
  };

  const subscriptionsList = await clientCasted.subscriptions.all({
    customer_id: customerId,
  });

  return subscriptionsList.items.map((sub) => ({
    id: sub.id,
    status: sub.status,
    current_end: sub.current_end,
    current_start: sub.current_start,
    end_at: sub.end_at ?? null,
    notes: sub.notes as Record<string, string>,
  }));
}

export function verifyPaymentSignature(
  razorpayPaymentId: string,
  razorpaySubscriptionId: string,
  razorpaySignature: string
): boolean {
  const config = getConfig();

  const payload = `${razorpayPaymentId}|${razorpaySubscriptionId}`;
  const expectedSignature = crypto
    .createHmac('sha256', config.keySecret)
    .update(payload)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const signatureBuffer = Buffer.from(razorpaySignature, 'hex');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const config = getConfig();

  const expectedSignature = crypto
    .createHmac('sha256', config.webhookSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
