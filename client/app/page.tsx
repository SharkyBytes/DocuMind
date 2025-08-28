'use client';

import FileUploadComponent from './components/file-upload';
import ChatComponent from './components/chat';
import { useUser, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, MessageSquare, Upload, LogOut } from 'lucide-react';

export default function Home() {
  // Move all hooks to the top level of the component to maintain consistent hook order
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen">
          <div className="mb-8 flex flex-col items-center">
            <div className="flex items-center justify-center h-20 w-20 rounded-full bg-blue-600 mb-6">
              <FileText className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 text-center mb-4">
              Welcome to <span className="text-blue-600">DocuMind</span>
            </h1>
            <p className="text-xl text-slate-600 text-center max-w-2xl">
              Upload your documents and chat with them using AI-powered insights
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 max-w-5xl w-full">
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">Upload Documents</h3>
              <p className="text-slate-600">Upload your PDFs and let our AI analyze the content for you.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">Chat with Documents</h3>
              <p className="text-slate-600">Ask questions about your documents and get instant answers.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">Secure & Private</h3>
              <p className="text-slate-600">Your documents are securely stored and processed with privacy in mind.</p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Link
              href="/sign-in"
              className="px-10 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center text-lg font-medium"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex items-center justify-center h-20 w-20 rounded-full bg-blue-600 mb-6">
            <FileText className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 text-center mb-4">
            Welcome back, <span className="text-blue-600">{user?.firstName || 'User'}</span>!
          </h1>
          <p className="text-xl text-slate-600 text-center max-w-2xl">
            Ready to chat with your documents using AI-powered insights
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 max-w-5xl w-full">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-800">Upload Documents</h3>
            <p className="text-slate-600">Upload your PDFs and let our AI analyze the content for you.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-800">Chat with Documents</h3>
            <p className="text-slate-600">Ask questions about your documents and get instant answers.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-800">Secure & Private</h3>
            <p className="text-slate-600">Your documents are securely stored and processed with privacy in mind.</p>
          </div>
        </div>
        
        <div className="flex justify-center space-x-4">
          <Link
            href="/pdf-doc-chat"
            className="px-10 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center text-lg font-medium"
          >
            Let's Chat
            <MessageSquare className="ml-2 h-5 w-5" />
          </Link>
          
          {/* <button
            onClick={handleSignOut}
            className="px-6 py-4 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm flex items-center"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </button> */}
        </div>
      </div>
    </div>
  );
}
