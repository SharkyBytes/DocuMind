'use client';

import { SignIn } from "@clerk/nextjs";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="absolute top-6 left-6">
        <div className="flex items-center gap-2">
          <FileText className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-blue-600">DocuMind</span>
        </div>
      </div>
      
      <div className="w-full max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row shadow-xl rounded-2xl overflow-hidden">
        {/* Left Panel - Decorative Side */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 flex-col justify-center relative text-white">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold mb-6 relative">Welcome to DocuMind</h1>
          <p className="text-lg mb-8 opacity-90 relative">
            Your intelligent document assistant that helps you extract insights from PDFs and documents.
          </p>
          
          <div className="space-y-4 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p>Upload and analyze PDFs instantly</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p>Ask questions about your documents</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p>Get AI-powered insights and summaries</p>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Sign In Component */}
        <div className="w-full md:w-1/2 bg-white p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h2>
            <p className="text-gray-600">
              Access your documents and continue your work
            </p>
          </div>
          
          <div className="flex justify-center">
            <SignIn 
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
                  card: 'shadow-none',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'border border-gray-300 shadow-sm',
                  formFieldLabel: 'text-gray-700',
                  formFieldInput: 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500',
                }
              }}
              redirectUrl="/"
              signUpUrl="/sign-up"
            />
          </div>
          
          <div className="mt-8 text-center text-sm">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <a href="/sign-up" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign up for free <ArrowRight className="inline h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
