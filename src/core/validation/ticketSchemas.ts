/**
 * Zod v2 Validation Gate: Ticket & Concurrency Schemas
 * Enforces strict input validation, data sanitization, and OCC token constraints.
 */

import { z } from 'zod';

export const TicketStatusEnum = z.enum([
  'Pending',
  'Working on it',
  'In Review',
  'Stuck',
  'Done',
]);

export const TicketPriorityEnum = z.enum(['urgent', 'high', 'medium', 'low']);
export const TicketSeverityEnum = z.enum(['critical', 'major', 'minor', 'cosmetic']);

export const CreateTicketSchema = z.object({
  board_id: z.string().min(1, 'board_id is required'),
  group_id: z.string().optional().default('group-1'),
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(250, 'Title cannot exceed 250 characters'),
  status: TicketStatusEnum.optional().default('Pending'),
  status_color: z.string().optional().default('#c4c4c4'),
  priority: TicketPriorityEnum.optional().default('medium'),
  severity: TicketSeverityEnum.optional().default('minor'),
  due_date: z.string().optional(),
  sla_due_at: z.string().optional(),
  tags: z.array(z.string().max(40)).optional().default([]),
  description: z.string().max(5000).optional(),
  assignee: z
    .object({
      id: z.string(),
      name: z.string(),
      avatar: z.string().url().or(z.string().startsWith('/')),
    })
    .optional(),
  external_source: z.enum(['web', 'discord', 'slack', 'monday', 'email']).optional().default('web'),
});

export const UpdateTicketSchema = z.object({
  id: z.string().min(1, 'Ticket ID is required'),
  expectedVersion: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(250).optional(),
  status: TicketStatusEnum.optional(),
  status_color: z.string().optional(),
  priority: TicketPriorityEnum.optional(),
  severity: TicketSeverityEnum.optional(),
  group_id: z.string().optional(),
  due_date: z.string().optional(),
  sla_due_at: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().max(5000).optional(),
  assignee: z
    .object({
      id: z.string(),
      name: z.string(),
      avatar: z.string(),
    })
    .nullable()
    .optional(),
});

export const AddCommentSchema = z.object({
  ticketId: z.string().min(1, 'ticketId is required'),
  author_name: z.string().min(1).max(100),
  author_avatar: z.string().optional().default('/default-avatar.png'),
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment exceeds maximum character limit'),
});

export const ClaimTicketSchema = z.object({
  ticketId: z.string().min(1, 'ticketId is required'),
  userId: z.string().min(1, 'userId is required'),
  userName: z.string().min(1, 'userName is required'),
  userAvatar: z.string().optional().default('/default-avatar.png'),
  expectedVersion: z.number().int().positive().optional(),
});
