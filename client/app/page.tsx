'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, MessageSquare, Upload } from 'lucide-react';

export default function Home() {
  // Move all hooks to the top level of the component to maintain consistent hook order
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen relative z-10">
          <div className="mb-8 flex flex-col items-center">
            <div className="flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 mb-6 shadow-lg transform hover:scale-110 transition-transform duration-300 animate-bounce-slow">
              <FileText className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 text-center mb-4 animate-fade-in-up">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">DocuMind</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 text-center max-w-3xl animate-fade-in-up animation-delay-200">
              Upload your documents and chat with them using AI-powered insights
            </p>
          </div>
          
          {/* Animated Get Started Button - Moved above features */}
          <div className="mb-12 animate-fade-in-up animation-delay-400">
            <Link
              href="/sign-in"
              className="group relative px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center text-base sm:text-lg font-semibold overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              <span className="relative z-10 flex items-center">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
              </span>
              {/* Floating particles effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-ping"></div>
                <div className="absolute bottom-2 right-4 w-1 h-1 bg-white rounded-full animate-ping animation-delay-200"></div>
                <div className="absolute top-3 right-6 w-1 h-1 bg-white rounded-full animate-ping animation-delay-400"></div>
              </div>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl w-full px-4 sm:px-0">
            <div className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-white/50 animate-fade-in-up animation-delay-600">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 mb-6 shadow-md transform hover:rotate-12 transition-transform duration-300">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-800">Upload Documents</h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">Upload your PDFs and let our AI analyze the content for you.</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-white/50 animate-fade-in-up animation-delay-800">
              <div className="flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 mb-6 shadow-md transform hover:rotate-12 transition-transform duration-300">
                <MessageSquare className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-800">Chat with Documents</h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">Ask questions about your documents and get instant answers.</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-white/50 animate-fade-in-up animation-delay-1000">
              <div className="flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 mb-6 shadow-md transform hover:rotate-12 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 sm:h-8 sm:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-800">Secure & Private</h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">Your documents are securely stored and processed with privacy in mind.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen relative z-10">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 mb-6 shadow-lg transform hover:scale-110 transition-transform duration-300 animate-bounce-slow">
            <FileText className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 text-center mb-4 animate-fade-in-up">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{user?.firstName || `User`}</span>!
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 text-center max-w-3xl animate-fade-in-up animation-delay-200">
            Ready to chat with your documents using AI-powered insights
          </p>
        </div>
        
        {/* Animated Get Started Button - Moved above features */}
        <div className="mb-12 animate-fade-in-up animation-delay-400">
          <Link
            href="/pdf-doc-chat"
            className="group relative px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center text-base sm:text-lg font-semibold overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
            <span className="relative z-10 flex items-center">
              Let's Chat
              <MessageSquare className="ml-2 h-4 w-4 sm:h-5 sm:w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
            </span>
            {/* Floating particles effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-ping"></div>
              <div className="absolute bottom-2 right-4 w-1 h-1 bg-white rounded-full animate-ping animation-delay-200"></div>
              <div className="absolute top-3 right-6 w-1 h-1 bg-white rounded-full animate-ping animation-delay-400"></div>
            </div>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl w-full px-4 sm:px-0">
          <div className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-white/50 animate-fade-in-up animation-delay-600">
            <div className="flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 mb-6 shadow-md transform hover:rotate-12 transition-transform duration-300">
              <Upload className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-800">Upload Documents</h3>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">Upload your PDFs and let our AI analyze the content for you.</p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-white/50 animate-fade-in-up animation-delay-800">
            <div className="flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 mb-6 shadow-md transform hover:rotate-12 transition-transform duration-300">
              <MessageSquare className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-800">Chat with Documents</h3>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">Ask questions about your documents and get instant answers.</p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-white/50 animate-fade-in-up animation-delay-1000">
            <div className="flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 mb-6 shadow-md transform hover:rotate-12 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 sm:h-8 sm:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-800">Secure & Private</h3>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">Your documents are securely stored and processed with privacy in mind.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
