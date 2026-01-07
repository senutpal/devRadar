import { z } from 'zod';

/*** User status schema ***/
export const UserStatusTypeSchema = z.enum(['online', 'idle', 'dnd', 'offline']);

/*** Tier schema ***/
export const TierSchema = z.enum(['FREE', 'PRO', 'TEAM']);

/*** Role schema ***/
export const RoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER']);

/*** Friend request status schema ***/
export const FriendRequestStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'REJECTED']);

/*** Message type schema ***/
export const MessageTypeSchema = z.enum([
  'STATUS_UPDATE',
  'FRIEND_STATUS',
  'POKE',
  'CONFLICT_ALERT',
  'ACHIEVEMENT',
  'ERROR',
  'HEARTBEAT',
  'PONG',
  'CONNECTED',
  'FRIEND_REQUEST_RECEIVED',
  'FRIEND_REQUEST_ACCEPTED',
]);

/*** Activity payload schema ***/
export const ActivityPayloadSchema = z.object({
  fileName: z.string().max(255).optional(),
  language: z.string().max(50).optional(),
  project: z.string().max(255).optional(),
  workspace: z.string().max(255).optional(),
  sessionDuration: z.number().int().min(0),
  intensity: z.number().int().min(0).max(100).optional(),
});

/*** User status schema ***/
export const UserStatusSchema = z.object({
  userId: z.string().min(1),
  status: UserStatusTypeSchema,
  activity: ActivityPayloadSchema.optional(),
  updatedAt: z.number().int().positive(),
});

/*** WebSocket message schema ***/
export const WebSocketMessageSchema = z.object({
  type: MessageTypeSchema,
  payload: z.unknown(),
  timestamp: z.number().int().positive(),
  correlationId: z.string().uuid().optional(),
});

/*** Poke payload schema ***/
export const PokePayloadSchema = z.object({
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  message: z.string().max(280).optional(),
});

/*** Login request schema ***/
export const LoginRequestSchema = z.object({
  code: z.string().min(1, 'GitHub authorization code is required'),
});

/*** User update schema ***/
export const UserUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  privacyMode: z.boolean().optional(),
});

/*** Pagination query schema ***/
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/*** Send friend request schema ***/
export const SendFriendRequestSchema = z.object({
  toUserId: z.string().min(1, 'User ID is required'),
});

/* Type exports from schemas */
export type ActivityPayloadInput = z.infer<typeof ActivityPayloadSchema>;
export type UserStatusInput = z.infer<typeof UserStatusSchema>;
export type WebSocketMessageInput = z.infer<typeof WebSocketMessageSchema>;
export type PokePayloadInput = z.infer<typeof PokePayloadSchema>;
export type LoginRequestInput = z.infer<typeof LoginRequestSchema>;
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;
export type PaginationQueryInput = z.infer<typeof PaginationQuerySchema>;
export type SendFriendRequestInput = z.infer<typeof SendFriendRequestSchema>;
export type FriendRequestStatusInput = z.infer<typeof FriendRequestStatusSchema>;
