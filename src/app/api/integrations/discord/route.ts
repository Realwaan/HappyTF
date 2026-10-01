import { NextRequest, NextResponse } from 'next/server';
import { getDiscordConfig, setDiscordConfig } from '@/lib/integrations/discord';
import { checkRateLimit } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') || 'ws-default';

    const config = await getDiscordConfig(workspaceId);

    // Mask sensitive bot token for safety in client responses
    const safeConfig = config ? {
      ...config,
      bot_token: config.bot_token ? `${config.bot_token.slice(0, 8)}...${config.bot_token.slice(-4)}` : '',
      has_token: Boolean(config.bot_token),
    } : null;

    return NextResponse.json({ ok: true, config: safeConfig });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Failed to fetch Discord config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = await checkRateLimit(`ratelimit:discord_config:${ip}`, 30, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
    }

    const body = await request.json();
    const { 
      workspace_id, 
      bot_token, 
      client_id, 
      public_key, 
      guild_id, 
      tickets_channel_id, 
      reminders_channel_id, 
      webhook_url, 
      is_active 
    } = body;

    if (!workspace_id) {
      return NextResponse.json({ ok: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const existing = await getDiscordConfig(workspace_id);

    const updatedConfig = {
      workspace_id,
      bot_token: bot_token && !bot_token.includes('...') ? bot_token : (existing?.bot_token || ''),
      client_id: client_id || existing?.client_id || '',
      public_key: public_key || existing?.public_key || '',
      guild_id: guild_id || existing?.guild_id || '',
      tickets_channel_id: tickets_channel_id || existing?.tickets_channel_id || '',
      reminders_channel_id: reminders_channel_id || existing?.reminders_channel_id || '',
      webhook_url: webhook_url || existing?.webhook_url || '',
      is_active: is_active ?? true,
      bot_name: 'CapStoneFlow Bot',
      updated_at: new Date().toISOString(),
    };

    await setDiscordConfig(updatedConfig);

    return NextResponse.json({ 
      ok: true, 
      message: 'Discord CapStoneFlow integration saved successfully',
      has_token: Boolean(updatedConfig.bot_token),
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Failed to save Discord config' }, { status: 500 });
  }
}
