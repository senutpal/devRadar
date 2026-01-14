/**
 * Razorpay webhook handler for subscription lifecycle events.
 *
 * Handles webhook events from Razorpay for subscription activation,
 * cancellation, payment failures, and other subscription events.
 */

import { logger } from '@/lib/logger';
import { getDb } from '@/services/db';
import { verifyWebhookSignature } from '@/services/razorpay';

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: { id: string; entity: Record<string, unknown> };
    payment?: { id: string; entity: Record<string, unknown> };
    invoice?: { id: string; entity: Record<string, unknown> };
  };
  entity: string;
  account_id: string;
  created_at: number;
}

export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw new Error('Invalid webhook signature');
  }

  const payload = JSON.parse(rawBody.toString()) as RazorpayWebhookPayload;
  const { event } = payload;

  logger.info({ event }, 'Received Razorpay webhook');

  const db = getDb();

  switch (event) {
    case 'subscription.activated':
      await handleSubscriptionActivated(db, payload.payload.subscription?.entity);
      break;

    case 'subscription.cancelled':
      await handleSubscriptionCancelled(db, payload.payload.subscription?.entity);
      break;

    case 'subscription.completed':
      await handleSubscriptionCompleted(db, payload.payload.subscription?.entity);
      break;

    case 'subscription.paused':
      handleSubscriptionPaused(db, payload.payload.subscription?.entity);
      break;

    case 'subscription.resumed':
      handleSubscriptionResumed(db, payload.payload.subscription?.entity);
      break;

    case 'subscription.pending':
      handleSubscriptionPending(db, payload.payload.subscription?.entity);
      break;

    case 'payment.succeeded':
      handlePaymentSucceeded(db, payload.payload.payment?.entity);
      break;

    case 'payment.failed':
      handlePaymentFailed(db, payload.payload.payment?.entity);
      break;

    case 'invoice.paid':
      await handleInvoicePaid(db, payload.payload.invoice?.entity);
      break;

    case 'invoice.payment_failed':
      handleInvoicePaymentFailed(db, payload.payload.invoice?.entity);
      break;

    default:
      logger.debug({ event }, 'Unhandled Razorpay event');
  }
}

async function handleSubscriptionActivated(
  db: ReturnType<typeof getDb>,
  subscription: Record<string, unknown> | undefined
): Promise<void> {
  if (!subscription) {
    logger.warn('No subscription data in webhook');
    return;
  }

  const subscriptionId = subscription.id as string;
  const notes = subscription.notes as Record<string, string> | undefined;
  const userId = notes?.userId;
  const tier = notes?.tier as 'PRO' | 'TEAM' | undefined;
  const currentEnd = subscription.current_end as number;

  if (!userId) {
    logger.warn({ subscriptionId }, 'No userId in subscription notes');
    return;
  }

  await db.user.update({
    where: { id: userId },
    data: {
      tier: tier ?? 'PRO',
      razorpaySubscriptionId: subscriptionId,
      razorpayCurrentPeriodEnd: new Date(currentEnd * 1000),
    },
  });

  logger.info({ userId, subscriptionId, tier }, 'Subscription activated via webhook');
}

async function handleSubscriptionCancelled(
  db: ReturnType<typeof getDb>,
  subscription: Record<string, unknown> | undefined
): Promise<void> {
  if (!subscription) {
    logger.warn('No subscription data in webhook');
    return;
  }

  const subscriptionId = subscription.id as string;
  const endAt = subscription.end_at as number | null;

  const user = await db.user.findFirst({
    where: { razorpaySubscriptionId: subscriptionId },
  });

  if (!user) {
    logger.warn({ subscriptionId }, 'No user found for subscription cancellation');
    return;
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      tier: 'FREE',
      razorpaySubscriptionId: null,
      razorpayCurrentPeriodEnd: endAt ? new Date(endAt * 1000) : null,
    },
  });

  logger.info({ userId: user.id, subscriptionId }, 'Subscription cancelled via webhook');
}

