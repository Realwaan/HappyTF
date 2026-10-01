import { NextRequest, NextResponse } from 'next/server';
import { getDiscordConfig, registerDiscordSlashCommands } from '@/lib/integrations/discord';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const workspaceId = body.workspace_id || 'ws-default';

    const config = await getDiscordConfig(workspaceId);
    if (!config || !config.bot_token || !config.client_id) {
      return NextResponse.json({
        ok: false,
        error: 'Discord Bot Token and Client ID must be configured in Workspace Settings before syncing slash commands.',
      }, { status: 400 });
    }

    const result = await registerDiscordSlashCommands(
      config.bot_token,
      config.client_id,
      config.guild_id || undefined
    );

    if (!result.success) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully registered ${result.registeredCount} CapStoneFlow slash commands to Discord!`,
      registeredCount: result.registeredCount,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Slash command sync error',
    }, { status: 500 });
  }
}
