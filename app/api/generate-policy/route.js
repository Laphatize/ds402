import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { topic } = await request.json();

    if (!topic || !topic.trim()) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a policy writer that creates comprehensive, balanced policy proposals on various topics.'
        },
        {
          role: 'user',
          content: `Create a detailed policy proposal about: ${topic}\n\nWrite a comprehensive policy text (3-5 paragraphs) that outlines the key aspects, considerations, and recommendations for this topic. The policy should be balanced and thoughtful.`
        }
      ],
    });

    const policyText = completion.choices?.[0]?.message?.content || '';

    return NextResponse.json({ policyText });
  } catch (error) {
    console.error('Error generating policy:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate policy' },
      { status: 500 }
    );
  }
}
