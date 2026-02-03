'use client';

import { useState, useEffect, useRef } from 'react';
import { askCommish, getExampleQuestions, checkAIStatus } from '@/lib/api';

interface Message {
  role: 'user' | 'commish';
  content: string;
  sources?: string[];
}

export default function AskTheCommish() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);
  const [aiAvailable, setAiAvailable] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check AI availability and load example questions
    async function init() {
      try {
        const status = await checkAIStatus();
        setAiAvailable(status.available);
        
        if (status.available) {
          const examples = await getExampleQuestions();
          setExampleQuestions(examples.questions);
        }
      } catch (err) {
        console.error('Failed to initialize Ask the Commish:', err);
      }
    }
    init();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const userQuestion = question.trim();
    setQuestion('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userQuestion }]);
    setIsLoading(true);

    try {
      const response = await askCommish(userQuestion);
      setMessages(prev => [...prev, { 
        role: 'commish', 
        content: response.answer,
        sources: response.sources_used 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'commish', 
        content: "Sorry, I'm having trouble thinking right now. Try again in a moment! 🍩" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (q: string) => {
    setQuestion(q);
  };

  if (!aiAvailable) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2"
        aria-label="Ask the Commish"
      >
        <span className="text-2xl">🍩</span>
        {!isOpen && <span className="hidden sm:inline font-medium">Ask the Commish</span>}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col max-h-[70vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-pink-500 to-pink-600 rounded-t-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍩</span>
              <div>
                <h3 className="font-bold text-white">Ask the Commish</h3>
                <p className="text-xs text-pink-100">Your league questions, answered</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
            {messages.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  Got questions about the league? I've got answers! 📊
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">
                    Try asking:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {exampleQuestions.slice(0, 4).map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleExampleClick(q)}
                        className="text-xs px-3 py-1.5 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {msg.role === 'commish' && (
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-sm">🍩</span>
                        <span className="text-xs font-medium text-pink-600 dark:text-pink-400">Commish</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🍩</span>
                    <span className="text-xs text-pink-600 dark:text-pink-400">Commish is thinking</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about the league..."
                className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 dark:disabled:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
              Powered by AI • Only answers from league data
            </p>
          </form>
        </div>
      )}
    </>
  );
}
