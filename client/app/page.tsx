import FileUploadComponent from './components/file-upload';
import ChatComponent from './components/chat';

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-800 min-h-screen">
      <div className="container mx-auto">
        <div className="min-h-screen flex flex-col lg:flex-row">
          {/* Sidebar with file upload */}
          <div className="lg:w-[30%] min-h-[30vh] lg:min-h-screen bg-slate-900 shadow-xl">
            <FileUploadComponent />
          </div>
          
          {/* Main chat area */}
          <div className="lg:w-[70%] min-h-[70vh] lg:min-h-screen bg-slate-50">
            <ChatComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
