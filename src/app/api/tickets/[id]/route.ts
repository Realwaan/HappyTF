import { NextRequest, NextResponse } from 'next/server';
import { cacheDelete } from '@/lib/redis';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { addServerMessage } from '@/lib/serverChannelsStore';
import { updateServerBoardItem, deleteServerBoardItem } from '@/lib/serverTicketsStore';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { updates, if_version, actor_name, board_id } = body;

    if (!updates) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
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
