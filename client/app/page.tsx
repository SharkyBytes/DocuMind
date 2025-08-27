import FileUploadComponent from './components/file-upload';
import ChatComponent from './components/chat';

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-800 min-h-screen overflow-hidden">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Sidebar with file upload - fixed position */}
        <div className="lg:w-[30%] bg-slate-900 shadow-xl overflow-y-auto lg:fixed lg:left-0 lg:top-0 lg:bottom-0 z-10">
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
