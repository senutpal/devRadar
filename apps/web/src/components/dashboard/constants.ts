import type { RoleType } from '@/lib/api';

export const roleBadgeColors: Record<RoleType, string> = {
  OWNER: 'border-primary text-primary',
  ADMIN: 'border-foreground/40 text-foreground',
  MEMBER: 'border-border text-muted-foreground',
};
