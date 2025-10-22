import { NextResponse } from 'next/server';
import { createSession } from '@/lib/db';

export async function POST(request) {
  try {
    const { policyText, statements } = await request.json();

    if (!policyText || !statements || !Array.isArray(statements)) {
      return NextResponse.json(
        { error: 'Policy text and statements are required' },
        { status: 400 }
      );
    }

    const sessionId = await createSession(policyText, statements);

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 500 }
    );
  }
}
