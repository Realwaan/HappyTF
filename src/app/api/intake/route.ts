import { NextRequest, NextResponse } from 'next/server';
import { 
  IntakeSubmissionSchema, 
  processIntakeSubmission, 
  getSanitizedTrackingTicket 
} from '../../../lib/intake/intakeEngine';
import { INITIAL_BOARD_ITEMS } from '../../../lib/mock-data';

// Persistent memory cache for demo/server runtime
const globalIntakeTickets = new Map<string, any>();

// Seed existing mock items into cache
Object.values(INITIAL_BOARD_ITEMS).forEach((items) => {
  items.forEach((item) => {
    if (item.ticket_number) {
      globalIntakeTickets.set(item.ticket_number, item);
    }
  });
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = IntakeSubmissionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid submission data',
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { ticket, trackingToken, trackingUrl } = processIntakeSubmission(parseResult.data);
    globalIntakeTickets.set(ticket.ticket_number!, ticket);
    globalIntakeTickets.set(ticket.id, ticket);

    return NextResponse.json(
      {
        success: true,
        message: 'Request received and triaged successfully',
        trackingNumber: ticket.ticket_number,
        trackingToken,
        trackingUrl,
        ticket: getSanitizedTrackingTicket(ticket),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API /api/intake] Submission failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process intake submission',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || searchParams.get('ticket_number');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Ticket ID or tracking number required' },
        { status: 400 }
      );
    }

    const found = globalIntakeTickets.get(id);

    if (!found) {
      return NextResponse.json(
        { success: false, message: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: getSanitizedTrackingTicket(found),
    });
  } catch (error: any) {
    console.error('[API /api/intake] Query failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve ticket' },
      { status: 500 }
    );
  }
}
