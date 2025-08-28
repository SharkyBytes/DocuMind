'use client';

import { SignUp } from "@clerk/nextjs";
import { ArrowRight, FileText } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="absolute top-6 left-6">
        <div className="flex items-center gap-2">
          <FileText className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-blue-600">DocuMind</span>
        </div>
      </div>
      
      <div className="w-full max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row shadow-xl rounded-2xl overflow-hidden">
        {/* Left Panel - Sign Up Component */}
        <div className="w-full md:w-1/2 bg-white p-8 sm:p-12 flex flex-col justify-center order-2 md:order-1">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create an Account</h2>
            <p className="text-gray-600">
              Join DocuMind and start analyzing your documents
            </p>
          </div>
          
          <div className="flex justify-center">
            <SignUp 
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
              signInUrl="/sign-in"
            />
          </div>
          
          <div className="mt-8 text-center text-sm">
            <p className="text-gray-600">
              Already have an account?{' '}
              <a href="/sign-in" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in <ArrowRight className="inline h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
        
        {/* Right Panel - Decorative Side */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-600 to-blue-700 p-12 flex-col justify-center relative text-white order-1 md:order-2">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold mb-6 relative">Start Your Journey</h1>
          <p className="text-lg mb-8 opacity-90 relative">
            Create an account and unlock the full potential of your documents with AI-powered analysis.
          </p>
          
          <div className="space-y-4 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p>Create your personal document repository</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <p>Securely store and access your files</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <p>Collaborate and share document insights</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
