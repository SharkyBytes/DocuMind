'use client';
import * as React from 'react';
import { FileText, Check, AlertCircle, Clock, FileUp, MessageSquare } from 'lucide-react';
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
    <div className="flex flex-col h-full w-full p-6">
      {/* Upload card with drag and drop */}
      <div 
        className={`bg-white border text-slate-800 shadow-md rounded-lg transition-all duration-300 overflow-hidden
          ${dragActive ? 'border-blue-400 scale-105 shadow-blue-400/20' :
            uploadStatus === 'uploading' || uploadStatus === 'processing' ? 'border-blue-400 shadow-blue-400/20' :
            uploadStatus === 'success' ? 'border-green-400 shadow-green-400/20' :
            uploadStatus === 'error' ? 'border-red-400 shadow-red-400/20' :
            'border-slate-200 hover:border-blue-300 hover:shadow-blue-300/10'}
        `}
        onClick={(uploadStatus === 'uploading' || uploadStatus === 'processing') ? undefined : handleFileUploadButtonClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="p-8 flex flex-col items-center text-center">
          {uploadStatus === 'uploading' ? (
            <>
              <div className="w-20 h-20 mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-xl font-semibold mb-2 animate-pulse text-slate-800">Uploading PDF...</h3>
              <p className="text-slate-500 text-sm">Please wait while we upload your document</p>
              <div className="w-full bg-slate-200 h-2 mt-6 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse-width rounded-full"></div>
              </div>
            </>
          ) : uploadStatus === 'processing' ? (
            <>
              <div className="w-20 h-20 mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">
                {progressDetails?.stage === 'initialization' ? 'Analyzing Document...' :
                 progressDetails?.stage === 'text_extraction' ? 'Extracting Text...' :
                 progressDetails?.stage === 'text_extracted' ? 'Text Extraction Complete' :
                 progressDetails?.stage === 'embedding_generation' ? 'Processing Content...' :
                 'Processing Document...'}
              </h3>
              
              <p className="text-slate-600 text-sm mb-4 font-medium">{processingMessage}</p>
              
              {/* Main Progress Bar */}
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
              <div className="text-sm font-medium text-blue-600 mb-4">{processingProgress}%</div>
              
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
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-center text-green-700">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Ready to chat!</span>
                  </div>
                </div>
              )}
            </>
          ) : uploadStatus === 'success' ? (
            <>
              <div className="w-20 h-20 mb-4 rounded-full bg-green-500/20 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-green-500/10 animate-ping"></div>
                <Check className="w-10 h-10 text-green-500 animate-scale-in" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">Processing Complete!</h3>
              <p className="text-slate-500 text-sm">Your document is ready for chat</p>
            </>
          ) : uploadStatus === 'error' ? (
            <>
              <div className="w-20 h-20 mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500 animate-shake" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">Upload Failed</h3>
              <p className="text-slate-500 text-sm">{errorMessage || 'Please try again'}</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center relative overflow-hidden group-hover:shadow-lg transition-all duration-300">
                <div className={`absolute inset-0 ${dragActive ? 'bg-blue-500/30 animate-pulse' : 'bg-blue-500/0'}`}></div>
                <FileUp className={`w-10 h-10 text-white transition-transform duration-300 ${dragActive ? 'scale-110' : ''}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-800">Upload PDF File</h3>
              <p className="text-slate-500 text-sm mb-2">Click to browse or drag and drop</p>
              <div className="flex items-center justify-center text-xs text-slate-500 mt-2">
                <div className="flex items-center border border-slate-200 rounded-full px-3 py-1">
                  <FileText size={12} className="mr-1" />
                  <span>PDF files only</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* File history with animations */}
      {uploadedFiles.length > 0 && (
        <div className="mt-8 animate-fade-in">
          <h3 className="text-lg font-semibold mb-3 text-slate-700 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Uploaded Documents
          </h3>
          <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-2 scrollbar-thin">
            {uploadedFiles.map((file, index) => (
              <div 
                key={index} 
                className="bg-white border border-slate-200 rounded-lg p-3 flex items-center group hover:bg-blue-50 transition-all duration-200 animate-slide-in" 
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-md mr-3 shadow-md group-hover:scale-110 transition-transform duration-200">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 text-sm font-medium truncate">{file.name}</p>
                  <div className="flex items-center text-slate-500 text-xs">
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
  );
};

export default FileUploadComponent;
