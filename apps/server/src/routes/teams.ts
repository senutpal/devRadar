/**
 * Team Management Routes
 *
 * CRUD operations for teams and team membership.
 * Premium feature for TEAM tier users.
 */

import crypto from 'crypto';

import { PaginationQuerySchema } from '@devradar/shared';
import { z } from 'zod';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { env } from '@/config';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
  AuthenticationError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getDb } from '@/services/db';

/* ============================================================================
 * Validation Schemas
 * ============================================================================ */

const TeamIdParamsSchema = z.object({
  id: z.string().min(1, 'Team ID is required'),
});

const MemberIdParamsSchema = z.object({
  id: z.string().min(1, 'Team ID is required'),
  userId: z.string().min(1, 'User ID is required'),
});

const CreateTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(50),
  slug: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
});

const UpdateTeamSchema = z.object({
  name: z.string().min(2).max(50).optional(),
});

const InviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

const UpdateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

const JoinTeamSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
});

/* ============================================================================
 * Helper Functions
 * ============================================================================ */

/** Generates a cryptographically secure invitation token. */
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Checks if user has permission to manage team (owner or admin). */
async function checkTeamAdmin(
  db: ReturnType<typeof getDb>,
  teamId: string,
  userId: string
): Promise<{ isOwner: boolean; isAdmin: boolean }> {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { ownerId: true },
  });

  if (!team) {
    throw new NotFoundError('Team', teamId);
  }

  const isOwner = team.ownerId === userId;
  if (isOwner) {
    return { isOwner: true, isAdmin: true };
  }

  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true },
  });

  if (!membership) {
    throw new ForbiddenError('You are not a member of this team');
  }

  const isAdmin = membership.role === 'ADMIN' || membership.role === 'OWNER';
  return { isOwner, isAdmin };
}

/** Checks if user is a member of the team. */
async function checkTeamMember(
  db: ReturnType<typeof getDb>,
  teamId: string,
  userId: string
): Promise<void> {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { ownerId: true },
  });

  if (!team) {
    throw new NotFoundError('Team', teamId);
  }

  if (team.ownerId === userId) {
    return; // Owner is always a member
  }

  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });

  if (!membership) {
    throw new ForbiddenError('You are not a member of this team');
  }
}

/* ============================================================================
 * Route Handlers
 * ============================================================================ */

