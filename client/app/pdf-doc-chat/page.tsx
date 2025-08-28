'use client';

import FileUploadComponent from '../components/file-upload';
import ChatComponent from '../components/chat';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function PdfDocChat() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Redirect to home if not signed in
  if (!isSignedIn) {
    router.push('/');
    return null;
  }

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen overflow-hidden">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Sidebar with file upload - fixed position */}
        <div className="lg:w-[30%] bg-white shadow-xl overflow-y-auto lg:fixed lg:left-0 lg:top-0 lg:bottom-0 z-10 border-r border-slate-200">
          <div className="p-4 border-b border-slate-200 bg-blue-50">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Welcome, {user?.firstName || 'User'}!
                </h2>
                <p className="text-sm text-slate-600">
                  Upload documents to get started
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3 w-3" />
                <span>Logout</span>
              </button>
            </div>
          </div>
          <FileUploadComponent />
        </div>
        
        {/* Main chat area - scrollable with offset margin */}
        <div className="lg:w-[70%] lg:ml-[30%] bg-slate-50 min-h-screen">
          <ChatComponent />
        </div>
      </div>
    </div>
  );
}
