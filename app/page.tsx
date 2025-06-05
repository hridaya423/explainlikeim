'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';


const MindMap = dynamic(() => import('./components/MindMap'), { ssr: false });

const formSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(300, 'Topic must be less than 300 characters'),
  audience: z.string().min(1, 'Audience is required').max(150, 'Audience must be less than 150 characters'),
  mode: z.enum(['default', 'step-by-step', 'story', 'qa']),
  knowledgeLevel: z.enum(['absolute-beginner', 'beginner', 'some-knowledge', 'informed', 'expert']),
});

type FormData = z.infer<typeof formSchema>;

export default function Home() {
  const [explanation, setExplanation] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentMode, setCurrentMode] = useState<string>('default');
  const [qaMessages, setQaMessages] = useState<Array<{type: 'question' | 'answer', content: string}>>([]);
  const [qaInput, setQaInput] = useState('');
  const [isQaLoading, setIsQaLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [mindMapData, setMindMapData] = useState<string | null>(null);
  const [isLoadingMindMap, setIsLoadingMindMap] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);

  const generateRandomTopic = async () => {
    setIsGeneratingTopic(true);
    setError('');
    
    try {
      const response = await fetch('/api/random-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate random topic');
      }

      if (result.error) {
        throw new Error(result.error);
      }

      reset({ 
        topic: result.topic, 
        audience: result.audience, 
        mode: 'default', 
        knowledgeLevel: 'beginner' 
      });
      setExplanation('');
      setSuggestions([]);
      setError('');
      setMindMapData(null); 
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate random topic. Please try again.');
      console.error('Error generating random topic:', err);
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const watchedTopic = watch('topic', '');
  const watchedAudience = watch('audience', '');
  const watchedMode = watch('mode', 'default');

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError('');
    setExplanation('');
    setSuggestions([]);
    setCurrentMode(data.mode);
    setQaMessages([]);
    setMindMapData(null); 

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: data.topic,
          audience: data.audience,
          mode: data.mode,
          knowledgeLevel: data.knowledgeLevel,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate explanation');
      }

      console.log('API response received:', result);
      console.log('Suggestions in response:', result.suggestions);

      setExplanation(result.explanation);
      setSuggestions(result.suggestions || []);
      
      console.log('Suggestions state set to:', result.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    reset({ topic: '', audience: '', mode: 'default', knowledgeLevel: 'beginner' });
    setExplanation('');
    setSuggestions([]);
    setError('');
    setMindMapData(null); 
  };

  const handleExampleClick = (topic: string, audience: string) => {
    reset({ topic, audience, mode: 'default', knowledgeLevel: 'beginner' });
    setExplanation('');
    setSuggestions([]);
    setError('');
    setMindMapData(null); 
  };

  const handleSuggestionClick = (suggestion: string) => {
    reset({ topic: suggestion, audience: watchedAudience || 'curious person', mode: 'default', knowledgeLevel: 'beginner' });
    setExplanation('');
    setSuggestions([]);
    setError('');
    setMindMapData(null); 
  };

  const handleQaQuestion = async (question: string) => {
    if (!question.trim()) return;
    
    setIsQaLoading(true);
    setQaMessages(prev => [...prev, { type: 'question', content: question }]);
    setQaInput('');

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: watchedTopic,
          audience: watchedAudience || 'curious person',
          mode: 'qa-followup',
          knowledgeLevel: watch('knowledgeLevel') || 'beginner',
          originalExplanation: explanation,
          conversationHistory: qaMessages,
          followUpQuestion: question,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setQaMessages(prev => [...prev, { type: 'answer', content: result.explanation }]);
      } else {
        const errorMessage = result.error || 'Sorry, I had trouble answering that question. Please try again.';
        setQaMessages(prev => [...prev, { type: 'answer', content: errorMessage }]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sorry, I had trouble answering that question. Please try again.';
      setQaMessages(prev => [...prev, { type: 'answer', content: errorMessage }]);
    } finally {
      setIsQaLoading(false);
    }
  };

  const explainDifferently = async () => {
    if (!watchedTopic || !watchedAudience) return;
    
    setIsRegenerating(true);
    setError('');
    setMindMapData(null); 

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: watchedTopic,
          audience: watchedAudience,
          mode: watchedMode,
          knowledgeLevel: watch('knowledgeLevel') || 'beginner',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate new explanation');
      }

      setExplanation(result.explanation);
      setSuggestions(result.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating a new explanation');
    } finally {
      setIsRegenerating(false);
    }
  };

  const generateMindMap = async () => {
    if (!explanation || !watchedTopic) return;
    
    setIsLoadingMindMap(true);
    
    try {
      const response = await fetch('/api/mindmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          explanation,
          topic: watchedTopic,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate mind map');
      }

      setMindMapData(result.mermaidDiagram);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating the mind map');
    } finally {
      setIsLoadingMindMap(false);
    }
  };

  const renderFormattedExplanation = () => {
    if (!explanation) return null;

    
    if (currentMode === 'step-by-step') {
      console.log('🔍 Step-by-step mode - Raw explanation:', explanation);
      
      const sections: Array<{type: string, content: string, title?: string}> = [];
      
      
      const introMatch = explanation.match(/INTRO_START([\s\S]*?)INTRO_END/i);
      const summaryMatch = explanation.match(/SUMMARY_START([\s\S]*?)SUMMARY_END/i);
      const stepMatches = [...explanation.matchAll(/STEP(\d+)_START([\s\S]*?)STEP\d+_END/gi)];
      
      console.log('🏷️ Tag parsing results:', {
        introMatch: !!introMatch,
        summaryMatch: !!summaryMatch,
        stepMatches: stepMatches.length
      });
      
      if (introMatch || stepMatches.length > 0 || summaryMatch) {
        
        if (introMatch) {
          sections.push({ type: 'INTRO', content: introMatch[1].trim() });
        }
        
        stepMatches.forEach((match) => {
          const stepNum = match[1];
          const stepContent = match[2].trim();
          sections.push({ type: `STEP${stepNum}`, content: stepContent });
        });
        
        if (summaryMatch) {
          sections.push({ type: 'SUMMARY', content: summaryMatch[1].trim() });
        }
        
        console.log('✅ Successfully parsed with new tags. Sections:', sections.length);
      } else {
        
        const oldIntroMatch = explanation.match(/\[INTRO\]([\s\S]*?)\[\/INTRO\]/i);
        const oldSummaryMatch = explanation.match(/\[SUMMARY\]([\s\S]*?)\[\/SUMMARY\]/i);
        const oldStepMatches = [...explanation.matchAll(/\[STEP(\d+)\]([\s\S]*?)\[\/STEP\d+\]/gi)];
        
        if (oldIntroMatch || oldStepMatches.length > 0 || oldSummaryMatch) {
          if (oldIntroMatch) {
            sections.push({ type: 'INTRO', content: oldIntroMatch[1].trim() });
          }
          
          oldStepMatches.forEach((match) => {
            const stepNum = match[1];
            const stepContent = match[2].trim();
            sections.push({ type: `STEP${stepNum}`, content: stepContent });
          });
          
          if (oldSummaryMatch) {
            sections.push({ type: 'SUMMARY', content: oldSummaryMatch[1].trim() });
          }
          
          console.log('✅ Successfully parsed with old tags. Sections:', sections.length);
        } else {
          console.log('⚠️ No tags found, trying fallback parsing...');
          
          
          const lines = explanation.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          let currentSection: {type: string, content: string, title?: string} | null = null;
          let introContent = '';
          let foundFirstStep = false;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            
            const stepMatch = line.match(/^(?:Step\s*)?(\d+)[\.:]\s*(.*)/i) || 
                             line.match(/^(\d+)[\.:]\s*(.*)/);
            
            if (stepMatch && !foundFirstStep) {
              foundFirstStep = true;
              
              if (introContent.trim()) {
                sections.push({ type: 'INTRO', content: introContent.trim() });
              }
            }
            
            if (stepMatch) {
              
              if (currentSection) {
                sections.push(currentSection);
              }
              
              const stepNum = stepMatch[1];
              const stepTitle = stepMatch[2] || '';
              currentSection = { 
                type: `STEP${stepNum}`, 
                content: stepTitle,
                title: stepTitle
              };
            } else if (currentSection) {
              
              currentSection.content += (currentSection.content ? '\n' : '') + line;
            } else if (!foundFirstStep) {
              
              introContent += (introContent ? '\n' : '') + line;
            }
          }
          
          
          if (currentSection) {
            sections.push(currentSection);
          }
          
          console.log('📝 Fallback parsing result. Sections found:', sections.length);
          
          
          if (sections.length === 0) {
            console.log('🔄 Trying aggressive parsing...');
            
            const numberedSections = explanation.split(/(?=\d+[\.:]\s)/);
            if (numberedSections.length > 1) {
              numberedSections.forEach((section, index) => {
                const trimmed = section.trim();
                if (trimmed) {
                  const match = trimmed.match(/^(\d+)[\.:]\s*([\s\S]*)/);
                  if (match) {
                    sections.push({
                      type: `STEP${match[1]}`,
                      content: match[2].trim(),
                      title: match[2].split('\n')[0] || `Step ${match[1]}`
                    });
                  } else if (index === 0) {
                    sections.push({ type: 'INTRO', content: trimmed });
                  }
                }
              });
            }
            console.log('🎯 Aggressive parsing result. Sections found:', sections.length);
          }
        }
      }

      console.log('📊 Final sections for rendering:', sections.map(s => ({ type: s.type, contentLength: s.content.length })));

      
      if (sections.length === 0) {
        console.log('❌ No sections found, using fallback display');
        
        const cleanedExplanation = explanation
          .replace(/INTRO_START|INTRO_END|SUMMARY_START|SUMMARY_END/gi, '')
          .replace(/STEP\d+_START|STEP\d+_END/gi, '')
          .replace(/\[INTRO\]|\[\/INTRO\]|\[SUMMARY\]|\[\/SUMMARY\]/gi, '')
          .replace(/\[STEP\d+\]|\[\/STEP\d+\]/gi, '')
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          .trim();
        
        return (
          <div className="bg-blue-50/80 border-2 border-blue-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">📋</span>
              </div>
              <h3 className="text-xl font-bold text-blue-800">Step-by-Step Explanation</h3>
            </div>
            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{cleanedExplanation}</div>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {sections.map((section, index) => {
            const cleanedContent = section.content
              .replace(/INTRO_START|INTRO_END|SUMMARY_START|SUMMARY_END/gi, '')
              .replace(/STEP\d+_START|STEP\d+_END/gi, '')
              .replace(/\[INTRO\]|\[\/INTRO\]|\[SUMMARY\]|\[\/SUMMARY\]/gi, '')
              .replace(/\[STEP\d+\]|\[\/STEP\d+\]/gi, '')
              .trim();
              
            return (
              <div key={index} className={`
                ${section.type === 'INTRO' ? 'bg-blue-50/80 border-blue-200' : 
                  section.type === 'SUMMARY' ? 'bg-green-50/80 border-green-200' : 
                  'bg-indigo-50/80 border-indigo-200'} 
                border-2 rounded-2xl p-6 shadow-sm
              `}>
                {section.type === 'INTRO' && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">📚</span>
                    </div>
                    <h3 className="text-xl font-bold text-blue-800">Introduction</h3>
                  </div>
                )}
                {section.type.startsWith('STEP') && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{section.type.replace('STEP', '')}</span>
                    </div>
                    <h3 className="text-xl font-bold text-indigo-800">
                      Step {section.type.replace('STEP', '')}
                      {section.title && section.title !== cleanedContent && (
                        <span className="text-base font-normal text-indigo-600 ml-2">
                          - {section.title.length > 50 ? section.title.substring(0, 50) + '...' : section.title}
                        </span>
                      )}
                    </h3>
                  </div>
                )}
                {section.type === 'SUMMARY' && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">✅</span>
                    </div>
                    <h3 className="text-xl font-bold text-green-800">Summary</h3>
                  </div>
                )}
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
                  {cleanedContent}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    
    if (currentMode === 'qa') {
      return (
        <div className="space-y-6">
          
          <div className="bg-purple-50/80 border-2 border-purple-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">📝</span>
              </div>
              <h3 className="text-xl font-bold text-purple-800">Topic Summary</h3>
            </div>
            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
              {explanation}
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">💬</span>
              </div>
              <h4 className="text-xl font-bold text-purple-800">Ask Follow-up Questions</h4>
            </div>
            
            {qaMessages.length > 0 && (
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto bg-white/50 rounded-xl p-4">
                {qaMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.type === 'question' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                      message.type === 'question' 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-white border border-gray-200 text-gray-800'
                    }`}>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-3">
              <input
                type="text"
                value={qaInput}
                onChange={(e) => setQaInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQaQuestion(qaInput)}
                placeholder="Ask anything about this topic..."
                className="flex-1 px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-base"
                disabled={isQaLoading}
              />
              <button
                onClick={() => handleQaQuestion(qaInput)}
                disabled={isQaLoading || !qaInput.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
              >
                {isQaLoading ? '...' : 'Ask'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    
    return (
      <div className="text-gray-800 leading-relaxed whitespace-pre-wrap bg-white/60 rounded-2xl p-6 shadow-inner border border-white/40 text-base sm:text-lg">
        {explanation}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 relative overflow-hidden">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className={`container mx-auto px-4 py-8 sm:py-12 relative z-10 ${explanation ? 'max-w-7xl' : 'max-w-5xl'}`}>
        
        {!explanation && (
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-4 tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Explain Like I&apos;m
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Transform complex topics into crystal-clear explanations with concrete real-world examples tailored to any audience. 
              Powered by advanced AI that connects abstract concepts to your everyday experiences.
            </p>
          </div>
        )}

        
        {explanation && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Explain Like I&apos;m
            </h1>
          </div>
        )}
        <div className={`bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 transition-all duration-300 hover:shadow-3xl ${explanation ? 'p-4 sm:p-6 mb-6' : 'p-6 sm:p-10 mb-8'}`}>
          <form onSubmit={handleSubmit(onSubmit)} className={explanation ? "space-y-6" : "space-y-8"}>
            {(watchedTopic || watchedAudience) && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 border border-blue-100 transition-all duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="text-sm font-semibold text-blue-800">Preview:</span>
                </div>
                <p className="text-blue-700 font-medium">
                  &quot;Explain <span className="bg-blue-200 px-1 rounded">{watchedTopic || '[topic]'}</span> like they are <span className="bg-purple-200 px-1 rounded">{watchedAudience || '[audience]'}</span>&quot;
                  {(watchedMode !== 'default' || showAdvanced) && (
                    <span className="ml-2 text-sm">
                      {watchedMode !== 'default' && (
                        <>using <span className="bg-indigo-200 px-1 rounded font-semibold">
                          {watchedMode === 'step-by-step' ? 'Step-by-Step' : 
                           watchedMode === 'story' ? 'Story Mode' : 
                           watchedMode === 'qa' ? 'Q&A Style' : watchedMode}
                        </span> format</>
                      )}
                    </span>
                  )}
                </p>
              </div>
            )}

            
            <div className="space-y-6">
              <div className="space-y-3">
                <label htmlFor="topic" className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  What would you like explained?
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 font-bold text-sm transition-all duration-200 group-focus-within:text-blue-600 group-focus-within:scale-95 z-10" style={{ color: '#000000 !important', opacity: '1', backgroundColor: 'rgba(255,255,255,0.8)', padding: '2px 4px', borderRadius: '4px' }}>
                    Explain
                  </span>
                  <input
                    {...register('topic')}
                    type="text"
                    id="topic"
                    placeholder="quantum computing, photosynthesis, cryptocurrency, machine learning..."
                    className="w-full pl-20 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white/50 backdrop-blur-sm hover:border-gray-300 text-sm sm:text-base"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                    {watchedTopic.length}/300
                  </div>
                </div>
                {errors.topic && (
                  <div className="flex items-center gap-1 text-red-600 text-sm animate-shake">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errors.topic.message}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label htmlFor="audience" className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Explain like they are:
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 font-bold text-sm transition-all duration-200 group-focus-within:text-purple-600 group-focus-within:scale-95 z-10" style={{ color: '#000000 !important', opacity: '1', backgroundColor: 'rgba(255,255,255,0.8)', padding: '2px 4px', borderRadius: '4px' }}>
                    like I&apos;m
                  </span>
                  <input
                    {...register('audience')}
                    type="text"
                    id="audience"
                    placeholder="5 year old, college student, complete beginner, busy parent..."
                    className="w-full pl-24 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white/50 backdrop-blur-sm hover:border-gray-300 text-sm sm:text-base"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                    {watchedAudience.length}/150
                  </div>
                </div>
                {errors.audience && (
                  <div className="flex items-center gap-1 text-red-600 text-sm animate-shake">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errors.audience.message}
                  </div>
                )}
              </div>
            </div>

            
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 border border-gray-200 rounded-xl p-4 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  <span className="font-semibold text-gray-800">Advanced Options</span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdvanced && (
                <div className="space-y-6 bg-gradient-to-br from-blue-50/50 to-purple-50/50 border border-blue-100 rounded-xl p-6 animate-fadeIn">
                  
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Explanation Style
                    </label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { value: 'default', label: 'Real-World Examples', icon: '🌍', desc: 'Concrete examples from daily life' },
                        { value: 'step-by-step', label: 'Step-by-Step', icon: '📋', desc: 'Detailed breakdown in steps' },
                        { value: 'story', label: 'Story Mode', icon: '📖', desc: 'Engaging narrative format' },
                        { value: 'qa', label: 'Q&A Style', icon: '❓', desc: 'Question and answer format' },
                      ].map((mode) => (
                        <label key={mode.value} className="relative">
                          <input
                            {...register('mode')}
                            type="radio"
                            value={mode.value}
                            className="sr-only peer"
                            defaultChecked={mode.value === 'default'}
                          />
                          <div className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl p-3 cursor-pointer transition-all duration-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50/80 hover:border-gray-300 hover:bg-white/90 text-center">
                            <div className="text-2xl mb-1">{mode.icon}</div>
                            <div className="text-sm font-semibold text-gray-900 peer-checked:text-indigo-800">{mode.label}</div>
                            <div className="text-xs text-gray-600 peer-checked:text-indigo-600">{mode.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.mode && (
                      <div className="flex items-center gap-1 text-red-600 text-sm animate-shake">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.mode.message}
                      </div>
                    )}
                  </div>

                  
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Your Knowledge Level
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {[
                        { value: 'absolute-beginner', label: 'Complete Newbie', icon: '🌱', desc: 'Never heard of this before' },
                        { value: 'beginner', label: 'Beginner', icon: '📚', desc: 'Know very little about this' },
                        { value: 'some-knowledge', label: 'Some Knowledge', icon: '🧩', desc: 'Understand the basics' },
                        { value: 'informed', label: 'Well-Informed', icon: '🎓', desc: 'Pretty knowledgeable' },
                        { value: 'expert', label: 'Expert Level', icon: '🧠', desc: 'Very advanced understanding' },
                      ].map((level) => (
                        <label key={level.value} className="relative">
                          <input
                            {...register('knowledgeLevel')}
                            type="radio"
                            value={level.value}
                            className="sr-only peer"
                            defaultChecked={level.value === 'beginner'}
                          />
                          <div className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl p-3 cursor-pointer transition-all duration-200 peer-checked:border-emerald-500 peer-checked:bg-emerald-50/80 hover:border-gray-300 hover:bg-white/90 text-center h-full flex flex-col justify-center">
                            <div className="text-2xl mb-1">{level.icon}</div>
                            <div className="text-sm font-semibold text-gray-900 peer-checked:text-emerald-800">{level.label}</div>
                            <div className="text-xs text-gray-600 peer-checked:text-emerald-600 leading-tight">{level.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.knowledgeLevel && (
                      <div className="flex items-center gap-1 text-red-600 text-sm animate-shake">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.knowledgeLevel.message}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={generateRandomTopic}
                disabled={isGeneratingTopic}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
              >
                {isGeneratingTopic ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>🎭 Generating Magic...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>🎲 Surprise Me with a Random Topic!</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white py-4 px-8 rounded-2xl font-bold hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-base shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Generating amazing explanation...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Explain It!</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="sm:w-auto px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Clear
              </button>
            </div>
            
          
        
            
            
            
          </form>
        </div>

        
        {error && (
          <div className="bg-red-50/80 backdrop-blur-xl border-2 border-red-200 rounded-2xl p-6 mb-8 shadow-lg animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-red-800 font-bold text-lg">Oops! Something went wrong</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        
        {explanation && (
          <div className="space-y-8">
            
            {mindMapData && (
              <MindMap 
                data={mindMapData} 
                isInline={true}
                onClose={() => setMindMapData(null)}
              />
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-green-50/80 to-blue-50/80 backdrop-blur-xl border-2 border-green-200 rounded-3xl p-8 shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Here&apos;s your explanation!</h2>
                      {currentMode !== 'default' && (
                        <p className="text-sm text-gray-600 mt-1">
                          Displayed in {currentMode === 'step-by-step' ? 'Step-by-Step' : 
                                       currentMode === 'story' ? 'Story' : 
                                       currentMode === 'qa' ? 'Q&A' : currentMode} format
                        </p>
                      )}
                    </div>
                  </div>
                  
                  
                  <div className="flex gap-2">
                    
                    <button
                      onClick={generateMindMap}
                      disabled={isLoadingMindMap}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-2 rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      {isLoadingMindMap ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span className="text-sm">Creating...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span className="text-sm">Visualize</span>
                        </>
                      )}
                    </button>
                  
                  
                  <button
                    onClick={explainDifferently}
                    disabled={isRegenerating}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {isRegenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="text-sm">Generating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-sm">Explain Differently</span>
                      </>
                    )}
                  </button>
                  </div>
                </div>
                
                <div className="prose prose-lg max-w-none">
                  {renderFormattedExplanation()}
                </div>
                
                {currentMode !== 'qa' && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={handleReset}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Ask Another Question
                    </button>
                  </div>
                )}
              </div>
            </div>

            
            {suggestions.length > 0 && (
              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-purple-50/80 to-indigo-50/80 backdrop-blur-xl border-2 border-purple-200 rounded-3xl p-8 shadow-2xl animate-fadeIn sticky top-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Related Topics</h3>
                      <p className="text-gray-600 text-base">Continue your learning journey</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full bg-white/70 backdrop-blur-sm border border-purple-200 rounded-2xl p-5 text-left hover:bg-white/90 hover:border-purple-400 hover:shadow-lg transition-all duration-200 group transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-xl flex items-center justify-center group-hover:from-purple-500 group-hover:to-indigo-500 transition-all duration-200 mt-1">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-900 font-bold text-lg group-hover:text-purple-800 transition-colors duration-200 leading-tight">
                              {suggestion}
                            </div>
                            <div className="text-gray-500 text-base mt-2">
                              Click to explore this topic
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {!explanation && (
          <div className="mt-16 space-y-12">
            <div className="text-center">
              <h3 className="text-3xl font-bold text-gray-900 mb-3">✨ Get Inspired</h3>
              <p className="text-lg text-gray-600 mb-8">Try these fascinating topics to see the magic in action</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { topic: "Why do we dream?", audience: "curious teenager", emoji: "💭" },
                  { topic: "How does WiFi work?", audience: "tech-curious parent", emoji: "📶" },
                  { topic: "What causes déjà vu?", audience: "psychology student", emoji: "🧠" },
                  { topic: "Why do cats always land on their feet?", audience: "cat lover", emoji: "🐱" },
                  { topic: "How do vaccines work?", audience: "health-conscious person", emoji: "💉" },
                  { topic: "Why is the sky blue?", audience: "curious 8 year old", emoji: "🌌" },
                  { topic: "How does cryptocurrency work?", audience: "financial beginner", emoji: "₿" },
                  { topic: "Why do we get hiccups?", audience: "medical student", emoji: "🫁" },
                  { topic: "How do magnets work?", audience: "physics enthusiast", emoji: "🧲" },
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example.topic, example.audience)}
                    className="bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl p-5 text-left hover:bg-white/80 hover:border-blue-300 hover:shadow-lg transition-all duration-200 group transform hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-2xl">{example.emoji}</div>
                      <div className="text-sm text-blue-600 font-semibold">Example {index + 1}</div>
                    </div>
                    <div className="text-gray-900 font-bold text-lg mb-2 group-hover:text-blue-800 transition-colors">&quot;{example.topic}&quot;</div>
                    <div className="text-gray-600 text-sm">like I&apos;m <span className="font-medium text-purple-600">{example.audience}</span></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        

      </div>
    </div>
  );
}

