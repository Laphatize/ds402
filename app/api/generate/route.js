import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { policyText } = await request.json();

    if (!policyText || !policyText.trim()) {
      return NextResponse.json(
        { error: 'Policy text is required' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a democratic summarizer that produces distinct representative statements from a policy.'
        },
        {
          role: 'user',
          content: `Policy: ${policyText}\n\nGenerate 5 distinct, concise statements summarizing diverse viewpoints citizens might have.`
        }
      ],
    });

    const output = completion.choices?.[0]?.message?.content || '';
    const lines = output
      .split(/\n+/)
      .filter(l => l.trim())
      .map(l => l.replace(/^\d+\.|^-/, '').trim());

    return NextResponse.json({ statements: lines });
  } catch (error) {
    console.error('Error generating statements:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate statements' },
      { status: 500 }
    );
  }
}
