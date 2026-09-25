import { NextRequest, NextResponse } from 'next/server';
import { checkAndSetIdempotencyKey, cacheDelete } from '@/lib/redis';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Monday.com Webhook Handshake Verification Challenge
    if (body.challenge) {
      return NextResponse.json({ challenge: body.challenge });
    }

    const event = body.event;
    if (!event) {
      return NextResponse.json({ ok: true, notice: 'No event body' });
    }

    // 2. Idempotency Deduplication (Monday pulses and column changes)
    const eventId = `monday_${event.pulseId || event.itemId}_${event.triggerTime || Date.now()}`;
    const isNew = await checkAndSetIdempotencyKey(eventId, 300);
    if (!isNew) {
      return NextResponse.json({ ok: true, notice: 'Duplicate Monday event ignored' });
    }

    console.log('[Monday.com Event Received]', {
      type: event.type,
      pulseId: event.pulseId,
      columnTitle: event.columnTitle,
      value: event.value,
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();

      // Handle Column Status Change
      if (event.type === 'change_column_value') {
        const pulseId = String(event.pulseId);
        const columnTitle = (event.columnTitle || '').toLowerCase();

        if (columnTitle.includes('status')) {
          let newStatus = 'working_on_it';
          const label = (event.value?.label?.text || '').toLowerCase();
          if (label.includes('done')) newStatus = 'done';
          else if (label.includes('stuck') || label.includes('block')) newStatus = 'stuck';
          else if (label.includes('review')) newStatus = 'in_review';

          await supabase
            .from('tickets')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('monday_item_id', pulseId);

          await supabase.from('ticket_activities').insert([
            {
              ticket_id: pulseId,
              actor_name: 'Monday.com Sync',
              action: `Status synced to ${newStatus} from Monday board`,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      }

      // Invalidate board cache
      if (event.boardId) {
        await cacheDelete(`tickets:board:${event.boardId}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Monday Webhook Error]', error);
    return NextResponse.json({ error: 'Failed to process Monday webhook' }, { status: 500 });
  }
}
