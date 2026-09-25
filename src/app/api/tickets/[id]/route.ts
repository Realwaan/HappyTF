import { NextRequest, NextResponse } from 'next/server';
import { cacheDelete } from '@/lib/redis';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { dispatchSlackStatusChange } from '@/lib/integrations/slack';

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

    if (isSupabaseConfigured()) {
      const supabase = createClient();

      // 1. Fetch current ticket to verify version
      const { data: existing, error: fetchErr } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !existing) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      // Optimistic concurrency check
      if (if_version !== undefined && existing.version !== if_version) {
        return NextResponse.json(
          {
            error: 'Conflict: This ticket was modified by another session.',
            current_version: existing.version,
            expected_version: if_version,
          },
          { status: 409 }
        );
      }

      const nextVersion = (existing.version || 1) + 1;
      const nextUpdatedAt = new Date().toISOString();

      const { data: updated, error: updateErr } = await supabase
        .from('tickets')
        .update({
          ...updates,
          version: nextVersion,
          updated_at: nextUpdatedAt,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      // Invalidate board cache
      if (board_id || existing.board_id) {
        await cacheDelete(`tickets:board:${board_id || existing.board_id}`);
      }

      // Record activity
      await supabase.from('ticket_activities').insert([
        {
          ticket_id: id,
          actor_name: actor_name || 'Team Member',
          action: 'Updated ticket',
          created_at: nextUpdatedAt,
        },
      ]);

      // If status changed, notify Slack
      if (updates.status && updates.status !== existing.status) {
        dispatchSlackStatusChange({
          workspaceId: existing.workspace_id,
          ticketId: existing.id,
          ticketNumber: existing.ticket_number || id,
          title: existing.title,
          oldStatus: existing.status,
          newStatus: updates.status,
          actorName: actor_name || 'Team Member',
        }).catch((e) => console.warn('[Slack Status Dispatch Failed]', e));
      }

      return NextResponse.json({ data: updated, success: true });
    }

    // Demo / fallback mode response
    if (board_id) {
      await cacheDelete(`tickets:board:${board_id}`);
    }

    return NextResponse.json({
      data: { id, ...updates, version: (if_version || 1) + 1, updated_at: new Date().toISOString() },
      success: true,
      source: 'demo-mode',
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

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('tickets').delete().eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, source: 'demo-mode' });
}
