import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ItemComment } from '@/types';
import { cacheGet, cacheSet } from '@/lib/redis';

const DATA_DIR = path.join(process.cwd(), '.data');
const COMMENTS_FILE = path.join(DATA_DIR, 'ticket_comments.json');

// Memory cache fallback
let memoryComments: Record<string, ItemComment[]> = {};

function ensureDataFile(): Record<string, ItemComment[]> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(COMMENTS_FILE)) {
      const content = fs.readFileSync(COMMENTS_FILE, 'utf-8');
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          memoryComments = { ...memoryComments, ...parsed };
          return memoryComments;
        }
      }
    }
  } catch (err) {
    console.warn('[Comments API] Failed to read comments file', err);
  }
  return memoryComments;
}

function persistComments(data: Record<string, ItemComment[]>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Comments API] Failed to write comments file', err);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get('ticket_id');

  const allComments = ensureDataFile();

  if (ticketId) {
    const list = allComments[ticketId] || [];
    return NextResponse.json({
      success: true,
      ticket_id: ticketId,
      comments: list,
    });
  }

  return NextResponse.json({
    success: true,
    comments: allComments,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticket_id, comment, comments } = body;

    if (!ticket_id) {
      return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 });
    }

    const currentData = ensureDataFile();
    let updatedList: ItemComment[] = currentData[ticket_id] || [];

    const sanitizeComment = (c: ItemComment): ItemComment => {
      const nowIso = new Date().toISOString();
      const createdAt = c.created_at || (c.timestamp && c.timestamp !== 'Just now' ? c.timestamp : nowIso);
      return {
        ...c,
        created_at: createdAt,
        timestamp: c.timestamp === 'Just now' ? createdAt : (c.timestamp || createdAt),
      };
    };

    if (Array.isArray(comments)) {
      // Direct replace or sync of comment list for this ticket
      updatedList = comments.map(sanitizeComment);
    } else if (comment && typeof comment === 'object') {
      const sanitized = sanitizeComment(comment);
      // Append single comment, deduplicating by ID
      const existingIdx = updatedList.findIndex((c) => c.id === sanitized.id);
      if (existingIdx >= 0) {
        updatedList[existingIdx] = sanitized;
      } else {
        updatedList.push(sanitized);
      }
    } else {
      return NextResponse.json({ error: 'Invalid comment payload' }, { status: 400 });
    }

    currentData[ticket_id] = updatedList;
    memoryComments = currentData;
    persistComments(currentData);

    // Also update Redis/cache if configured
    await cacheSet(`comments:ticket:${ticket_id}`, updatedList, 3600);

    return NextResponse.json({
      success: true,
      ticket_id,
      comments: updatedList,
    });
  } catch (err: any) {
    console.error('[Comments API POST]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
