/**
 * Billing API routes for subscription management.
 *
 * Provides endpoints for creating subscriptions, managing subscriptions,
 * and handling Razorpay webhooks.
 */

import { z } from 'zod';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { InternalError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getDb } from '@/services/db';
import {
  isRazorpayEnabled,
  createSubscription,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  verifyPaymentSignature,
  getSubscriptionDetails,
} from '@/services/razorpay';
import { handleWebhook } from '@/services/razorpay-webhooks';

const CheckoutRequestSchema = z.object({
  tier: z.enum(['PRO', 'TEAM']),
  billingInterval: z.enum(['monthly', 'annual']),
});

const VerifyPaymentSchema = z.object({
  razorpayPaymentId: z.string(),
  razorpaySubscriptionId: z.string(),
  razorpaySignature: z.string(),
});

export function billingRoutes(app: FastifyInstance): void {
  const authenticate: typeof app.authenticate = async (request, reply) => {
    await app.authenticate(request, reply);
  };

  app.post(
    '/checkout',
    { onRequest: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isRazorpayEnabled()) {
        throw new InternalError('Billing is not configured');
      }

      const body = request.body as { tier?: string; billingInterval?: string };
      const result = CheckoutRequestSchema.safeParse(body);
      if (!result.success) {
        throw new ValidationError('Invalid request body', {
          details: result.error.flatten(),
        });
      }

      const { userId } = request.user as { userId: string };
      const { tier, billingInterval } = result.data;

      const checkoutData = await createSubscription(userId, tier, billingInterval);

      return reply.send(checkoutData);
    }
  );

  app.post(
    '/cancel',
    { onRequest: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isRazorpayEnabled()) {
        throw new InternalError('Billing is not configured');
      }

      const { userId } = request.user as { userId: string };
      await cancelSubscription(userId);

      return reply.send({ success: true, message: 'Subscription cancelled successfully' });
    }
  );

  app.post(
    '/pause',
    { onRequest: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isRazorpayEnabled()) {
        throw new InternalError('Billing is not configured');
      }

      const { userId } = request.user as { userId: string };
      await pauseSubscription(userId);

      return reply.send({ success: true, message: 'Subscription paused successfully' });
    }
  );

  app.post(
    '/resume',
    { onRequest: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isRazorpayEnabled()) {
        throw new InternalError('Billing is not configured');
      }

      const { userId } = request.user as { userId: string };
      await resumeSubscription(userId);

      return reply.send({ success: true, message: 'Subscription resumed successfully' });
    }
  );

  app.post(
    '/verify',
    { onRequest: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isRazorpayEnabled()) {
        throw new InternalError('Billing is not configured');
      }

      const body = request.body as {
        razorpayPaymentId?: string;
        razorpaySubscriptionId?: string;
        razorpaySignature?: string;
      };
      const result = VerifyPaymentSchema.safeParse(body);
      if (!result.success) {
        throw new ValidationError('Invalid request body', {
          details: result.error.flatten(),
        });
      }

      const { razorpayPaymentId, razorpaySubscriptionId, razorpaySignature } = result.data;

      const isValid = verifyPaymentSignature(
        razorpayPaymentId,
        razorpaySubscriptionId,
        razorpaySignature
      );

      if (!isValid) {
        throw new ValidationError('Invalid payment signature');
      }

      const db = getDb();
      const { userId } = request.user as { userId: string };

      const subscriptionDetails = await getSubscriptionDetails(razorpaySubscriptionId);

      await db.user.update({
        where: { id: userId },
        data: {
          tier: subscriptionDetails.notes.tier as 'PRO' | 'TEAM',
          razorpayCurrentPeriodEnd: new Date(subscriptionDetails.current_end * 1000),
        },
      });

      return reply.send({ verified: true });
    }
  );

  app.post(
    '/webhooks',
    {
      config: { rawBody: true } as Record<string, unknown>,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isRazorpayEnabled()) {
        return reply.status(503).send({ error: 'Billing not configured' });
      }

      const signature = request.headers['x-razorpay-signature'];
      if (!signature || typeof signature !== 'string') {
        return reply.status(400).send({ error: 'Missing x-razorpay-signature header' });
      }

      try {
        const rawBody = request.rawBody;
        if (!rawBody || !Buffer.isBuffer(rawBody)) {
          return await reply.status(400).send({ error: 'Missing raw body' });
        }

        await handleWebhook(rawBody, signature);

        return await reply.send({ received: true });
      } catch (error) {
        if (error instanceof Error) {
          logger.warn({ error: error.message }, 'Webhook processing failed');
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  app.get(
    '/status',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const db = getDb();

      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          tier: true,
          razorpaySubscriptionId: true,
          razorpayCurrentPeriodEnd: true,
        },
      });

      if (!user) {
        throw new ValidationError('User not found');
      }

      return reply.send({
        tier: user.tier,
        hasSubscription: !!user.razorpaySubscriptionId,
        currentPeriodEnd: user.razorpayCurrentPeriodEnd?.toISOString() ?? null,
        billingEnabled: isRazorpayEnabled(),
      });
    }
  );

  app.get(
    '/subscription',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const db = getDb();

      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          tier: true,
          razorpaySubscriptionId: true,
          razorpayCurrentPeriodEnd: true,
          razorpayCustomerId: true,
        },
      });

      if (!user) {
        throw new ValidationError('User not found');
      }

      if (!user.razorpaySubscriptionId) {
        return reply.send({
          hasSubscription: false,
          subscription: null,
        });
      }

      const subscriptionDetails = await getSubscriptionDetails(user.razorpaySubscriptionId);

      return reply.send({
        hasSubscription: true,
        subscription: {
          id: subscriptionDetails.id,
          status: subscriptionDetails.status,
          tier: subscriptionDetails.notes.tier,
          currentPeriodStart: new Date(subscriptionDetails.current_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscriptionDetails.current_end * 1000).toISOString(),
          endAt: subscriptionDetails.end_at
            ? new Date(subscriptionDetails.end_at * 1000).toISOString()
            : null,
        },
      });
    }
  );
}
