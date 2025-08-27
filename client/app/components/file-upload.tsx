'use client';
import * as React from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';

interface UploadedFile {
  name: string;
  size: number;
  timestamp: Date;
}

const FileUploadComponent: React.FC = () => {
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const handleFileUploadButtonClick = () => {
    const el = document.createElement('input');
    el.setAttribute('type', 'file');
    el.setAttribute('accept', 'application/pdf');
    el.addEventListener('change', async (ev) => {
      if (el.files && el.files.length > 0) {
        const file = el.files.item(0);
        if (file) {
          // Update upload status
          setUploadStatus('uploading');
          setErrorMessage('');
          
          const formData = new FormData();
          formData.append('pdf', file);

          try {
            const response = await fetch('http://localhost:8000/upload/pdf', {
              method: 'POST',
              body: formData,
            });
            
            if (!response.ok) {
              throw new Error(`Upload failed with status: ${response.status}`);
            }
            
            // Add file to uploaded files list
            setUploadedFiles(prev => [
              {
                name: file.name,
                size: file.size,
                timestamp: new Date()
              },
              ...prev
            ]);
            
            setUploadStatus('success');
            console.log('File uploaded successfully');
            
            // Reset success status after 3 seconds
            setTimeout(() => {
              setUploadStatus('idle');
            }, 3000);
          } catch (error) {
            console.error('Upload error:', error);
            setUploadStatus('error');
            setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
          }
        }
      }
    });
    el.click();
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

  return (
    <div className="flex flex-col h-full w-full p-6">
      <h1 className="text-2xl font-bold mb-6 text-center text-white">DocuMind</h1>
      
      {/* Upload card */}
      <div 
        className={`bg-slate-800 text-white shadow-xl rounded-lg border-2 transition-all ${
          uploadStatus === 'uploading' ? 'border-blue-400 shadow-blue-400/20' :
          uploadStatus === 'success' ? 'border-green-400 shadow-green-400/20' :
          uploadStatus === 'error' ? 'border-red-400 shadow-red-400/20' :
          'border-slate-700 hover:border-blue-500 hover:shadow-blue-500/10'
        } cursor-pointer`}
        onClick={uploadStatus === 'uploading' ? undefined : handleFileUploadButtonClick}
      >
        <div className="p-8 flex flex-col items-center text-center">
          {uploadStatus === 'uploading' ? (
            <>
              <div className="w-16 h-16 mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Uploading PDF...</h3>
              <p className="text-slate-400 text-sm">Please wait while we process your document</p>
            </>
          ) : uploadStatus === 'success' ? (
            <>
              <div className="w-16 h-16 mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Complete!</h3>
              <p className="text-slate-400 text-sm">Your document has been processed</p>
            </>
          ) : uploadStatus === 'error' ? (
            <>
              <div className="w-16 h-16 mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Failed</h3>
              <p className="text-slate-400 text-sm">{errorMessage || 'Please try again'}</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload PDF File</h3>
              <p className="text-slate-400 text-sm">Click to browse or drag and drop</p>
            </>
          )}
        </div>
      </div>
      
      {/* File history */}
      {uploadedFiles.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3 text-white">Uploaded Documents</h3>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center">
                <div className="bg-blue-500/20 p-2 rounded-md mr-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{file.name}</p>
                  <div className="flex items-center text-slate-400 text-xs">
                    <span>{formatFileSize(file.size)}</span>
                    <span className="mx-1">•</span>
                    <span>{file.timestamp.toLocaleTimeString()}</span>
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
