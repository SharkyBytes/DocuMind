'use client';

import FileUploadComponent from '../components/file-upload';
import ChatComponent from '../components/chat';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogOut } from 'lucide-react';

export default function PdfDocChat() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  // Handle redirect in useEffect to avoid setState during render
  useEffect(() => {
    if (isSignedIn === false) {
      router.push('/');
    }
  }, [isSignedIn, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Show loading while checking authentication
  if (isSignedIn === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden flex items-center justify-center">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <div className="bg-white/80 backdrop-blur-sm px-8 py-6 rounded-2xl shadow-lg border border-white/50">
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading DocuMind</h3>
            <p className="text-slate-600">Preparing your AI-powered document chat experience...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if not signed in (redirect will happen in useEffect)
  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="flex flex-col lg:flex-row h-screen relative z-10">
        {/* Sidebar with file upload - hidden on mobile, visible on desktop */}
        <div className="hidden lg:block lg:w-[30%] bg-white/90 backdrop-blur-sm shadow-2xl overflow-y-auto lg:fixed lg:left-0 lg:top-0 lg:bottom-0 z-20 border-r border-white/50">
          <div className="p-6 border-b border-white/50 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-center">
              <div className="animate-fade-in-up">
                <h2 className="text-xl font-bold text-slate-800 mb-1">
                  Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{user?.firstName || 'User'}</span>!
                </h2>
                <p className="text-sm text-slate-600">
                  Upload documents to get started
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/80 backdrop-blur-sm border border-white/50 text-slate-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-600 hover:border-red-200 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                title="Sign out"
              >
                <LogOut className="h-4 w-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
          <FileUploadComponent />
        </div>
        
        {/* Main chat area - full width on mobile, offset on desktop */}
        <div className="w-full lg:w-[70%] lg:ml-[30%] bg-gradient-to-br from-slate-50/50 to-white/50 backdrop-blur-sm min-h-screen relative">
          {/* Mobile File Upload Component - rendered for mobile hamburger menu */}
          <div className="lg:hidden">
            <FileUploadComponent />
          </div>
          <ChatComponent />
        </div>
      </div>
    </div>
  );
}
