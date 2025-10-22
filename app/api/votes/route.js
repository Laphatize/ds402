import { NextResponse } from 'next/server';
import { submitVote, getSession } from '@/lib/db';

export async function POST(request) {
  try {
    const { sessionId, voterId, statementIndex, rating } = await request.json();

    if (!sessionId || !voterId || statementIndex === undefined || !rating) {
      return NextResponse.json(
        { error: 'Session ID, voter ID, statement index, and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Verify session exists
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify statement index is valid
    if (statementIndex < 0 || statementIndex >= session.statements.length) {
      return NextResponse.json(
        { error: 'Invalid statement index' },
        { status: 400 }
      );
    }

    await submitVote(sessionId, voterId, statementIndex, rating);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting vote:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit vote' },
      { status: 500 }
    );
  }
}
