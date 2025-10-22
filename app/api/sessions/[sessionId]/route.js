import { NextResponse } from 'next/server';
import { getSession, getVoteStats, getVoterVotes } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    // Await params in case it's a Promise (Next.js 15+)
    const resolvedParams = await params;
    const sessionId = resolvedParams.sessionId;

    const { searchParams } = new URL(request.url);
    const voterId = searchParams.get('voterId');

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const stats = await getVoteStats(sessionId);

    let voterVotes = {};
    if (voterId) {
      const votes = await getVoterVotes(sessionId, voterId);
      voterVotes = votes.reduce((acc, vote) => {
        acc[vote.statement_index] = vote.rating;
        return acc;
      }, {});
    }

    return NextResponse.json({
      session,
      stats,
      voterVotes
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
