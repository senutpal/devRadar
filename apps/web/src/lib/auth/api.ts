import type { User } from './auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || 'An error occurred');
  }

  return response.json();
}

export const authApi = {
  async getCurrentUser(): Promise<{ data: User }> {
    return api('/users/me');
  },

  async getBillingStatus(): Promise<{
    tier: string;
    hasSubscription: boolean;
    currentPeriodEnd: string | null;
    billingEnabled: boolean;
  }> {
    return api('/billing/status');
  },

  async createCheckout(
    tier: 'PRO' | 'TEAM',
    billingInterval: 'monthly' | 'annual'
  ): Promise<{
    subscriptionId: string;
    orderId: string;
    keyId: string;
  }> {
    return api('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ tier, billingInterval }),
    });
  },

  async getSubscription(): Promise<{
    hasSubscription: boolean;
    subscription: {
      id: string;
      status: string;
      tier: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
      endAt: string | null;
    } | null;
  }> {
    return api('/billing/subscription');
  },

  async cancelSubscription(): Promise<{ success: boolean; message: string }> {
    return api('/billing/cancel', { method: 'POST' });
  },

  async pauseSubscription(): Promise<{ success: boolean; message: string }> {
    return api('/billing/pause', { method: 'POST' });
  },

  async resumeSubscription(): Promise<{ success: boolean; message: string }> {
    return api('/billing/resume', { method: 'POST' });
  },

  async verifyPayment(
    razorpayPaymentId: string,
    razorpaySubscriptionId: string,
    razorpaySignature: string
  ): Promise<{ verified: boolean }> {
    return api('/billing/verify', {
      method: 'POST',
      body: JSON.stringify({
        razorpayPaymentId,
        razorpaySubscriptionId,
        razorpaySignature,
      }),
    });
  },
};
