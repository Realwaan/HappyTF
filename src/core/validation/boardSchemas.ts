/**
 * Zod v2 Validation Gate: Board & Workspace Schemas
 */

import { z } from 'zod';

export const CreateBoardSchema = z.object({
  workspace_id: z.string().min(1, 'workspace_id is required'),
  name: z.string().min(1, 'Name is required').max(100),
  icon_emoji: z.string().max(8).optional().default('📋'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional().default('#0073ea'),
  description: z.string().max(1000).optional().default(''),
  folder_id: z.string().optional(),
});

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(80),
  icon_emoji: z.string().max(8).optional().default('🚀'),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional().default('#0073ea'),
});

export const JoinBoardSchema = z.object({
  board_id: z.string().min(1, 'Board ID is required'),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).optional().default('member'),
  inviter: z.string().optional(),
});
