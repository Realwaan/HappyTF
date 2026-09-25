import { NextRequest, NextResponse } from 'next/server';
import { checkAndSetIdempotencyKey } from '@/lib/redis';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // 1. Handle Slack Interactive Actions (application/x-www-form-urlencoded with 'payload' parameter)
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const rawPayload = formData.get('payload');
      if (!rawPayload || typeof rawPayload !== 'string') {
        return NextResponse.json({ error: 'Missing payload parameter' }, { status: 400 });
      }

      const payload = JSON.parse(rawPayload);
      const action = payload.actions?.[0];
      if (!action) {
        return NextResponse.json({ ok: true });
      }

      let parsedValue: { action: string; ticketId: string } | null = null;
      try {
        parsedValue = JSON.parse(action.value);
      } catch {
        // Fallback parsing
        const parts = (action.action_id || '').split('_');
        if (parts.length >= 2) {
          parsedValue = { action: parts[0], ticketId: parts.slice(1).join('_') };
        }
      }

      if (parsedValue) {
        const userName = payload.user?.name || payload.user?.username || 'Slack User';
        const { action: actionType, ticketId } = parsedValue;

        // Deduplicate using action trigger ID or timestamp
        const actionIdempotencyKey = `slack_act_${payload.trigger_id || action.action_ts}`;
        const isNew = await checkAndSetIdempotencyKey(actionIdempotencyKey, 300);
        if (!isNew) {
          return NextResponse.json({ ok: true });
        }

        if (isSupabaseConfigured()) {
          const supabase = createClient();
          if (actionType === 'claim') {
            await supabase
              .from('tickets')
              .update({
                status: 'working_on_it',
                updated_at: new Date().toISOString(),
              })
              .eq('id', ticketId);

            await supabase.from('ticket_activities').insert([
              {
                ticket_id: ticketId,
                actor_name: `@${userName}`,
                action: 'Claimed ticket from Slack',
                created_at: new Date().toISOString(),
              },
            ]);
          } else if (actionType === 'done') {
            await supabase
              .from('tickets')
              .update({
                status: 'done',
                resolved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', ticketId);

            await supabase.from('ticket_activities').insert([
              {
                ticket_id: ticketId,
                actor_name: `@${userName}`,
                action: 'Marked ticket Done from Slack',
                created_at: new Date().toISOString(),
              },
            ]);
          }
        }

        return NextResponse.json({
          response_type: 'in_channel',
          replace_original: false,
          text: `⚡ *@${userName}* ${actionType === 'claim' ? 'claimed' : 'resolved'} this ticket via Slack!`,
        });
      }

      return NextResponse.json({ ok: true });
    }

    // 2. Handle Slack JSON Events (Events API & Challenges)
    const body = await request.json();

    // Challenge handshake
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Idempotency check on event_id
    if (body.event_id) {
      const isNew = await checkAndSetIdempotencyKey(`slack_event_${body.event_id}`, 600);
      if (!isNew) {
        return NextResponse.json({ ok: true, notice: 'Event already processed' });
      }
    }

    // Slack slash command / mentions handling
    if (body.event?.type === 'app_mention') {
      console.log('[Slack App Mention]', body.event.text);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Slack Webhook Error]', error);
    return NextResponse.json({ error: 'Failed to process Slack webhook' }, { status: 500 });
  }
}
