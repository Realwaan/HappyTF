import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cacheDelete, checkRateLimit } from '@/lib/redis';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { addServerMessage } from '@/lib/serverChannelsStore';
import { updateServerBoardItem, deleteServerBoardItem } from '@/lib/serverTicketsStore';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TicketPatchSchema = z.object({
  updates: z.record(z.any()).refine((obj) => Object.keys(obj).length > 0, {
    message: 'updates must contain at least one field',
  }),
  if_version: z.number().int().optional(),
  actor_name: z.string().max(100).optional(),
  board_id: z.string().optional(),
  workspace_id: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
  }

  // 1. Rate limiting on ticket mutations
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
  const rateLimit = await checkRateLimit(`ratelimit:ticket_patch:${ip}`, 60, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many updates. Please wait.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSeconds) } }
    );
  }

  try {
    const rawBody = await request.json();
    const parseResult = TicketPatchSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid update payload', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { updates, if_version, actor_name, board_id, workspace_id } = parseResult.data;

    // Always update in server store for instant multi-session sync
    const updatedServerItem = updateServerBoardItem(id, updates);

    // Invalidate board cache
    if (board_id) {
      await cacheDelete(`tickets:board:${board_id}`);
    }

    const isUuid = UUID_REGEX.test(id);
    if (isSupabaseConfigured() && isUuid) {
      try {
        const supabase = createClient();
        const { data: existing } = await supabase
          .from('tickets')
          .select('*')
          .eq('id', id)
          .single();

        if (existing) {
          // IDOR protection: verify caller workspace matches target ticket workspace
          if (workspace_id && existing.workspace_id && existing.workspace_id !== workspace_id) {
            return NextResponse.json(
              { error: 'Forbidden: Ticket does not belong to specified workspace' },
              { status: 403 }
            );
          }

          const nextVersion = (existing.version || 1) + 1;
          const nextUpdatedAt = new Date().toISOString();

          await supabase
            .from('tickets')
            .update({
              ...updates,
              version: nextVersion,
              updated_at: nextUpdatedAt,
            })
            .eq('id', id);

          // If status changed, post internal channel notification to #eng-prod-alerts
          if (updates.status && updates.status !== existing.status) {
            try {
              addServerMessage({
                id: `msg-alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                channel_id: 'chan-eng-alerts',
                workspace_id: existing.workspace_id || 'ws-demo-01',
                user_id: 'usr-bot',
                user_name: 'HappyTF Alerts Bot',
                user_avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
                content: `🔄 Ticket **#${existing.ticket_number || id}** moved from **${existing.status}** ➔ **${updates.status}** by **${actor_name || 'Team Member'}**`,
                linked_ticket_number: existing.ticket_number || undefined,
                reactions: [{ emoji: '🚀', count: 1, users: [actor_name || 'Team Member'] }],
                reply_count: 0,
                created_at: new Date().toISOString(),
              });
            } catch (e) {
              console.warn('[Internal Channel Alert Failed]', e);
            }
          }
        }
      } catch (err) {
        console.warn('[Supabase Ticket Update Error]', err);
      }
    } else if (updates.status && updatedServerItem) {
      // Local fallback alert if Supabase is bypassed
      try {
        addServerMessage({
          id: `msg-alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          channel_id: 'chan-eng-alerts',
          workspace_id: 'ws-demo-01',
          user_id: 'usr-bot',
          user_name: 'HappyTF Alerts Bot',
          user_avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          content: `🔄 Ticket **#${updatedServerItem.ticket_number || id}** status updated to **${updates.status}** by **${actor_name || 'Team Member'}**`,
          linked_ticket_number: updatedServerItem.ticket_number || undefined,
          reactions: [{ emoji: '🚀', count: 1, users: [actor_name || 'Team Member'] }],
          reply_count: 0,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[Internal Channel Alert Failed]', e);
      }
    }

    return NextResponse.json({
      data: updatedServerItem || { id, ...updates, version: (if_version || 1) + 1, updated_at: new Date().toISOString() },
      success: true,
    });
  } catch (error) {
    console.error('[API Tickets PATCH]', error);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
  }

  // Rate limiting on ticket deletion
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
  const rateLimit = await checkRateLimit(`ratelimit:ticket_delete:${ip}`, 30, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many delete requests. Please wait.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSeconds) } }
    );
  }

  // Remove from server store
  deleteServerBoardItem(id);

  const isUuid = UUID_REGEX.test(id);
  if (isSupabaseConfigured() && isUuid) {
    try {
      const supabase = createClient();
      await supabase.from('tickets').delete().eq('id', id);
    } catch (err) {
      console.warn('[Supabase Ticket Delete Error]', err);
    }
  }

  return NextResponse.json({ success: true });
}