/** Registers team routes on the Fastify instance. */
export function teamRoutes(app: FastifyInstance): void {
  const db = getDb();

  // GET /me - List user's teams
  app.get('/me', { onRequest: [app.authenticate] }, async (request: FastifyRequest, reply) => {
    const { userId } = request.user as { userId: string };

    const paginationResult = PaginationQuerySchema.safeParse(request.query);
    const { page, limit } = paginationResult.success
      ? paginationResult.data
      : { page: 1, limit: 20 };

    const skip = (page - 1) * limit;

    // Get all teams where user is owner or member (fetch all to handle deduping/sorting correctly)
    const [ownedTeams, memberships] = await Promise.all([
      db.team.findMany({
        where: { ownerId: userId },
        include: {
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.teamMember.findMany({
        where: { userId },
        include: {
          team: {
            include: {
              _count: { select: { members: true } },
            },
          },
        },
      }),
    ]);

    // Merge and dedupe
    interface MergedTeam {
      id: string;
      name: string;
      slug: string;
      role: 'OWNER' | 'ADMIN' | 'MEMBER';
      memberCount: number;
      createdAt: Date;
    }
    const teamMap = new Map<string, MergedTeam>();

    ownedTeams.forEach((t) => {
      teamMap.set(t.id, {
        id: t.id,
        name: t.name,
        slug: t.slug,
        role: 'OWNER' as const,
        memberCount: t._count.members + 1,
        createdAt: new Date(t.createdAt),
      });
    });

    memberships.forEach((m) => {
      // Owner role takes precedence if present in both lists
      if (!teamMap.has(m.team.id) || teamMap.get(m.team.id)?.role !== 'OWNER') {
        teamMap.set(m.team.id, {
          id: m.team.id,
          name: m.team.name,
          slug: m.team.slug,
          role: m.role,
          memberCount: m.team._count.members + 1,
          createdAt: new Date(m.joinedAt),
        });
      }
    });

    const allTeams = Array.from(teamMap.values());

    // Sort by createdAt desc
    allTeams.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination in memory
    const total = allTeams.length;
    const paginatedTeams = allTeams.slice(skip, skip + limit).map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    }));

    return reply.send({
      data: paginatedTeams,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + paginatedTeams.length < total,
      },
    });
  });

  // POST / - Create new team
  app.post('/', { onRequest: [app.authenticate] }, async (request: FastifyRequest, reply) => {
    const { userId } = request.user as { userId: string };

    const bodyResult = CreateTeamSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.errors[0]?.message ?? 'Invalid input');
    }

    const { name, slug } = bodyResult.data;

    // Check user's tier (only TEAM tier can create teams)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.tier !== 'TEAM') {
      throw new ForbiddenError('Team creation requires TEAM tier subscription');
    }

    // Check if slug is already taken
    const existingTeam = await db.team.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingTeam) {
      throw new ConflictError(`Team slug "${slug}" is already taken`);
    }

    // Create team with owner
    const team = await db.team.create({
      data: {
        name,
        slug,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    logger.info({ teamId: team.id, ownerId: userId, slug }, 'Team created');

    return reply.status(201).send({
      data: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        owner: team.owner,
        createdAt: team.createdAt.toISOString(),
      },
    });
  });

  // GET /:id - Get team details
  app.get(
    '/:id',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsResult = TeamIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid team ID');
      }

      const { id: teamId } = paramsResult.data;

      // Check membership
      await checkTeamMember(db, teamId, userId);

      const team = await db.team.findUnique({
        where: { id: teamId },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: { joinedAt: 'asc' },
          },
          _count: {
            select: { invitations: true },
          },
        },
      });

      if (!team) {
        throw new NotFoundError('Team', teamId);
      }

      return reply.send({
        data: {
          id: team.id,
          name: team.name,
          slug: team.slug,
          tier: team.tier,
          owner: team.owner,
          members: team.members.map((m) => ({
            ...m.user,
            role: m.role,
            joinedAt: m.joinedAt.toISOString(),
          })),
          pendingInvitations: team._count.invitations,
          createdAt: team.createdAt.toISOString(),
          updatedAt: team.updatedAt.toISOString(),
        },
      });
    }
  );

  // PATCH /:id - Update team
  app.patch(
    '/:id',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsResult = TeamIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid team ID');
      }

      const bodyResult = UpdateTeamSchema.safeParse(request.body);
      if (!bodyResult.success) {
        throw new ValidationError(bodyResult.error.errors[0]?.message ?? 'Invalid input');
      }

      const { id: teamId } = paramsResult.data;
      const updates = bodyResult.data;

      // Only owner or admin can update team
      const { isAdmin } = await checkTeamAdmin(db, teamId, userId);
      if (!isAdmin) {
        throw new ForbiddenError('Only team owner or admin can update team settings');
      }

      const team = await db.team.update({
        where: { id: teamId },
        data: updates.name ? { name: updates.name } : {},
      });

      logger.info({ teamId, userId, updates }, 'Team updated');

      return reply.send({
        data: {
          id: team.id,
          name: team.name,
          slug: team.slug,
          updatedAt: team.updatedAt.toISOString(),
        },
      });
    }
  );

  // DELETE /:id - Delete team
  app.delete(
    '/:id',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsResult = TeamIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid team ID');
      }

      const { id: teamId } = paramsResult.data;

      // Only owner can delete team
      const { isOwner } = await checkTeamAdmin(db, teamId, userId);
      if (!isOwner) {
        throw new ForbiddenError('Only team owner can delete the team');
      }

      await db.team.delete({
        where: { id: teamId },
      });

      logger.info({ teamId, userId }, 'Team deleted');

      return reply.status(204).send();
    }
  );

  // POST /:id/invite - Invite member
  app.post(
    '/:id/invite',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsResult = TeamIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid team ID');
      }

      const bodyResult = InviteMemberSchema.safeParse(request.body);
      if (!bodyResult.success) {
        throw new ValidationError(bodyResult.error.errors[0]?.message ?? 'Invalid input');
      }

      const { id: teamId } = paramsResult.data;
      const { email, role } = bodyResult.data;

      // Only owner or admin can invite
      const { isAdmin } = await checkTeamAdmin(db, teamId, userId);
      if (!isAdmin) {
        throw new ForbiddenError('Only team owner or admin can invite members');
      }

      // Check if user is already a member (by email)
      const existingUser = await db.user.findFirst({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        const existingMember = await db.teamMember.findUnique({
          where: { userId_teamId: { userId: existingUser.id, teamId } },
        });

        if (existingMember) {
          throw new ConflictError('User is already a team member');
        }

        // Check if user is the owner
        const team = await db.team.findUnique({
          where: { id: teamId },
          select: { ownerId: true },
        });

        if (team?.ownerId === existingUser.id) {
          throw new ConflictError('User is the team owner');
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await db.teamInvitation.findFirst({
        where: {
          teamId,
          email,
          status: 'PENDING',
        },
      });

      if (existingInvitation) {
        throw new ConflictError('An invitation has already been sent to this email');
      }

      // Create invitation (expires in 7 days)
      const token = generateInvitationToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitation = await db.teamInvitation.create({
        data: {
          teamId,
          email,
          role,
          token,
          expiresAt,
          inviterId: userId,
        },
        include: {
          team: { select: { name: true, slug: true } },
          inviter: { select: { username: true, displayName: true } },
        },
      });

      logger.info({ teamId, email, inviterId: userId }, 'Team invitation created');

      // TODO: Send invitation email with token

      return reply.status(201).send({
        data: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          teamName: invitation.team.name,
          invitedBy: invitation.inviter.displayName ?? invitation.inviter.username,
          expiresAt: invitation.expiresAt.toISOString(),
          // Include token only for development/testing
          token: env.NODE_ENV !== 'production' ? invitation.token : undefined,
        },
      });
    }
  );

  // POST /:id/join - Accept invitation
  app.post(
    '/:id/join',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsResult = TeamIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid team ID');
      }

      const bodyResult = JoinTeamSchema.safeParse(request.body);
      if (!bodyResult.success) {
        throw new ValidationError(bodyResult.error.errors[0]?.message ?? 'Invalid input');
      }

      const { id: teamId } = paramsResult.data;
      const { token } = bodyResult.data;

      // Find valid invitation
      const invitation = await db.teamInvitation.findFirst({
        where: {
          teamId,
          token,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
        include: {
          team: { select: { name: true } },
        },
      });

      if (!invitation) {
        throw new NotFoundError('Valid invitation');
      }

      // Verify email matches (or allow any authenticated user for now)
      // Note: Email verification could be added here for stricter access control

      // Check if already a member
      const existingMember = await db.teamMember.findUnique({
        where: { userId_teamId: { userId, teamId } },
      });

      if (existingMember) {
        throw new ConflictError('You are already a member of this team');
      }

      // Accept invitation in a transaction
      await db.$transaction([
        // Update invitation status
        db.teamInvitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED' },
        }),
        // Add as team member
        db.teamMember.create({
          data: {
            userId,
            teamId,
            role: invitation.role,
          },
        }),
      ]);

      logger.info({ teamId, userId, invitationId: invitation.id }, 'User joined team');

      return reply.status(201).send({
        data: {
          teamId,
          teamName: invitation.team.name,
          role: invitation.role,
          message: `Successfully joined ${invitation.team.name}`,
        },
      });
    }
  );

  // PATCH /:id/members/:userId - Update member role
  app.patch(
    '/:id/members/:userId',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId: currentUserId } = request.user as { userId: string };

      const paramsResult = MemberIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid parameters');
      }

      const bodyResult = UpdateMemberRoleSchema.safeParse(request.body);
      if (!bodyResult.success) {
        throw new ValidationError(bodyResult.error.errors[0]?.message ?? 'Invalid input');
      }

      const { id: teamId, userId: targetUserId } = paramsResult.data;
      const { role } = bodyResult.data;

      // Only owner can change roles
      const { isOwner } = await checkTeamAdmin(db, teamId, currentUserId);
      if (!isOwner) {
        throw new ForbiddenError('Only team owner can change member roles');
      }

      // Cannot change owner's role
      if (targetUserId === currentUserId) {
        throw new ConflictError('Cannot change your own role');
      }

      // Verify target is a member
      const membership = await db.teamMember.findUnique({
        where: { userId_teamId: { userId: targetUserId, teamId } },
      });

      if (!membership) {
        throw new NotFoundError('Team member', targetUserId);
      }

      // Update role
      const updated = await db.teamMember.update({
        where: { userId_teamId: { userId: targetUserId, teamId } },
        data: { role },
        include: {
          user: {
            select: { username: true, displayName: true },
          },
        },
      });

      logger.info({ teamId, targetUserId, role, updatedBy: currentUserId }, 'Member role updated');

      return reply.send({
        data: {
          userId: targetUserId,
          username: updated.user.username,
          displayName: updated.user.displayName,
          role: updated.role,
        },
      });
    }
  );

  // DELETE /:id/members/:userId - Remove member
  app.delete(
    '/:id/members/:userId',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId: currentUserId } = request.user as { userId: string };

      const paramsResult = MemberIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid parameters');
      }

      const { id: teamId, userId: targetUserId } = paramsResult.data;

      // Check permissions: owner can remove anyone, admins can remove members, users can remove themselves
      const team = await db.team.findUnique({
        where: { id: teamId },
        select: { ownerId: true },
      });

      if (!team) {
        throw new NotFoundError('Team', teamId);
      }

      const isOwner = team.ownerId === currentUserId;
      const isSelfRemoval = currentUserId === targetUserId;

      if (!isOwner && !isSelfRemoval) {
        const { isAdmin } = await checkTeamAdmin(db, teamId, currentUserId);
        if (!isAdmin) {
          throw new ForbiddenError('You do not have permission to remove members');
        }

        // Admins cannot remove other admins
        const targetMembership = await db.teamMember.findUnique({
          where: { userId_teamId: { userId: targetUserId, teamId } },
          select: { role: true },
        });

        if (targetMembership?.role === 'ADMIN') {
          throw new ForbiddenError('Admins cannot remove other admins');
        }
      }

      // Cannot remove owner
      if (targetUserId === team.ownerId) {
        throw new ConflictError('Cannot remove team owner');
      }

      // Verify target is a member
      const membership = await db.teamMember.findUnique({
        where: { userId_teamId: { userId: targetUserId, teamId } },
      });

      if (!membership) {
        throw new NotFoundError('Team member', targetUserId);
      }

      // Remove member
      await db.teamMember.delete({
        where: { userId_teamId: { userId: targetUserId, teamId } },
      });

      logger.info(
        { teamId, targetUserId, removedBy: currentUserId, isSelfRemoval },
        'Member removed from team'
      );

      return reply.status(204).send();
    }
  );

  // GET /:id/invitations - List pending invitations
  app.get(
    '/:id/invitations',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsResult = TeamIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid team ID');
      }

      const { id: teamId } = paramsResult.data;

      // Only admin can view invitations
      const { isAdmin } = await checkTeamAdmin(db, teamId, userId);
      if (!isAdmin) {
        throw new ForbiddenError('Only team owner or admin can view invitations');
      }

      const invitations = await db.teamInvitation.findMany({
        where: {
          teamId,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
        include: {
          inviter: { select: { username: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        data: invitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          invitedBy: inv.inviter.displayName ?? inv.inviter.username,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
        })),
      });
    }
  );

  // DELETE /:id/invitations/:invitationId - Revoke invitation
  app.delete(
    '/:id/invitations/:invitationId',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const paramsSchema = z.object({
        id: z.string().min(1),
        invitationId: z.string().min(1),
      });

      const paramsResult = paramsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError('Invalid parameters');
      }

      const { id: teamId, invitationId } = paramsResult.data;

      // Only admin can revoke invitations
      const { isAdmin } = await checkTeamAdmin(db, teamId, userId);
      if (!isAdmin) {
        throw new ForbiddenError('Only team owner or admin can revoke invitations');
      }

      const invitation = await db.teamInvitation.findFirst({
        where: { id: invitationId, teamId },
      });

      if (!invitation) {
        throw new NotFoundError('Invitation', invitationId);
      }

      await db.teamInvitation.update({
        where: { id: invitationId },
        data: { status: 'REVOKED' },
      });

      logger.info({ teamId, invitationId, revokedBy: userId }, 'Invitation revoked');

      return reply.status(204).send();
    }
  );
}
