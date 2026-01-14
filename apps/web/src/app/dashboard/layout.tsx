import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'DevRadar Dashboard - Manage your account and view your coding activity.',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
