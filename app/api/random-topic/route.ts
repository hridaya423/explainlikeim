import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function generateTopicWithRetry(maxRetries = 3): Promise<{topic: string, audience: string}> {
  const prompt = `Generate a random, interesting topic that would be great to explain in simple terms. The topic should be:

1. Fascinating and educational
2. Something people encounter or wonder about
3. Not too niche or overly technical
4. Suitable for explanation to different audiences
5. From various fields: science, technology, psychology, economics, nature, history, etc.

Also suggest an appropriate audience type for this topic.

IMPORTANT: You must respond with ONLY valid JSON in this exact format:
{"topic": "A specific topic", "audience": "An appropriate audience"}

Examples:
{"topic": "Why do we dream?", "audience": "curious teenager"}
{"topic": "How does WiFi work?", "audience": "tech beginner"}
{"topic": "What causes déjà vu?", "audience": "psychology student"}
{"topic": "Why do cats purr?", "audience": "animal lover"}

Generate a completely different topic each time. Be creative and diverse!`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Random topic generation attempt ${attempt}/${maxRetries}`);
      
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.9, 
        max_tokens: 150,
        top_p: 0.9,
      });

      const response = completion.choices[0]?.message?.content;
      console.log(`AI Response (attempt ${attempt}):`, response);
      
      if (!response) {
        throw new Error('No response from AI');
      }

      
      let cleanedResponse = response.trim();
      
      
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      
      const parsedResponse = JSON.parse(cleanedResponse);
      
      if (!parsedResponse.topic || !parsedResponse.audience) {
        throw new Error(`Invalid response format: missing topic or audience. Got: ${JSON.stringify(parsedResponse)}`);
      }

      console.log(`Successfully generated topic (attempt ${attempt}):`, parsedResponse);
      return {
        topic: parsedResponse.topic,
        audience: parsedResponse.audience
      };

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        
        throw new Error(`Failed to generate topic after ${maxRetries} attempts. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('Unexpected error in retry logic');
}

export async function POST() {
  try {
    const result = await generateTopicWithRetry(3);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Random topic generation failed completely:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate random topic. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 