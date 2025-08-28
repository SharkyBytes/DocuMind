'use client';

import Link from 'next/link';
import { FileText, LogOut } from 'lucide-react';
import { SignedIn, SignedOut, UserButton, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <header className="w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold text-blue-600">DocuMind</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <SignedOut>
            <Link 
              href="/sign-in"
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Sign In
            </Link>
          </SignedOut>
          
          <SignedIn>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
              <UserButton 
                afterSignOutUrl="/sign-in"
                appearance={{
                  elements: {
                    userButtonBox: 'h-9 w-9'
                  }
                }}
              />
            </div>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
