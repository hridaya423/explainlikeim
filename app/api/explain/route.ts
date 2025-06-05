import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});


function cleanResponse(text: string): string {
  return text
    
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<internal>[\s\S]*?<\/internal>/gi, '')
    .replace(/<scratch>[\s\S]*?<\/scratch>/gi, '')
    .replace(/<draft>[\s\S]*?<\/draft>/gi, '')
    
    .replace(/<(?!\/?(?:INTRO|STEP\d+|SUMMARY)\b)[^>]*>/g, '')
    
    .replace(/\*\*(.*?)\*\*/g, '$1') 
    .replace(/\*(.*?)\*/g, '$1') 
    .replace(/`(.*?)`/g, '$1') 
    .replace(/#{1,6}\s*/g, '') 
    
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/\s+/g, ' ')
    
    .trim();
}


async function generateSmartSuggestions(topic: string, audience: string): Promise<string[]> {
  const suggestionsPrompt = `Generate exactly 6 short related topics for someone who just learned about "${topic}" explained for ${audience}.

CRITICAL REQUIREMENTS - FOLLOW EXACTLY:
- Respond ONLY with the 6 topic names, one per line
- NO thinking, NO explanations, NO extra text, NO formatting
- NO numbers, NO bullets, NO dashes, NO special characters
- Each topic must be 2-5 words maximum
- Make topics relevant and progressive for continued learning
- Focus on practical, relatable topics for ${audience}

Format (EXACTLY like this):
Topic Name One
Topic Name Two
Topic Name Three
Topic Name Four
Topic Name Five
Topic Name Six`;

  try {
    console.log('🔍 Generating suggestions for:', topic, 'audience:', audience);
    
    const suggestionsCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a topic suggestion generator. You respond ONLY with topic names, one per line, with NO additional text, formatting, or characters. You are precise and follow instructions exactly.',
        },
        {
          role: 'user',
          content: suggestionsPrompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 800,
      top_p: 0.9,
    });

    const suggestionsText = suggestionsCompletion.choices[0]?.message?.content;
    console.log('📝 Raw suggestions response:', suggestionsText);
    
    if (!suggestionsText) {
      console.log('❌ No suggestions text received');
      return [];
    }

    
    const suggestions = suggestionsText
      .split('\n')
      .map(s => s.trim())
      .map(s => s.replace(/^\d+\.?\s*/, '')) 
      .map(s => s.replace(/^[-•*]\s*/, '')) 
      .map(s => s.replace(/^[^\w\s]+/, '')) 
      .filter(s => s.length > 0 && s.length < 50)
      .filter(s => !s.includes('<') && !s.includes('>')) 
      .filter(s => !s.toLowerCase().includes('think') && !s.toLowerCase().includes('explain'))
      .filter(s => !/^\d+$/.test(s)) 
      .slice(0, 6);

    console.log('✅ Final suggestions:', suggestions);
    console.log('📊 Suggestions count:', suggestions.length);
    
    return suggestions;
  } catch (error) {
    console.error('💥 Error generating suggestions:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      topic, 
      audience, 
      mode = 'default', 
      knowledgeLevel = 'beginner',
      originalExplanation,
      conversationHistory,
      followUpQuestion
    } = await request.json();

    if (!topic || !audience) {
      return NextResponse.json(
        { error: 'Topic and audience are required' },
        { status: 400 }
      );
    }

    
    const knowledgeLevelContext = {
      'absolute-beginner': 'You have never encountered this topic before and need everything explained from the very basics with lots of simple analogies.',
      'beginner': 'You have minimal knowledge and need clear, simple explanations with concrete examples.',
      'some-knowledge': 'You have some basic understanding but need clarification on how things work and connect together.',
      'informed': 'You are well-informed and want detailed explanations that dive deeper into mechanisms and nuances.',
      'expert': 'You have extensive knowledge and want advanced insights, edge cases, and technical depth.'
    };

    const knowledgeContext = knowledgeLevelContext[knowledgeLevel as keyof typeof knowledgeLevelContext] || knowledgeLevelContext.beginner;

    
    const modeInstructions = {
      'default': `You are a master educator who excels at making complex topics crystal clear through real-world examples. Explain "${topic}" for ${audience}, considering that ${knowledgeContext}

    CRITICAL REQUIREMENTS - FOLLOW EXACTLY:
    - Write in plain text only (ABSOLUTELY NO markdown, NO formatting, NO bold, NO bullets, NO special characters)
    - Keep it conversational and engaging (2-4 paragraphs)
    - MUST include at least 3-4 specific real-world examples that ${audience} encounters regularly
    - Use concrete analogies to familiar objects, activities, or situations from their daily life
    - Think deeply about what ${audience} actually does, sees, and experiences every day
    - Make abstract concepts tangible by connecting them to specific real-world scenarios
    - Use phrases like "it's exactly like when you...", "imagine you're...", "think about how..."
    - Reference specific brands, activities, or situations ${audience} would recognize
    - Focus on the most important concepts and make them stick through memorable examples
    - Write like you're explaining to a friend using examples from their actual life
    - NO technical jargon unless absolutely necessary and then explain it immediately
    - NO lists, NO numbered points, NO bullet points - use flowing conversational text
    - NO section headers or titles

    KNOWLEDGE LEVEL ADAPTATION:
    ${knowledgeLevel === 'absolute-beginner' ? '- Start with the most basic foundation concepts' : ''}
    ${knowledgeLevel === 'beginner' ? '- Explain fundamental concepts clearly before moving to applications' : ''}
    ${knowledgeLevel === 'some-knowledge' ? '- Build on basic understanding and explain connections and mechanisms' : ''}
    ${knowledgeLevel === 'informed' ? '- Provide deeper insights and explain nuances and complexities' : ''}
    ${knowledgeLevel === 'expert' ? '- Focus on advanced concepts, edge cases, and technical depth' : ''}

    EXAMPLE APPROACH BY AUDIENCE:
    - For a 5-year-old: Use toys, playground activities, family situations, cartoons they watch
    - For a teenager: Use social media, video games, school situations, popular apps/brands
    - For a college student: Use dorm life, part-time jobs, studying, campus experiences
    - For a business professional: Use office scenarios, meetings, project management, industry examples
    - For a complete beginner: Use household items, daily routines, common experiences

    Give a clear, flowing explanation that connects abstract concepts to specific, concrete examples from ${audience}'s real world.`,

      'step-by-step': `You are a master educator who excels at breaking down complex topics into clear, detailed steps. Explain "${topic}" for ${audience}, considering that ${knowledgeContext}

    CRITICAL REQUIREMENTS - FOLLOW EXACTLY:
    - Write in plain text only (ABSOLUTELY NO markdown, NO formatting, NO bold, NO bullets)
    - Break the explanation into 3-6 clear, numbered steps
    - Each step should build on the previous one logically
    - Be detailed and thorough but appropriate for the knowledge level
    - Use simple language appropriate for ${audience}
    - Include real-world examples within each step
    - Make each step actionable or easy to understand
    - Connect steps together with smooth transitions
    - Focus on the logical progression of understanding
    - NO section headers except for the required tags
    - NO lists or bullet points within steps

    KNOWLEDGE LEVEL ADAPTATION:
    ${knowledgeLevel === 'absolute-beginner' ? '- Use extremely simple language and start with the very basics' : ''}
    ${knowledgeLevel === 'beginner' ? '- Explain each step clearly with plenty of examples' : ''}
    ${knowledgeLevel === 'some-knowledge' ? '- Build on existing knowledge and explain how things connect' : ''}
    ${knowledgeLevel === 'informed' ? '- Provide more detailed explanations and deeper insights in each step' : ''}
    ${knowledgeLevel === 'expert' ? '- Include technical details and advanced considerations in each step' : ''}

    MANDATORY FORMATTING - USE THESE EXACT TAGS:
    INTRO_START
    Brief introduction paragraph explaining what we'll learn and why it matters. No other text or formatting.
    INTRO_END

    STEP1_START
    Step 1: What is the basic concept?
    Detailed explanation of the fundamental concept with real-world examples appropriate for ${audience}...
    STEP1_END

    STEP2_START
    Step 2: How does it work?
    Detailed explanation of the process or mechanism with examples...
    STEP2_END

    STEP3_START
    Step 3: Why is it important?
    Detailed explanation of significance and applications with examples...
    STEP3_END

    STEP4_START
    Step 4: Real-world applications
    Specific examples that ${audience} can relate to in their daily life...
    STEP4_END

    SUMMARY_START
    Summary paragraph that ties everything together and reinforces key points.
    SUMMARY_END

    CRITICAL: Use the exact tags shown above (INTRO_START/INTRO_END, STEP1_START/STEP1_END, etc.). Adjust step numbers if you need more or fewer steps. These tags are essential for proper display.`,

      'story': `You are a master storyteller who makes complex topics memorable through engaging narratives. Explain "${topic}" for ${audience}, considering that ${knowledgeContext}

    CRITICAL REQUIREMENTS - FOLLOW EXACTLY:
    - Write in plain text only (ABSOLUTELY NO markdown, NO formatting, NO bold, NO bullets)
    - Create an engaging story or narrative that explains the concept
    - Use characters, scenarios, or situations that ${audience} can relate to
    - Make the story memorable and entertaining while being educational
    - Include a clear beginning, middle, and end
    - Weave the educational content naturally into the narrative
    - Use dialogue, action, or interesting scenarios to maintain engagement
    - Make abstract concepts come alive through the story
    - Ensure the story directly relates to ${audience}'s world and experiences
    - NO section breaks or chapter headers
    - Tell one continuous, flowing story

    KNOWLEDGE LEVEL ADAPTATION:
    ${knowledgeLevel === 'absolute-beginner' ? '- Use very simple story elements and basic concepts' : ''}
    ${knowledgeLevel === 'beginner' ? '- Include clear explanations within the story narrative' : ''}
    ${knowledgeLevel === 'some-knowledge' ? '- Build on familiar concepts and add new connections through the story' : ''}
    ${knowledgeLevel === 'informed' ? '- Include more sophisticated story elements and deeper insights' : ''}
    ${knowledgeLevel === 'expert' ? '- Use complex scenarios and technical details woven into the narrative' : ''}

    Tell a compelling, continuous story that makes "${topic}" both understandable and unforgettable for ${audience}.`,

      'qa': `You are a master educator who provides clear, comprehensive topic summaries. Explain "${topic}" for ${audience}, considering that ${knowledgeContext}

    CRITICAL REQUIREMENTS - FOLLOW EXACTLY:
    - Write in plain text only (ABSOLUTELY NO markdown, NO formatting, NO bold, NO bullets)
    - Provide a comprehensive summary that covers all key aspects of ${topic}
    - Use language and examples appropriate for ${audience}
    - Include real-world examples and analogies they can relate to
    - Make it detailed enough to stand alone as a complete explanation
    - Structure it logically from basic concepts to more advanced ideas
    - Address common misconceptions or important points to understand
    - Write like you're explaining to a friend using examples from their actual life
    - NO section headers, NO lists, NO numbered points
    - Use flowing, conversational paragraphs

    KNOWLEDGE LEVEL ADAPTATION:
    ${knowledgeLevel === 'absolute-beginner' ? '- Start with the absolute basics and build very gradually' : ''}
    ${knowledgeLevel === 'beginner' ? '- Explain fundamental concepts before moving to applications' : ''}
    ${knowledgeLevel === 'some-knowledge' ? '- Build on existing understanding and explain deeper connections' : ''}
    ${knowledgeLevel === 'informed' ? '- Provide comprehensive coverage with detailed insights' : ''}
    ${knowledgeLevel === 'expert' ? '- Include advanced concepts, technical details, and expert-level insights' : ''}

    This summary will be displayed to users who can then ask follow-up questions. Make it comprehensive enough to serve as a foundation for further questions while being perfectly tailored to their knowledge level.`,

      'qa-followup': `You are an expert educator answering a follow-up question about a topic you previously explained. 

CONTEXT:
- Original topic: "${topic}"
- Audience: ${audience}
- Knowledge level: ${knowledgeContext}
- Follow-up question: "${followUpQuestion}"

ORIGINAL EXPLANATION:
${originalExplanation}

CONVERSATION HISTORY:
${conversationHistory && conversationHistory.length > 0 
  ? conversationHistory.map((msg: {type: 'question' | 'answer', content: string}, index: number) => `${index + 1}. ${msg.type === 'question' ? 'Q' : 'A'}: ${msg.content}`).join('\n')
  : 'No previous questions asked.'}

CRITICAL REQUIREMENTS - FOLLOW EXACTLY:
- Write in plain text only (ABSOLUTELY NO markdown, NO formatting, NO bold, NO bullets)
- Answer the specific follow-up question while maintaining context of the original explanation
- Reference and build upon what you already explained when relevant
- Keep the same language level and examples style that would appeal to ${audience}
- If the question is unclear, acknowledge what you think they're asking and provide a helpful answer
- Keep responses conversational and engaging (1-3 paragraphs typically)
- Use concrete examples that ${audience} can relate to
- If the question goes beyond the original topic, acknowledge the connection and then answer
- Maintain consistency with the original explanation's tone and style

KNOWLEDGE LEVEL ADAPTATION:
${knowledgeLevel === 'absolute-beginner' ? '- Use very simple language and basic examples' : ''}
${knowledgeLevel === 'beginner' ? '- Keep explanations clear and use familiar examples' : ''}
${knowledgeLevel === 'some-knowledge' ? '- Build on their existing understanding and make connections' : ''}
${knowledgeLevel === 'informed' ? '- Provide more detailed insights and nuanced explanations' : ''}
${knowledgeLevel === 'expert' ? '- Include technical depth and advanced considerations' : ''}

Answer the follow-up question while staying connected to the original topic and explanation context.`
    };

    const prompt = modeInstructions[mode as keyof typeof modeInstructions] || modeInstructions.default;

    const [chatCompletion, suggestions] = await Promise.all([
      groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator who adapts explanations perfectly to different knowledge levels and formats. You NEVER use markdown, formatting, or any special characters. You always follow instructions exactly and provide clean, well-structured explanations tailored to the audience\'s knowledge level. You are precise, clear, and engaging.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.6,
        max_tokens: 8000,
        top_p: 0.9,
        frequency_penalty: 0.2,
        presence_penalty: 0.1,
      }),
      
      mode === 'qa-followup' ? Promise.resolve([]) : generateSmartSuggestions(topic, audience)
    ]);

    let explanation = chatCompletion.choices[0]?.message?.content;

    if (!explanation) {
      throw new Error('No explanation generated');
    }

    explanation = cleanResponse(explanation);

    if (!explanation.trim()) {
      throw new Error('No valid explanation generated after filtering');
    }

    console.log('Final response - explanation length:', explanation.length, 'suggestions count:', suggestions.length);
    console.log('Suggestions being returned:', suggestions);

    return NextResponse.json({ 
      explanation,
      suggestions: suggestions.length > 0 ? suggestions : []
    });
  } catch (error) {
    console.error('Error generating explanation:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('model')) {
        return NextResponse.json(
          { error: 'AI model temporarily unavailable. Please try again.' },
          { status: 503 }
        );
      }
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Configuration error. Please contact support.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate explanation. Please try again.' },
      { status: 500 }
    );
  }
} 