async function handleSubscriptionCompleted(
  db: ReturnType<typeof getDb>,
  subscription: Record<string, unknown> | undefined
): Promise<void> {
  if (!subscription) {
    logger.warn('No subscription data in webhook');
    return;
  }

  const subscriptionId = subscription.id as string;

  const user = await db.user.findFirst({
    where: { razorpaySubscriptionId: subscriptionId },
  });

  if (!user) {
    logger.warn({ subscriptionId }, 'No user found for completed subscription');
    return;
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      tier: 'FREE',
      razorpaySubscriptionId: null,
      razorpayCurrentPeriodEnd: null,
    },
  });

  logger.info({ userId: user.id, subscriptionId }, 'Subscription completed via webhook');
}

function handleSubscriptionPaused(
  _db: ReturnType<typeof getDb>,
  subscription: Record<string, unknown> | undefined
): void {
  if (!subscription) {
    logger.warn('No subscription data in webhook');
    return;
  }

  const subscriptionId = subscription.id as string;
  const pausedAt = subscription.paused_at as number | undefined;

  logger.info({ subscriptionId, pausedAt }, 'Subscription paused');
}

function handleSubscriptionResumed(
  _db: ReturnType<typeof getDb>,
  subscription: Record<string, unknown> | undefined
): void {
  if (!subscription) {
    logger.warn('No subscription data in webhook');
    return;
  }

  const subscriptionId = subscription.id as string;
  const currentEnd = subscription.current_end as number;

  logger.info({ subscriptionId, currentEnd }, 'Subscription resumed');
}

function handleSubscriptionPending(
  _db: ReturnType<typeof getDb>,
  subscription: Record<string, unknown> | undefined
): void {
  if (!subscription) {
    logger.warn('No subscription data in webhook');
    return;
  }

  const subscriptionId = subscription.id as string;

  logger.info({ subscriptionId }, 'Subscription is pending');
}

function handlePaymentSucceeded(
  _db: ReturnType<typeof getDb>,
  payment: Record<string, unknown> | undefined
): void {
  if (!payment) {
    logger.warn('No payment data in webhook');
    return;
  }

  const paymentId = payment.id as string;
  const amount = payment.amount as number;
  const currency = payment.currency as string;

  logger.info({ paymentId, amount, currency }, 'Payment succeeded');
}

function handlePaymentFailed(
  _db: ReturnType<typeof getDb>,
  payment: Record<string, unknown> | undefined
): void {
  if (!payment) {
    logger.warn('No payment data in webhook');
    return;
  }

  const paymentId = payment.id as string;
  const amount = payment.amount as number;
  const errorCode = payment.error_code as string | undefined;
  const errorDescription = payment.error_description as string | undefined;

  logger.warn({ paymentId, amount, errorCode, errorDescription }, 'Payment failed');
}

async function handleInvoicePaid(
  db: ReturnType<typeof getDb>,
  invoice: Record<string, unknown> | undefined
): Promise<void> {
  if (!invoice) {
    logger.warn('No invoice data in webhook');
    return;
  }

  const invoiceId = invoice.id as string;
  const amount = invoice.amount as number;
  const subscriptionId = invoice.subscription_id as string | undefined;

  logger.info({ invoiceId, amount, subscriptionId }, 'Invoice paid');

  if (subscriptionId) {
    const subscription = await db.user.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
    });

    if (subscription) {
      logger.info({ userId: subscription.id, invoiceId }, 'Invoice paid for subscription');
    }
  }
}

function handleInvoicePaymentFailed(
  _db: ReturnType<typeof getDb>,
  invoice: Record<string, unknown> | undefined
): void {
  if (!invoice) {
    logger.warn('No invoice data in webhook');
    return;
  }

  const invoiceId = invoice.id as string;
  const amount = invoice.amount as number;
  const subscriptionId = invoice.subscription_id as string | undefined;

  logger.warn({ invoiceId, amount, subscriptionId }, 'Invoice payment failed');
}
