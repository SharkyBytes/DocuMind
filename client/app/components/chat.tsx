'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as React from 'react';
import { Send, FileText, Book, ThumbsUp, Star, Info, MessageSquare } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

interface Doc {
  pageContent?: string;
  metadata?: {
    loc?: {
      pageNumber?: number;
    };
    source?: string;
    pdf?: string;
    filename?: string;
  };
  score?: number; // Relevance score if available
}

interface IMessage {
  role: 'assistant' | 'user';
  content?: string;
  documents?: Doc[];
}

const ChatComponent: React.FC = () => {
  const { user } = useUser();
  const [message, setMessage] = React.useState<string>('');
  const [messages, setMessages] = React.useState<IMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat whenever messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendChatMessage = async () => {
    if (!message.trim()) return;
    
    // Check if user is available
    if (!user?.id) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'User authentication required. Please sign in again.',
        },
      ]);
      return;
    }
    
    const userMessage = message;
    setMessage('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/chat?message=${encodeURIComponent(userMessage)}&userId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data?.message,
          documents: data?.docs,
        },
      ]);
    } catch (error) {
      console.error('Error fetching response:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Sorry, I encountered an error while processing your request.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  // Function to render message content with markdown-like formatting
  const renderMessageContent = (content: string) => {
    if (!content) return null;
    
    // Split by newlines to handle paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim() !== '');
    
    return (
      <>
        {paragraphs.map((paragraph, idx) => {
          // Check if this is a code block
          if (paragraph.startsWith('```') && paragraph.endsWith('```')) {
            const code = paragraph.slice(3, -3);
            return (
              <pre key={idx} className="mb-3 text-sm font-mono bg-slate-800 text-white p-3 rounded-md overflow-x-auto">
                {code}
              </pre>
            );
          }
          
          // Check if this is a list
          if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('* ')) {
            const items = paragraph.split('\n').filter(item => item.trim().startsWith('- ') || item.trim().startsWith('* '));
            return (
              <ul key={idx} className="list-disc pl-5 mb-3">
                {items.map((item, itemIdx) => {
                  // Process the list item for links
                  const processedItem = processLinksInText(item.replace(/^[*-]\s+/, ''));
                  return <li key={itemIdx} dangerouslySetInnerHTML={{ __html: processedItem }} />;
                })}
              </ul>
            );
          }
          let formattedText = paragraph;
          // Handle inline code, bold and italics
          
          // Replace inline code
          formattedText = formattedText.replace(/`([^`]+)`/g, (_, code) => 
            `<code>${code}</code>`
          );
          
          // Replace bold text
          formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, (_, text) => 
            `<strong>${text}</strong>`
          );
          
          // Replace italic text
          formattedText = formattedText.replace(/\*([^*]+)\*/g, (_, text) => 
            `<em>${text}</em>`
          );
          
          // Process links in the text
          formattedText = processLinksInText(formattedText);
          
          return (
            <p 
              key={idx} 
              className="mb-3 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />
          );
        })}
      </>
    );
  };
  
  // Function to convert URLs in text to clickable links
  const processLinksInText = (text: string): string => {
    // Match URLs starting with http:// or https:// and make them clickable
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      // Ensure the URL is properly encoded
      try {
        // Create a URL object to validate and normalize the URL
        new URL(url);
        // Return an anchor tag with target="_blank" to open in a new tab
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline">${url}</a>`;
      } catch (e) {
        // If the URL is invalid, return it as is
        return url;
      }
    });
  };

  // Function to calculate and display relevance stars based on score
  const renderRelevanceStars = (score?: number) => {
    if (score === undefined) return null;
    
    // Normalize score to be between 0 and 5
    const normalizedScore = score > 1 ? 5 : Math.round(score * 5);
    
    return (
      <div className="flex items-center" title={`Relevance score: ${score.toFixed(2)}`}>
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            size={12} 
            className={`${i < normalizedScore ? 'text-amber-500 fill-amber-500' : 'text-gray-300'} mr-0.5`} 
          />
        ))}
      </div>
    );
  };

  // Function to extract key information from document content
  const extractKeyInformation = (doc: Doc) => {
    if (!doc.pageContent) return null;
    
    // Try to extract the most relevant sentence or paragraph
    const sentences = doc.pageContent.split(/[.!?]/).filter(s => s.trim().length > 20);
    if (sentences.length === 0) return null;
    
    // Take the first substantial sentence as a snippet
    let snippet = sentences[0].trim() + (sentences[0].endsWith('.') ? '' : '...');
    
    // Truncate if necessary
    if (snippet.length > 100) {
      snippet = snippet.substring(0, 100) + '...';
    }
    
    // Process any URLs in the snippet to make them clickable
    snippet = processLinksInText(snippet);
    
    return (
      <div 
        className="text-xs text-gray-600 mt-1 italic"
        dangerouslySetInnerHTML={{ __html: `"${snippet}"` }}
      />
    );
  };

  // Function to render document sources with links and relevance
  const renderDocumentSources = (docs: Doc[] | undefined) => {
    if (!docs || docs.length === 0) return null;
    
    // Sort documents by score (if available) or default order
    const sortedDocs = [...docs].sort((a, b) => {
      if (a.score !== undefined && b.score !== undefined) {
        return b.score - a.score; // Higher score first
      }
      return 0;
    });
    
    // Group documents by source/filename to avoid duplicates
    const sourcesMap = new Map<string, Doc[]>();
    sortedDocs.forEach(doc => {
      const source = doc.metadata?.source || doc.metadata?.filename || 'Unknown Source';
      if (!sourcesMap.has(source)) {
        sourcesMap.set(source, []);
      }
      sourcesMap.get(source)?.push(doc);
    });
    
    return (
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md text-sm border border-blue-100 animate-fade-in">
        <h4 className="font-semibold flex items-center mb-3 text-blue-800">
          <FileText size={16} className="mr-2" /> 
          Source Documents
        </h4>
        <div className="space-y-4">
          {Array.from(sourcesMap.entries()).map(([source, docsForSource], idx) => {
            // Get unique page numbers
            const pageNumbers = docsForSource
              .map(doc => doc.metadata?.loc?.pageNumber)
              .filter((value, index, self) => 
                value !== undefined && self.indexOf(value) === index
              )
              .sort((a, b) => (a || 0) - (b || 0));
              
            // Get most relevant doc for this source
            const mostRelevantDoc = docsForSource.reduce((prev, current) => 
              (current.score || 0) > (prev.score || 0) ? current : prev, docsForSource[0]
            );
            
            return (
              <div key={idx} className="bg-white p-3 rounded-md shadow-sm border border-blue-50 hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <Book size={14} className="mr-2 mt-1 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-blue-700">{source}</div>
                      {renderRelevanceStars(mostRelevantDoc?.score)}
                    </div>
                    
                    {extractKeyInformation(mostRelevantDoc)}
                    
                    {pageNumbers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pageNumbers.map((page, pageIdx) => (
                          <span key={pageIdx} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center">
                            <Info size={10} className="mr-1" /> Page {page}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen relative">
      {/* Main chat area - scrollable */}
      <div 
        ref={chatContainerRef}
        className="p-6 flex-1 overflow-y-auto scrollbar-thin pb-20"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f8fafc'
        }}
      >
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-800 flex justify-center items-center">
          <MessageSquare className="mr-2 text-blue-600" size={28} />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            DocuMind Chat
          </span>
        </h1>
        
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
            <div className="w-24 h-24 mb-6 rounded-full bg-blue-50 flex items-center justify-center animate-pulse">
              <FileText size={48} className="text-blue-400" />
            </div>
            <p className="text-lg font-medium mb-2">Upload a PDF and ask questions about it</p>
            <p className="text-sm text-center max-w-md">
              Your documents will be analyzed and you can ask specific questions about their content.
              The AI will provide answers with references to the source material.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg max-w-[85%] chat-message ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white ml-auto shadow-md'
                    : 'bg-white border border-slate-200 shadow-md'
                } transition-all duration-300 animate-slide-in`}
              >
                <div className={msg.role === 'user' ? 'text-white' : 'text-slate-800'}>
                  {msg.content && renderMessageContent(msg.content)}
                </div>
                
                {msg.role === 'assistant' && renderDocumentSources(msg.documents)}
              </div>
            ))}
            {isLoading && (
              <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm max-w-[85%] chat-message">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area - fixed at bottom */}
      <div className="p-4 border-t border-slate-200 bg-white shadow-lg absolute bottom-0 left-0 right-0">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              className="flex-1 py-6 pr-12 pl-4 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all"
              disabled={isLoading}
            />
            {message.length > 0 && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-400">
                {message.length} chars
              </div>
            )}
          </div>
          <Button 
            onClick={handleSendChatMessage} 
            disabled={!message.trim() || isLoading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all duration-300 h-12 w-12 rounded-full"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
