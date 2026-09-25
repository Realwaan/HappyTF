import { NextRequest, NextResponse } from 'next/server';
import { cacheDelete } from '@/lib/redis';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { user, if_version, board_id } = body;

    if (!user || !user.id || !user.name) {
      return NextResponse.json({ error: 'User info is required to claim a ticket' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();

      // 1. Fetch current ticket to verify claim eligibility & version
      const { data: existing, error: fetchErr } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !existing) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      // Check if another teammate already claimed this ticket
      if (existing.assignee_id && existing.assignee_id !== user.id) {
        return NextResponse.json(
          {
            error: `Conflict: This ticket was already claimed by another team member.`,
            current_assignee_id: existing.assignee_id,
          },
          { status: 409 }
        );
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

      // Update assignee and status
      const { data: updated, error: updateErr } = await supabase
        .from('tickets')
        .update({
          assignee_id: user.id,
          status: 'working_on_it',
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
      const effectiveBoardId = board_id || existing.board_id;
      if (effectiveBoardId) {
        await cacheDelete(`tickets:board:${effectiveBoardId}`);
      }

      // Record activity
      await supabase.from('ticket_activities').insert([
        {
          ticket_id: id,
          actor_name: user.name,
          action: `Claimed ticket (${existing.ticket_number || id}) and set status to Working on it`,
          created_at: nextUpdatedAt,
        },
      ]);

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Ticket successfully claimed by ${user.name}`,
      });
    }

    // In local / demo mode fallback
    return NextResponse.json({
      success: true,
      data: {
        id,
        assignee: { id: user.id, name: user.name, avatar: user.avatar || '' },
        status: 'Working on it',
        claimed_by: user.name,
        claimed_at: new Date().toISOString(),
      },
      message: `Ticket claimed in local session by ${user.name}`,
    });
  } catch (err: any) {
    console.error('[Ticket Claim Error]', err);
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
}
