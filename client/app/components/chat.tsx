'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as React from 'react';
import { Send, FileText, Book } from 'lucide-react';

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
}

interface IMessage {
  role: 'assistant' | 'user';
  content?: string;
  documents?: Doc[];
}

const ChatComponent: React.FC = () => {
  const [message, setMessage] = React.useState<string>('');
  const [messages, setMessages] = React.useState<IMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat whenever messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendChatMessage = async () => {
    if (!message.trim()) return;
    
    const userMessage = message;
    setMessage('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/chat?message=${encodeURIComponent(userMessage)}`);
      const data = await res.json();
      
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
          content: 'Sorry, I encountered an error while processing your request.',
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
              <pre key={idx} className="mb-3 text-sm font-mono">
                {code}
              </pre>
            );
          }
          
          // Check if this is a list
          if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('* ')) {
            const items = paragraph.split('\n').filter(item => item.trim().startsWith('- ') || item.trim().startsWith('* '));
            return (
              <ul key={idx} className="list-disc pl-5 mb-3">
                {items.map((item, itemIdx) => (
                  <li key={itemIdx}>{item.replace(/^[*-]\s+/, '')}</li>
                ))}
              </ul>
            );
          }
          
          // Handle inline code, bold and italics
          let formattedText = paragraph;
          
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
          
          return (
            <p 
              key={idx} 
              className="mb-3"
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />
          );
        })}
      </>
    );
  };

  // Function to render document sources with links
  const renderDocumentSources = (docs: Doc[] | undefined) => {
    if (!docs || docs.length === 0) return null;
    
    // Group documents by source/filename to avoid duplicates
    const sourcesMap = new Map<string, Doc[]>();
    docs.forEach(doc => {
      const source = doc.metadata?.source || doc.metadata?.filename || 'Unknown Source';
      if (!sourcesMap.has(source)) {
        sourcesMap.set(source, []);
      }
      sourcesMap.get(source)?.push(doc);
    });
    
    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-md text-sm border border-blue-100">
        <h4 className="font-semibold flex items-center mb-2 text-blue-800">
          <FileText size={16} className="mr-2" /> Sources
        </h4>
        <div className="space-y-3">
          {Array.from(sourcesMap.entries()).map(([source, docsForSource], idx) => {
            // Get unique page numbers
            const pageNumbers = docsForSource
              .map(doc => doc.metadata?.loc?.pageNumber)
              .filter((value, index, self) => 
                value !== undefined && self.indexOf(value) === index
              )
              .sort((a, b) => (a || 0) - (b || 0));
              
            return (
              <div key={idx} className="flex items-start">
                <Book size={14} className="mr-2 mt-1 text-blue-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-blue-700">{source}</div>
                  {pageNumbers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pageNumbers.map((page, pageIdx) => (
                        <span key={pageIdx} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                          Page {page}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-1 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">DocuMind Chat</h1>
        
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
            <FileText size={48} className="mb-4 text-slate-400" />
            <p className="text-lg">Upload a PDF and ask questions about it</p>
            <p className="text-sm mt-2">Your documents will be analyzed and ready for queries</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg max-w-[85%] chat-message ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white ml-auto shadow-md'
                    : 'bg-white border border-slate-200 shadow-md'
                }`}
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
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            className="flex-1 py-6"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendChatMessage} 
            disabled={!message.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
