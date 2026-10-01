import { describe, it, expect } from 'vitest';

describe('Board Collaboration & Shareable Invite Link Engine', () => {
  interface JoinParams {
    join_board: string;
    board_name?: string;
    ws_id?: string;
    ws_name?: string;
    role?: 'member' | 'viewer' | 'admin';
    inviter?: string;
  }

  function generateInviteUrl(origin: string, params: JoinParams): string {
    const url = new URL(origin);
    url.searchParams.set('join_board', params.join_board);
    if (params.board_name) url.searchParams.set('board_name', params.board_name);
    if (params.ws_id) url.searchParams.set('ws_id', params.ws_id);
    if (params.ws_name) url.searchParams.set('ws_name', params.ws_name);
    if (params.role) url.searchParams.set('role', params.role);
    if (params.inviter) url.searchParams.set('inviter', params.inviter);
    return url.toString();
  }

  function parseJoinParams(urlString: string): JoinParams | null {
    try {
      const url = new URL(urlString);
      const join_board = url.searchParams.get('join_board');
      if (!join_board) return null;

      const rawRole = url.searchParams.get('role');
      const validRole = rawRole === 'admin' || rawRole === 'viewer' ? rawRole : 'member';

      return {
        join_board,
        board_name: url.searchParams.get('board_name') || 'Shared Board',
        ws_id: url.searchParams.get('ws_id') || undefined,
        ws_name: url.searchParams.get('ws_name') || 'Shared Workspace',
        role: validRole,
        inviter: url.searchParams.get('inviter') || 'Team Member',
      };
    } catch {
      return null;
    }
  }

  it('generates a valid shareable join URL with encoded board and workspace metadata', () => {
    const link = generateInviteUrl('http://localhost:3000', {
      join_board: 'board-777',
      board_name: 'Sprint 24 Board',
      ws_id: 'ws-alpha',
      ws_name: 'Engineering Team',
      role: 'member',
      inviter: 'Alex River',
    });

    expect(link).toContain('http://localhost:3000/?');
    expect(link).toContain('join_board=board-777');
    expect(link).toContain('board_name=Sprint+24+Board');
    expect(link).toContain('role=member');
    expect(link).toContain('inviter=Alex+River');
  });

  it('correctly parses join parameters and falls back to safe member defaults', () => {
    const parsed = parseJoinParams(
      'http://localhost:3000/?join_board=board-888&board_name=DevOps+Tasks&role=invalid_role&inviter=Taylor'
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.join_board).toBe('board-888');
    expect(parsed?.board_name).toBe('DevOps Tasks');
    expect(parsed?.role).toBe('member'); // sanitized default
    expect(parsed?.inviter).toBe('Taylor');
  });

  it('returns null when join_board is omitted from the link', () => {
    const parsed = parseJoinParams('http://localhost:3000/?board_name=Solo+Board');
    expect(parsed).toBeNull();
  });
});
