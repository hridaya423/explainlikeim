import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { explanation, topic } = await request.json();

    if (!explanation || !topic) {
      return NextResponse.json(
        { error: 'Explanation and topic are required' },
        { status: 400 }
      );
    }

    const prompt = `
You are a visual diagram generator. Based on the following explanation about "${topic}", create a Mermaid flowchart diagram that breaks down the concept into its key components and relationships in a mind-map style layout.

Explanation: "${explanation}"

Create a Mermaid flowchart with this structure:
1. Central topic: "${topic}" (use a circle or rounded rectangle)
2. Main branches (3-6 key concepts from the explanation) 
3. Sub-branches (2-4 supporting details for each main branch)

Return ONLY the Mermaid flowchart syntax in this exact format:

\`\`\`mermaid
flowchart TB
    A[${topic}] --> B[Branch1]
    A --> C[Branch2] 
    A --> D[Branch3]
    B --> E[Subbranch1]
    B --> F[Subbranch2]
    C --> G[Subbranch3]
    C --> H[Subbranch4]
    D --> I[Subbranch5]
    D --> J[Subbranch6]
\`\`\`

Rules:
- Use flowchart TB (top-bottom) syntax
- Use rectangles [text] for most nodes, circles ((text)) for important concepts
- Extract 3-6 main concepts as primary branches from the central topic
- Add 2-4 sub-concepts under each main branch
- Keep labels concise (2-4 words max)
- Focus on the most important concepts from the explanation
- Use simple, clear language
- No special characters or symbols in labels
- Make it look like a mind map with the central topic connecting to main branches

Only return the Mermaid code block, nothing else.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from AI');
    }

    
    let mermaidDiagram;
    try {
      
      const cleanedResponse = response.trim();
      
      
      const mermaidMatch = cleanedResponse.match(/```mermaid\s*([\s\S]*?)\s*```/i);
      if (mermaidMatch) {
        mermaidDiagram = mermaidMatch[1].trim();
      } else {
        mermaidDiagram = cleanedResponse;
      }
      
      
      if (!mermaidDiagram.includes('flowchart')) {
        throw new Error('Invalid flowchart syntax');
      }
      
    } catch (parseError) {
      console.error('Failed to parse Mermaid diagram:', response);
      console.error('Parse error:', parseError);
      
      mermaidDiagram = `flowchart TB
    A[${topic}] --> B[Key Concepts]
    A --> C[Applications]
    A --> D[Benefits]
    B --> E[Concept 1]
    B --> F[Concept 2]
    C --> G[Use Case 1]
    C --> H[Use Case 2]
    D --> I[Advantage 1]
    D --> J[Advantage 2]`;
    }

    return NextResponse.json({ mermaidDiagram });

  } catch (error) {
    console.error('Mind map generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate mind map' },
      { status: 500 }
    );
  }
} 