import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/webhooks/github/route';

describe('Phase 4: GitHub PR Auto-Transitions & Discord Bridge', () => {
  it('Auto-advances ticket to "In Review" when a PR is opened with ticket key', async () => {
    const payload = {
      simulate: true,
      event: 'pull_request',
      action: 'opened',
      pr: {
        number: 42,
        title: 'feat(api): implement Discord CapStoneFlow webhook router #TK-2048',
        body: 'Closes #TK-2048. All unit tests green.',
        url: 'https://github.com/happytf/work-os/pull/42',
      },
      sender: {
        login: 'alexrivera',
      },
    };

    const req = new NextRequest('http://localhost:3000/api/webhooks/github', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'pull_request',
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.type).toBe('pull_request');
    expect(json.linked_ticket).toBe('TK-2048');
    expect(json.transition.newStatus).toBe('In Review');
  });

  it('Auto-advances ticket to "Done" when a PR is merged into main', async () => {
    const payload = {
      simulate: true,
      event: 'pull_request',
      action: 'closed',
      merged: true,
      pr: {
        number: 43,
        title: 'fix(core): resolve concurrency collision in ticket claim #TK-3099',
        merged: true,
        url: 'https://github.com/happytf/work-os/pull/43',
      },
      sender: {
        login: 'taylorchen',
      },
    };

    const req = new NextRequest('http://localhost:3000/api/webhooks/github', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'pull_request',
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.type).toBe('pull_request');
    expect(json.linked_ticket).toBe('TK-3099');
    expect(json.transition.newStatus).toBe('Done');
  });

  it('Gracefully acknowledges PR without linked ticket number', async () => {
    const payload = {
      simulate: true,
      event: 'pull_request',
      action: 'opened',
      pr: {
        number: 44,
        title: 'docs: update README with Discord commands',
        url: 'https://github.com/happytf/work-os/pull/44',
      },
      sender: {
        login: 'docsbot',
      },
    };

    const req = new NextRequest('http://localhost:3000/api/webhooks/github', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'pull_request',
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.linked_ticket).toBeUndefined();
    expect(json.transition.newStatus).toBeUndefined();
  });
});
