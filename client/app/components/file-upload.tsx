'use client';
import * as React from 'react';
import { FileText, Check, AlertCircle, Clock, FileUp, MessageSquare, Menu, X } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { io, Socket } from 'socket.io-client';

interface UploadedFile {
  name: string;
  size: number;
  timestamp: Date;
}

interface ProgressData {
  userId: string;
  jobId: string;
  progress: number;
  status: 'processing' | 'completed' | 'error' | 'finalizing';
  message: string;
  details?: {
    filename?: string;
    stage?: string;
    currentDocument?: number;
    totalDocuments?: number;
    currentBatch?: number;
    totalBatches?: number;
    documentPreview?: string;
    pageNumber?: number;
    success?: boolean;
    fileSize?: number;
    totalChunks?: number;
    totalPages?: number;
    documentsInBatch?: number;
  };
}

const FileUploadComponent: React.FC = () => {
  const { user } = useUser();
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [dragActive, setDragActive] = React.useState<boolean>(false);
  const [currentJobId, setCurrentJobId] = React.useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = React.useState<number>(0);
  const [processingMessage, setProcessingMessage] = React.useState<string>('');
  const [canChat, setCanChat] = React.useState<boolean>(false);
  const [progressDetails, setProgressDetails] = React.useState<ProgressData['details'] | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState<boolean>(false);
  const socketRef = React.useRef<Socket | null>(null);

  // Initialize Socket.IO connection
  React.useEffect(() => {
    if (user?.id) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      socketRef.current = io(apiUrl);
      
      // Join user-specific room for progress updates
      socketRef.current.emit('join', user.id);
      
      // Listen for upload progress
      socketRef.current.on('uploadProgress', (data: ProgressData) => {
        if (data.jobId === currentJobId) {
          setProcessingProgress(data.progress);
          setProcessingMessage(data.message);
          setProgressDetails(data.details || null);
          
          if (data.status === 'completed') {
            setUploadStatus('success');
            setCanChat(true);
            // Close mobile menu when upload is successful
            setIsMobileMenuOpen(false);
            setTimeout(() => {
              setUploadStatus('idle');
              setCurrentJobId(null);
              setProcessingProgress(0);
              setProcessingMessage('');
              setProgressDetails(null);
            }, 3000);
          } else if (data.status === 'error') {
            setUploadStatus('error');
            setErrorMessage(data.message);
            setCurrentJobId(null);
            setProcessingProgress(0);
            setProcessingMessage('');
            setProgressDetails(null);
          }
        }
      });
      
      return () => {
        socketRef.current?.disconnect();
      };
    }
  }, [user?.id, currentJobId]);

  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        handleFileUpload(file);
      } else {
        setUploadStatus('error');
        setErrorMessage('Only PDF files are accepted');
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    }
  };

  const handleFileUploadButtonClick = () => {
    const el = document.createElement('input');
    el.setAttribute('type', 'file');
    el.setAttribute('accept', 'application/pdf');
    el.addEventListener('change', async () => {
      if (el.files && el.files.length > 0) {
        const file = el.files.item(0);
        if (file) {
          handleFileUpload(file);
        }
      }
    });
    el.click();
  };

  const handleFileUpload = async (file: File) => {
    // Check if user is available
    if (!user?.id) {
      setUploadStatus('error');
      setErrorMessage('User authentication required. Please sign in again.');
      return;
    }

    // Update upload status
    setUploadStatus('uploading');
    setErrorMessage('');
    setCanChat(false);
    
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('userId', user.id); // Include user ID

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/upload/pdf`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Set the job ID for tracking progress
      setCurrentJobId(data.jobId);
      setUploadStatus('processing');
      setProcessingProgress(0);
      setProcessingMessage('Upload successful, processing document...');
      
      // Add file to uploaded files list
      setUploadedFiles(prev => [
        {
          name: file.name,
          size: file.size,
          timestamp: new Date()
        },
        ...prev
      ]);
      
      console.log('File upload initiated with job ID:', data.jobId);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  // Format file size in KB or MB
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  // Format time elapsed since upload
  const formatTimeElapsed = (timestamp: Date): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} sec${seconds !== 1 ? 's' : ''} ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  return (
    <>
      {/* Mobile Hamburger Menu Button - Only visible on mobile */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-3 rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 hover:scale-110 active:scale-95 animate-bounce-slow"
        aria-label="Open upload menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Menu Overlay - Only visible on mobile when open */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Upload Component Container */}
      <div className={`
        ${isMobileMenuOpen 
          ? 'lg:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50 bg-white/95 backdrop-blur-md shadow-2xl transform translate-x-0' 
          : 'lg:block hidden lg:relative lg:w-full lg:h-full lg:transform-none'
        }
        transition-transform duration-300 ease-in-out overflow-hidden
      `}>
        {/* Mobile Close Button */}
        {isMobileMenuOpen && (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-sm text-gray-600 p-2 rounded-xl hover:bg-white transition-colors hover:scale-105 active:scale-95 shadow-md"
            aria-label="Close upload menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col h-full w-full p-4 sm:p-6">
          {/* Mobile User Greeting - Only shown in mobile menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 animate-fade-in-up">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{user?.firstName || 'User'}</span>!
                  </h2>
                  <p className="text-sm text-slate-600">
                    Upload documents to get started
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Upload card with drag and drop */}
          <div 
            className={`bg-white/90 backdrop-blur-sm border-2 text-slate-800 shadow-lg rounded-2xl transition-all duration-300 overflow-hidden cursor-pointer
              ${dragActive ? 'border-blue-400 scale-105 shadow-blue-400/30 bg-blue-50/50' :
                uploadStatus === 'uploading' || uploadStatus === 'processing' ? 'border-blue-400 shadow-blue-400/30 bg-blue-50/30' :
                uploadStatus === 'success' ? 'border-green-400 shadow-green-400/30 bg-green-50/30' :
                uploadStatus === 'error' ? 'border-red-400 shadow-red-400/30 bg-red-50/30' :
                'border-white/50 hover:border-blue-300 hover:shadow-blue-300/20 hover:bg-blue-50/30 active:scale-95'}
              ${isMobileMenuOpen ? 'touch-manipulation' : ''}
            `}
            onClick={(uploadStatus === 'uploading' || uploadStatus === 'processing') ? undefined : handleFileUploadButtonClick}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className={`${isMobileMenuOpen ? 'p-6' : 'p-6 sm:p-8'} flex flex-col items-center text-center`}>
              {uploadStatus === 'uploading' ? (
                <>
                  <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 flex items-center justify-center animate-pulse">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 animate-pulse bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Uploading PDF...</h3>
                  <p className="text-slate-600 text-sm font-medium">Please wait while we upload your document</p>
                  <div className="w-full bg-gradient-to-r from-slate-200 to-slate-300 h-3 mt-6 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-pulse-width rounded-full shadow-lg"></div>
                  </div>
                </>
              ) : uploadStatus === 'processing' ? (
                <>
                  <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 flex items-center justify-center animate-pulse">
                    <div className="w-10 h-10 border-4 border-gradient-to-r from-blue-500 to-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {progressDetails?.stage === 'initialization' ? 'Analyzing Document...' :
                     progressDetails?.stage === 'text_extraction' ? 'Extracting Text...' :
                     progressDetails?.stage === 'text_extracted' ? 'Text Extraction Complete' :
                     progressDetails?.stage === 'embedding_generation' ? 'Processing Content...' :
                     'Processing Document...'}
                  </h3>
                  
                  <p className="text-slate-700 text-sm mb-4 font-medium">{processingMessage}</p>
                  
                  {/* Main Progress Bar */}
                  <div className="w-full bg-gradient-to-r from-slate-200 to-slate-300 h-3 rounded-full overflow-hidden mb-2 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full transition-all duration-500 shadow-lg"
                      style={{ width: `${processingProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">{processingProgress}%</div>
              
              {/* Detailed Progress Information */}
              {progressDetails && (
                <div className="w-full max-w-sm">
                  {/* File Information */}
                  {progressDetails.filename && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-100">
                      <div className="flex items-center text-blue-800 text-sm">
                        <FileText className="w-4 h-4 mr-2" />
                        <span className="font-medium truncate">{progressDetails.filename}</span>
                      </div>
                      {progressDetails.totalChunks && (
                        <div className="text-blue-600 text-xs mt-1">
                          {progressDetails.totalChunks} content chunks • {progressDetails.totalPages} pages
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Processing Details */}
                  {progressDetails.stage === 'embedding_generation' && progressDetails.currentDocument && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-3 border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-700 text-sm font-medium">Content Processing</span>
                        <span className="text-slate-600 text-xs">
                          {progressDetails.currentDocument}/{progressDetails.totalDocuments}
                        </span>
                      </div>
                      
                      {/* Mini progress bar for current batch */}
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                        <div 
                          className="h-full bg-slate-400 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${((progressDetails.currentDocument || 0) / (progressDetails.totalDocuments || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                      
                      {progressDetails.currentBatch && (
                        <div className="text-slate-500 text-xs">
                          Batch {progressDetails.currentBatch} of {progressDetails.totalBatches}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Current Content Preview */}
                  {progressDetails.documentPreview && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                      <div className="flex items-center text-green-800 text-xs font-medium mb-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        Currently Processing
                        {progressDetails.pageNumber && (
                          <span className="ml-1">(Page {progressDetails.pageNumber})</span>
                        )}
                      </div>
                      <div className="text-green-700 text-xs leading-relaxed">
                        &quot;{progressDetails.documentPreview}...&quot;
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {canChat && (
                <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
                  <div className="flex items-center justify-center text-green-700">
                    <MessageSquare className="w-4 h-4 mr-2 animate-bounce" />
                    <span className="text-sm font-bold">Ready to chat!</span>
                  </div>
                </div>
              )}
            </>
          ) : uploadStatus === 'success' ? (
            <>
              <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center relative overflow-hidden animate-bounce-slow">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 animate-ping"></div>
                <Check className="w-10 h-10 text-green-500 animate-scale-in" />
              </div>
              <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Processing Complete!</h3>
              <p className="text-slate-600 text-sm font-medium">Your document is ready for chat</p>
            </>
          ) : uploadStatus === 'error' ? (
            <>
              <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-r from-red-500/20 to-pink-500/20 flex items-center justify-center animate-pulse">
                <AlertCircle className="w-10 h-10 text-red-500 animate-shake" />
              </div>
              <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">Upload Failed</h3>
              <p className="text-slate-600 text-sm font-medium">{errorMessage || 'Please try again'}</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center relative overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-110 animate-float">
                <div className={`absolute inset-0 ${dragActive ? 'bg-blue-500/30 animate-pulse' : 'bg-blue-500/0'}`}></div>
                <FileUp className={`w-10 h-10 text-white transition-transform duration-300 ${dragActive ? 'scale-110 rotate-12' : ''}`} />
                {!dragActive && (
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-ping"></div>
                    <div className="absolute bottom-2 right-4 w-1 h-1 bg-white rounded-full animate-ping animation-delay-200"></div>
                    <div className="absolute top-3 right-6 w-1 h-1 bg-white rounded-full animate-ping animation-delay-400"></div>
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Upload PDF File</h3>
              <p className="text-slate-600 text-sm mb-2 font-medium">Click to browse or drag and drop</p>
              <div className="flex items-center justify-center text-xs text-slate-500 mt-2">
                <div className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full px-3 py-1 shadow-sm">
                  <FileText size={12} className="mr-1 text-blue-600" />
                  <span className="font-medium">PDF files only</span>
                </div>
              </div>
            </>
          )}
            </div>
          </div>
          
          {/* File history with animations */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6 animate-fade-in">
              <h3 className="text-lg font-bold mb-3 text-slate-700 flex items-center">
                <Clock className="w-4 h-4 mr-2 text-blue-600" />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Uploaded Documents</span>
              </h3>
              <div className={`space-y-3 ${isMobileMenuOpen ? 'max-h-[calc(100vh-480px)]' : 'max-h-[calc(100vh-380px)]'} overflow-y-auto pr-2 scrollbar-thin`}>
                {uploadedFiles.map((file, index) => (
                  <div 
                    key={index} 
                    className="bg-white/90 backdrop-blur-sm border border-white/50 rounded-xl p-4 flex items-center group hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 animate-slide-in shadow-sm hover:shadow-md transform hover:-translate-y-1" 
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl mr-3 shadow-md group-hover:scale-110 transition-transform duration-200">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm font-semibold truncate">{file.name}</p>
                      <div className="flex items-center text-slate-500 text-xs font-medium">
                        <span>{formatFileSize(file.size)}</span>
                        <span className="mx-1">•</span>
                        <span title={file.timestamp.toLocaleString()}>{formatTimeElapsed(file.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FileUploadComponent;
